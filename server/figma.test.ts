import { describe, expect, it } from "vitest";

describe("Figma API Integration", () => {
  it("should validate Figma API token by fetching user info", async () => {
    const token = process.env.FIGMA_ACCESS_TOKEN;
    
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    
    // Test API connection by fetching user info
    const response = await fetch("https://api.figma.com/v1/me", {
      headers: {
        "X-Figma-Token": token!
      }
    });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("email");
    
    console.log(`✅ Figma API connected successfully for user: ${data.email}`);
  });
});
