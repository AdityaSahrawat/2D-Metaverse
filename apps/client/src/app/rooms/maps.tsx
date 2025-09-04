import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog } from "@radix-ui/react-dialog";
import { Maps } from "@repo/valid";
import axios from "axios";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { useState } from "react";


export const MapsComp = ({maps} : {maps : Maps[]} ) => {
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [spaceName , setSpaceName] = useState("")
  const [maxParticipants , setMaxParticipants] = useState("1")
  const [type  , setType] = useState("private")
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;
  const handleCreateSpace = async(mapid : string , mapId : string)=>{
    try {
      console.log("sending to /web/space")
      await axios.post(`${api}/v1/web/space` , {
        name : spaceName , maxParticipants ,type , mapid , mapId

      },{
        withCredentials : true
      })
    } catch (error) {
       console.log(error)
    }
    setIsSpaceDialogOpen(false)
  }


  return (
    <div>
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Available Maps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maps &&
            maps.map((map) => (
              <Card key={map.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  <Image src={map.imagePath} alt={map.name} width={100} height={100} className="w-full h-full object-cover"/>
                </div>
                <CardHeader>
                  <CardTitle>{map.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span>
                        {map.width} × {map.height}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>
                        {new Date(map.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div></div>

                    <Dialog
                      open={isSpaceDialogOpen}
                      onOpenChange={setIsSpaceDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <div className="inline-block p-[2px] rounded-lg bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
                          <button className="bg-white text-black px-4 py-2 rounded-lg w-full h-full hover:cursor-pointer">
                            create Space
                          </button>
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Add specifications to your space
                          </DialogTitle>
                        </DialogHeader>
                        {/* name, maxParticipants ,type */}
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="name">Name </label>
                            <Input
                              className="mt-2.5"
                              id="name"
                              value={spaceName}
                              onChange={(e) => setSpaceName(e.target.value)}
                            ></Input>
                          </div>
                          <div>
                            <label htmlFor="maxParticipants">
                              maxParticipants{" "}
                            </label>
                            <Input
                              className="mt-2.5"
                              type="number"
                              id="maxParticipants"
                              min={1}
                              max={10}
                              value={maxParticipants}
                              onChange={(e) =>
                                setMaxParticipants(e.target.value)
                              }
                            ></Input>
                          </div>
                          <div>
                            <Select value={type} onValueChange={setType}>
                              <SelectTrigger>
                                <SelectValue placeholder="space type"></SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="Invite-only">
                                  invite-only
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-center">
                            <Button
                              className="hover:cursor-pointer"
                              onClick={() => handleCreateSpace(map.mapid , map.id)}
                            >
                              Create Space
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
};
