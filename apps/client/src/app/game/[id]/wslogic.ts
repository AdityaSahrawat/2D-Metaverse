// wslogic.ts
export type ServerMsg =
  | { type: "space-joined"; payload: { self: { id: string; tileX: number; tileY: number; char: string }; players: { id: string; tileX: number; tileY: number; char: string }[] } }
  | { type: "user-joined"; payload: { id: string; tileX: number; tileY: number; char: string } }
  | { type: "user-left"; payload: { userId: string } }
  | { type: "movement approved"; payload: { x: number; y: number } }
  | { type: "player moved"; payload: { userId: string; x: number; y: number } }
  | { type: "movement restricted"; payload: { x: number; y: number } }
  | {type : "show-trigger" ; payload : {obj_id : string}}
  | {type : "no-trigger" }

let ws: WebSocket | null = null;

export const connectWS = (url: string,payload: { spaceId: string},onMessage: (msg: ServerMsg) => void) => {
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[WS] connected");
    // Double check the ready state before sending
    const message = JSON.stringify({ type: "join", payload });

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(message);
      console.log("sent req to join" , payload)
    } else {
      ws?.addEventListener("open", () => ws?.send(message), { once: true });
    }
  };

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (err) {
      console.error("[WS] parse error:", err);
      console.error("[WS] Raw data that failed to parse:", ev.data);
      // Continue without crashing - ignore invalid messages
    }
  };

  ws.onclose = () => {
    console.log("[WS] disconnected");
  };

  ws.onerror = (err) => {
    console.error("[WS] error", err);
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
