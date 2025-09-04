import { WebSocket } from "ws";
import { RoomManager } from "./roomManager";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { prismaClient } from "@repo/db";
import { collisionRects, getSpawnPoint, getTriggerObjs, isColliding, getOnTrigger } from "./logic";
import { getMapData } from "@repo/map/index";
import redis from "@repo/redis/index";
import cookie from "cookie";

dotenv.config();
const jwt_Secret = process.env.JWT_SECTRET;

export class User {
    public userId: string;
    public spaceId?: string;
    public tileX: number;
    public tileY: number;
    public ws: WebSocket;
    public char : string
    public joined: boolean
    constructor(ws: WebSocket, userId: string) {
        this.ws = ws;
        this.userId = userId;
        this.tileX = 0;
        this.tileY = 0;
        this.char = "bob"
        this.joined = false
        this.initHandler();
    }

    private Send(message: any) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private initHandler() {
        this.ws.on("message", async (data) => {
            let parsedData: any;
            try {
                parsedData = JSON.parse(data.toString());
            } catch (err) {
                console.error("Invalid JSON from client:", err);
                return;
            }


            switch (parsedData.type) {
                case "join":
                    if(this.joined){
                        this.Send({type : "error" , payload : {message : "already joined"}})
                        break
                    }
                    await this.handleJoin(parsedData.payload);
                    break;
                case "move" :
                    if(!this.joined){
                        this.Send({type : "error" , payload : {message : "First join the space"}})
                        break;
                    }
                    await this.handleUserMove(parsedData.payload)
                    break;
            }   
        });

        this.ws.on("close", () => {
            if (this.spaceId) {
                RoomManager.getInstance().removeUser(this.spaceId, this);
                RoomManager.getInstance().broadcast(this.spaceId , {
                    type: "user-left",
                    payload: { userId: this.userId }
                } , this);
            }
        });
    }

    private async handleJoin(payload: { spaceId: string; userId: string }) {
        console.log("join received");
        // Verify token
        
        // Validate space exists in DB
        const space = await prismaClient.space.findFirst({
            where: { id: payload.spaceId },
            include : {
                map : true,
                participants : true,
                admin : true
            }
        });
        
        if (!space) {
            this.ws.close();
            return;
        }
        const spaceData = await RoomManager.getInstance().initSpace(payload.spaceId)
        
        if (!spaceData) {
            this.ws.close();
            return;
        }
        // Spawn point (tile-based)
        // const spawnPoint = getSpawnPoint(RoomManager.getInstance().getMapObjects(this.spaceId!));
        const spawnPoint = getSpawnPoint(spaceData.mapObjects);
        this.tileX = spawnPoint.x!;
        this.tileY = spawnPoint.y!;
        this.spaceId = payload.spaceId;
        console.log("spawn x, y : " , this.tileX , this.tileY)

        if(space.admin.id === this.userId){
            this.char = space.admin.avatar
        }else {
            const participant = space.participants.find((u)=>{u.id === this.userId})
            if(!participant){
                return this.ws.close()
            }
            this.char = participant.avatar
        }

        RoomManager.getInstance().addUser(payload.spaceId, this);

        this.Send({
            type: "space-joined",
            payload: {
                self: {
                    id: this.userId,
                    tileX: this.tileX,
                    tileY: this.tileY,
                    char : this.char
                },
                players: spaceData.users
                    .filter(u => u.userId !== this.userId)
                    .map(u => ({
                        id: u.userId,
                        tileX: u.tileX,
                        tileY: u.tileY,
                        char : u.char
                    })),
                // triggers: spaceData.triggerObjs,
                // placeObjs: spaceData.placeObjs,
            }
        });

        // Broadcast to others that a new player joined
        RoomManager.getInstance().broadcast(payload.spaceId , {
            type: "user-joined",
            payload: {
                id: this.userId,
                tileX: this.tileX,
                tileY: this.tileY,
                char: this.char
            }
        }, this);

        this.joined = true;
        console.log(`User ${this.userId} joined space ${payload.spaceId}`);
    }
 
    private async handleUserMove(payload : {newX : number , newY : number , spaceId : string}){
        const spaceData = await RoomManager.getInstance().initSpace(this.spaceId!)
        if(!spaceData){
            return this.ws.close()
        }
        const collisionRectangles = await collisionRects(spaceData.mapObjects)

        const isCollision = isColliding(payload.newX, payload.newY, collisionRectangles)

        if(isCollision){
            this.Send({
                type : "movement restricted",
                payload : {
                    x : this.tileX,
                    y : this.tileY
                }
            })
            return
        }else{
            this.tileX = payload.newX
            this.tileY = payload.newY
            this.Send({
                type : "movement approved" ,
                payload  :{
                    x : payload.newX,
                    y : payload.newY
                }
            })

            RoomManager.getInstance().broadcast(payload.spaceId , {
                type : "player moved", 
                payload : {
                    userId: this.userId,
                    x : payload.newX,
                    y : payload.newY
                }
            } , this)
        }

        const triggerObj = getTriggerObjs(spaceData.triggerObjs);

        const trigger = getOnTrigger(payload.newX , payload.newY , triggerObj);

        if(trigger){
            this.Send({
                type : "show-trigger",
                payload : {
                    obj_id : trigger.properties?.obj_id
                }
            })
        }else{
            this.Send({
                type : "no-trigger"
            })
        }
    }

    public cleanup() {
        // Clean up any resources when user disconnects
        if (this.spaceId) {
            RoomManager.getInstance().removeUser(this.spaceId, this);
        }
        this.joined = false;
    }

}
