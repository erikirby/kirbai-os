import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        console.log("Testing Gemini 1.5 Flash...");
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: "Hello, can you hear me?",
            config: {
                systemInstruction: "You are a helpful assistant.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        reply: { type: Type.STRING }
                    },
                    required: ["reply"]
                }
            }
        });
        console.log("RESPONSE:", response.text);
    } catch (e) {
        console.error("GEMINI FAILED:");
        console.error(e);
    }
}
test();
