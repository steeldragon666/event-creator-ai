import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Available image generation models on OpenRouter
 */
export const IMAGE_MODELS = {
  NANO_BANANA_PRO: "google/gemini-3-pro-image-preview", // Primary: Best for text rendering and professional assets
  FLUX_2_PRO: "black-forest-labs/flux.2-pro", // Secondary: High-end visual quality
  FLUX_2_FLEX: "black-forest-labs/flux.2-flex", // Tertiary: Excellent for complex text and typography
  DALLE_3: "openai/dall-e-3", // Fallback: Reliable alternative
} as const;

export type ImageModel = typeof IMAGE_MODELS[keyof typeof IMAGE_MODELS];

export interface OpenRouterImageOptions {
  prompt: string;
  model?: ImageModel;
  size?: string; // e.g., "1024x1024", "1920x1080"
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

export interface OpenRouterImageResult {
  url: string;
  model: string;
  revisedPrompt?: string;
}

/**
 * Generate image using OpenRouter API with specified model
 */
export async function generateImageWithOpenRouter(
  options: OpenRouterImageOptions
): Promise<OpenRouterImageResult> {
  const {
    prompt,
    model = IMAGE_MODELS.NANO_BANANA_PRO, // Default to Nano Banana Pro
    size = "1024x1024",
    quality = "hd",
    style = "vivid",
  } = options;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  try {
    console.log(`[OpenRouter] Generating image with model: ${model}`);
    
    // OpenRouter uses chat completions endpoint for image generation
    // MUST include modalities: ["image", "text"] for image generation
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt, // Simple string prompt for image generation
          },
        ],
        modalities: ["image", "text"], // REQUIRED for image generation
        // Image-specific parameters for Gemini models
        image_config: {
          aspect_ratio: size === "1920x1080" ? "16:9" : "1:1",
          image_size: quality === "hd" ? "2K" : "1K",
        },
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://event-creator-ai.manus.space",
          "X-Title": "Event Creator AI",
        },
      }
    );

    // Extract image URL from response
    // OpenRouter returns images in message.images array with base64 data URLs
    const message = response.data.choices?.[0]?.message;
    
    if (!message) {
      throw new Error("No response from OpenRouter API");
    }

    // Check if response contains images
    if (!message.images || message.images.length === 0) {
      console.error("[OpenRouter] Response:", JSON.stringify(response.data, null, 2));
      throw new Error("No images found in OpenRouter response");
    }

    // Get the first generated image
    const imageUrl = message.images[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("[OpenRouter] Image object:", JSON.stringify(message.images[0], null, 2));
      throw new Error("No image URL found in image object");
    }

    return {
      url: imageUrl,
      model,
      revisedPrompt: message.revised_prompt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[OpenRouter] API Error:", error.response?.data || error.message);
      throw new Error(
        `OpenRouter API error: ${error.response?.data?.error?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Generate image with automatic fallback between models
 */
export async function generateImageWithFallback(
  options: OpenRouterImageOptions
): Promise<OpenRouterImageResult> {
  const models: ImageModel[] = [
    IMAGE_MODELS.NANO_BANANA_PRO,
    IMAGE_MODELS.FLUX_2_PRO,
    IMAGE_MODELS.FLUX_2_FLEX,
  ];

  let lastError: Error | undefined;

  for (const model of models) {
    try {
      console.log(`[OpenRouter] Attempting generation with ${model}`);
      return await generateImageWithOpenRouter({ ...options, model });
    } catch (error) {
      console.warn(`[OpenRouter] Failed with ${model}:`, error);
      lastError = error as Error;
      // Continue to next model
    }
  }

  throw new Error(
    `All image generation models failed. Last error: ${lastError?.message}`
  );
}

/**
 * Select best model for asset type
 */
export function selectModelForAssetType(assetType: string): ImageModel {
  // Nano Banana Pro is best for assets with text (event names, dates, etc.)
  if (assetType.includes("post") || assetType.includes("story") || assetType.includes("banner")) {
    return IMAGE_MODELS.NANO_BANANA_PRO;
  }

  // FLUX.2 for artistic/creative assets
  if (assetType.includes("creative") || assetType.includes("artistic")) {
    return IMAGE_MODELS.FLUX_2_PRO;
  }

  // Default to Nano Banana Pro
  return IMAGE_MODELS.NANO_BANANA_PRO;
}
