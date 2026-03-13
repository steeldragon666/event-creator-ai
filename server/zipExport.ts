import archiver from "archiver";
import axios from "axios";
import { storagePut } from "./storage";
import * as db from "./db";

export interface ExportOptions {
  campaignVersionId: number;
  selectedAssetIds: number[];
}

export interface ExportResult {
  zipUrl: string;
  fileCount: number;
  totalSize: number;
}

/**
 * Generate a ZIP file containing all selected assets for a campaign version
 */
export async function generateZipExport(
  options: ExportOptions
): Promise<ExportResult> {
  const { campaignVersionId, selectedAssetIds } = options;

  // Get campaign version
  const version = await db.getCampaignVersionById(campaignVersionId);
  if (!version) {
    throw new Error("Campaign version not found");
  }

  // Get selected assets
  const allAssets = await db.getAssetsByVersionId(campaignVersionId);
  const selectedAssets = allAssets.filter(asset =>
    selectedAssetIds.includes(asset.id)
  );

  if (selectedAssets.length === 0) {
    throw new Error("No assets selected for export");
  }

  // Create ZIP archive in memory
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });

  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Track stats
  let fileCount = 0;
  let totalSize = 0;

  // Download and add each asset to ZIP
  for (const asset of selectedAssets) {
    if (!asset.assetUrl) continue;

    try {
      // Download asset from URL
      const response = await axios.get(asset.assetUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);
      totalSize += buffer.length;

      // Determine file extension from asset type
      const ext = getFileExtension(asset.assetType);
      const fileName = `${sanitizeFileName(asset.assetType)}_${asset.id}${ext}`;

      // Add file to archive
      archive.append(buffer, { name: fileName });
      fileCount++;
    } catch (error) {
      console.error(`[ZipExport] Failed to download asset ${asset.id}:`, error);
      // Continue with other assets
    }
  }

  // Finalize archive
  await archive.finalize();

  // Wait for all chunks to be collected
  await new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", (err: Error) => reject(err));
  });

  // Combine chunks into single buffer
  const zipBuffer = Buffer.concat(chunks);

  // Upload ZIP to S3
  const zipKey = `exports/${campaignVersionId}/campaign_assets_${Date.now()}.zip`;
  const { url: zipUrl } = await storagePut(
    zipKey,
    zipBuffer,
    "application/zip"
  );

  return {
    zipUrl,
    fileCount,
    totalSize: zipBuffer.length,
  };
}

/**
 * Get file extension for asset type
 */
function getFileExtension(assetType: string): string {
  // Most assets are PNG
  if (assetType.includes("story")) return ".png";
  if (assetType.includes("post")) return ".png";
  if (assetType.includes("banner")) return ".png";
  if (assetType.includes("ad")) return ".png";
  return ".png";
}

/**
 * Sanitize file name to be filesystem-safe
 */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}
