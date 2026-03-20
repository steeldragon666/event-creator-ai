import { generateImageWithFallback, IMAGE_MODELS } from './server/openRouterImageGen';
import dotenv from 'dotenv';
dotenv.config();

async function testImageGen() {
  console.log("Testing Image Generation with OpenRouter...");
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || apiKey === 'your_openrouter_api_key') {
    console.error("❌ OPENROUTER_API_KEY is not set or still has placeholder value.");
    return;
  }

  console.log("API Key found. Attempting generation...");

  try {
    const testOptions = {
      prompt: "A professional, high-end visual for a 'Techno Sunrise' beach party. Modern, sleek, vibrant colors, minimalist typography style background.",
      model: IMAGE_MODELS.NANO_BANANA_PRO,
      size: "1024x1024",
      quality: "hd" as const
    };

    console.log(`\n1. Calling generateImageWithFallback...`);
    const result = await generateImageWithFallback(testOptions);
    
    console.log("✅ Image generation successful!");
    console.log(`   Model Used: ${result.model}`);
    console.log(`   URL: ${result.url}`);
    
    if (result.url.startsWith('data:')) {
        console.log("   (Visual returned as base64 data URL)");
    }

  } catch (error) {
    console.error("\n❌ Image generation test failed:");
    console.error(error);
  }
}

testImageGen();
