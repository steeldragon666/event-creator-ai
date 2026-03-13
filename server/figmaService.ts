import { storagePut } from "./storage";
import { GeneratedDNATokens } from "./campaignDNA";
import { nanoid } from "nanoid";

const FIGMA_API_BASE = "https://api.figma.com/v1";
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

if (!FIGMA_TOKEN) {
  console.warn("[Figma] FIGMA_ACCESS_TOKEN not set - Figma integration will not work");
}

/**
 * Figma template configuration for each asset type
 * These should be updated with your actual Figma file IDs and node IDs
 */
export const FIGMA_TEMPLATES = {
  "instagram_post": {
    fileKey: "YOUR_FILE_KEY_HERE", // Replace with actual Figma file key
    nodeId: "1:2", // Replace with actual node ID for Instagram post template
    width: 1080,
    height: 1080
  },
  "instagram_story": {
    fileKey: "YOUR_FILE_KEY_HERE",
    nodeId: "1:3",
    width: 1080,
    height: 1920
  },
  "ticket_banner": {
    fileKey: "YOUR_FILE_KEY_HERE",
    nodeId: "1:4",
    width: 1200,
    height: 630
  },
  "facebook_ad": {
    fileKey: "YOUR_FILE_KEY_HERE",
    nodeId: "1:5",
    width: 1200,
    height: 628
  }
};

export interface FigmaRenderOptions {
  campaignVersionId: number;
  assetType: string;
  dnaTokens: GeneratedDNATokens;
  copy: {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
  };
  eventName: string;
  eventDate: string;
  venue?: string;
  logoUrl?: string;
}

export interface FigmaAsset {
  assetUrl: string;
  assetKey: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  format: string;
  templateId: string;
}

/**
 * Get Figma file data
 */
async function getFigmaFile(fileKey: string): Promise<any> {
  if (!FIGMA_TOKEN) {
    throw new Error("FIGMA_ACCESS_TOKEN not configured");
  }

  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      "X-Figma-Token": FIGMA_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Export Figma node as image
 */
async function exportFigmaNode(
  fileKey: string,
  nodeId: string,
  format: "png" | "jpg" = "png",
  scale: number = 2
): Promise<string> {
  if (!FIGMA_TOKEN) {
    throw new Error("FIGMA_ACCESS_TOKEN not configured");
  }

  const response = await fetch(
    `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=${format}&scale=${scale}`,
    {
      headers: {
        "X-Figma-Token": FIGMA_TOKEN
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Figma export error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.images[nodeId];

  if (!imageUrl) {
    throw new Error("Figma export failed: No image URL returned");
  }

  return imageUrl;
}

/**
 * Download image from URL and upload to S3
 */
async function downloadAndUploadToS3(
  imageUrl: string,
  fileKey: string,
  contentType: string = "image/png"
): Promise<{ url: string; key: string }> {
  // Download image from Figma
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Upload to S3
  const result = await storagePut(fileKey, buffer, contentType);
  return result;
}

/**
 * Render a Figma template with campaign data
 * 
 * Note: This is a simplified implementation. For production use, you would:
 * 1. Use Figma's REST API to duplicate the template
 * 2. Update text layers with campaign copy
 * 3. Update color styles with DNA tokens
 * 4. Replace image fills with logos/assets
 * 5. Export the modified design
 * 
 * For MVP, we'll just export the template as-is and document the manual workflow
 */
export async function renderFigmaTemplate(options: FigmaRenderOptions): Promise<FigmaAsset> {
  const { assetType, campaignVersionId } = options;

  const template = FIGMA_TEMPLATES[assetType as keyof typeof FIGMA_TEMPLATES];
  if (!template) {
    throw new Error(`No Figma template configured for asset type: ${assetType}`);
  }

  // Check if template is configured
  if (template.fileKey === "YOUR_FILE_KEY_HERE") {
    throw new Error(
      `Figma template not configured for ${assetType}. ` +
      `Please update FIGMA_TEMPLATES in figmaService.ts with your Figma file keys and node IDs.`
    );
  }

  try {
    // Export the Figma node as PNG
    const figmaImageUrl = await exportFigmaNode(
      template.fileKey,
      template.nodeId,
      "png",
      2 // 2x scale for high quality
    );

    // Download and upload to S3
    const fileKey = `generated/${campaignVersionId}/${assetType}/figma-${nanoid()}.png`;
    const { url, key } = await downloadAndUploadToS3(figmaImageUrl, fileKey, "image/png");

    return {
      assetUrl: url,
      assetKey: key,
      thumbnailUrl: url, // Could generate a smaller thumbnail if needed
      width: template.width,
      height: template.height,
      format: "png",
      templateId: `${template.fileKey}:${template.nodeId}`
    };

  } catch (error) {
    console.error("[Figma] Template render failed:", error);
    throw new Error(`Failed to render Figma template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * List available Figma templates (for debugging/admin)
 */
export function listFigmaTemplates(): Record<string, any> {
  return FIGMA_TEMPLATES;
}
