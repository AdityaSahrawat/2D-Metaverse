export type Direction = "up" | "down" | "left" | "right";

export type Char = "bob" | "adam" | "alex" | "amelia"

// A player in the world
export interface Player {
  id: string;       // userId from JWT
  x: number;        // tile X
  y: number;        // tile Y
  spaceId: string;  // which space they’re in
  chat : Char
}


export interface JoinMessage {
  type: "join";
  payload: {
    spaceId: string;
  };
}

// Client requests to move
export interface MoveMessage {
  type: "move";
  payload: {
    direction: Direction;
  };
}

// Optional: chat
export interface ChatMessage {
  type: "chat";
  payload: {
    message: string;
  };
}

export type ClientMessage =
  | JoinMessage
  | MoveMessage
  | ChatMessage;


// --- Server → Client messages ---

// Confirmation of join
export interface JoinedMessage {
  type: "joined";
  payload: {
    player: Player;   // the joined player
    players: Player[]; // all other players in same space
  };
}

// Broadcast: player moved
export interface MovedMessage {
  type: "moved";
  payload: {
    playerId: string;
    x: number;
    y: number;
  };
}

// Broadcast: new player joined
export interface PlayerJoinedMessage {
  type: "playerJoined";
  payload: Player;
}

// Broadcast: player left
export interface PlayerLeftMessage {
  type: "playerLeft";
  payload: { playerId: string };
}

// Chat message
export interface ChatBroadcastMessage {
  type: "chat";
  payload: {
    playerId: string;
    message: string;
  };
}

// Error
export interface ErrorMessage {
  type: "error";
  payload: {
    message: string;
  };
}

export type ServerMessage =
  | JoinedMessage
  | MovedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | ChatBroadcastMessage
  | ErrorMessage;