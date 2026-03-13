import { GeneratedDNATokens } from "./campaignDNA";
import { CampaignVersion } from "../drizzle/schema";

export interface TemplateRenderOptions {
  templateId: string;
  dnaTokens: GeneratedDNATokens;
  version: CampaignVersion;
  assetType: string;
  width: number;
  height: number;
  copy: {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
    date?: string;
    venue?: string;
  };
  logos?: Array<{ url: string; position: "header" | "footer" | "corner" }>;
}

export interface RenderedTemplate {
  html: string;
  css: string;
  width: number;
  height: number;
}

/**
 * Asset specifications for each type
 */
export const ASSET_SPECS: Record<string, { width: number; height: number; format: string }> = {
  instagram_post: { width: 1080, height: 1080, format: "png" },
  instagram_story: { width: 1080, height: 1920, format: "png" },
  facebook_ad: { width: 1200, height: 628, format: "png" },
  facebook_banner: { width: 820, height: 312, format: "png" },
  ticketing_banner: { width: 1200, height: 400, format: "png" },
  website_banner: { width: 1920, height: 600, format: "png" },
  flyer_a4: { width: 2480, height: 3508, format: "png" },
  flyer_a3: { width: 3508, height: 4961, format: "png" },
};

/**
 * Generate HTML/CSS template for structured rendering
 */
