import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Check, AlertCircle } from "lucide-react";

export default function AssetDelivery() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const campaignId = parseInt(id || "0");
  const versionId = parseInt(vid || "0");
  const searchParams = new URLSearchParams(window.location.search);
  const batchConfigId = parseInt(searchParams.get("batch") || "0");

  const [selectedAssets, setSelectedAssets] = useState<Record<number, boolean>>({});

  const { data: campaign } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const { data: assets, refetch: refetchAssets, isLoading: isLoadingAssets } = trpc.batch.getAssets.useQuery(
    { batchConfigId },
    { enabled: !!batchConfigId }
  );
  
  const { data: jobs, refetch: refetchJobs } = trpc.jobs.list.useQuery(
    { campaignVersionId: versionId },
    { enabled: !!versionId }
  );

  const masterJob = jobs?.find(j => j.jobType === "GENERATE_BATCH_ASSETS" && j.payload && (j.payload as any).batchConfigId === batchConfigId);
  const childJobs = jobs?.filter(j => 
    (j.jobType === "RESIZE_AND_COMPOSITE" || j.jobType === "GENERATE_ROUND_VARIANTS") && 
    j.payload && (j.payload as any).batchConfigId === batchConfigId
  ) || [];

  const isGenerating = masterJob && masterJob.status !== "completed" && masterJob.status !== "failed";
  const numCompleted = childJobs.filter(j => j.status === "completed").length;
  const numTotal = childJobs.length;

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        refetchJobs();
        refetchAssets();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, refetchJobs, refetchAssets]);

  // Group assets by Platform, then by Ticket Round
  const assetsByPlatform: Record<string, Record<string, any[]>> = {};

  if (assets) {
    assets.forEach(asset => {
      if (!assetsByPlatform[asset.platform]) {
        assetsByPlatform[asset.platform] = {};
      }
      if (!assetsByPlatform[asset.platform][asset.ticketRound]) {
        assetsByPlatform[asset.platform][asset.ticketRound] = [];
      }
      assetsByPlatform[asset.platform][asset.ticketRound].push(asset);
    });
  }

  const handleToggleSelect = (assetId: number) => {
    setSelectedAssets(prev => ({
      ...prev,
      [assetId]: !prev[assetId]
    }));
  };

  const handleSelectAll = (platform: string, round: string, assetsList: any[]) => {
    const allSelected = assetsList.every(a => selectedAssets[a.id]);
    const next = { ...selectedAssets };
    assetsList.forEach(a => {
      next[a.id] = !allSelected;
    });
    setSelectedAssets(next);
  };

  const handleDownloadZip = () => {
    const numSelected = Object.values(selectedAssets).filter(Boolean).length;
    if (numSelected === 0) {
      alert("Please select at least one asset to download.");
      return;
    }
    alert(`Mock downloading ${numSelected} assets in ZIP...`);
  };

  const platforms = Object.keys(assetsByPlatform);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 max-w-7xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Asset Delivery</h1>
          <p className="text-muted-foreground">{campaign?.campaign.name} - Batch Variations</p>
        </div>
        <div className="flex gap-4">
          <Button size="lg" onClick={handleDownloadZip}>
            <Download className="mr-2 h-4 w-4" /> Download Selected
          </Button>
        </div>
      </div>

      {isGenerating && (
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <div>
                <CardTitle className="text-amber-700">Generating Variations...</CardTitle>
                <CardDescription className="text-amber-600">
                  Compositing {numTotal} base assets into their final formats. 
                  ({numCompleted}/{numTotal} completed)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {masterJob?.status === "failed" && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <CardTitle className="text-red-700">Generation Failed</CardTitle>
                <CardDescription className="text-red-600">{masterJob.errorMessage || "Unknown error occurred"}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {isLoadingAssets ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assets && assets.length > 0 ? (
        <Tabs defaultValue={platforms[0]} className="space-y-6">
          <TabsList>
            {platforms.map(p => (
              <TabsTrigger key={p} value={p} className="capitalize">
                {p.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>

          {platforms.map(platform => (
            <TabsContent key={platform} value={platform} className="space-y-8">
              {Object.keys(assetsByPlatform[platform]).map(round => {
                const roundAssets = assetsByPlatform[platform][round];
                const allSelected = roundAssets.every(a => selectedAssets[a.id]);

                return (
                  <div key={round}>
                    <div className="flex items-center justify-between mb-4 mt-6">
                      <h3 className="text-2xl font-semibold tracking-tight">Round {round}</h3>
                      <Button variant="ghost" size="sm" onClick={() => handleSelectAll(platform, round, roundAssets)}>
                        {allSelected ? "Deselect All" : "Select All in Round"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {roundAssets.map((asset, i) => (
                        <Card 
                          key={asset.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedAssets[asset.id] ? "ring-2 ring-primary" : "opacity-80"}`}
                          onClick={() => handleToggleSelect(asset.id)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="relative aspect-square bg-slate-200 rounded-md overflow-hidden flex items-center justify-center">
                              {/* Using fallback text if real assetUrl is local mock */}
                              {asset.assetUrl.includes("fake-s3") ? (
                                <div className="text-center p-4">
                                  <div className="text-4xl font-bold text-slate-400 mb-2">V{asset.variationNumber}</div>
                                  <div className="text-xs text-slate-500">{platform.replace("_", " ")}</div>
                                </div>
                              ) : (
                                <img src={asset.assetUrl} alt={`Asset ${asset.id}`} className="w-full h-full object-cover" />
                              )}
                              
                              {selectedAssets[asset.id] && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                                  <Check className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <Badge variant="outline">Variation {asset.variationNumber}</Badge>
                              <span className="text-muted-foreground">{asset.width}x{asset.height}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      ) : !isGenerating ? (
        <Card>
          <CardHeader>
            <CardTitle>No Assets Found</CardTitle>
            <CardDescription>We couldn't find any generated assets for this batch.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
