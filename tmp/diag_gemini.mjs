import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Manual env parsing since we don't know if dotenv is available top-level
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const apiKey = process.env.GEMINI_API_KEY;
console.log(`[DIAG] API Key found: ${apiKey ? (apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4)) : 'MISSING'}`);

if (!apiKey) {
    console.error("[DIAG] No API key in .env.local!");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testCall() {
    try {
        console.log("[DIAG] Calling Gemini models/list...");
        const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: "Hello, reply with 'OS_OK'" }] }]
        });
        
        console.log("[DIAG] Success!");
        console.log("[DIAG] Response:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("[DIAG] FAIL!");
        console.error("[DIAG] Error Message:", e.message);
        if (e.response) {
            console.error("[DIAG] Response Data:", JSON.stringify(e.response, null, 2));
        }
    }
}

testCall();
