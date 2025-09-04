import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Space } from "@repo/valid";
import { Globe, Lock, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export const Spaces = ({spaces}: {spaces : Space[]}) => {
  const router = useRouter()

  const getSpaceTypeIcon = (type: string) => {
    switch (type) {
      case "private":
        return <Lock className="h-4 w-4" />;
      case "public":
        return <Globe className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getSpaceTypeBadge = (type: string) => {
    const variants = {
      private: "destructive",
      public: "default",
      invite_only: "secondary",
    } as const;
    return variants[type as keyof typeof variants] || "default";
  };

  return (
    <div>
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-6 w-6" />
          Active Spaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces &&
            spaces.map((space) => (
              <Card key={space.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  <Image src={space.map.imagePath} alt={space.map.name} width={100} height={100} className="w-full h-full object-cover"/>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{space.name}</CardTitle>
                    <Badge
                      variant={getSpaceTypeBadge(space.type)}
                      className="gap-1"
                    >
                      {getSpaceTypeIcon(space.type)}
                      {space.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Map:{" "}
                      <span className="text-foreground">{space.map.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Participants:
                      </span>
                      <span className="text-foreground">
                        {space.participants.length}/
                        {space.maxParticipants || "∞"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">
                        {new Date(space.createAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={()=>router.push(`/game/${space.id}`)}>
                      <Users className="h-4 w-4 mr-2" />
                      View Space
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
};
