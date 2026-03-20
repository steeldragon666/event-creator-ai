import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

interface TextElement {
  content: string;
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    opacity: number;
    fontFamily: string;
  };
  position: { x: number; y: number };
}

export interface CompositorOptions {
  baseImageBuffer: Buffer;
  targetWidth: number;
  targetHeight: number;
  textElements: TextElement[];
  bannerText?: string;
  bannerColor?: string;
  sponsorLogos?: { buffer: Buffer; position: { x: number; y: number; width: number; height: number } }[];
  colorShift?: number;
  backgroundOpacity?: number;
}

export async function compositeAsset(options: CompositorOptions): Promise<Buffer> {
  const { 
    baseImageBuffer, targetWidth, targetHeight, textElements, 
    bannerText, bannerColor, sponsorLogos, colorShift, backgroundOpacity 
  } = options;

  let base = sharp(baseImageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "attention"
    });

  if (colorShift !== undefined && colorShift !== 0) {
    base = base.modulate({ hue: colorShift });
  }

  const compositeInputs: sharp.OverlayOptions[] = [];

  // Generate SVG overlay for text elements
  if (textElements.length > 0) {
    const textSvgParts = textElements.map(element => {
      // Very basic text rendering in SVG
      return `<text x="${element.position.x}" y="${element.position.y}" font-family="${element.style.fontFamily}" font-weight="${element.style.fontWeight}" font-size="${element.style.fontSize}px" fill="${element.style.color}" fill-opacity="${element.style.opacity || 1}">${escapeXml(element.content)}</text>`;
    });

    const svgTextOverlay = `
      <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
        ${textSvgParts.join("\n")}
      </svg>
    `;

    compositeInputs.push({
      input: Buffer.from(svgTextOverlay),
      gravity: "northwest",
    });
  }

  // Generate SVG banner overlay if needed
  if (bannerText) {
    const bannerHeight = 80;
    const svgBanner = `
      <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${targetWidth}" height="${bannerHeight}" fill="${bannerColor || '#000000'}" fill-opacity="0.8" />
        <text x="${targetWidth / 2}" y="${bannerHeight / 2 + 8}" font-family="Arial, sans-serif" font-weight="bold" font-size="28px" fill="#FFFFFF" text-anchor="middle">${escapeXml(bannerText)}</text>
      </svg>
    `;
    compositeInputs.push({
      input: Buffer.from(svgBanner),
      gravity: "northwest"
    });
  }

  // Add logos
  if (sponsorLogos && sponsorLogos.length > 0) {
    for (const logo of sponsorLogos) {
      const resizedLogo = await sharp(logo.buffer)
        .resize(logo.position.width, logo.position.height, { fit: 'contain' })
        .toBuffer();

      compositeInputs.push({
        input: resizedLogo,
        left: Math.round(logo.position.x),
        top: Math.round(logo.position.y),
      });
    }
  }

  return base.composite(compositeInputs).png().toBuffer();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
