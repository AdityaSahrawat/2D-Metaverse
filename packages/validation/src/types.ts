
export interface TiledProperty {
  name: string;
  type: string;
  value: any;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  visible: boolean;
  properties?: TiledProperty[];
}

export interface ObjectLayer {
  name: string;
  type: "objectgroup";
  visible: boolean;
  objects: TiledObject[];
}

export interface TileLayer {
  name: string;
  type: "tilelayer";
  data: number[];
  width: number;
  height: number;
  visible: boolean;
}

export type TiledLayer = TileLayer | ObjectLayer;

export interface Tileset {
  firstgid: number;
  columns: number;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  spacing: number;
  margin: number;
  tilecount: number;
  name: string;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: Tileset[];
}

export type MapObjectType = 'wall' | 'floor' | 'furniture' | 'decoration' | 'interactive';

export type ObjectVariant =
  | 'chair'
  | 'table'
  | 'sofa'
  | 'bookshelf'
  | 'brick'
  | 'wooden'
  | 'glass'
  | 'concrete'
  | 'tree'
  | 'plant'
  | 'painting'
  | 'lamp'
  | 'carpet'
  | string; // Allow fallback to custom variants

export interface MapObject {
  id: string;
  type: MapObjectType;
  variant: ObjectVariant;

  x: number;
  y: number;

  // Optional metadata
  width?: number;
  height?: number;
  zIndex?: number;
  rotation?: number;
  texture?: string;

  // Tiled-defined properties
  properties?: {
    walkable?: boolean;
    obstructsMovement?: boolean;
    interactable?: boolean;
    interactionType?: string;
    [key: string]: any;
  };
}

export interface player{
  id : string
  spriteName : 'bob' | 'adam' | 'alex' | 'amelia'
  x : number
  y : number
  width : number
  height : number
  speed: number;
  direction: 'front' | 'back' | 'left' | 'right';
}