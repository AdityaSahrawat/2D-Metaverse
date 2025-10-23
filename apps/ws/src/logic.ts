import { MapObject, TiledMap } from "@repo/valid";


export function getSpawnPoint(mapObjects : MapObject[]){
    const placeObjs = mapObjects.filter(obj => obj.type === "spawn")
    return {
        x : placeObjs[0]?.x,
        y : placeObjs[0]?.y
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
  .filter(obj => obj.properties?.obstructsMovement)
  .map(obj => ({
    x: obj.x,
    y: obj.y,
    width: obj.width ?? 0,
    height: obj.height ?? 0,
  }));
  return collisionRects
}

export async function triggerObjs(mapObjects : MapObject[]) : Promise<{x : number , y: number , width : number , height : number}[]>{

  const triggerObjs = mapObjects
  .filter(obj => obj.type = "trigger")
  .map(obj => ({
    x: obj.x,
    y: obj.y,
    width: obj.width ?? 0,
    height: obj.height ?? 0,
  }));
  return triggerObjs
}

// const playerHitboxDebug = new Graphic();
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

export function getPlaceObjs(mapObjects : MapObject[]){
  return mapObjects.filter(obj => obj.type === "interactive")
}

export function getTriggerObjs(mapObjects : MapObject[]){
  return mapObjects.filter(obj => obj.type === "trigger")
}

export function getOnTrigger(x: number, y: number , triggerObjs : MapObject[]) : MapObject | null{

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

  // const for(obj : triggerObjs)
  for(const obj of triggerObjs){
    const ontrigger = hitbox.x < obj.x + obj.width &&
      hitbox.x + obj.width > obj.x &&
      hitbox.y < obj.y + obj.height &&
      hitbox.y + obj.height > obj.y;

      if(ontrigger){
        return obj
      }
  }
  return null
}
