import { invokeLLM } from "./_core/llm";
import { CampaignVersion } from "../drizzle/schema";
import { GeneratedDNATokens } from "./campaignDNA";

export interface GeneratedCopyVariants {
  headlines: Array<{ content: string; variant: number }>;
  ctas: Array<{ content: string; variant: number }>;
  bodyTexts: Array<{ content: string; platform: string; variant: number }>;
  hashtags: Array<{ content: string; variant: number }>;
}

/**
 * Generate copy variants (headlines, CTAs, body text, hashtags) using Claude
 */
export async function generateCopyVariants(
  version: CampaignVersion,
  dnaTokens: GeneratedDNATokens,
  archetype: string
): Promise<GeneratedCopyVariants> {
  const systemPrompt = `You are an expert copywriter specializing in event marketing and promotional content. Your task is to create compelling, platform-optimized copy that matches the event's tone and visual identity.

Generate multiple variants for each copy type to give the user options. All copy must:
- Match the specified tone (${version.tone})
- Align with the emotional tone: ${dnaTokens.emotionalTone}
- Be appropriate for the ${archetype.replace('_', ' ')} archetype
- Include the preferred CTA: ${version.ctaPreference}
${version.includeHashtags ? '- Include relevant hashtags' : '- Exclude hashtags'}
${version.includePresentedBy && version.presentedByText ? `- Include "Presented by ${version.presentedByText}"` : ''}

Your output must be valid JSON matching the exact structure provided.`;

  const userPrompt = `Create promotional copy for this event:

**Event Details:**
- Name: ${version.eventName}
- Dates: ${version.eventStartDate.toLocaleDateString()} ${version.eventEndDate ? `to ${version.eventEndDate.toLocaleDateString()}` : ''}
- Venue: ${version.venue || 'TBD'} ${version.city ? `in ${version.city}` : ''}

**Music & Artists:**
- Genre: ${version.primaryGenre} ${version.subGenres ? `(${version.subGenres.join(", ")})` : ''}
- Headliners: ${version.headliners.join(", ")}
${version.supportLineup ? `- Support: ${version.supportLineup.join(", ")}` : ''}

**Vibe:** ${version.vibeKeywords ? version.vibeKeywords.join(", ") : 'energetic, exciting'}

**Tone:** ${version.tone}
**CTA:** ${version.ctaPreference}
${version.mustIncludeText ? `**Must Include:** ${version.mustIncludeText}` : ''}

**Platforms:** ${version.promotionalPlatforms.join(", ")}

Generate:
1. **3 headline variants** - Short, punchy, attention-grabbing (max 60 characters)
2. **3 CTA variants** - Clear call-to-action phrases
3. **Body text for each platform** - Platform-optimized descriptions (Instagram, Facebook, etc.)
4. **3 hashtag sets** - Relevant, searchable hashtags (if applicable)

Make the copy ${version.tone}, compelling, and perfectly suited to a ${archetype.replace('_', ' ')} event.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "copy_variants",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headlines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  variant: { type: "number" }
                },
                required: ["content", "variant"],
                additionalProperties: false
              }
            },
            ctas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  variant: { type: "number" }
                },
                required: ["content", "variant"],
                additionalProperties: false
              }
            },
            bodyTexts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  platform: { type: "string" },
                  variant: { type: "number" }
                },
                required: ["content", "platform", "variant"],
                additionalProperties: false
              }
            },
            hashtags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  variant: { type: "number" }
                },
                required: ["content", "variant"],
                additionalProperties: false
              }
            }
          },
          required: ["headlines", "ctas", "bodyTexts", "hashtags"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate copy variants: No response from AI");
  }

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const variants = JSON.parse(contentStr) as GeneratedCopyVariants;
  return variants;
}

/**
 * Generate ticket phase-specific copy
 */
export async function generateTicketPhaseCopy(
  version: CampaignVersion,
  phaseName: string,
  dnaTokens: GeneratedDNATokens
): Promise<Array<{ content: string; variant: number }>> {
  const systemPrompt = `You are an expert copywriter creating urgency-driven copy for ticket sales phases. Generate compelling, time-sensitive copy that encourages immediate action.`;

  const userPrompt = `Create 3 promotional copy variants for the "${phaseName}" ticket phase of ${version.eventName}.

Event: ${version.eventName}
Date: ${version.eventStartDate.toLocaleDateString()}
Artists: ${version.headliners.join(", ")}
Tone: ${version.tone}
Phase: ${phaseName}

Each variant should:
- Create urgency appropriate to the phase
- Include the event name and key artists
- Match the ${version.tone} tone
- Be concise (max 120 characters)
- Encourage ${version.ctaPreference} action`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ticket_phase_copy",
        strict: true,
        schema: {
          type: "object",
          properties: {
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  variant: { type: "number" }
                },
                required: ["content", "variant"],
                additionalProperties: false
              }
            }
          },
          required: ["variants"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate ticket phase copy: No response from AI");
  }

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentStr) as { variants: Array<{ content: string; variant: number }> };
  return result.variants;
}
