import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function GenerationProgress() {
  const { id, vid } = useParams<{ id: string; vid: string }>();
  const campaignId = parseInt(id || "0");
  const versionId = parseInt(vid || "0");

  const [, setLocation] = useLocation();
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);

  const { data: campaign } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: !!campaignId }
  );

  const { data: version } = trpc.versions.get.useQuery(
    { id: versionId },
    { enabled: !!versionId }
  );

  const { data: jobs, refetch: refetchJobs } = trpc.jobs.list.useQuery(
    { campaignVersionId: versionId },
    { 
      enabled: !!versionId && hasStartedGeneration,
      refetchInterval: 3000 // Poll every 3 seconds
    }
  );

  const startGeneration = trpc.versions.startGeneration.useMutation({
    onSuccess: () => {
      toast.success("Generation started!");
      setHasStartedGeneration(true);
    },
    onError: (error) => {
      toast.error(`Failed to start generation: ${error.message}`);
    }
  });

  const handleStartGeneration = () => {
    startGeneration.mutate({ versionId });
  };

  // Check if all jobs are complete
  const allJobsComplete = jobs && jobs.every(job => 
    job.status === "completed" || job.status === "failed"
  );

  const anyJobsFailed = jobs && jobs.some(job => job.status === "failed");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "processing": return "bg-blue-500";
      case "retrying": return "bg-yellow-500";
      default: return "bg-gray-400";
    }
  };

  const getJobLabel = (jobType: string) => {
    switch (jobType) {
      case "GENERATE_CAMPAIGN_DNA":
        return "Generating Campaign DNA";
      case "GENERATE_COPY_VARIANTS":
        return "Generating Copy Variants";
      case "GENERATE_ASSET_OPTIONS":
        return "Generating Asset Options";
      case "RENDER_TEMPLATE":
        return "Rendering Templates";
      case "GENERATE_FINAL_ASSETS":
        return "Generating Final Assets";
      case "EXPORT_ZIP":
        return "Exporting ZIP";
      default:
        return jobType;
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{campaign.campaign.name}</h1>
          <p className="text-muted-foreground">
            {version.eventName} - Generation Progress
          </p>
        </div>

        {/* Start Generation Card */}
        {!hasStartedGeneration && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ready to Generate</CardTitle>
              <CardDescription>
                Start the AI generation process to create your campaign assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">This will generate:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Campaign DNA (visual identity and style guide)</li>
                    <li>Copy variants (headlines, CTAs, body text)</li>
                    <li>Asset options for each selected type (A/B comparison)</li>
                  </ul>
                </div>
                <Button
                  size="lg"
                  onClick={handleStartGeneration}
                  disabled={startGeneration.isPending}
                  className="w-full"
                >
                  {startGeneration.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    "Start Generation"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Progress */}
        {hasStartedGeneration && jobs && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
                <CardDescription>
                  {allJobsComplete
                    ? anyJobsFailed
                      ? "Some jobs failed"
                      : "All jobs completed successfully!"
                    : "Generating your campaign assets..."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">{getJobLabel(job.jobType)}</span>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                    {job.progress !== null && job.progress > 0 && (
                      <Progress value={job.progress} className="h-2" />
                    )}
                    {job.errorMessage && (
                      <p className="text-sm text-destructive">{job.errorMessage}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* View Assets Button */}
            {allJobsComplete && !anyJobsFailed && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => setLocation(`/app/campaigns/${campaignId}/v/${versionId}/assets`)}
                  >
                    View Generated Assets
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Retry Failed Jobs */}
            {allJobsComplete && anyJobsFailed && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={handleStartGeneration}
                    disabled={startGeneration.isPending}
                  >
                    Retry Failed Jobs
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
