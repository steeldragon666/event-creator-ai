import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Music, Users, Mic, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Archetype = "club_night" | "festival" | "show" | "conference";

interface ArchetypeOption {
  value: Archetype;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultAssets: string[];
  defaultVibe: string[];
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    value: "club_night",
    label: "Club Night",
    description: "Underground club events, DJ sets, electronic music nights",
    icon: <Music className="h-8 w-8" />,
    defaultAssets: ["instagram_post", "instagram_story", "ticketing_banner"],
    defaultVibe: ["energetic", "underground", "immersive"]
  },
  {
    value: "festival",
    label: "Festival",
    description: "Multi-day festivals, outdoor events, large-scale productions",
    icon: <Users className="h-8 w-8" />,
    defaultAssets: ["instagram_post", "instagram_story", "ticketing_banner"],
    defaultVibe: ["vibrant", "massive", "diverse"]
  },
  {
    value: "show",
    label: "Show / Concert",
    description: "Single artist shows, concerts, intimate venue performances",
    icon: <Mic className="h-8 w-8" />,
    defaultAssets: ["instagram_post", "instagram_story", "ticketing_banner"],
    defaultVibe: ["intimate", "focused", "memorable"]
  },
  {
    value: "conference",
    label: "Conference",
    description: "Professional events, conferences, corporate gatherings",
    icon: <Building2 className="h-8 w-8" />,
    defaultAssets: ["instagram_post", "instagram_story", "ticketing_banner"],
    defaultVibe: ["professional", "informative", "networking"]
  }
];

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [campaignName, setCampaignName] = useState("");

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (campaign) => {
      toast.success("Campaign created!");
      // Navigate to wizard with campaign ID
      setLocation(`/app/campaigns/${campaign.id}/wizard`);
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    }
  });

  const handleCreate = () => {
    if (!selectedArchetype) {
      toast.error("Please select an archetype");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    createCampaign.mutate({
      name: campaignName,
      archetype: selectedArchetype as "club_night" | "festival" | "show"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Create New Campaign</h1>
          <p className="text-muted-foreground">
            Choose your event type to get started with smart defaults
          </p>
        </div>

        {/* Campaign Name */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Campaign Name</CardTitle>
            <CardDescription>Give your campaign a memorable name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Festival 2026"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Archetype Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Select Event Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ARCHETYPES.map((archetype) => (
              <Card
                key={archetype.value}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedArchetype === archetype.value
                    ? "ring-2 ring-primary shadow-lg"
                    : ""
                }`}
                onClick={() => setSelectedArchetype(archetype.value)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      {archetype.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{archetype.label}</CardTitle>
                      <CardDescription className="mt-1">
                        {archetype.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Default vibe:</span>{" "}
                      <span className="text-muted-foreground">
                        {archetype.defaultVibe.join(", ")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Assets:</span>{" "}
                      <span className="text-muted-foreground">
                        {archetype.defaultAssets.length} types
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setLocation("/app/campaigns")}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={!selectedArchetype || !campaignName.trim() || createCampaign.isPending}
          >
            {createCampaign.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Continue to Wizard"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
