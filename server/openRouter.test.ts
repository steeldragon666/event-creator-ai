import { describe, expect, it } from "vitest";
import {
  generateImageWithOpenRouter,
  generateImageWithFallback,
  selectModelForAssetType,
  IMAGE_MODELS,
} from "./openRouterImageGen";

describe("OpenRouter Image Generation", () => {
  it("should select Nano Banana Pro for post assets", () => {
    const model = selectModelForAssetType("instagram_post");
    expect(model).toBe(IMAGE_MODELS.NANO_BANANA_PRO);
  });

  it("should select Nano Banana Pro for story assets", () => {
    const model = selectModelForAssetType("instagram_story");
    expect(model).toBe(IMAGE_MODELS.NANO_BANANA_PRO);
  });

  it("should select Nano Banana Pro for banner assets", () => {
    const model = selectModelForAssetType("ticket_banner");
    expect(model).toBe(IMAGE_MODELS.NANO_BANANA_PRO);
  });

  it("should generate image with Nano Banana Pro", async () => {
    const result = await generateImageWithOpenRouter({
      prompt: "A vibrant electronic music event poster with neon colors and futuristic design",
      model: IMAGE_MODELS.NANO_BANANA_PRO,
      size: "1080x1080",
      quality: "hd",
      style: "vivid",
    });

    expect(result).toBeDefined();
    expect(result.url).toBeTruthy();
    expect(result.model).toBe(IMAGE_MODELS.NANO_BANANA_PRO);
    console.log("[Test] Generated image URL:", result.url);
  }, 60000); // 60 second timeout for API call

  it("should fallback to alternative models if primary fails", async () => {
    // Test with a deliberately complex prompt that might fail on some models
    const result = await generateImageWithFallback({
      prompt: "Ultra-detailed cyberpunk music festival with holographic stage, neon lights, and crowd silhouettes",
      size: "1920x1080",
      quality: "hd",
      style: "vivid",
    });

    expect(result).toBeDefined();
    expect(result.url).toBeTruthy();
    expect(result.model).toBeTruthy();
    console.log("[Test] Fallback generated image with model:", result.model);
    console.log("[Test] Image URL:", result.url);
  }, 120000); // 120 second timeout for fallback attempts
});
