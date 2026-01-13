/**
 * List available Gemini models
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not set");
    console.log("Set it with: export GEMINI_API_KEY='your-key-here'");
    process.exit(1);
  }

  console.log("🔍 Listing available Gemini models...\n");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log("✅ Available models:\n");
    
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model) => {
        const supportsGenerate = model.supportedGenerationMethods?.includes("generateContent");
        if (supportsGenerate) {
          console.log(`  ✓ ${model.name}`);
          console.log(`    Display Name: ${model.displayName}`);
          console.log(`    Description: ${model.description}`);
          console.log(`    Methods: ${model.supportedGenerationMethods.join(", ")}`);
          console.log();
        }
      });
    } else {
      console.log("No models found");
    }
    
  } catch (error) {
    console.error("❌ Error listing models:", error.message);
    process.exit(1);
  }
}

listModels();
