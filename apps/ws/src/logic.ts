import redis from "@repo/redis/index";
import { MapObject, placeObj, TiledMap } from "@repo/valid";


export function getSpawnPoint(mapObjects : MapObject[]){
    const placeObjs = mapObjects.filter(obj => obj.type === "spawn")
    
    // If no spawn point found, return a default safe position
    if (!placeObjs.length || placeObjs[0]?.x === undefined || placeObjs[0]?.y === undefined) {
        console.log("No spawn point found in map, using default (100, 100)");
        return {
            x: 100,
            y: 100
        }
    }
    
    return {
        x : placeObjs[0].x,
        y : placeObjs[0].y - (placeObjs[0].height ?? 0)
    }
}


export function extractMapObjects(tmj: TiledMap): MapObject[] {
  const objectLayers = tmj.layers.filter(layer => layer.type === "objectgroup");

  const mapObjects: MapObject[] = [];

  for (const layer of objectLayers) {
    for (const obj of layer.objects || []) {
      const propMap: Record<string, any> = {};
      if (obj.properties) {
        for (const prop of obj.properties) {
          propMap[prop.name] = prop.value; 
        }
      }

      const mapObject: MapObject = {
        id: `obj-${obj.id}`,
        type: propMap.type ?? 'decoration',
        variant: propMap.variant ?? 'unknown',
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation ?? 0,
        properties: {
          walkable: propMap.walkable,
          obj_id : propMap.obj_id,
          obstructsMovement: propMap.obstructsMovement,
          interactable: propMap.interactable,
          interactionType: propMap.interactionType,
          ...propMap,
        },
      };

      mapObjects.push(mapObject);
    }
  }

  return mapObjects;
}

export async function collisionRects(mapObjects : MapObject[]) : Promise<{x : number , y: number , width : number , height : number}[]>{

  const collisionRects = mapObjects
  .filter(obj => obj.properties?.obstructsMovement && obj.properties?.type !== "interactive") // Exclude doors
  .map(obj => ({
    x: obj.x,
    y: obj.y - (obj.height ?? 0), // Convert from Tiled's bottom-origin to top-origin
    width: obj.width ?? 0,
    height: obj.height ?? 0,
  }));
  return collisionRects
}

export async function doorCollisionRects(mapObjects : MapObject[]) : Promise<{x : number , y: number , width : number , height : number, obj_id: string}[]>{

  const doorRects = mapObjects
  .filter(obj => 
  obj.properties?.type === "interactive" && 
  obj.properties?.obj_id?.startsWith("door-")
)
  .map(obj => ({
    x: obj.x,
    y: obj.y - (obj.height ?? 0),
    width: obj.width ?? 0,
    height: obj.height ?? 0,
    obj_id: obj.properties?.obj_id ?? ""
  }));
  return doorRects
}

export async function triggerObjs(mapObjects : MapObject[]) : Promise<{x : number , y: number , width : number , height : number}[]>{

  const triggerObjs = mapObjects
  .filter(obj => obj.type = "trigger")
  .map(obj => ({
    x: obj.x,
    y: obj.y - (obj.height ?? 0), // Convert from Tiled's bottom-origin to top-origin
    width: obj.width ?? 0,
    height: obj.height ?? 0,
  }));
  return triggerObjs
}

export function isColliding(x: number, y: number,collisionRectangles : {x : number , y : number , width : number , height : number}[]): boolean {  
  const hitbox = {
    // x: x-6,
    // y : y-6,
    // width : 12,
    // height : 12,
    x: x,
    y : y,
    width : 5,
    height : 5,
  };

  for (const rect of collisionRectangles) {
    const collide =
      hitbox.x < rect.x + rect.width &&
      hitbox.x + hitbox.width > rect.x &&
      hitbox.y < rect.y + rect.height &&
      hitbox.y + hitbox.height > rect.y;
      
    if (collide) {
      console.log("Collision detected between:", {player: hitbox, object: rect});
      return true;
    }
  }
  return false;
}

export async function getPlaceObjs(mapObjects : MapObject[] , spaceId : number){
  let placeObjects : placeObj[] =[]
  for(const obj of mapObjects.filter(obj => obj.type === "interactive")){
    const raw = await redis.get(`space:${spaceId}:${obj.properties?.obj_id}`)

    if(raw){
      const plcObj = JSON.parse(raw)
      placeObjects.push(plcObj)
    }
  }
  return placeObjects
}

export function getTriggerObjs(mapObjects : MapObject[]){
  return mapObjects
    .filter(obj => obj.properties?.type === "trigger")
    .map(obj => ({
      ...obj,
      y: obj.y - (obj.height ?? 0)
    }));
}

export function getOnTrigger(x: number, y: number , triggerObjs : MapObject[]) : MapObject | null{

  const hitbox = {
    x: x,
    y : y,
    width : 5,
    height : 5,
  };

  for(const obj of triggerObjs){
    const ontrigger = hitbox.x < obj.x + obj.width &&
      hitbox.x + hitbox.width > obj.x &&
      hitbox.y < obj.y + obj.height &&
      hitbox.y + hitbox.height > obj.y;

      if(ontrigger){
        return obj
      }
  }
  return null
}

export function findValidStandingPosition(
  chairX: number,
  chairY: number,
  chairWidth: number,
  chairHeight: number,
  collisionRects: {x: number, y: number, width: number, height: number}[],
  occupiedPositions: {x: number, y: number}[]
): {x: number, y: number} | null {
  const TILE_SIZE = 16;
  
  const offsets = [
    { x: 0, y: -TILE_SIZE }, // top
    { x: 0, y: chairHeight + TILE_SIZE }, // bottom
    { x: -TILE_SIZE, y: 0 }, // left
    { x: chairWidth + TILE_SIZE, y: 0 }, // right
    { x: -TILE_SIZE, y: -TILE_SIZE }, // top-left
    { x: chairWidth + TILE_SIZE, y: -TILE_SIZE }, // top-right
    { x: -TILE_SIZE, y: chairHeight + TILE_SIZE }, // bottom-left
    { x: chairWidth + TILE_SIZE, y: chairHeight + TILE_SIZE }, // bottom-right
  ];

  for (const offset of offsets) {
    const testX = chairX + offset.x;
    const testY = chairY + offset.y;

    const isOccupied = occupiedPositions.some(
      pos => Math.abs(pos.x - testX) < TILE_SIZE && Math.abs(pos.y - testY) < TILE_SIZE
    );
    
    if (isOccupied) continue;

    if (!isColliding(testX, testY, collisionRects)) {
      return { x: testX, y: testY };
    }
  }
  return { x: chairX, y: chairY + chairHeight + TILE_SIZE };
}
