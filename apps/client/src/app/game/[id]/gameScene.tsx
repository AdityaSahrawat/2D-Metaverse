"use client"
import { Application, Assets, Texture, Rectangle, AnimatedSprite, Container, Text, TextStyle, Graphics } from "pixi.js";
import { Space, TiledMap } from "@repo/valid";
import axios from "axios";
import { loadMap } from "./logic";
import { connectWS, sendMove, disconnectWS } from "./wslogic";

export const initGameScene = async (container: HTMLDivElement,space: Space,role: "admin" | "member") => {
  console.log("role:", role);
  const otherPlayers: Record<string, AnimatedSprite> = {};

  // Camera system variables
  let ZOOM_LEVEL = 2.5; // Zoom factor to make player appear larger
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.25;

  const app = new Application();
  await app.init({ width: 1024, height: 768, backgroundColor: 0x2c2c2c });

  container.innerHTML = "";
  container.appendChild(app.canvas);

  // Create world container for camera system
  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Create UI container for fixed UI elements (not affected by camera)
  const uiContainer = new Container();
  app.stage.addChild(uiContainer);

  // Create trigger UI text - positioned relative to player (thought bubble style)
  const triggerBackground = new Graphics()
    .roundRect(-50, -15, 100, 30, 10)
    .fill(0x000000)
    .stroke({ width: 2, color: 0xFFFFFF });
  triggerBackground.alpha = 0.8;
  triggerBackground.visible = false;

  const triggerText = new Text({
    text: "Press E to open/close",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0xFFFFFF,
      align: "center"
    })
  });
  triggerText.anchor.set(0.5);
  triggerText.visible = false;
  
  // Create a container for the trigger bubble
  const triggerBubble = new Container();
  triggerBubble.addChild(triggerBackground);
  triggerBubble.addChild(triggerText);
  triggerBubble.visible = false;
  // Note: Position will be updated relative to player in updateTriggerPosition function
  worldContainer.addChild(triggerBubble); // Add to world container so it moves with camera

  // Create zoom indicator
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

  // Create controls hint
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

  return {
    run: {
      left: makeFrames(0),
      back: makeFrames(6),
      right: makeFrames(12),
      front: makeFrames(18),
    },
    idle: {
      // just pick the first frame of each direction
      left: [makeFrames(0)[0]!],
      back: [makeFrames(6)[0]!],
      right: [makeFrames(12)[0]!],
      front: [makeFrames(18)[0]!],
    },
  };
  }

  const animations = await showCharAnimation("bob")

  // Create animated sprite with idle front animation
  const playerSprite = new AnimatedSprite(animations.idle.front);
  playerSprite.animationSpeed = 0.2; // Faster animation speed
  playerSprite.loop = true; // Ensure animations loop
  playerSprite.play();

  let currentDirection = "front";

  // Tile constants
  const TILE_SIZE = 16;
  const MAP_WIDTH = map.width * map.tilewidth;
  const MAP_HEIGHT = map.height * map.tileheight;

  let isSpawned = false;

  
  const keysPressed = new Set<string>();
  
  // Movement timing
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
    
    const maxX = 0;
    const minX = app.screen.width - scaledMapWidth;
    const maxY = 0;
    const minY = app.screen.height - scaledMapHeight;
    
    let finalX = targetX;
    let finalY = targetY;
    
    // Only apply boundaries if scaled map is larger than screen
    if (scaledMapWidth > app.screen.width) {
      finalX = Math.max(minX, Math.min(maxX, targetX));
    } else {
      finalX = (app.screen.width - scaledMapWidth) / 2;
    }
    
    if (scaledMapHeight > app.screen.height) {
      finalY = Math.max(minY, Math.min(maxY, targetY));
    } else {
      finalY = (app.screen.height - scaledMapHeight) / 2;
    }
    
    // Smooth camera movement with proper interpolation
    const lerpFactor = 0.15; // Slightly faster for more responsive feel
    worldContainer.x += (finalX - worldContainer.x) * lerpFactor;
    worldContainer.y += (finalY - worldContainer.y) * lerpFactor;
  };

  const updateTriggerPosition = () => {
    if (!isSpawned || !triggerBubble.visible) return;
    
    // Position trigger bubble above player (like a thought bubble)
    triggerBubble.x = playerSprite.x + playerSprite.width / 2;
    triggerBubble.y = playerSprite.y - 30; // 30 pixels above player
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
          console.log(`🏃 Changing direction from ${currentDirection} to ${newDirection}`);
          currentDirection = newDirection;
          playerSprite.textures = animations.run[currentDirection as keyof typeof animations.run];
          playerSprite.play();
          console.log(`🎬 Playing run animation for ${currentDirection}`);
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
    if (!isSpawned) return; // 🚫 block until server spawn
    
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e", "+", "=", "-"].includes(key)) {
      e.preventDefault();
    }

    // Handle zoom controls
    if (key === "+" || key === "=") {
      ZOOM_LEVEL = Math.min(MAX_ZOOM, ZOOM_LEVEL + ZOOM_STEP);
      console.log(`🔍 Zoom in: ${ZOOM_LEVEL}x`);
      zoomIndicator.text = `Zoom: ${ZOOM_LEVEL.toFixed(1)}x`;
      // Zoom change should be immediate, not smooth
    } else if (key === "-") {
      ZOOM_LEVEL = Math.max(MIN_ZOOM, ZOOM_LEVEL - ZOOM_STEP);
      console.log(`🔍 Zoom out: ${ZOOM_LEVEL}x`);
      zoomIndicator.text = `Zoom: ${ZOOM_LEVEL.toFixed(1)}x`;
      // Zoom change should be immediate, not smooth
    }

    // Handle 'E' key for interaction
    if (key === "e" && triggerBubble.visible) {
      console.log("🔗 Player pressed E to interact");
      // Add your interaction logic here
      // You can emit a WebSocket message or handle the interaction locally
    }

    // Add key to pressed set (for continuous movement)
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      keysPressed.add(key);
      console.log(`🎹 Key pressed: ${key}, Keys active:`, Array.from(keysPressed));
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    
    // Remove key from pressed set
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      keysPressed.delete(key);
      
      // If no movement keys are pressed, return to idle animation
      const movementKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
      const stillMoving = movementKeys.some(k => keysPressed.has(k));
      
      if (!stillMoving && isSpawned) {
        // Set to idle animation based on current direction
        console.log(`😴 Returning to idle animation for ${currentDirection}`);
        playerSprite.textures = animations.idle[currentDirection as keyof typeof animations.idle];
        playerSprite.play();
      }
    }
  });

  connectWS("ws://localhost:3006", { spaceId: space.id }, (msg) => {
    console.log("message of type:", msg.type);
    switch (msg.type) {
      case "space-joined": {
        console.log("✅ joined space", msg.payload);
        console.log(
          "📍 Spawn coordinates from server:",
          msg.payload.self.tileX,
          msg.payload.self.tileY
        );

        // Remove if already exists (rejoin scenario)
        if (worldContainer.children.includes(playerSprite)) {
          worldContainer.removeChild(playerSprite);
        }

        // Set to spawn
        playerSprite.x = msg.payload.self.tileX;
        playerSprite.y = msg.payload.self.tileY;
        worldContainer.addChild(playerSprite);

        // Mark ready
        isSpawned = true;
        
        console.log(`📷 Map size: ${MAP_WIDTH}x${MAP_HEIGHT}, Screen size: ${app.screen.width}x${app.screen.height}`);
        console.log(`🔍 Zoom level: ${ZOOM_LEVEL}x, Scaled map: ${MAP_WIDTH * ZOOM_LEVEL}x${MAP_HEIGHT * ZOOM_LEVEL}`);
        console.log(`🎮 Player spawned at: (${playerSprite.x}, ${playerSprite.y})`);
        
        // Camera will start updating automatically via game loop

        // Load correct character animations
        showCharAnimation(msg.payload.self.char).then((playerAnimations) => {
          // Update the global animations variable for this character
          Object.assign(animations, playerAnimations);
          
          // Update the sprite with the new character's animations
          playerSprite.textures = playerAnimations.idle.front;
          playerSprite.play();
          playerSprite.x = msg.payload.self.tileX;
          playerSprite.y = msg.payload.self.tileY;
          
          console.log(
            `🎨 Character loaded at (${playerSprite.x}, ${playerSprite.y})`,
            `Animations loaded:`, Object.keys(playerAnimations)
          );
        });

        // Add existing players
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
        console.log("❌ user left", msg.payload.userId);
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
        // Camera updates automatically via game loop for smooth movement
        updateTriggerPosition(); // Update trigger position after player moves
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
        triggerBubble.visible = true;
        updateTriggerPosition(); 
        break;
      }

      case "no-trigger": {
        console.log("No trigger, hiding interaction text");
        triggerBubble.visible = false;
        break;
      }
    }
  });

  return () => {
    console.log("Cleaning up WebSocket connection");
    disconnectWS();
  };
};
