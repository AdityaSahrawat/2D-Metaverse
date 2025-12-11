// wslogic.ts

interface PlaceObj {
  obj_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "front" | "back" | "left" | "right";
  state: "close" | "open";
  type: "interactive";
}

export type ServerMsg =
  | { type: "space-joined"; payload: { self: { id: string; tileX: number; tileY: number; char: string }; players: { id: string; tileX: number; tileY: number; char: string }[] } }
  | { type: "user-joined"; payload: { id: string; tileX: number; tileY: number; char: string } }
  | { type: "user-left"; payload: { userId: string } }
  | { type: "movement approved"; payload: { x: number; y: number } }
  | { type: "player moved"; payload: { userId: string; x: number; y: number } }
  | { type: "movement restricted"; payload: { x: number; y: number; message?: string } }
  | { type: "show-trigger"; payload: { obj_id: string } }
  | { type: "no-trigger" }
  | { type: "obj-state-changed"; payload: { obj_id: string; state: string; placeObj: PlaceObj } }
  | { type: "trigger-pressed-res"; payload: { obj_id: string; state: string; placeObj: PlaceObj } }
  | { type: "chair-action"; payload: { action: "sit" | "stand"; obj_id: string; userId: string; x?: number; y?: number } }
  | { type: "player-sat-down"; payload: { userId: string; obj_id: string; char?: string; x: number; y: number } }
  | { type: "player-stood-up"; payload: { userId: string; obj_id: string; char?: string; x: number; y: number } }
  | { type: "error"; payload: { message: string } }

let ws: WebSocket | null = null;

export const connectWS = (url: string,payload: { spaceId: string},onMessage: (msg: ServerMsg) => void) => {
  console.log("Attempting to connect to WebSocket:", url);
  console.log("Join payload:", payload);
  
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("✅ [WS] connected successfully");
    const message = JSON.stringify({ type: "join", payload });

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(message);
      console.log("[WS] sent join request:", payload)
    } else {
      ws?.addEventListener("open", () => ws?.send(message), { once: true });
    }
  };

  ws.onmessage = (ev) => {
    console.log("[WS] Raw message received:", ev.data);
    try {
      const data = JSON.parse(ev.data);
      console.log("[WS] Parsed message:", data);
      onMessage(data);
    } catch (err) {
      console.error("[WS] parse error:", err);
      console.error("[WS] Raw data that failed to parse:", ev.data);
    }
  };

  ws.onclose = (event) => {
    console.log("[WS] disconnected - Code:", event.code, "Reason:", event.reason);
  };

  ws.onerror = (err) => {
    console.error("[WS] connection error:", err);
    console.error("Make sure the WS server is running on ws://localhost:8081");
  };
};

export const sendMove = (payload: { spaceId: string; newX: number; newY: number }) => {
  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type: "move", payload }));
      console.log("[WS] move message sent");
    } catch (error) {
      console.error("[WS] Error sending move message:", error);
    }
  } else {
    console.warn("[WS] WebSocket not ready for sending move message, state:", ws?.readyState);
  }
};

export const disconnectWS = () => {
  ws?.close();
  ws = null;
};

export const sendWS = (message: { type: string; payload: unknown }) => {
  if (ws?.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: message.type,
        payload: message.payload
      }))
      console.log("[WS] message sent:", message.type);
    } catch (e) {
      console.error("[WS] Error in send message to ws server", e)
    }
  } else {
    console.warn("[WS] webSocket is not ready for send to ws server")
  }
}