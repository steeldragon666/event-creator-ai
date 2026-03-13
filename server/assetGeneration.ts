import { generateImage } from "./_core/imageGeneration";
import { generateImageWithFallback, selectModelForAssetType } from "./openRouterImageGen";
import { storagePut } from "./storage";
import { GeneratedDNATokens, buildAssetPrompt } from "./campaignDNA";
import { CampaignVersion } from "../drizzle/schema";
import { generateTemplate, ASSET_SPECS, TemplateRenderOptions } from "./templateRenderer";
import { renderFigmaTemplate, FIGMA_TEMPLATES } from "./figmaService";
import { nanoid } from "nanoid";

export interface AssetGenerationOptions {
  campaignVersionId: number;
  version: CampaignVersion;
  archetype: string;
  dnaTokens: GeneratedDNATokens;
  basePrompt: string;
  styleModifiers: string[];
  assetType: string;
  engine: "structured" | "generative";
  copy: {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
  };
  logos?: Array<{ url: string; position: "header" | "footer" | "corner" }>;
}

export interface GeneratedAsset {
  assetUrl: string;
  assetKey: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  format: string;
  promptUsed?: string | null;
  templateId?: string | null;
}

/**
 * Generate an asset using the specified engine (structured or generative)
 */
export async function generateAsset(options: AssetGenerationOptions): Promise<GeneratedAsset> {
  const { engine, assetType, campaignVersionId } = options;
  
  if (engine === "structured") {
    return generateStructuredAsset(options);
  } else {
    return generateGenerativeAsset(options);
  }
}

/**
 * Generate asset using structured template renderer (Figma or fallback to HTML templates)
 */
async function generateStructuredAsset(options: AssetGenerationOptions): Promise<GeneratedAsset> {
  const { assetType } = options;
  
  // Try Figma first if template is configured
  const figmaTemplate = FIGMA_TEMPLATES[assetType as keyof typeof FIGMA_TEMPLATES];
  if (figmaTemplate && figmaTemplate.fileKey !== "YOUR_FILE_KEY_HERE") {
    try {
      return await generateFigmaAsset(options);
    } catch (error) {
      console.warn(`[AssetGen] Figma render failed for ${assetType}, falling back to HTML templates:`, error);
      // Fall through to HTML template renderer
    }
  }
  
  // Fallback to HTML template renderer
  return generateHTMLTemplateAsset(options);
}

/**
 * Generate asset using Figma API
 */
async function generateFigmaAsset(options: AssetGenerationOptions): Promise<GeneratedAsset> {
  const { assetType, version, dnaTokens, copy, campaignVersionId } = options;
  
  const figmaAsset = await renderFigmaTemplate({
    campaignVersionId,
    assetType,
    dnaTokens,
    copy,
    eventName: version.eventName,
    eventDate: version.eventStartDate.toLocaleDateString(),
    venue: version.venue || undefined,
    logoUrl: version.logoUrl || undefined
  });
  
  return figmaAsset;
}

/**
 * Generate asset using HTML template renderer (fallback)
 */
async function generateHTMLTemplateAsset(options: AssetGenerationOptions): Promise<GeneratedAsset> {
   const { assetType, version, dnaTokens, copy, campaignVersionId, logos } = options;
  
  const specs = ASSET_SPECS[assetType];
  if (!specs) {
    throw new Error(`Unknown asset type: ${assetType}`);
  }
  
  // Select template based on archetype and DNA
  const templateId = selectTemplateId(options.archetype, dnaTokens);
  
  // Generate HTML/CSS template
  const renderOptions: TemplateRenderOptions = {
    templateId,
    dnaTokens,
    version,
    assetType,
    width: specs.width,
    height: specs.height,
    copy,
    logos
  };
  
  const template = generateTemplate(renderOptions);
  
  // In production, we would use Puppeteer/Playwright to render HTML to PNG
  // For now, we'll use a placeholder approach
  // TODO: Implement actual HTML-to-PNG rendering using Playwright MCP
  
  // For MVP, we'll generate a text-based image using the generative engine
  // but with strict layout constraints from the template
  const templatePrompt = `Create a ${assetType.replace('_', ' ')} promotional image with this EXACT layout:

${template.html}

STRICT REQUIREMENTS:
- Dimensions: ${specs.width}x${specs.height}px
- Use EXACT colors from palette: ${JSON.stringify(dnaTokens.palette)}
- Typography: ${dnaTokens.typography.headlineFont} for headlines, ${dnaTokens.typography.bodyFont} for body
- Layout density: ${dnaTokens.layout.density}
- Safe zone: ${dnaTokens.layout.safeZonePct * 100}% margin
- Logo placement: ${dnaTokens.layout.logoZone}
- CTA style: ${dnaTokens.layout.ctaStyle}

Text must be PERFECTLY LEGIBLE with high contrast.
This is a structured, professional design - NOT artistic or abstract.`;

  const { url } = await generateImage({
    prompt: templatePrompt
  });
  
  if (!url) {
    throw new Error("Failed to generate image: No URL returned");
  }
  
  // Upload to S3 with proper path structure
  const fileKey = `generated/${campaignVersionId}/${assetType}/structured_${nanoid()}.png`;
  
  // In production, we would download the generated image and re-upload to our S3
  // For now, we'll use the URL directly
  
  return {
    assetUrl: url,
    assetKey: fileKey,
    width: specs.width,
    height: specs.height,
    format: specs.format,
    templateId
  };
}

