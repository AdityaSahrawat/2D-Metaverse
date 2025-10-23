import { Application, Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { MapObject, TiledMap ,  } from "@repo/valid"


export async function loadMap(map : TiledMap , app:Application, container?: Container){
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
    (container || app.stage).addChild(mapContainer);


      const borders = new Container();

  for (const layer of map.layers) {
    if (layer.type !== "objectgroup" || !layer.visible) continue;

    for (const obj of layer.objects) {
      if (obj.width === 0 || obj.height === 0) continue;

      // const g = new Graphics();
      // g.rect(x , y , width , height).stroke({                                // <-- v8 stroke options
      //    width: 2,
      //    color: 0xff0000,
      //    alpha: 1,
      //    alignment: 0,                          // center the 2‑px outline
      //  });
      //                        // optional: keep on top
      //   borders.addChild(g);
    }
  }
   borders.sortableChildren = true;

  (container || app.stage).addChild(borders);
}


export async function loadPlaceObjects(mapObjects: MapObject[], app: Application , container : Container) {
  const placeObjs = mapObjects.filter((obj) => obj.type === "interactive");

  // Preload required textures into Pixi Assets cache to avoid cache warnings
  const neededTexturePaths = new Set<string>();
  for (const obj of placeObjs) {
    const isOpen = obj.properties?.state === "open";
    neededTexturePaths.add(
      isOpen ? "/assets/objects/door_open.png" : "/assets/objects/door_close.png"
    );
  }

  if (neededTexturePaths.size > 0) {
    await Assets.load(Array.from(neededTexturePaths));
  }

  for (const obj of placeObjs) {
    const texturePath =
      obj.properties?.state === "open"
        ? "/assets/objects/door_open.png"
        : "/assets/objects/door_close.png";

    // Retrieve from cache; if missing for some reason, fall back to Texture.from
    let texture = Assets.get(texturePath) as Texture | undefined;
    if (!texture) {
      console.warn(
        `[loadPlaceObjects] Texture not found in Assets cache for ${texturePath}, falling back to Texture.from.`
      );
      texture = Texture.from(texturePath);
    }

    const sprite = new Sprite({ texture });

    console.log("obj shown :", texturePath);

    sprite.x = obj.x;
    sprite.y = obj.y;
    sprite.width = obj.width;
    sprite.height = obj.height;

    // app.stage.addChild(sprite);
    container.addChild(sprite)

    // doors[obj.properties.obj_id] = {
    //   sprite,
    //   state: obj.properties.state as "open" | "closed",
    // };
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
          obj_id : propMap.obj_id,
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
