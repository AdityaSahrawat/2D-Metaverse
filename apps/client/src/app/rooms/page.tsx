"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import axios from "axios";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Maps, Space } from "@repo/valid";
import { Spaces } from "./spaces";
import { MapsComp } from "./maps";


const Index = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maps, setMaps] = useState<Maps[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [joinSpaceId, setJoinSpaceId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  
  
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleJoinSpace = async() => {
    await axios.post(`${api}/v1/space/join` , {
      code : joinCode ,
      spaceId : joinSpaceId
    })
    setIsJoinDialogOpen(false);
    setJoinSpaceId("");
    setJoinCode("");
  };

  async function checkIsLoggedIn() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${api}/v1/user/auth/status`, {
          withCredentials: true,
        });
        setIsAuth(res.data.isAuth === true);
      } catch (err) {
        setIsAuth(false);
        console.log(err)
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
      }
  }

  async function fetchMaps() {
      
      try {
        const response = await axios.get(`${api}/v1/web/maps`, {
          withCredentials: true,
        });
        setMaps(response.data.maps ?? []);
      } catch (error) {
        console.error("Error fetching maps:", error);
      }
    }

  async function fetchSpaces() {
    try {
      const response = await axios.get(`${api}/v1/web/spaces`, {
        withCredentials: true,
      });
      console.log(response.data.spaces)
      setSpaces(response.data.spaces ?? []);
    } catch (error) {
      console.error("Error fetching spaces:", error);
    }
  }


  useEffect(() => {
    checkIsLoggedIn();
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuth) {
      router.push("/auth");
      return;
    }

    setIsLoading(true);

    fetchSpaces();
    fetchMaps();

    setIsLoading(false);
  }, [authChecked, isAuth]);

  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Join Space
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Space</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="spaceId">Space ID</Label>
                  <Input className="mt-2"
                    id="spaceId"
                    value={joinSpaceId}
                    onChange={(e) => setJoinSpaceId(e.target.value)}
                    placeholder="Enter space ID"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Access Code</Label>
                  <Input className="mt-2"
                    id="code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter access code"
                  />
                </div>
                <Button onClick={handleJoinSpace} className="w-full">
                  Join Space
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Maps Section */}
        <MapsComp maps={maps}/>

        {/* Spaces Section */}
        <Spaces spaces={spaces}/>
      </div>
    </div>
  );
}



export default Index