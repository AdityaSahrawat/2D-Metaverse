import { WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import {parse} from "cookie"
import { User } from './user';

dotenv.config()

const wsPort = process.env.WSPORT
const jwt_Secret = process.env.JWT_SECTRET
const wss = new WebSocketServer({ port: Number(wsPort) });


function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, jwt_Secret!);

    if (typeof decoded === "object" && decoded !== null && "userId" in decoded) {
      return (decoded as { userId: string }).userId;
    }

    return null;
  } catch (e) {
    return null;
  }
}

wss.on('connection', async function connection(ws , request) {

    const cookieHeader = request.headers.cookie

  if(!cookieHeader){
    ws.close(1008 , "no cookie header found");
    return;
  }
  
  const cookies = parse(cookieHeader)
  const token = cookies.token;

  if (!token) return ws.close(1000 , "token not found");
  const userId = checkUser(token)

  if (!userId) return ws.close(1000 , "userId not found");

  // Create User instance when connection is established
  const user = new User(ws , userId)
  console.log(`User ${user.userId} connected`);

  ws.on('error', console.error);

  ws.on('close', function close() {
    console.log(`User ${user.userId} disconnected`);
    user.cleanup();
  });

});
