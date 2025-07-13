'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { initGameScene } from './gameScene';

export default function GameRoomPage() {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const { id } = useParams(); // get /game/:id

  useEffect(() => {
    if (!id || !pixiContainerRef.current) return;

    // Init Pixi + scene  
    initGameScene(pixiContainerRef.current , id as string);

    // Cleanup on unmount
    return () => {
      // destroyGameScene(); // Optional: cleanup logic
    };
  }, [id]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <div ref={pixiContainerRef} className="w-full h-full" />
    </div>
  );
}