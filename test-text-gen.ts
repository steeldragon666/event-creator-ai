import { invokeLLM } from './server/_core/llm';
import dotenv from 'dotenv';
dotenv.config();

async function testTextGen() {
  console.log("Testing text generation with Anthropic...");
  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: "Write a 2-sentence story about a robot learning to paint." }],
      maxTokens: 100
    });
    console.log("✅ Text Response:", response.choices[0]?.message?.content);

  } catch (error: any) {
    console.error("❌ Error caught:");
    if (error.status) {
      console.error(JSON.stringify(error, null, 2));
    } else {
      console.error(error);
    }
  }
}

testTextGen();
