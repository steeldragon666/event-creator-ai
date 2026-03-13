import { invokeLLM } from "./_core/llm";
import { CampaignVersion } from "../drizzle/schema";

export interface GeneratedDNARaw {
  moodDescriptors: string[];
  references: string[];
  motifSuggestions: string[];
  typographyStyleSuggestions: string[];
  compositionGuidance: Record<string, string>;
  doNots: string[];
}

export interface GeneratedDNATokens {
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headlineFont: string;
    bodyFont: string;
    scale: { h1: number; h2: number; h3: number; body: number };
    tracking: { headline: number; body: number };
    style: string;
  };
  spacing: {
    unit: number;
    scale: number[];
  };
  layout: {
    density: "tight" | "medium" | "spacious";
    safeZonePct: number;
    logoZone: "header" | "footer" | "corner";
    ctaStyle: "pill" | "sharp" | "outline";
  };
  imagery: {
    style: string;
    grain: "none" | "low" | "medium" | "high";
    lighting: "flat" | "high-contrast" | "dramatic";
    avoid: string[];
  };
  visualMotifs: string[];
  emotionalTone: string;
}

export interface GeneratedDNA {
  raw: GeneratedDNARaw;
  tokens: GeneratedDNATokens;
  basePrompt: string;
  styleModifiers: string[];
}

/**
 * Generate Campaign DNA using Claude API with both raw descriptive output and deterministic tokens
 */
