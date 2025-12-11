import { prismaClient } from "@repo/db";
import { Request, Response, Router } from "express";
import { UserMiddleware } from "../middleware/userMiddleware";
import redis from "@repo/redis/index";
import {MapObject, ObjectLayer, placeObj, Space, TiledMap} from "@repo/valid"
import path from "path";
import fs from 'fs/promises';

const webRouter : Router = Router();


webRouter.post('/map' , async(req : Request , res : Response)=>{
    const {name, mapid , mapPath , imagePath ,width ,height}  = req.body

    if(!name || !mapid || !mapPath || !imagePath || !width || !height){
        res.status(403).json({
            message : "some fields are missing"
        })
    }

    try {

        const response = await prismaClient.maps.findFirst({
            where : {
                mapPath : mapPath
            }
        })

        if(response){
            res.status(403).json({
                message : "A map allready exists with is map path"
            })
        }

        
        await prismaClient.maps.create({
            data : {
                name,
                mapid,
                mapPath,
                imagePath,
                width,
                height
            }
        })
        res.status(200).json({
            message : "map created"
        })


    } catch (error) {
        res.status(500).json({
            message : "error in adding map"
        })
    }
})

webRouter.get('/maps' ,UserMiddleware, async (req : Request , res : Response)=>{
    console.log("in get/map")
    try {
        const maps = await prismaClient.maps.findMany()

        res.status(200).json({
            maps
        })
    }catch(e){
        console.log("error in get /maps" , e )
        res.status(500).json({
            message : "not able to get all maps"
        })
    }    
})
 
webRouter.get('/spaces' ,UserMiddleware, async (req : Request , res : Response)=>{
    console.log("in get /spaces")
    const userId = req.userId
    try {
        const spaces = await prismaClient.space.findMany({
            where : {
                adminId : userId
            },
            include: {
                map: true,
                participants: true   
            }
        })
        res.status(200).json({
            spaces : spaces?? []
        })
    }catch(error){
        res.status(500).json({
            message : "not able to get your spaces"
        })
    }
})

webRouter.post('/space' , UserMiddleware , async(req : Request , res : Response)=>{
    const {name, maxParticipants ,type , mapId , mapid} = req.body
    const userId =req.userId
    
    if(!name || !mapId || !mapid){
        res.status(403).json({
            message : "missing req fields"
        })
        return
    }
    if(type != "public" && type != "private" && type != "invite-only"){
        res.status(403).json({
            message : "invalid or missing 'type' field"
        })
        return
    }
    if(!userId){ 
        res.status(403).json({
            message : "missing userId"
        })
        return
    }

    // Verify user exists in database
    const user = await prismaClient.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        res.status(404).json({
            message: "User not found. Please login again."
        })
        return;
    }

    try {
        await redis.set('test', 'test');
    } catch (error) {
        return res.status(500).json({ message: 'error in redis connection' });
    }
    console.log(3, "Creating space with userId:", userId, "mapId:", mapId)
    let space : Awaited<ReturnType<typeof prismaClient.space.create>>;
    try {
         space = await prismaClient.space.create({
            data : {
                name,
                type,
                adminId : userId,
                mapId,
                maxParticipants : parseInt(maxParticipants, 10) || 0,
                participants: {
                    connect: { id: userId } 
                }
            }
        })
    } catch (error) {
        console.log("error in prisma post/space : " , error)
        console.log("Failed to create space with userId:", userId, "mapId:", mapId)
        res.status(500).json({
            message : "error in creating a space" , 
            details: error instanceof Error ? error.message : "Unknown error"
        })
        return
    }

    const mapPath  = path.join(__dirname , `../map_${mapid}.tmj`);
    const mapData = await fs.readFile(mapPath, 'utf-8');
    const map: TiledMap = JSON.parse(mapData);

    // const layer = map.layers.filter(layer => layer.type === "objectgroup" && layer.name === "Object Layer place");

    const layer = map.layers.find(
      (layer): layer is ObjectLayer =>
        layer.type === 'objectgroup' && layer.name === 'Object Layer place'
    );

    if (!layer) {
      return res.status(500).json({ message: 'no object layer named "Object Layer place"' });
    }
    const placeObjects: placeObj[] = [];

    for (const obj of layer.objects) {
        if(!obj.properties){
            continue;
        }
      const props = Object.fromEntries(obj.properties.map((p: any) => [p.name, p.value]));
 
      let state = props.state?.toLowerCase();
      if (state === 'closed') state = 'close';
      if (state === 'opened') state = 'open';
 
      const placeObj: placeObj = {
        obj_id: props['obj_id'],
        x: Math.floor(obj.x),
        y: Math.floor(obj.y),
        width: Math.floor(obj.width),
        height: Math.floor(obj.height),
        direction: props.direction || 'front',
        state: state || 'close',
        type: props.type || 'interactive' 
      };
      if (placeObj.obj_id) {
        await redis.set(`space:${space.id}:${placeObj.obj_id}`, JSON.stringify(placeObj));
        console.log("objfromat : " , `space:${space.id}:${placeObj.obj_id}`, JSON.stringify(placeObj))
        placeObjects.push(placeObj);
      }
    }
    res.status(200).json({
        message: "Space created successfully",
        spaceId: space.id,
        placeObjects
    });

})

webRouter.post('/space/join' , UserMiddleware , async(req : Request , res : Response)=>{
    const userId = req.userId
    const {code , spaceId } = req.body

    if(!code || !spaceId){
        res.status(403).json({
            message : "code or spaceId is/are missing"
        })
    }

    try {
    const space = await prismaClient.space.findUnique({
      where: { id: spaceId },
      include: { participants: true },
    });

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }
    if (space.code !== code) {
      return res.status(403).json({ message: "Invalid code" });
    }

    const isAlreadyParticipant = space.participants.some((p) => p.id === userId);
    if (isAlreadyParticipant) {
      return res.status(409).json({ message: "User already joined the space" });
    }

    const currentParticipants = space.participants.length;
    if (space.maxParticipants && currentParticipants >= space.maxParticipants) {
      return res.status(403).json({ message: "Space is full" });
    }

    await prismaClient.space.update({
      where: { id: spaceId },
      data: {
        participants: {
          connect: { id: userId },
        },
      },
    });

    return res.status(200).json({ message: "Joined space successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
})

webRouter.get('/space/:spaceId/access' , UserMiddleware , async(req : Request , res : Response)=>{
    const userId = req.userId
    const spaceId = req.params.spaceId

    if(!userId){
        res.status(404).json({
            message : "missing userId"
        })
        return
    }

    try{
        const space = await prismaClient.space.findFirst({
            where : {
                id : spaceId
            },
            include : {
                participants : true,
                map : true
            }
        })

        if(!space){
            res.status(403).json({
                message : "no space found"
            })
            return;
        }

        if(userId === space.adminId){
            res.status(200).json({
                role : "admin",
                space
            })
            return
        }

        if(space.participants.find(p => p.id === userId)){
            res.status(200).json({
                role : "member",
                space
            })
        }
    }catch(error){
        res.status(500).json({
            message : "Internal server error" , error
        })
    }

})

export default webRouter