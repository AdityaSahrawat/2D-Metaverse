
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
  width: number;
  height: number;
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

export type MapObjectType = 'wall' | 'floor' | 'furniture' | 'decoration' | 'interactive' | 'trigger' | 'spawn';

export type ObjectVariant =
  | 'chair'
  | 'door'
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
  | string;

export interface MapObject {
  id: string;
  type: MapObjectType;
  variant?: ObjectVariant;

  x: number;
  y: number;

  // Optional metadata
  width: number;
  height: number;
  zIndex?: number;
  rotation?: number;
  texture?: string;

  // Tiled-defined properties
  properties?: {
    walkable?: boolean;
    obstructsMovement?: boolean;
    interactable?: boolean;
    interactionType?: string;
    obj_id : string
    [key: string]: any;
  };
}

export interface placeObj {
  obj_id : string
  x: number;
  y: number;

  width: number;
  height: number;

  direction : "front" | "back" | "left" | "right"
  state : "close" | "open"
  type : "interactive"
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


export interface User {
  id: string;
  email: string;
  username: string;
  provider: string;
  password?: string;
  avatar: string;
  Space: Space[];          // Created spaces
  joinedSpaces: Space[];   // Spaces user has joined
}

export interface Maps {
  id: string;
  mapid : string
  name: string;
  createdAt: string; // ISO string; if using Date objects, use Date
  mapPath: string;
  imagePath: string;
  width: number;
  height: number;
  Space?: Space; // Optional, one-to-one or one-to-many depending on actual use
}

export type Spacetype = "private" | "public" | "invite_only";

export interface Space {
  id: string;
  name: string;
  createAt: string; // ISO string
  maxParticipants?: number;
  type: Spacetype;

  adminId: string;
  admin: User;

  mapId: string;
  map: Maps;

  participants: User[];
}
