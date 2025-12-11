import { WebSocket } from "ws";
import { RoomManager } from "./roomManager";
import dotenv from "dotenv";
import { prismaClient } from "@repo/db";
import {getSpawnPoint, getTriggerObjs, isColliding, getOnTrigger, findValidStandingPosition } from "./logic";
import redis from "@repo/redis/index";
import { placeObj } from "@repo/valid";

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
    public isSitting: boolean
    public sittingOnChairId: string | null
    public beforeSitX: number
    public beforeSitY: number
    constructor(ws: WebSocket, userId: string) {
        this.ws = ws;
        this.userId = userId;
        this.tileX = 0;
        this.tileY = 0;
        this.char = "bob"
        this.joined = false
        this.isSitting = false
        this.sittingOnChairId = null
        this.beforeSitX = 0
        this.beforeSitY = 0
        this.initHandler();
    }

    private Send(message: any) {
        if (this.ws.readyState === WebSocket.OPEN) {
            const stringified = JSON.stringify(message);
            console.log("Sending message:", message.type, "to user:", this.userId);
            console.log("Message payload:", stringified.substring(0, 200));
            this.ws.send(stringified);
        } else {
            console.error(" WebSocket not open. ReadyState:", this.ws.readyState, "Message type:", message.type);
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

                case "trigger-pressed" :
                    if(!this.joined){
                        this.Send({type : "error" , payload : {message : "Join the space to access other endpoints"}})
                        break;
                    }
                    await this.handleTriggerPressed(parsedData.payload);
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

    private async handleJoin(payload: { spaceId: string }) {
        console.log("Join request received for spaceId:", payload.spaceId, "from userId:", this.userId);
        
        try {
        const space = await prismaClient.space.findFirst({
            where: { id: payload.spaceId },
            include : {
                map : true,
                participants : true,
                admin : true
            }
        });
        
        if (!space) {
            console.log("Space not found:", payload.spaceId);
            this.ws.close();
            return;
        }
        console.log("Space found:", space.name);
        
        const spaceData = await RoomManager.getInstance().initSpace(payload.spaceId)
        
        if (!spaceData) {
            console.log("Failed to init space data");
            this.ws.close();
            return;
        }
        
        const spawnPoint = getSpawnPoint(spaceData.mapObjects);
        this.tileX = spawnPoint.x;
        this.tileY = spawnPoint.y;
        this.spaceId = payload.spaceId;
        console.log("📍 Spawn point calculated:", this.tileX, this.tileY);
        
        // Validate spawn coordinates
        if (typeof this.tileX !== 'number' || typeof this.tileY !== 'number' || 
            isNaN(this.tileX) || isNaN(this.tileY)) {
            console.error("❌ Invalid spawn coordinates!", this.tileX, this.tileY);
            this.tileX = 100;
            this.tileY = 100;
            console.log("✅ Using fallback spawn point:", this.tileX, this.tileY);
        }

        // Check if user is admin or participant
        if(space.admin.id === this.userId){
            this.char = space.admin.avatar
        } else {
            const participant = space.participants.find((u) => u.id === this.userId)
            if(!participant){
                this.Send({
                    type: "error",
                    payload: { message: "You are not a member of this space. Please join first." }
                });
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
            }
        });
        console.log("📤 Sent space-joined message to client");

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
        } catch (error) {
            console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
            this.Send({
                type: "error",
                payload: { message: "Failed to join space: " + (error instanceof Error ? error.message : String(error)) }
            });
        }
    }
 
    private async handleUserMove(payload : {newX : number , newY : number , spaceId : string}){
        if (!this.spaceId) {
            console.log("❌ User tried to move without joining a space");
            return;
        }

        // Prevent movement if sitting
        if (this.isSitting) {
            this.Send({
                type: "movement restricted",
                payload: {
                    x: this.tileX,
                    y: this.tileY,
                    message: "Cannot move while sitting. Press E to stand up."
                }
            });
            return;
        }

        // Don't re-init space on every move! Just get the cached data
        const spaceData = RoomManager.getInstance().getSpaceData(this.spaceId);
        if (!spaceData) {
            console.log("❌ Space data not found for:", this.spaceId);
            return;
        }

        // Start with static walls
        const collisionRectangles = [...spaceData.collisionRects];
        
        // Add CLOSED doors from in-memory cache
        for (const doorRect of spaceData.doorCollisions) {
            const doorState = spaceData.doorStates.get(doorRect.obj_id);
            if (doorState && doorState.state === "close") {
                collisionRectangles.push({
                    x: doorRect.x,
                    y: doorRect.y,
                    width: doorRect.width,
                    height: doorRect.height
                });
            }
        }

        const isCollision = isColliding(payload.newX, payload.newY, collisionRectangles)

        if(isCollision){
            // Send CURRENT position, not spawn position!
            this.Send({
                type : "movement restricted",
                payload : {
                    x : this.tileX,  // Current position
                    y : this.tileY
                }
            })
            console.log(`Movement blocked for user ${this.userId} - collision at (${payload.newX}, ${payload.newY}), staying at (${this.tileX}, ${this.tileY})`);
            return
        }else{
            // Update server position
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
                    obj_id : trigger.properties?.obj_id ,

                }
            })
        }else{
            this.Send({
                type : "no-trigger"
            })
        }
    }

    private async handleTriggerPressed(payload: { obj_id: string }) {
        if (!this.spaceId) {
            this.Send({ type: "error", payload: { message: "Not in a space" } });
            return;
        }

        const { obj_id } = payload;
        console.log("obj_id : " , obj_id)

        // Handle chair sit/stand
        if (obj_id.startsWith("chair-")) {
            if (this.isSitting && this.sittingOnChairId === obj_id) {
                // Get space data
                const spaceData = RoomManager.getInstance().getSpaceData(this.spaceId!);
                if (!spaceData) return;
                
                // Get chair object
                const chairObj = spaceData.mapObjects.find(
                    obj => obj.properties?.obj_id === obj_id
                );
                
                if (!chairObj) return;
                
                // Get other players' positions
                const occupiedPositions = spaceData.users
                    .filter(u => u.userId !== this.userId)
                    .map(u => ({ x: u.tileX, y: u.tileY }));
                
                // Find valid standing position
                let standPos = findValidStandingPosition(
                    chairObj.x,
                    chairObj.y,
                    chairObj.width ?? 16,
                    chairObj.height ?? 16,
                    spaceData.collisionRects,
                    occupiedPositions
                );
                
                if (!standPos) {
                    // Fallback to position before sitting
                    standPos = { x: this.beforeSitX, y: this.beforeSitY };
                }
                
                // Stand up
                this.isSitting = false;
                this.sittingOnChairId = null;
                this.tileX = standPos.x;
                this.tileY = standPos.y;
                
                // Update Redis state
                const chairState = {
                    obj_id: obj_id,
                    occupied: false,
                    userId: null,
                    type: "chair"
                };
                await redis.set(`space:${this.spaceId}:${obj_id}`, JSON.stringify(chairState));
                
                console.log(`🪑 User ${this.userId} stood up from ${obj_id} at (${this.tileX}, ${this.tileY})`);
                
                this.Send({
                    type: "chair-action",
                    payload: {
                        action: "stand",
                        obj_id: obj_id,
                        userId: this.userId,
                        x: this.tileX,
                        y: this.tileY
                    }
                });
                
                RoomManager.getInstance().broadcast(this.spaceId, {
                    type: "player-stood-up",
                    payload: {
                        userId: this.userId,
                        obj_id: obj_id,
                        char: this.char,
                        x: this.tileX,
                        y: this.tileY
                    }
                }, this);
                
                return;
            } else if (this.isSitting && this.sittingOnChairId !== obj_id) {
                // Already sitting on a different chair
                this.Send({
                    type: "error",
                    payload: { message: "You are already sitting. Stand up first." }
                });
                return;
            } else if (!this.isSitting) {
                // Check if chair is already occupied
                const raw = await redis.get(`space:${this.spaceId}:${obj_id}`);
                if (raw) {
                    const chairState = JSON.parse(raw);
                    if (chairState.occupied && chairState.userId !== this.userId) {
                        this.Send({
                            type: "error",
                            payload: { message: "This chair is already occupied" }
                        });
                        return;
                    }
                }
                
                // Get chair object from map
                const spaceData = RoomManager.getInstance().getSpaceData(this.spaceId);
                if (!spaceData) return;
                
                const chairObj = spaceData.mapObjects.find(
                    obj => obj.properties?.obj_id === obj_id
                );
                
                if (!chairObj) {
                    this.Send({ type: "error", payload: { message: "Chair not found" } });
                    return;
                }
                
                // Save current position before sitting
                this.beforeSitX = this.tileX;
                this.beforeSitY = this.tileY;
                
                // Sit down - position player on chair with proper coordinate conversion
                this.isSitting = true;
                this.sittingOnChairId = obj_id;
                
                // Convert from Tiled's bottom-origin to top-origin and adjust for player sprite offset
                const chairWidth = chairObj.width ?? 16;
                const chairHeight = chairObj.height ?? 16;
                const direction = chairObj.properties?.direction ?? "front";
                
                // Position player at center of chair - adjusted for sprite alignment
                switch(direction) {
                    case "left":
                    case "right":
                        this.tileX = chairObj.x + chairWidth / 2 - 16;
                        this.tileY = chairObj.y - chairHeight + 16; // Move down 16px
                        break;
                    case "front":
                    case "back":
                        this.tileX = chairObj.x + chairWidth / 2 - 16;
                        this.tileY = chairObj.y - chairHeight + 16; // Move down 16px
                        break;
                    default:
                        // Fallback to center with adjustment
                        this.tileX = chairObj.x + chairWidth / 2 - 16;
                        this.tileY = chairObj.y - chairHeight + 16; // Move down 16px
                }
                
                // Update Redis state
                const chairState = {
                    obj_id: obj_id,
                    occupied: true,
                    userId: this.userId,
                    playerX: this.tileX,
                    playerY: this.tileY,
                    beforeSitX: this.beforeSitX,
                    beforeSitY: this.beforeSitY,
                    type: "chair"
                };
                await redis.set(`space:${this.spaceId}:${obj_id}`, JSON.stringify(chairState));
                
                console.log(`🪑 User ${this.userId} sat down on ${obj_id} at (${this.tileX}, ${this.tileY})`);
                
                this.Send({
                    type: "chair-action",
                    payload: {
                        action: "sit",
                        obj_id: obj_id,
                        userId: this.userId,
                        x: this.tileX,
                        y: this.tileY,
                        direction: direction
                    }
                });
                
                RoomManager.getInstance().broadcast(this.spaceId, {
                    type: "player-sat-down",
                    payload: {
                        userId: this.userId,
                        obj_id: obj_id,
                        char: this.char,
                        x: this.tileX,
                        y: this.tileY,
                        direction: direction
                    }
                }, this);
                
                return;
            }
        }

        ////getting all key val : :::::::
        async function getAllKeysAndValues(): Promise<Record<string, string | null>> {
            const keys: string[] = [];
            let cursor = '0';

            do {
                const result = await redis.scan(cursor);
                cursor = String(result.cursor);
                keys.push(...result.keys);
            } while (cursor !== '0');

            if (keys.length === 0) return {};

            const values = await redis.mGet(keys);
            const result: Record<string, string | null> = {};
            keys.forEach((key, i) => {
                result[key] = values[i] ?? null;
            });

            return result;
        }

        getAllKeysAndValues().then((data) => {
            console.log(JSON.stringify(data, null, 2)); 
        });




        const raw = await redis.get(`space:${this.spaceId}:${obj_id}`);
        
        if (!raw) {
            this.Send({ type: "error", payload: { message: "Object not found" } });
            return;
        }

        const placeObj: placeObj = JSON.parse(raw);
        
        const newState = placeObj.state === "open" ? "close" : "open";
        placeObj.state = newState;
        
        await redis.set(`space:${this.spaceId}:${obj_id}`, JSON.stringify(placeObj));
        
        // Update in-memory cache for door collision
        RoomManager.getInstance().updateDoorState(this.spaceId, obj_id, placeObj);
        
        console.log(`🚪 User ${this.userId} toggled ${obj_id} to ${newState}`);
        
        this.Send({
            type: "trigger-pressed-res",
            payload: {
                obj_id: obj_id,
                state: newState,
                placeObj: placeObj
            }
        });
        
        RoomManager.getInstance().broadcast(this.spaceId, {
            type: "obj-state-changed",
            payload: {
                obj_id: obj_id,
                state: newState,
                placeObj: placeObj
            }
        }, this);
    }

    public cleanup() {
        if (this.spaceId) {
            RoomManager.getInstance().removeUser(this.spaceId, this);
        }
        this.joined = false;
        this.isSitting = false;
        this.sittingOnChairId = null;
    }

}
