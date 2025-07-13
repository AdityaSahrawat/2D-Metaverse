"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import axios from "axios";

export default function PostAuthPage() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuth = async () => {
      const session = await getSession();

      if (session?.user?.email) {
        await axios.post("http://localhost:3009/v1/user/oauth", {
          email: session.user.email,
          username: session.user.name,
        }, {
          withCredentials: true,
        });

        router.replace("/rooms"); 
      }
    };

    handleOAuth();
  }, [router]);

  return <p>Completing login...</p>;
}