/**
 * Generate asset using generative AI with text compositing
 */
async function generateGenerativeAsset(options: AssetGenerationOptions): Promise<GeneratedAsset> {
  const { assetType, version, dnaTokens, basePrompt, styleModifiers, copy, campaignVersionId } = options;
  
  const specs = ASSET_SPECS[assetType];
  if (!specs) {
    throw new Error(`Unknown asset type: ${assetType}`);
  }
  
  // Build comprehensive prompt using Campaign DNA
  const fullPrompt = buildAssetPrompt(
    dnaTokens,
    basePrompt,
    styleModifiers,
    assetType,
    version.eventName,
    `
Event: ${version.eventName}
Artists: ${version.headliners.join(", ")}
Date: ${version.eventStartDate.toLocaleDateString()}
Venue: ${version.venue || 'TBD'}

Copy to include:
${copy.headline ? `Headline: "${copy.headline}"` : ''}
${copy.subheadline ? `Subheadline: "${copy.subheadline}"` : ''}
${copy.cta ? `CTA: "${copy.cta}"` : ''}

CRITICAL: Generate the BACKGROUND ART ONLY without text overlays. 
Text will be composited separately to ensure perfect legibility.
Focus on creating a stunning visual that matches the ${dnaTokens.emotionalTone} emotional tone.
    `
  );
  
  // Generate background image using OpenRouter with intelligent model selection
  const model = selectModelForAssetType(assetType);
  console.log(`[AssetGen] Generating ${assetType} with OpenRouter model: ${model}`);
  
  const { url: backgroundUrl } = await generateImageWithFallback({
    prompt: fullPrompt,
    model,
    size: `${specs.width}x${specs.height}`,
    quality: "hd",
    style: "vivid",
  });
  
  if (!backgroundUrl) {
    throw new Error("Failed to generate image: No URL returned");
  }
  
  // Convert base64 data URL to buffer and upload to S3
  let finalAssetUrl: string;
  let finalAssetKey: string;
  
  if (backgroundUrl.startsWith('data:')) {
    // Extract base64 data from data URL
    const matches = backgroundUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Invalid base64 data URL format");
    }
    
    const [, imageType, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to S3
    const fileKey = `generated/${campaignVersionId}/${assetType}/generative_${nanoid()}.${imageType}`;
    const { url: s3Url } = await storagePut(fileKey, imageBuffer, `image/${imageType}`);
    
    finalAssetUrl = s3Url;
    finalAssetKey = fileKey;
    
    console.log(`[AssetGen] Uploaded generated image to S3: ${s3Url}`);
  } else {
    // If it's already a URL (shouldn't happen with OpenRouter), use it directly
    finalAssetUrl = backgroundUrl;
    finalAssetKey = `generated/${campaignVersionId}/${assetType}/generative_${nanoid()}.png`;
  }
  
  return {
    assetUrl: finalAssetUrl,
    assetKey: finalAssetKey,
    width: specs.width,
    height: specs.height,
    format: specs.format,
    promptUsed: fullPrompt
  };
}

/**
 * Generate both A and B options for an asset type
 */
export async function generateAssetOptions(options: Omit<AssetGenerationOptions, 'engine'>): Promise<{
  optionA: GeneratedAsset;
  optionB: GeneratedAsset;
}> {
  // Generate Option A (Structured)
  const optionA = await generateAsset({
    ...options,
    engine: "structured"
  });
  
  // Generate Option B (Generative)
  const optionB = await generateAsset({
    ...options,
    engine: "generative"
  });
  
  return { optionA, optionB };
}

/**
 * Select appropriate template ID based on archetype and DNA
 */
function selectTemplateId(archetype: string, dnaTokens: GeneratedDNATokens): string {
  const archetypeMap: Record<string, string[]> = {
    club_night: ['neon-minimal', 'dark-bold', 'techno-grid'],
    festival: ['outdoor-vibrant', 'lineup-showcase', 'summer-energy'],
    show: ['concert-spotlight', 'intimate-venue', 'stage-focus']
  };
  
  const templates = archetypeMap[archetype] || ['default-minimal'];
  
  // Select based on density and imagery style
  if (dnaTokens.layout.density === 'tight' && dnaTokens.imagery.style.includes('minimal')) {
    return templates[0];
  } else if (dnaTokens.imagery.lighting === 'dramatic') {
    return templates[1];
  } else {
    return templates[2] || templates[0];
  }
}

/**
 * Generate thumbnail from asset URL
 */
export async function generateThumbnail(assetUrl: string, assetKey: string): Promise<string> {
  // TODO: Implement thumbnail generation
  // In production, we would:
  // 1. Download the asset
  // 2. Resize to thumbnail dimensions (e.g., 400x400)
  // 3. Upload to S3 with _thumb suffix
  
  // For MVP, return the original URL
  return assetUrl;
}
