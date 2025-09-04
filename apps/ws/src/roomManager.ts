import { MapObject, TiledMap } from "@repo/valid";
import { User } from "./user";
import { collisionRects, extractMapObjects, getPlaceObjs, getTriggerObjs } from "./logic";
import { prismaClient } from "@repo/db";
import { getMapData } from "@repo/map/index";


interface SpaceData {
    users: User[];
    mapid : string
    mapObjects: MapObject[]; // from extractMapObjects
    collisionRects: { x: number; y: number; width: number; height: number }[];
    placeObjs : MapObject[]
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
        const placeObjs = getPlaceObjs(mapObjects)
        const triggerObjs = getTriggerObjs(mapObjects)

        this.rooms.set(spaceId, {
            users: [],
            mapid : space?.map.mapid,
            mapObjects,
            collisionRects: collisions,
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

    public getMeta(spaceId: string) {
        return this.rooms.get(spaceId)?.meta;
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