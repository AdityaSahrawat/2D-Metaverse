import express from "express"
import cors from "cors"
import userRouter from "./routes/userRoutes"
import cookieParser from "cookie-parser"
import webRouter from "./routes/webRouter";

const app = express();

app.use(express.json())
app.use(cors({
    origin : "http://localhost:3000",
    credentials : true
}))
app.use(cookieParser())

app.use("/v1/user" , userRouter)
app.use("/v1/web" , webRouter )

const PORT = 3011;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
}); 