import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TicketRoundStatus = "upcoming" | "active" | "completed";
interface TicketRound {
  roundNumber: number;
  label: string;
  status: TicketRoundStatus;
  price: string;
  bannerText: string;
}

export default function AssetCustomizer() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const campaignId = parseInt(id || "0");
  const versionId = parseInt(vid || "0");
  
  const [, setLocation] = useLocation();

  const [variationCount, setVariationCount] = useState(3);
  const [platforms, setPlatforms] = useState<string[]>(["instagram_portrait", "instagram_square"]);
  
  const [ticketRounds, setTicketRounds] = useState<TicketRound[]>([
    { roundNumber: 1, label: "Early Bird", status: "completed", price: "$20", bannerText: "SOLD OUT" },
    { roundNumber: 2, label: "First Release", status: "active", price: "$30", bannerText: "ON SALE NOW" },
  ]);

  const [overrides, setOverrides] = useState({
    ticketUrl: "",
    legalText: "",
    presentedBy: ""
  });

  const { data: version, isLoading } = trpc.versions.get.useQuery(
    { id: versionId },
    { enabled: !!versionId }
  );

  const createBatchConfig = trpc.batch.createConfig.useMutation({
    onSuccess: (config) => {
      startBatch.mutate({
        campaignId,
        campaignVersionId: versionId,
        batchConfigId: config.id
      });
    },
    onError: (error) => {
      toast.error(`Failed to save configuration: ${error.message}`);
    }
  });

  const startBatch = trpc.batch.startBatchGeneration.useMutation({
    onSuccess: (res) => {
      toast.success("Batch generation started!");
      setLocation(`/app/campaigns/${campaignId}/v/${versionId}/delivery?batch=${res.masterJobId}`);
    },
    onError: (error) => {
      toast.error(`Failed to start variations: ${error.message}`);
    }
  });

  const handleCreateBatch = () => {
    createBatchConfig.mutate({
      campaignVersionId: versionId,
      selectedOptionId: 0, // In a real app we'd pass the actual selected option base asset
      variationCount,
      platforms,
      ticketRounds: ticketRounds.map(r => ({
        ...r, status: r.status as any
      })),
      ...overrides
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Configure Variations</h1>
          <p className="text-muted-foreground">{version?.eventName || "Campaign"} - Batch Details</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ticket Rounds */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Rounds</CardTitle>
            <CardDescription>Define the ticket phases to generate variations for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketRounds.map((round, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-100 p-4 rounded-md">
                <div className="col-span-3">
                  <Label>Label</Label>
                  <Input 
                    value={round.label} 
                    onChange={e => {
                      const newRounds = [...ticketRounds];
                      newRounds[index].label = e.target.value;
                      setTicketRounds(newRounds);
                    }} 
                  />
                </div>
                <div className="col-span-3">
                  <Label>Status</Label>
                  <Select
                    value={round.status}
                    onValueChange={(val: any) => {
                      const newRounds = [...ticketRounds];
                      newRounds[index].status = val;
                      setTicketRounds(newRounds);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed / Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Price</Label>
                  <Input 
                    value={round.price || ""} 
                    onChange={e => {
                      const newRounds = [...ticketRounds];
                      newRounds[index].price = e.target.value;
                      setTicketRounds(newRounds);
                    }} 
                  />
                </div>
                <div className="col-span-3">
                  <Label>Banner Text</Label>
                  <Input 
                    value={round.bannerText || ""} 
                    onChange={e => {
                      const newRounds = [...ticketRounds];
                      newRounds[index].bannerText = e.target.value;
                      setTicketRounds(newRounds);
                    }} 
                  />
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                    const newRounds = [...ticketRounds];
                    newRounds.splice(index, 1);
                    setTicketRounds(newRounds);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2" onClick={() => {
               setTicketRounds([...ticketRounds, {
                 roundNumber: ticketRounds.length + 1,
                 label: "New Round",
                 status: "upcoming",
                 price: "",
                 bannerText: ""
               }]);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Add Round
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Platforms & Count */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Spec</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Variations per Round</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <Button 
                      key={num} 
                      variant={variationCount === num ? "default" : "outline"}
                      onClick={() => setVariationCount(num)}
                      className="flex-1"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Number of different visual layouts per format.</p>
              </div>

              <div className="space-y-2 mt-6">
                <Label>Platforms to Generate</Label>
                <div className="space-y-2">
                  {["instagram_portrait", "instagram_square", "instagram_story", "twitter_post"].map(platform => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Switch 
                        id={platform} 
                        checked={platforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) setPlatforms([...platforms, platform]);
                          else setPlatforms(platforms.filter(p => p !== platform));
                        }}
                      />
                      <Label htmlFor={platform} className="capitalize">{platform.replace("_", " ")}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overrides */}
          <Card>
            <CardHeader>
              <CardTitle>Text Overrides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ticket URL</Label>
                <Input 
                  placeholder="tickets.event.com" 
                  value={overrides.ticketUrl}
                  onChange={e => setOverrides({...overrides, ticketUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Presented By (Optional)</Label>
                <Input 
                  placeholder="Brand Name" 
                  value={overrides.presentedBy}
                  onChange={e => setOverrides({...overrides, presentedBy: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Legal / Fine Print</Label>
                <Input 
                  placeholder="18+ Only. Subject to change." 
                  value={overrides.legalText}
                  onChange={e => setOverrides({...overrides, legalText: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Action */}
        <div className="flex justify-end pt-4">
          <Button 
            size="lg" 
            onClick={handleCreateBatch} 
            disabled={createBatchConfig.isPending || startBatch.isPending || platforms.length === 0 || ticketRounds.length === 0}
          >
            {createBatchConfig.isPending || startBatch.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Generate {ticketRounds.length * platforms.length * variationCount} Assets
          </Button>
        </div>
      </div>
    </div>
  );
}
