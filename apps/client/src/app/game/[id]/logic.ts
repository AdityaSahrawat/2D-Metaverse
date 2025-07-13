import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { MapObject, TiledMap ,  } from "@repo/valid"


export async function loadMap(map : TiledMap , app:Application){
    const tilesetsWithTextures = await Promise.all(
      map.tilesets.map(async (set) => {
        const imagePath = `/assets/tilesets/${set.image.split('/').pop()}`;
        const texture = await Assets.load<Texture>(imagePath);
        return { ...set, texture };
      })
    );

    const mapContainer = new Container();

    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer' || !layer.visible) continue;

      const { data, width, height } = layer;
      const layerContainer = new Container();

      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const index = row * width + col;
          const gid = data[index];
          if (gid === 0) continue;

          // Find the tileset this tile belongs to
          const tileset = tilesetsWithTextures
            .slice()
            .reverse()
            .find((ts) => gid! >= ts.firstgid);

          if (!tileset) continue;

          const localId = gid! - tileset.firstgid;
          const cols = tileset.columns;
          const spacing = tileset.spacing || 0;
          const margin = tileset.margin || 0;

          const tileX = (localId % cols) * (tileset.tilewidth + spacing) + margin;
          const tileY = Math.floor(localId / cols) * (tileset.tileheight + spacing) + margin;

          const tileTexture = new Texture({
            source: tileset.texture.source,
            frame: new Rectangle(tileX, tileY, tileset.tilewidth, tileset.tileheight),
          });

          const sprite = new Sprite({ texture: tileTexture });
          sprite.x = col * map.tilewidth;
          sprite.y = row * map.tileheight - (tileset.tileheight - map.tileheight);

          // no scaling at all
          sprite.zIndex = row; // to help with draw order

          layerContainer.addChild(sprite);
          layerContainer.sortableChildren = true;

          layerContainer.addChild(sprite);
        }
      }


      mapContainer.addChild(layerContainer);
    }
    app.stage.addChild(mapContainer);


      const borders = new Container();

  for (const layer of map.layers) {
    if (layer.type !== "objectgroup" || !layer.visible) continue;

    for (const obj of layer.objects) {
      const { x = 0, y = 0, width = 0, height = 0 } = obj;
      if (obj.width === 0 || obj.height === 0) continue;

      const g = new Graphics();
      g.rect(x , y , width , height).stroke({                                // <-- v8 stroke options
         width: 2,
         color: 0xff0000,
         alpha: 1,
         alignment: 0,                          // center the 2‑px outline
       });
                             // optional: keep on top
        borders.addChild(g);
    }
  }
   borders.sortableChildren = true;

  app.stage.addChild(borders);
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

export async function collisionRects(mapObjects : MapObject[]){

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
const playerHitboxDebug = new Graphics();
export function isColliding(app : Application , x: number, y: number, width: number, height: number , collisionRectangles : {x : number , y : number , width : number , height : number}[]): boolean {  
  const hitbox = {
    x,
    y : y + 16,
    width,
    height : height-16,
  };
  // 16 because height is 32px

  if (!app.stage.children.includes(playerHitboxDebug)) {
    app.stage.addChild(playerHitboxDebug);
  }

  // Draw red outline for player hitbox
  playerHitboxDebug.clear();
  playerHitboxDebug.rect(hitbox.x, hitbox.y, hitbox.width, hitbox.height).stroke({
    width: 2,
    color: 0xff0000,
    alpha: 1,
    alignment: 0,
  });

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