export function generateTemplate(options: TemplateRenderOptions): RenderedTemplate {
  const { dnaTokens, version, assetType, width, height, copy, logos } = options;
  
  // Calculate safe zone
  const safeZone = Math.floor(Math.min(width, height) * dnaTokens.layout.safeZonePct);
  
  // Determine layout based on archetype and preferences
  const isVertical = height > width;
  const isSquare = Math.abs(width - height) < 100;
  
  // Build CSS
  const css = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${dnaTokens.palette.background};
      color: ${dnaTokens.palette.text};
      font-family: ${dnaTokens.typography.bodyFont}, sans-serif;
      overflow: hidden;
      position: relative;
    }
    
    .container {
      width: 100%;
      height: 100%;
      padding: ${safeZone}px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    
    .background-pattern {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0.1;
      z-index: 0;
    }
    
    .content {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: ${dnaTokens.spacing.scale[3]}px;
    }
    
    .headline {
      font-family: ${dnaTokens.typography.headlineFont}, sans-serif;
      font-size: ${dnaTokens.typography.scale.h1}px;
      font-weight: 900;
      letter-spacing: ${dnaTokens.typography.tracking.headline}em;
      line-height: 0.9;
      color: ${dnaTokens.palette.primary};
      text-transform: uppercase;
      margin-bottom: ${dnaTokens.spacing.scale[2]}px;
    }
    
    .subheadline {
      font-size: ${dnaTokens.typography.scale.h2}px;
      font-weight: 700;
      color: ${dnaTokens.palette.secondary};
      margin-bottom: ${dnaTokens.spacing.scale[3]}px;
    }
    
    .artists {
      font-size: ${dnaTokens.typography.scale.h3}px;
      font-weight: 600;
      color: ${dnaTokens.palette.accent};
      margin-bottom: ${dnaTokens.spacing.scale[2]}px;
    }
    
    .details {
      font-size: ${dnaTokens.typography.scale.body}px;
      letter-spacing: ${dnaTokens.typography.tracking.body}em;
      color: ${dnaTokens.palette.text};
      opacity: 0.9;
      margin-bottom: ${dnaTokens.spacing.scale[3]}px;
    }
    
    .cta {
      display: inline-block;
      padding: ${dnaTokens.spacing.scale[2]}px ${dnaTokens.spacing.scale[4]}px;
      background: ${dnaTokens.palette.accent};
      color: ${dnaTokens.palette.background};
      font-size: ${dnaTokens.typography.scale.body}px;
      font-weight: 700;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      ${dnaTokens.layout.ctaStyle === 'pill' ? 'border-radius: 999px;' : ''}
      ${dnaTokens.layout.ctaStyle === 'sharp' ? 'border-radius: 0;' : ''}
      ${dnaTokens.layout.ctaStyle === 'outline' ? `
        background: transparent;
        border: 3px solid ${dnaTokens.palette.accent};
        color: ${dnaTokens.palette.accent};
      ` : ''}
    }
    
    .logo-container {
      position: absolute;
      ${dnaTokens.layout.logoZone === 'header' ? 'top: ' + safeZone + 'px; left: ' + safeZone + 'px;' : ''}
      ${dnaTokens.layout.logoZone === 'footer' ? 'bottom: ' + safeZone + 'px; left: ' + safeZone + 'px;' : ''}
      ${dnaTokens.layout.logoZone === 'corner' ? 'top: ' + safeZone + 'px; right: ' + safeZone + 'px;' : ''}
      z-index: 2;
    }
    
    .logo {
      max-width: ${Math.floor(width * 0.15)}px;
      max-height: ${Math.floor(height * 0.1)}px;
      object-fit: contain;
    }
    
    .accent-bar {
      position: absolute;
      background: ${dnaTokens.palette.accent};
      ${isVertical ? `
        width: 8px;
        height: 100%;
        left: 0;
        top: 0;
      ` : `
        width: 100%;
        height: 8px;
        left: 0;
        bottom: 0;
      `}
    }
    
    .motif-element {
      position: absolute;
      opacity: 0.15;
      ${dnaTokens.imagery.style.includes('geometric') ? `
        width: ${Math.floor(width * 0.3)}px;
        height: ${Math.floor(width * 0.3)}px;
        background: ${dnaTokens.palette.secondary};
        transform: rotate(45deg);
        top: -${Math.floor(width * 0.15)}px;
        right: -${Math.floor(width * 0.15)}px;
      ` : ''}
    }
  `;
  
  // Build HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${css}</style>
    </head>
    <body>
      <div class="accent-bar"></div>
      <div class="motif-element"></div>
      
      ${logos && logos.length > 0 ? `
        <div class="logo-container">
          ${logos.map(logo => `<img src="${logo.url}" class="logo" alt="Logo" />`).join('')}
        </div>
      ` : ''}
      
      <div class="container">
        <div class="content">
          ${copy.headline ? `<h1 class="headline">${escapeHtml(copy.headline)}</h1>` : ''}
          
          ${version.headliners.length > 0 ? `
            <div class="artists">${escapeHtml(version.headliners.join(' • '))}</div>
          ` : ''}
          
          ${copy.subheadline ? `<h2 class="subheadline">${escapeHtml(copy.subheadline)}</h2>` : ''}
          
          <div class="details">
            ${copy.date || formatEventDate(version)}<br/>
            ${copy.venue || version.venue || ''} ${version.city ? `• ${version.city}` : ''}
          </div>
          
          ${copy.body ? `<p class="body">${escapeHtml(copy.body)}</p>` : ''}
          
          ${copy.cta ? `<a href="#" class="cta">${escapeHtml(copy.cta)}</a>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return {
    html,
    css,
    width,
    height
  };
}

/**
 * Get template IDs for an archetype
 */
export function getTemplateIdsForArchetype(archetype: string): string[] {
  const baseTemplates = ['minimal', 'bold', 'elegant', 'energetic', 'underground'];
  
  const archetypeTemplates: Record<string, string[]> = {
    club_night: ['neon', 'dark', 'vibrant', 'techno', 'house'],
    festival: ['outdoor', 'colorful', 'massive', 'summer', 'lineup'],
    show: ['concert', 'intimate', 'venue', 'spotlight', 'stage']
  };
  
  return [...baseTemplates, ...(archetypeTemplates[archetype] || [])];
}

/**
 * Helper: Format event date
 */
function formatEventDate(version: CampaignVersion): string {
  const start = version.eventStartDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  if (version.eventEndDate) {
    const end = version.eventEndDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    return `${start} - ${end}`;
  }
  
  if (version.startTime) {
    return `${start} • ${version.startTime}`;
  }
  
  return start;
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m] || m);
}
