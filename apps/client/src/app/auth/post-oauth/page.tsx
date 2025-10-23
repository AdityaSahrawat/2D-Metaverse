"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import axios from "axios";

export default function PostAuthPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL
  useEffect(() => {
    const handleOAuth = async () => {
      const session = await getSession();
      if (session?.user?.email) {
        await axios.post(`${API}/v1/user/oauth`, {
          email: session.user.email,
          username: session.user.name,
        }, {
          withCredentials: true,
        });
        router.replace("/");
      }
    };
    

    handleOAuth();
  }, [router]);

  return <p className="text-white">Completing login...</p>;
}