'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { initGameScene } from './gameScene';
import axios from 'axios';
import { Space } from '@repo/valid';

export default function GameRoomPage() {
  const { id } = useParams();
  const [space, setSpace] = useState<Space>();
  const [role, setRole] = useState<"admin" | "member">();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;
  const router = useRouter();

  const checkUserAuth = async () => {
    try {
      const res = await axios.get(`${api}/v1/user/auth/status`, {
        withCredentials: true,
      });
      if (!res.data.isAuth) {
        router.push('/rooms');
        return false;
      }
      return true;
    } catch (err) {
      console.error(err);
      setError("Error checking authentication");
      return false;
    }
  };
  const fetchSpaceData = async () => {
    try {
      const res = await axios.get(`${api}/v1/web/space/${id}/access`, {
        withCredentials: true,
      });
      setSpace(res.data.space);
      setRole(res.data.role);
      return true;
    } catch (err) {
      console.error(err);
      setError("Error fetching space data");
      return false;
    }
  };

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      const isAuth = await checkUserAuth();
      if (!isAuth) return;
      const hasSpaceAccess = await fetchSpaceData();
      if (!hasSpaceAccess) return;
      setIsLoading(false);
    };

    init();

    return () => {
      // destroyGameScene(); // optional
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (pixiContainerRef.current && space && role) {
      console.log("Initializing game scene...");

      initGameScene(pixiContainerRef.current, space, role).then((cleanupFn) => {
        cleanup = cleanupFn;
      });
    }
    
    // Cleanup function to prevent multiple connections
    return () => {
      if (cleanup) {
        console.log("🧹 Cleaning up game scene (hot reload or unmount)");
        cleanup();
      }
    };
  }, [space, role]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-300">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <div ref={pixiContainerRef} className="w-full h-full" />
    </div>
  );
}