export async function generateCampaignDNA(version: CampaignVersion, archetype: string): Promise<GeneratedDNA> {
  const systemPrompt = `You are an expert creative director specializing in event marketing and brand identity design. Your task is to create a comprehensive "Campaign DNA" - a visual identity system that will ensure all promotional materials for an event have a consistent, cohesive look and feel.

Analyze the event details provided and generate a complete visual identity specification that includes:

1. **Raw Creative Output** (human-readable, descriptive):
   - Mood descriptors (emotional qualities)
   - Visual references (art movements, styles, cultural touchpoints)
   - Motif suggestions (geometric, abstract, organic elements)
   - Typography style suggestions (bold, elegant, condensed, etc.)
   - Composition guidance per platform
   - Do-nots (things to avoid)

2. **Deterministic Design Tokens** (machine-readable, precise):
   - Color palette (exact hex codes)
   - Typography system (font descriptors, scale, tracking)
   - Spacing system (base unit, scale array)
   - Layout primitives (density, safe zones, logo placement, CTA style)
   - Imagery rules (style, grain, lighting, avoid list)
   - Visual motifs and emotional tone

3. **Master Prompt** for consistent AI image generation
4. **Style Modifiers** (keywords for generation)

Your output must be valid JSON matching the exact structure provided.`;

  const userPrompt = `Create a Campaign DNA for this ${archetype.replace('_', ' ')} event:

**Event Details:**
- Archetype: ${archetype.replace('_', ' ')}
- Name: ${version.eventName}
- Dates: ${version.eventStartDate.toLocaleDateString()} ${version.eventEndDate ? `to ${version.eventEndDate.toLocaleDateString()}` : ''}
- Time: ${version.startTime || 'TBD'} ${version.endTime ? `- ${version.endTime}` : ''}
- Venue: ${version.venue || 'TBD'} ${version.city ? `in ${version.city}` : ''}

**Music & Vibe:**
- Primary Genre: ${version.primaryGenre}
${version.subGenres ? `- Sub-genres: ${version.subGenres.join(", ")}` : ''}
${version.vibeKeywords ? `- Vibe Keywords: ${version.vibeKeywords.join(", ")}` : ''}

**Artists:**
- Headliners: ${version.headliners.join(", ")}
${version.supportLineup ? `- Support: ${version.supportLineup.join(", ")}` : ''}
- Billing: ${version.billingOrder}

**Branding:**
- Brand Colors: ${version.brandColors.join(", ")}
- Tone: ${version.tone}
- CTA: ${version.ctaPreference}
${version.mustIncludeText ? `- Must Include: ${version.mustIncludeText}` : ''}

**Layout Preferences:**
- Overall: ${version.layoutPreference}
- Artist Photos: ${version.artistPhotoUsage}
- Sponsor Lockup: ${version.sponsorLockup}
- Safe Zone: ${version.safeZoneStrictness}

**Platforms:** ${version.promotionalPlatforms.join(", ")}

Generate a complete Campaign DNA that will create a stunning, cohesive visual identity. The design should be elegant and perfect in execution, matching the ${version.tone} tone and ${archetype.replace('_', ' ')} archetype.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "campaign_dna",
        strict: true,
        schema: {
          type: "object",
          properties: {
            raw: {
              type: "object",
              properties: {
                moodDescriptors: { type: "array", items: { type: "string" } },
                references: { type: "array", items: { type: "string" } },
                motifSuggestions: { type: "array", items: { type: "string" } },
                typographyStyleSuggestions: { type: "array", items: { type: "string" } },
                compositionGuidance: {
                  type: "object",
                  additionalProperties: { type: "string" }
                },
                doNots: { type: "array", items: { type: "string" } }
              },
              required: ["moodDescriptors", "references", "motifSuggestions", "typographyStyleSuggestions", "compositionGuidance", "doNots"],
              additionalProperties: false
            },
            tokens: {
              type: "object",
              properties: {
                palette: {
                  type: "object",
                  properties: {
                    primary: { type: "string" },
                    secondary: { type: "string" },
                    accent: { type: "string" },
                    background: { type: "string" },
                    text: { type: "string" }
                  },
                  required: ["primary", "secondary", "accent", "background", "text"],
                  additionalProperties: false
                },
                typography: {
                  type: "object",
                  properties: {
                    headlineFont: { type: "string" },
                    bodyFont: { type: "string" },
                    scale: {
                      type: "object",
                      properties: {
                        h1: { type: "number" },
                        h2: { type: "number" },
                        h3: { type: "number" },
                        body: { type: "number" }
                      },
                      required: ["h1", "h2", "h3", "body"],
                      additionalProperties: false
                    },
                    tracking: {
                      type: "object",
                      properties: {
                        headline: { type: "number" },
                        body: { type: "number" }
                      },
                      required: ["headline", "body"],
                      additionalProperties: false
                    },
                    style: { type: "string" }
                  },
                  required: ["headlineFont", "bodyFont", "scale", "tracking", "style"],
                  additionalProperties: false
                },
                spacing: {
                  type: "object",
                  properties: {
                    unit: { type: "number" },
                    scale: { type: "array", items: { type: "number" } }
                  },
                  required: ["unit", "scale"],
                  additionalProperties: false
                },
                layout: {
                  type: "object",
                  properties: {
                    density: { type: "string", enum: ["tight", "medium", "spacious"] },
                    safeZonePct: { type: "number" },
                    logoZone: { type: "string", enum: ["header", "footer", "corner"] },
                    ctaStyle: { type: "string", enum: ["pill", "sharp", "outline"] }
                  },
                  required: ["density", "safeZonePct", "logoZone", "ctaStyle"],
                  additionalProperties: false
                },
                imagery: {
                  type: "object",
                  properties: {
                    style: { type: "string" },
                    grain: { type: "string", enum: ["none", "low", "medium", "high"] },
                    lighting: { type: "string", enum: ["flat", "high-contrast", "dramatic"] },
                    avoid: { type: "array", items: { type: "string" } }
                  },
                  required: ["style", "grain", "lighting", "avoid"],
                  additionalProperties: false
                },
                visualMotifs: { type: "array", items: { type: "string" } },
                emotionalTone: { type: "string" }
              },
              required: ["palette", "typography", "spacing", "layout", "imagery", "visualMotifs", "emotionalTone"],
              additionalProperties: false
            },
            basePrompt: { type: "string" },
            styleModifiers: { type: "array", items: { type: "string" } }
          },
          required: ["raw", "tokens", "basePrompt", "styleModifiers"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate Campaign DNA: No response from AI");
  }

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const dna = JSON.parse(contentStr) as GeneratedDNA;
  return dna;
}

/**
 * Build a complete prompt for asset generation using Campaign DNA tokens
 */
export function buildAssetPrompt(
  tokens: GeneratedDNATokens,
  basePrompt: string,
  styleModifiers: string[],
  assetType: string,
  eventName: string,
  additionalContext?: string
): string {
  const assetSpecs: Record<string, string> = {
    instagram_post: "square format (1080x1080), optimized for Instagram feed, eye-catching and shareable",
    instagram_story: "vertical format (1080x1920), designed for Instagram stories, immersive and engaging",
    facebook_ad: "landscape format (1200x628), optimized for Facebook ads, clear call-to-action",
    facebook_banner: "wide banner format (820x312), designed for Facebook page cover",
    ticketing_banner: "wide banner format (1200x400), designed for ticketing platforms, event details prominent",
    website_banner: "hero banner format (1920x600), designed for website headers, dramatic and inviting",
    flyer_a4: "portrait format (2480x3508), printable A4 flyer design, all essential information included",
    flyer_a3: "portrait format (3508x4961), printable A3 poster design, bold and attention-grabbing"
  };

  const spec = assetSpecs[assetType] || "promotional material";

  let prompt = `${basePrompt}

Create a ${spec} for the event "${eventName}".

DESIGN SYSTEM (MUST FOLLOW EXACTLY):

Color Palette:
- Primary: ${tokens.palette.primary}
- Secondary: ${tokens.palette.secondary}
- Accent: ${tokens.palette.accent}
- Background: ${tokens.palette.background}
- Text: ${tokens.palette.text}

Typography:
- Headline: ${tokens.typography.headlineFont}, ${tokens.typography.scale.h1}px, tracking ${tokens.typography.tracking.headline}
- Subheading: ${tokens.typography.scale.h2}px
- Body: ${tokens.typography.bodyFont}, ${tokens.typography.scale.body}px, tracking ${tokens.typography.tracking.body}
- Style: ${tokens.typography.style}

Layout:
- Density: ${tokens.layout.density}
- Safe zone margin: ${tokens.layout.safeZonePct * 100}% from edges
- Logo placement: ${tokens.layout.logoZone}
- CTA button style: ${tokens.layout.ctaStyle}
- Spacing scale: ${tokens.spacing.scale.join(", ")}px

Imagery:
- Style: ${tokens.imagery.style}
- Grain: ${tokens.imagery.grain}
- Lighting: ${tokens.imagery.lighting}

Visual Elements:
- Motifs: ${tokens.visualMotifs.join(", ")}
- Emotional tone: ${tokens.emotionalTone}
- Style modifiers: ${styleModifiers.join(", ")}

DO NOT INCLUDE: ${tokens.imagery.avoid.join(", ")}

${additionalContext || ""}

The design MUST be elegant, professional, and perfectly executed with exact adherence to the design system.`;

  return prompt;
}
