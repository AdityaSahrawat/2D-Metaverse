
import { Router, Request, Response } from "express";
import {prismaClient} from "@repo/db"

import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"; 
// import { userSchema , signinSchema , roomSchema } from "@zod/index"
const jwt_secret  = "123"
const saltRound = process.env.SALTROUNDS || 5


const userRouter:Router = Router()


userRouter.post("/signup", async(req: Request, res: Response) => {
    const {username , email , password } = req.body 

    if(!username || !email || !password){
        res.status(403).json({
            message : "send username , email , password"
        })
        return;
    }
    
    try {
        const userExists = await prismaClient.user.findFirst({
            where : {
                email : email
            }
        })

        if(userExists){ 
            res.status(403).json({
                message : "A user allready exists with this email"
            })
            return;
        }
        const user = await prismaClient.user.create({
            data: {
                email,
                password,
                username,
                provider : "manual",
                avatar : "bob"
            }
        });
        const token = jwt.sign({ email: user.email, id: user.id },
                jwt_secret 
            );
            
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure : false
        })
        .status(200)
        .json({ message: "verified and user created!" });
            } catch (error) {
                res.status(500).json({ message: "Error creating user", error });
            }
});

userRouter.post('/signin', async(req: Request, res : Response) => {
    // const parseData = signinSchema.safeParse(req.body);
    const parseData = req.body
    if (!parseData.success){
        res.json({
            message : "Incorrect Inputs"
        })
        return 
    }

    try{
        const user = await prismaClient.user.findFirst({
            where:{
                email: parseData.data.email,
                password : parseData.data.password
            }
        })
        if(!user){
            res.status(403).json({
                message : "not authorized"
            })
            return
        }
        const token = jwt.sign({email : user.email , userId :user.id },jwt_secret)


        res.cookie("token" , token , {
            httpOnly : true,
            sameSite : "lax",
            secure : false
        }).status(200).json({
            message : "signed in successfully!!"
        })
    }catch(e){
        res.status(401).json({
            message : "user Not found"
        })
    }
})

userRouter.post("/oauth", async(req: Request, res: Response) => {
  const { email, username } = req.body;
  if (!email) {
    res.status(400).json({ message: "Missing or invalid data" });
    return
  }

  try {
    const existingUser = await prismaClient.user.findUnique({ where: { email } });

    if(existingUser?.provider === "manual"){
        res.status(403).json({
            message : "A user allreday exists with this email ( manual way ) "
        })
        return
    }

    let user;

    if (existingUser) {
      user = existingUser;
    } else {
      user = await prismaClient.user.create({
        data: {
          email,
          username,
          password: null,
          provider: "google",
          avatar : "bob"
        },
      });
    }

    const token = jwt.sign({ email: user.email, userId: user.id }, jwt_secret);

    res.cookie("token" , token , {
        httpOnly : true,
        sameSite : "lax",
        secure : false
    }).status(200).json({
      message: existingUser ? "User logged in" : "User registered",
      token
    });
    return;
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).json({
      message: "Internal server error",
      error,
    });

  }
});

userRouter.post("/send-code" , async (req : Request , res : Response)=>{
    const {email} = req.body;

    if(!email){
        res.status(403).json({
            message : "no email given"
        })
        return ;
    }

    try {
        const user = await prismaClient.user.findFirst({
            where : {
                email : email
            }
        })
        if(user){
            res.status(403).json({
                message : "A user allready exists with this email"
            })
            return
        }
    } catch (error) {
        res.status(500).json({
            message : "internal server error", error
        })
        return;
    }
    
    const verEmail =await prismaClient.verificationEmail.findFirst({
        where : {
            email : email
        }
    })
    const code = generateCode();
    try {
        if(verEmail){
            await prismaClient.verificationEmail.update({
                where : {
                    id : verEmail.id
                },data : {
                    code : code,
                    expireAt : new Date(Date.now() + (1000 * 60 * 10))
                }
            })
        }else{
            await prismaClient.verificationEmail.create({
                data : {
                    email : email,
                    code : code,
                    expireAt : new Date(Date.now() + (1000 * 60 * 10)) // 10 min
                }
            })
        }
        // code to send code
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'v1codesender@gmail.com',
                pass: 'welc dhux joam nyjw',
            },
        });

        async function sendMail() {
            const info = await transporter.sendMail({
                from: '"White Board" <v1codesender@gmail.com>',
                to: email,
                subject: 'verification code for your email',
                text: `Your code for signup is ${code} !! `,
            });
        }

        await sendMail()


        res.status(200).json({
            message : "code sent successfully"
        })
    } catch (error) {
        res.status(500).json({
            message : "Internal server error " , error
        })
    }
})

userRouter.post("/verify-code" , async (req : Request , res : Response)=>{
    const {email , code , password , username} = req.body

    if(!email || !code || !password || !username){
        res.status(404).json({
            message : "all fields required"
        })
        return
    }

    try {
        const verEmail =await prismaClient.verificationEmail.findFirst({
            where : {
                email : email
            }
        })

        if(!verEmail){
            res.status(404).json({
                message : "email not found"
            })
            return;
        }

        if(verEmail.code !== code){
            res.status(403).json({
                message : "code not matched"
            })
            return;
        }

        if(verEmail.expireAt < new Date()){
            res.status(403).json({
                message : "code expired!! , Retry to send code"
            })
            return;
        }

        const user = await prismaClient.user.create({
            data : {
                username ,
                email,
                password,
                provider : "manual",
                avatar : "bob"
            }
        })

        await prismaClient.verificationEmail.delete({
            where : {
                id : verEmail.id
            }
        })

        const token = jwt.sign({email : user.email , userId :user.id },jwt_secret)

        res.cookie("token" , token , {
            httpOnly : true,
            sameSite : "lax",
            secure : false
        }).status(200).json({
            message : "verified and user created!!",
        })
    } catch (error) {
        res.status(500).json({
            message : "Internal server error " , error
        })
    }
})

userRouter.get('/logout' , async (req : Request , res : Response)=>{
    res.clearCookie("token" , {
        httpOnly : true,
        sameSite : 'lax',
        secure : false
    })

    res.status(200).json({
        message : "Logged out"
    })
})
 
userRouter.get('/auth/status' , async (req : Request , res : Response)=>{
    const token = req.cookies?.token
    if(!token){
        res.status(204).json({
            isAuth : false
        })
        return;
    }

    try{
        const decoded = jwt.verify(token , jwt_secret);
        res.status(200).json({
            isAuth : true
        })
        return
    }catch(e){
        res.status(204).json({
            isAuth : false
        })
        return;
    }
} )

export default userRouter;


function generateCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}