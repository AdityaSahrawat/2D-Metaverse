import { MapObject, placeObj, TiledMap } from "@repo/valid";
import { User } from "./user";
import { collisionRects, doorCollisionRects, extractMapObjects, getPlaceObjs, getTriggerObjs } from "./logic";
import { prismaClient } from "@repo/db";
import { getMapData } from "@repo/map/index";
import redis from "@repo/redis/index";


interface SpaceData {
    users: User[];
    mapid : string
    mapObjects: MapObject[]; 
    collisionRects: { x: number; y: number; width: number; height: number }[];
    doorCollisions: { x: number; y: number; width: number; height: number; obj_id: string }[];
    doorStates: Map<string, placeObj>;
    placeObjs : placeObj[]
    triggerObjs : MapObject[];
    meta: {
        width: number;
        height: number;
        tileSize: number;
    };
}

export class RoomManager {
    private static instance: RoomManager;
    private rooms: Map<string, SpaceData> = new Map();

    private constructor() {}

    public static getInstance() {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    public async initSpace(spaceId: string) {
        if (this.rooms.has(spaceId)){
            return this.rooms.get(spaceId)
        }
        
        const space = await prismaClient.space.findFirst({
            where: { id: spaceId },
            include : {
                map : true
            }
        });
        if (!space) {
        throw new Error(`Space ${spaceId} not found`);
    }
        const map = getMapData(space.map.mapid)

        const mapObjects = extractMapObjects(map);
        const collisions = await collisionRects(mapObjects);
        const doors = await doorCollisionRects(mapObjects);
        const placeObjs = await getPlaceObjs(mapObjects ,Number(spaceId) )
        const triggerObjs = getTriggerObjs(mapObjects)

        const doorStates = new Map<string, placeObj>();
        for (const door of doors) {
            const raw = await redis.get(`space:${spaceId}:${door.obj_id}`);
            if (raw) {
                doorStates.set(door.obj_id, JSON.parse(raw));
            }
        }

        this.rooms.set(spaceId, {
            users: [],
            mapid : space?.map.mapid,
            mapObjects,
            collisionRects: collisions,
            doorCollisions: doors,
            doorStates: doorStates,
            placeObjs : placeObjs,
            triggerObjs : triggerObjs,

            meta: {
                width: map.width,
                height: map.height,
                tileSize: map.tilewidth
            }
        });
        return this.rooms.get(spaceId)
    }

    public addUser(spaceId: string, user: User) {
        const room = this.rooms.get(spaceId);
        if (!room) throw new Error(`Space ${spaceId} not initialized`);

        room.users.push(user);
    }

    public removeUser(spaceId: string, user: User) {
        const room = this.rooms.get(spaceId);
        if (!room) return;

        room.users = room.users.filter(u => u.userId !== user.userId);
    }

    public getUsers(spaceId: string) {
        return this.rooms.get(spaceId)?.users ?? [];
    }

    public getMapObjects(spaceId: string) {
        return this.rooms.get(spaceId)?.mapObjects ?? [];
    }

    public getCollisionRects(spaceId: string) {
        return this.rooms.get(spaceId)?.collisionRects ?? [];
    }

    public getPlaceObjects(spaceId: string) {
        return this.rooms.get(spaceId)?.placeObjs ?? [];
    }
    public getTriggerObjects(spaceId: string) {
        return this.rooms.get(spaceId)?.triggerObjs ?? [];
    }

    public getSpaceData(spaceId: string): SpaceData | undefined {
        return this.rooms.get(spaceId);
    }

    public getMeta(spaceId: string) {
        return this.rooms.get(spaceId)?.meta;
    }

    public updateDoorState(spaceId: string, obj_id: string, newState: placeObj) {
        const room = this.rooms.get(spaceId);
        if (room) {
            room.doorStates.set(obj_id, newState);
        }
    }

    public broadcast(spaceId: string, message: any, excludeUser?: User) {
        const room = this.rooms.get(spaceId);
        if (!room) return;

        const data = JSON.stringify(message);
        for (const u of room.users) {
            if (excludeUser && u.userId === excludeUser.userId) continue;
            // u.send(data);
            u.ws.send(data)
        }
    }
}