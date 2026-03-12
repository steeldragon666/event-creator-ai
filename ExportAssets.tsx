import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ExportAssets() {
  const params = useParams<{ id: string; vid: string }>();
  const versionId = parseInt(params.vid);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    zipUrl: string;
    fileCount: number;
    totalSize: number;
  } | null>(null);

  const { data: assets, isLoading } = trpc.assets.list.useQuery({
    campaignVersionId: versionId,
  });

  const exportMutation = trpc.assets.exportZip.useMutation({
    onSuccess: (result) => {
      setExportResult(result);
      setIsExporting(false);
      toast.success(`Successfully exported ${result.fileCount} assets`);
    },
    onError: (error) => {
      setIsExporting(false);
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const handleExport = () => {
    if (!assets || assets.length === 0) {
      toast.error("No assets available to export");
      return;
    }

    setIsExporting(true);
    exportMutation.mutate({
      campaignVersionId: versionId,
      selectedAssetIds: assets.map(a => a.id),
    });
  };

  const handleDownload = () => {
    if (exportResult?.zipUrl) {
      window.open(exportResult.zipUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Export Campaign Assets</h1>
          <p className="text-muted-foreground">
            Download all your generated assets in a single ZIP file
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ready to Export</CardTitle>
            <CardDescription>
              {assets?.length || 0} assets will be included in your download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Included Assets
              </h3>
              <div className="grid gap-2">
                {assets?.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {asset.assetType.replace(/_/g, " ").toUpperCase()}
                      </p>
                      {asset.assetUrl && (
                        <p className="text-sm text-muted-foreground truncate">
                          {asset.assetUrl.split("/").pop()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Button */}
            {!exportResult ? (
              <Button
                onClick={handleExport}
                disabled={isExporting || !assets || assets.length === 0}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Preparing Export...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Export as ZIP
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <h3 className="font-semibold text-green-700 dark:text-green-400">
                      Export Complete!
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exportResult.fileCount} files • {(exportResult.totalSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <Button
                  onClick={handleDownload}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download ZIP File
                </Button>

                <Button
                  onClick={() => setExportResult(null)}
                  variant="outline"
                  className="w-full"
                >
                  Export Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
