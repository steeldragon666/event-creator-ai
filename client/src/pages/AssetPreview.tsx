import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Check, RefreshCw, Download, ZoomIn } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function AssetPreview() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const campaignId = parseInt(id || "0");
  const versionId = parseInt(vid || "0");

  const [, setLocation] = useLocation();
  const [selections, setSelections] = useState<Record<string, number>>({});

  const { data: campaign } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const { data: version } = trpc.versions.get.useQuery(
    { id: versionId },
    { enabled: !!versionId }
  );

  const { data: assetOptions, isLoading: optionsLoading } = trpc.assets.listOptions.useQuery(
    { campaignVersionId: versionId },
    { enabled: !!versionId }
  );

  const selectOption = trpc.assets.selectOption.useMutation({
    onSuccess: () => {
      toast.success("Selection saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save selection: ${error.message}`);
    }
  });

  const handleSelectOption = (assetType: string, optionId: number) => {
    setSelections(prev => ({ ...prev, [assetType]: optionId }));
    selectOption.mutate({
      optionId
    });
  };

  const handleFinalize = () => {
    // Check if all asset types have selections
    const assetTypes = version?.assetTypes || [];
    const missingSelections = assetTypes.filter(type => !selections[type]);
    
    if (missingSelections.length > 0) {
      toast.error(`Please select options for: ${missingSelections.join(", ")}`);
      return;
    }

    // Navigate to export page
    setLocation(`/app/campaigns/${campaignId}/v/${versionId}/export`);
  };

  if (optionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign || !version) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Campaign or version not found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Group options by asset type
  const optionsByType: Record<string, NonNullable<typeof assetOptions>> = {};
  assetOptions?.forEach(option => {
    if (!optionsByType[option.assetType]) {
      optionsByType[option.assetType] = [];
    }
    optionsByType[option.assetType].push(option);
  });

  const assetTypes = Object.keys(optionsByType);

  const getAssetTypeLabel = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{campaign.campaign.name}</h1>
          <p className="text-muted-foreground">
            {version.eventName} - Select Your Preferred Assets
          </p>
        </div>

        {/* Asset Type Tabs */}
        {assetTypes.length > 0 ? (
          <Tabs defaultValue={assetTypes[0]} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              {assetTypes.map(type => (
                <TabsTrigger key={type} value={type}>
                  {getAssetTypeLabel(type)}
                  {selections[type] && (
                    <Check className="ml-2 h-4 w-4 text-green-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {assetTypes.map(type => {
              const options = optionsByType[type] || [];
              const optionA = options.find(o => o.optionLabel === "A");
              const optionB = options.find(o => o.optionLabel === "B");

              return (
                <TabsContent key={type} value={type} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option A */}
                    {optionA && (
                      <Card className={selections[type] === optionA.id ? "ring-2 ring-primary" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Option A</CardTitle>
                              <CardDescription>
                                <Badge variant="outline">{optionA.generationEngine}</Badge>
                              </CardDescription>
                            </div>
                            {selections[type] === optionA.id && (
                              <Badge className="bg-green-500">
                                <Check className="h-4 w-4 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Image Preview */}
                          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                            <img
                              src={optionA.thumbnailUrl || optionA.assetUrl}
                              alt="Option A"
                              className="w-full h-full object-cover"
                            />
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="absolute top-2 right-2"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <img
                                  src={optionA.assetUrl}
                                  alt="Option A Full Size"
                                  className="w-full h-auto"
                                />
                              </DialogContent>
                            </Dialog>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              variant={selections[type] === optionA.id ? "default" : "outline"}
                              onClick={() => handleSelectOption(type, optionA.id)}
                            >
                              {selections[type] === optionA.id ? "Selected" : "Select A"}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Metadata */}
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Dimensions: {optionA.width}x{optionA.height}</p>
                            <p>Format: {optionA.format.toUpperCase()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Option B */}
                    {optionB && (
                      <Card className={selections[type] === optionB.id ? "ring-2 ring-primary" : ""}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>Option B</CardTitle>
                              <CardDescription>
                                <Badge variant="outline">{optionB.generationEngine}</Badge>
                              </CardDescription>
                            </div>
                            {selections[type] === optionB.id && (
                              <Badge className="bg-green-500">
                                <Check className="h-4 w-4 mr-1" />
                                Selected
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Image Preview */}
                          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                            <img
                              src={optionB.thumbnailUrl || optionB.assetUrl}
                              alt="Option B"
                              className="w-full h-full object-cover"
                            />
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="absolute top-2 right-2"
                                >
                                  <ZoomIn className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <img
                                  src={optionB.assetUrl}
                                  alt="Option B Full Size"
                                  className="w-full h-auto"
                                />
                              </DialogContent>
                            </Dialog>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              variant={selections[type] === optionB.id ? "default" : "outline"}
                              onClick={() => handleSelectOption(type, optionB.id)}
                            >
                              {selections[type] === optionB.id ? "Selected" : "Select B"}
                            </Button>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Metadata */}
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Dimensions: {optionB.width}x{optionB.height}</p>
                            <p>Format: {optionB.format.toUpperCase()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Assets Yet</CardTitle>
              <CardDescription>
                Assets are still being generated. Please wait...
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Finalize Button */}
        {assetTypes.length > 0 && (
          <div className="mt-8 flex justify-end">
            <Button
              size="lg"
              onClick={handleFinalize}
              className="gap-2"
            >
              <Download className="h-5 w-5" />
              Finalize & Export
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
