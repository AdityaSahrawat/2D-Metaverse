"use client"
import { Application, Assets, Texture, Rectangle, AnimatedSprite, Container, Text, TextStyle, Graphics } from "pixi.js";
import { Space, TiledMap } from "@repo/valid";
import axios from "axios";
import { extractMapObjects, loadMap, loadPlaceObjects } from "./logic";
import { connectWS, sendMove, disconnectWS, sendWS } from "./wslogic";

export const initGameScene = async (container: HTMLDivElement,space: Space,role: "admin" | "member") => {
  console.log("role:", role);
  const otherPlayers: Record<string, AnimatedSprite> = {};

  let ZOOM_LEVEL = 2.5; 
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.25;

  const app = new Application();
  await app.init({ 
    width: window.innerWidth, 
    height: window.innerHeight, 
    backgroundColor: 0x2c2c2c,
    resizeTo: window
  });

  container.innerHTML = "";
  container.appendChild(app.canvas);

  const worldContainer = new Container();
  worldContainer.sortableChildren = true;
  app.stage.addChild(worldContainer);

  const uiContainer = new Container();
  app.stage.addChild(uiContainer);

  const triggerBackground = new Graphics()
    .roundRect(-80, -20, 160, 40, 10)
    .fill(0x000000)
    .stroke({ width: 2, color: 0xFFFFFF });
  triggerBackground.alpha = 0.8;
  triggerBackground.visible = false

  const triggerText = new Text({
    text: "Press E to interact",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0xFFFFFF,
      align: "center",
      fontWeight: "bold"
    })
  });
  triggerText.anchor.set(0.5);
  triggerText.visible = false;
  
  const triggerBubble = new Container();
  triggerBubble.addChild(triggerBackground);
  triggerBubble.addChild(triggerText);
  triggerBubble.visible = false;
  triggerBubble.zIndex = 10000
  worldContainer.addChild(triggerBubble); 

  const zoomIndicator = new Text({
    text: `Zoom: ${ZOOM_LEVEL.toFixed(1)}x`,
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xFFFFFF,
      stroke: { color: 0x000000, width: 1 },
      align: "left"
    })
  });
  zoomIndicator.x = 10;
  zoomIndicator.y = 10;
  uiContainer.addChild(zoomIndicator);

  const controlsHint = new Text({
    text: "Controls: WASD/Arrow Keys to move, +/- to zoom, E to interact",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0xCCCCCC,
      stroke: { color: 0x000000, width: 1 },
      align: "center"
    })
  });
  controlsHint.anchor.set(0.5, 0);
  controlsHint.x = app.screen.width / 2;
  controlsHint.y = 10;
  uiContainer.addChild(controlsHint);

  console.log("before get map");
  const { data: map } = await axios.get<TiledMap>(
    `/assets/maps/map_${space.map.mapid}.tmj`
  );

  await loadMap(map, app, worldContainer);

  const mapObjects = extractMapObjects(map)

  const objectSprites = await loadPlaceObjects(mapObjects , app , worldContainer)


  const showCharAnimation = async(charName : string)=>{
    const charNameCapitalized = charName.charAt(0).toUpperCase() + charName.slice(1);
    const runTexture = await Assets.load(`/assets/char/${charName}/${charNameCapitalized}_run_16x16.png`)

    const frameWidth  = 16;
    const frameHeight  = 32;
    const framesPerDirection = 6;

    const makeFrames = (startIndex: number) => {
    return Array.from({ length: framesPerDirection }, (_, i) => {
      return new Texture({
        source: runTexture,
        frame: new Rectangle(
          (startIndex + i) * frameWidth,
          0,
          frameWidth,
          frameHeight
        ),
      });
    });
  };

  // Load sit animation if available
  let sitFrames = null;
  try {
    const sitTexture = await Assets.load(`/assets/char/${charName}/${charNameCapitalized}_sit3_16x16.png`);
    sitFrames = Array.from({ length: 4 }, (_, i) => {
      return new Texture({
        source: sitTexture,
        frame: new Rectangle(
          i * frameWidth,
          0,
          frameWidth,
          frameHeight
        ),
      });
    });
  } catch (e) {
    console.log(`No sitting animation for ${charName}, will use idle instead`);
  }

  return {
    run: {
      right: makeFrames(0),
      back: makeFrames(6),
      left: makeFrames(12),
      front: makeFrames(18),
    },
    idle: {
      // just pick the first frame of each direction
      right: [makeFrames(0)[0]!],
      back: [makeFrames(6)[0]!],
      left: [makeFrames(12)[0]!],
      front: [makeFrames(18)[0]!],
    },
    sit: sitFrames || [makeFrames(18)[0]!], // Use front idle if no sit animation
  };
  }

  const animations = await showCharAnimation("bob")

  const playerSprite = new AnimatedSprite(animations.idle.front);
  playerSprite.animationSpeed = 0.2;
  playerSprite.loop = true; 
  playerSprite.play();
  playerSprite.zIndex = 100;
  
  console.log("Player sprite created, waiting for space-joined message...");

  let currentDirection = "front";

  const TILE_SIZE = 16;
  const MAP_WIDTH = map.width * map.tilewidth;
  const MAP_HEIGHT = map.height * map.tileheight;

  let isSpawned = false;

  
  const keysPressed = new Set<string>();
  
  let lastMoveTime = 0;
  const MOVE_DELAY = 150; 

  const updateCamera = () => {
    if (!isSpawned) return;
    
    worldContainer.scale.set(ZOOM_LEVEL);
    
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    
    const targetX = centerX - (playerSprite.x + playerSprite.width / 2) * ZOOM_LEVEL;
    const targetY = centerY - (playerSprite.y + playerSprite.height / 2) * ZOOM_LEVEL;
    
    const scaledMapWidth = MAP_WIDTH * ZOOM_LEVEL;
    const scaledMapHeight = MAP_HEIGHT * ZOOM_LEVEL;
    
    // Calculate camera bounds to prevent showing blank space
    const maxX = 0; // Right edge of map at left of screen
    const minX = app.screen.width - scaledMapWidth; // Left edge of map at right of screen
    const maxY = 0; // Bottom edge of map at top of screen
    const minY = app.screen.height - scaledMapHeight; // Top edge of map at bottom of screen
    
    let finalX = targetX;
    let finalY = targetY;
    
    // Always clamp to prevent black space
    if (scaledMapWidth > app.screen.width) {
      // Map is wider than screen - clamp to prevent blank space on sides
      finalX = Math.max(minX, Math.min(maxX, targetX));
    } else {
      // Map is narrower than screen - center it
      finalX = (app.screen.width - scaledMapWidth) / 2;
    }
    
    if (scaledMapHeight > app.screen.height) {
      // Map is taller than screen - clamp to prevent blank space on top/bottom
      finalY = Math.max(minY, Math.min(maxY, targetY));
    } else {
      // Map is shorter than screen - center it
      finalY = (app.screen.height - scaledMapHeight) / 2;
    }
    
    // Smooth camera movement with proper interpolation
    const lerpFactor = 0.15;
    worldContainer.x += (finalX - worldContainer.x) * lerpFactor;
    worldContainer.y += (finalY - worldContainer.y) * lerpFactor;
    
    // Hard clamp to ensure we never exceed bounds (failsafe)
    if (scaledMapWidth > app.screen.width) {
      worldContainer.x = Math.max(minX, Math.min(maxX, worldContainer.x));
    }
    if (scaledMapHeight > app.screen.height) {
      worldContainer.y = Math.max(minY, Math.min(maxY, worldContainer.y));
    }
  };

  const updateTriggerPosition = () => {
    if (!isSpawned || !triggerBubble.visible) return;
    
    
    triggerBubble.x = playerSprite.x + playerSprite.width / 2;
    triggerBubble.y = playerSprite.y - 30; 
  };

  const gameLoop = () => {
    const currentTime = Date.now();
    
    if (isSpawned && keysPressed.size > 0 && currentTime - lastMoveTime > MOVE_DELAY) {
      let newX = playerSprite.x;
      let newY = playerSprite.y;
      let moved = false;
      let newDirection = currentDirection;

      if (keysPressed.has("arrowup") || keysPressed.has("w")) {
        newY -= TILE_SIZE;
        newDirection = "back";
        moved = true;
      } else if (keysPressed.has("arrowdown") || keysPressed.has("s")) {
        newY += TILE_SIZE;
        newDirection = "front";
        moved = true;
      } else if (keysPressed.has("arrowleft") || keysPressed.has("a")) {
        newX -= TILE_SIZE;
        newDirection = "left";
        moved = true;
      } else if (keysPressed.has("arrowright") || keysPressed.has("d")) {
        newX += TILE_SIZE;
        newDirection = "right";
        moved = true;
      }

      if (moved) {
        if (currentDirection !== newDirection) {
          currentDirection = newDirection;
          playerSprite.textures = animations.run[currentDirection as keyof typeof animations.run];
          playerSprite.play();
        }

        // Clamp to map boundaries
        newX = Math.max(0, Math.min(MAP_WIDTH - playerSprite.width, newX));
        newY = Math.max(0, Math.min(MAP_HEIGHT - playerSprite.height, newY));
        
        console.log(
          `Client requesting move from (${playerSprite.x}, ${playerSprite.y}) to (${newX}, ${newY})`
        );
        
        sendMove({
          spaceId: space.id,
          newX,
          newY,
        });
        
        lastMoveTime = currentTime;
      }
    }
    
    updateCamera();
    
    updateTriggerPosition();
    
    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);

  window.addEventListener("keydown", (e) => {
    if (!isSpawned) return; 
    
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e", "+", "=", "-"].includes(key)) {
      e.preventDefault();
    }

    if (key === "+" || key === "=") {
      ZOOM_LEVEL = Math.min(MAX_ZOOM, ZOOM_LEVEL + ZOOM_STEP);
      zoomIndicator.text = `Zoom: ${ZOOM_LEVEL.toFixed(1)}x`;
    } else if (key === "-") {
      ZOOM_LEVEL = Math.max(MIN_ZOOM, ZOOM_LEVEL - ZOOM_STEP);
      zoomIndicator.text = `Zoom: ${ZOOM_LEVEL.toFixed(1)}x`;
    }

    if (key === "e" && triggerBubble.visible) {
      console.log("Player pressed E to interact");
      sendWS({
        type : "trigger-pressed" , 
        payload : {
          obj_id : currentTriggerObjId
        }
      })
    }

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      keysPressed.add(key);
      console.log(`Key pressed: ${key}, Keys active:`, Array.from(keysPressed));
    }
  });
  
  let currentTriggerObjId: string | null = null;
  let isSitting = false;

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      keysPressed.delete(key);
      
      const movementKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
      const stillMoving = movementKeys.some(k => keysPressed.has(k));
      
      if (!stillMoving && isSpawned) {
        playerSprite.textures = animations.idle[currentDirection as keyof typeof animations.idle];
        playerSprite.play();
      }
    }
  });

  connectWS("ws://localhost:8081", { spaceId: space.id }, (msg) => {
    console.log("WS message received - type:", msg.type);
    switch (msg.type) {
      case "space-joined": {
        console.log("1111111111111111111111")
        console.log("joined space", msg.payload);
        console.log(
          "📍 Spawn coordinates from server:",
          msg.payload.self.tileX,
          msg.payload.self.tileY
        );

        if (worldContainer.children.includes(playerSprite)) {
          worldContainer.removeChild(playerSprite);
        }

        playerSprite.x = msg.payload.self.tileX;
        playerSprite.y = msg.payload.self.tileY;
        playerSprite.visible = true; // Ensure visible
        playerSprite.alpha = 1.0; // Ensure fully opaque
        worldContainer.addChild(playerSprite);
        
        console.log("✅ Player sprite added to world at:", playerSprite.x, playerSprite.y);
        console.log("🔍 Player sprite properties:", {
          visible: playerSprite.visible,
          alpha: playerSprite.alpha,
          zIndex: playerSprite.zIndex,
          width: playerSprite.width,
          height: playerSprite.height,
          worldContainerChildren: worldContainer.children.length
        });

        isSpawned = true;
        
        // Force immediate camera update
        updateCamera();

        showCharAnimation(msg.payload.self.char).then((playerAnimations) => {
          Object.assign(animations, playerAnimations);
          
          playerSprite.textures = playerAnimations.idle.front;
          playerSprite.play();
          playerSprite.x = msg.payload.self.tileX;
          playerSprite.y = msg.payload.self.tileY;
          
        });

        msg.payload.players.forEach((p) => {
          showCharAnimation(p.char).then((playerAnimations) => {
            const s = new AnimatedSprite(playerAnimations.idle.front);
            s.animationSpeed = 0.2;
            s.loop = true;
            s.play();
            s.x = p.tileX;
            s.y = p.tileY;
            worldContainer.addChild(s);
            otherPlayers[p.id] = s;
          });
        });
        break;
      }

      case "user-joined": {
        console.log(
          "➕ user joined",
          msg.payload.id,
          "with character:",
          msg.payload.char
        );
        showCharAnimation(msg.payload.char).then((charAnimations) => {
          const newP = new AnimatedSprite(charAnimations.idle.front);
          newP.animationSpeed = 0.2;
          newP.loop = true;
          newP.play();
          newP.x = msg.payload.tileX;
          newP.y = msg.payload.tileY;
          worldContainer.addChild(newP);
          otherPlayers[msg.payload.id] = newP;
        });
        break;
      }

      case "user-left": {
        console.log("user left", msg.payload.userId);
        const leaving = otherPlayers[msg.payload.userId];
        if (leaving) {
          worldContainer.removeChild(leaving);
          delete otherPlayers[msg.payload.userId];
        }
        break;
      }

      case "movement approved": {
        console.log(
          `✅ Server approved movement to (${msg.payload.x}, ${msg.payload.y})`
        );
        playerSprite.x = msg.payload.x;
        playerSprite.y = msg.payload.y;
        updateTriggerPosition();
        break;
      }

      case "movement restricted": {
        console.log(
          `❌ Server restricted movement, staying at (${msg.payload.x}, ${msg.payload.y})`
        );
        playerSprite.x = msg.payload.x;
        playerSprite.y = msg.payload.y;
        break;
      }

      case "player moved": {
        const mover = otherPlayers[msg.payload.userId];
        if (mover) {
          mover.x = msg.payload.x;
          mover.y = msg.payload.y;
        }
        break;
      }

      case "show-trigger": {
        console.log("🎯 Trigger detected, showing interaction text" , "objId = " , msg.payload.obj_id);
        currentTriggerObjId = msg.payload.obj_id
        
        // Update trigger text based on object type
        if (msg.payload.obj_id.startsWith("chair-")) {
          triggerText.text = isSitting ? "Press E to stand up" : "Press E to sit";
        } else if (msg.payload.obj_id.startsWith("door-")) {
          triggerText.text = "Press E to open/close";
        } else {
          triggerText.text = "Press E to interact";
        }
        
        triggerBubble.visible = true;
        triggerBackground.visible = true;
        triggerText.visible = true;
        updateTriggerPosition(); 
        break;
      }

      case "no-trigger": {
        console.log("No trigger, hiding interaction text");
        currentTriggerObjId = null
        triggerBubble.visible = false;
        triggerBackground.visible = false;
        triggerText.visible = false;
        break;
      }

      case "trigger-pressed-res": {
        console.log("✅ Trigger interaction confirmed:", msg.payload.obj_id, "→", msg.payload.state);
        
        // Update door sprite texture
        const sprite = objectSprites[msg.payload.obj_id];
        if (sprite) {
          const newTexturePath = msg.payload.state === "open" 
            ? "/assets/objects/door_open.png" 
            : "/assets/objects/door_close.png";
          
          sprite.texture = Texture.from(newTexturePath);
          console.log("🚪 Updated door texture to:", newTexturePath);
        } else {
          console.warn("⚠️ Door sprite not found for obj_id:", msg.payload.obj_id);
        }
        break;
      }

      case "obj-state-changed": {
        console.log("🔄 Object state changed - obj_id:", msg.payload.obj_id, "state:", msg.payload.state);
        
        // Update door sprite texture for other players
        const sprite = objectSprites[msg.payload.obj_id];
        if (sprite) {
          const newTexturePath = msg.payload.state === "open" 
            ? "/assets/objects/door_open.png" 
            : "/assets/objects/door_close.png";
          
          sprite.texture = Texture.from(newTexturePath);
          console.log("🚪 Updated door texture to:", newTexturePath);
        }
        break;
      }

      case "chair-action": {
        console.log("🪑 Chair action:", msg.payload.action, "on", msg.payload.obj_id);
        
        if (msg.payload.action === "sit") {
          isSitting = true;
          
          // Move player to chair position
          if (msg.payload.x !== undefined && msg.payload.y !== undefined) {
            playerSprite.x = msg.payload.x;
            playerSprite.y = msg.payload.y;
          }
          
          console.log("💺 You are now sitting at (", playerSprite.x, ",", playerSprite.y, "). Movement disabled.");
          
          // Play sitting animation
          if (animations.sit) {
            playerSprite.textures = animations.sit;
            playerSprite.play();
          }
          
          // Update trigger text if still on trigger
          if (currentTriggerObjId === msg.payload.obj_id) {
            triggerText.text = "Press E to stand up";
          }
        } else if (msg.payload.action === "stand") {
          isSitting = false;
          
          // Move player to standing position
          if (msg.payload.x !== undefined && msg.payload.y !== undefined) {
            playerSprite.x = msg.payload.x;
            playerSprite.y = msg.payload.y;
          }
          
          console.log("🚶 You stood up at (", playerSprite.x, ",", playerSprite.y, "). Movement enabled.");
          
          // Return to idle animation
          playerSprite.textures = animations.idle[currentDirection as keyof typeof animations.idle];
          playerSprite.play();
          
          // Update trigger text if still on trigger
          if (currentTriggerObjId === msg.payload.obj_id) {
            triggerText.text = "Press E to sit";
          }
        }
        break;
      }

      case "player-sat-down": {
        console.log("🪑 Player", msg.payload.userId, "sat down on", msg.payload.obj_id);
        const sittingPlayer = otherPlayers[msg.payload.userId];
        if (sittingPlayer) {
          // Move player to chair position
          sittingPlayer.x = msg.payload.x;
          sittingPlayer.y = msg.payload.y;
          
          // Load and play sitting animation for other player
          showCharAnimation(msg.payload.char || "bob").then((playerAnimations) => {
            if (playerAnimations.sit) {
              sittingPlayer.textures = playerAnimations.sit;
              sittingPlayer.play();
            }
          });
        }
        break;
      }

      case "player-stood-up": {
        console.log("🚶 Player", msg.payload.userId, "stood up from", msg.payload.obj_id);
        const standingPlayer = otherPlayers[msg.payload.userId];
        if (standingPlayer) {
          // Move player to standing position
          standingPlayer.x = msg.payload.x;
          standingPlayer.y = msg.payload.y;
          
          // Return to idle animation
          showCharAnimation(msg.payload.char || "bob").then((playerAnimations) => {
            standingPlayer.textures = playerAnimations.idle.front;
            standingPlayer.play();
          });
        }
        break;
      }

      case "error": {
        console.error("❌ Server error:", msg.payload.message);
        break;
      }
    }
  });

  return () => {
    console.log("Cleaning up WebSocket connection");
    disconnectWS();
  };
};
