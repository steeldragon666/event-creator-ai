import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface WizardFormData {
  // Step 1: Event Essence
  eventName: string;
  eventDate: string;
  city: string;
  genre: string;
  vibe1: string;
  vibe2: string;
  vibe3: string;
  
  // Step 2: Branding
  color1: string;
  color2: string;
  color3: string;
  logoFile?: File;
  
  // Step 3: Asset Pack
  assetTypes: string[];
}

const VIBE_OPTIONS = [
  "energetic", "underground", "immersive", "vibrant", "massive",
  "diverse", "intimate", "focused", "memorable", "professional",
  "informative", "networking", "experimental", "nostalgic", "futuristic"
];

const ASSET_TYPE_OPTIONS = [
  { value: "instagram_post", label: "Instagram Post (1080x1080)" },
  { value: "instagram_story", label: "Instagram Story (1080x1920)" },
  { value: "ticketing_banner", label: "Ticketing Banner (1200x628)" }
];

export default function CampaignWizard() {
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id || "0");

  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardFormData>({
    defaultValues: {
      assetTypes: ["instagram_post", "instagram_story", "ticketing_banner"]
    }
  });

  const { data: campaign, isLoading: campaignLoading } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const createVersion = trpc.versions.create.useMutation({
    onSuccess: async (version) => {
      toast.success("Campaign version created!");
      // Navigate to generation screen
      setLocation(`/app/campaigns/${campaignId}/v/${version.id}/generate`);
    },
    onError: (error) => {
      toast.error(`Failed to create version: ${error.message}`);
    }
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("logoFile", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: WizardFormData) => {
    if (!campaign) return;

    // TODO: Upload logo to S3 if provided
    let logoUrl: string | undefined;
    let logoKey: string | undefined;

    if (data.logoFile) {
      // For MVP, we'll skip logo upload and just note it
      toast.info("Logo upload will be implemented in next iteration");
    }

    // Create campaign version
    createVersion.mutate({
      campaignId: campaign.campaign.id,
      eventName: data.eventName,
      eventStartDate: new Date(data.eventDate),
      city: data.city,
      primaryGenre: data.genre,
      headliners: [], // MVP: empty for now
      brandColors: [data.color1, data.color2, data.color3].filter(Boolean),
      logoUrl,
      logoKey,
      vibeKeywords: [data.vibe1, data.vibe2, data.vibe3].filter(Boolean),
      tone: "hype" as const,
      ctaPreference: "tickets" as const,
      promotionalPlatforms: ["instagram", "facebook"],
      assetTypes: data.assetTypes,
      ticketPhases: []
    });
    
    // Store selected asset types in local state for later use
    console.log("Selected asset types:", data.assetTypes);
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const selectedVibes = [watch("vibe1"), watch("vibe2"), watch("vibe3")].filter(Boolean);
  const selectedAssetTypes = watch("assetTypes") || [];

  if (campaignLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
            <CardDescription>Unable to load campaign details</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{campaign.campaign.name}</h1>
          <p className="text-muted-foreground">
            Step {currentStep} of 3 - Complete your campaign details
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step <= currentStep ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Event Essence */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Event Essence</CardTitle>
                <CardDescription>Tell us about your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input
                    id="eventName"
                    placeholder="e.g., Midnight Groove Sessions"
                    {...register("eventName", { required: true })}
                  />
                  {errors.eventName && <p className="text-sm text-destructive">Event name is required</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      {...register("eventDate", { required: true })}
                    />
                    {errors.eventDate && <p className="text-sm text-destructive">Date is required</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Melbourne"
                      {...register("city", { required: true })}
                    />
                    {errors.city && <p className="text-sm text-destructive">City is required</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Primary Genre *</Label>
                  <Input
                    id="genre"
                    placeholder="e.g., Techno, House, Hip-Hop"
                    {...register("genre", { required: true })}
                  />
                  {errors.genre && <p className="text-sm text-destructive">Genre is required</p>}
                </div>

                <div className="space-y-3">
                  <Label>Select 3 Vibe Keywords *</Label>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_OPTIONS.map((vibe) => {
                      const isSelected = selectedVibes.includes(vibe);
                      const canSelect = selectedVibes.length < 3 || isSelected;
                      
                      return (
                        <Badge
                          key={vibe}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer ${!canSelect ? "opacity-50" : ""}`}
                          onClick={() => {
                            if (isSelected) {
                              // Remove
                              if (watch("vibe1") === vibe) setValue("vibe1", "");
                              if (watch("vibe2") === vibe) setValue("vibe2", "");
                              if (watch("vibe3") === vibe) setValue("vibe3", "");
                            } else if (canSelect) {
                              // Add
                              if (!watch("vibe1")) setValue("vibe1", vibe);
                              else if (!watch("vibe2")) setValue("vibe2", vibe);
                              else if (!watch("vibe3")) setValue("vibe3", vibe);
                            }
                          }}
                        >
                          {vibe}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedVibes.length}/3
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Branding */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Branding Inputs</CardTitle>
                <CardDescription>Define your visual identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Brand Colors (3 colors) *</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color1" className="text-sm">Primary</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color1"
                          type="color"
                          className="w-16 h-10"
                          {...register("color1", { required: true })}
                        />
                        <Input
                          placeholder="#000000"
                          value={watch("color1")}
                          onChange={(e) => setValue("color1", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color2" className="text-sm">Secondary</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color2"
                          type="color"
                          className="w-16 h-10"
                          {...register("color2", { required: true })}
                        />
                        <Input
                          placeholder="#000000"
                          value={watch("color2")}
                          onChange={(e) => setValue("color2", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color3" className="text-sm">Accent</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color3"
                          type="color"
                          className="w-16 h-10"
                          {...register("color3", { required: true })}
                        />
                        <Input
                          placeholder="#000000"
                          value={watch("color3")}
                          onChange={(e) => setValue("color3", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="logo">Logo Upload (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {logoPreview ? (
                      <div className="space-y-4">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="max-h-32 mx-auto"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogoPreview(null);
                            setValue("logoFile", undefined);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="logo" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload logo (PNG, JPG, SVG)
                        </p>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Asset Pack */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Asset Pack</CardTitle>
                <CardDescription>Choose which assets to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ASSET_TYPE_OPTIONS.map((assetType) => (
                  <label
                    key={assetType.value}
                    className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={assetType.value}
                      checked={selectedAssetTypes.includes(assetType.value)}
                      onChange={(e) => {
                        const current = selectedAssetTypes;
                        if (e.target.checked) {
                          setValue("assetTypes", [...current, assetType.value]);
                        } else {
                          setValue("assetTypes", current.filter(t => t !== assetType.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{assetType.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Optimized for platform specifications
                      </p>
                    </div>
                  </label>
                ))}
                {selectedAssetTypes.length === 0 && (
                  <p className="text-sm text-destructive">Please select at least one asset type</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createVersion.isPending || selectedAssetTypes.length === 0}
              >
                {createVersion.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Campaign"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
