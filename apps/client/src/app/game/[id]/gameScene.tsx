"use client"
import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js';
import {TiledMap} from "@repo/valid"
import axios from 'axios';
import { collisionRects, loadMap , extractMapObjects, isColliding } from './logic';

export const initGameScene = async(container: HTMLDivElement , id : String)=>{
  const app = new Application();
  await app.init({ width: 1024, height: 768, backgroundColor: 0x2c2c2c });

  container.innerHTML = '';
  container.appendChild(app.canvas);

  // Load TMJ map file using axios
  const { data: map }: { data: TiledMap } = await axios.get(`/maps/map_${id}.tmj`);

  // Load tileset images
  await loadMap(map , app);

  const playerTexture = await Assets.load('/assets/char/bob/Bob_idle_16x16.png');
  const frame_Width = 16;
  const frame_Height = 32;
  const directions = {
    front : new Texture({source: playerTexture, frame: new Rectangle(48, 0, frame_Width, frame_Height)}),
    right : new Texture({source: playerTexture, frame: new Rectangle(32, 0, frame_Width, frame_Height)}),
    back : new Texture({source: playerTexture, frame: new Rectangle(16, 0, frame_Width, frame_Height)}),
    left : new Texture({source: playerTexture, frame: new Rectangle(0, 0, frame_Width, frame_Height)})
  }

  const playerSprite = new Sprite({texture : directions.front})

  playerSprite.x = 130;
  playerSprite.y = 210;
  // playerSprite.scale.set(2);
  let currentDirection = 'front';


  const playerContainer = new Container();
  playerContainer.sortableChildren = true;
  playerContainer.addChild(playerSprite);
  app.stage.addChild(playerContainer);

  // Keeps track of currently-pressed keys
  const keysDown = new Set<string>();

  window.addEventListener('keydown', (e) => {
    keysDown.add(e.key);
    // prevent arrow-key scrolling
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysDown.delete(e.key);
  });

  const mapObjects = extractMapObjects(map)
  const collisionRectangles = await collisionRects(mapObjects)

  const SPEED = 2;        // pixels per frame at 60 FPS ≈ 120 px/s
  const MAP_WIDTH  = map.width  * map.tilewidth;   // from TMJ
  const MAP_HEIGHT = map.height * map.tileheight;


  app.ticker.add(() => {
    const delta = app.ticker.deltaTime
    let dx = 0, dy = 0;

    if (keysDown.has('ArrowUp')    || keysDown.has('w')){
      dy -= 1;
      if(currentDirection != 'back'){
        playerSprite.texture = directions.back;
        currentDirection = 'back'
      }
    } 
    if (keysDown.has('ArrowDown')  || keysDown.has('s')){
      dy += 1;
      if(currentDirection != 'front'){
        playerSprite.texture = directions.front;
        currentDirection = 'front'
      }
    } 
    if (keysDown.has('ArrowLeft')  || keysDown.has('a')){
      dx -= 1;
      if(currentDirection != 'left'){
        playerSprite.texture = directions.right;
        currentDirection = 'left'
      }
    }     
    if (keysDown.has('ArrowRight') || keysDown.has('d')){
      dx += 1;
      if(currentDirection != 'right'){
        playerSprite.texture = directions.left;
        currentDirection = 'right'
      }
    } 

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    const newX = playerSprite.x + dx * SPEED * delta;
    const newY = playerSprite.y + dy * SPEED * delta;

    if (!isColliding(app , newX, newY, playerSprite.width, playerSprite.height , collisionRectangles)) {
      playerSprite.x = newX;
      playerSprite.y = newY;
    }

    const w = playerSprite.width;
    const h = playerSprite.height;
    playerSprite.x = Math.max(0, Math.min(MAP_WIDTH  - w, playerSprite.x));
    playerSprite.y = Math.max(0, Math.min(MAP_HEIGHT - h, playerSprite.y));
  });
};

  