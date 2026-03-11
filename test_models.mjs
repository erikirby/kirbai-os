import { GoogleGenAI } from '@google/genai';

async function listModels() {
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || '');
  // The SDK might not have a direct listModels helper that works without specific config, 
  // but we can try to hit a known model or use the fetch API to the endpoint.

  // Actually, I'll just try gemini-1.5-flash again with a simple ping.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const result = await model.generateContent("ping");
    console.log("gemini-1.5-flash: SUCCESS");
  } catch (e) {
    console.log("gemini-1.5-flash: FAIL - " + e.message);
  }

  const model8b = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
  try {
    const result = await model8b.generateContent("ping");
    console.log("gemini-1.5-flash-8b: SUCCESS");
  } catch (e) {
    console.log("gemini-1.5-flash-8b: FAIL - " + e.message);
  }
}

listModels();
