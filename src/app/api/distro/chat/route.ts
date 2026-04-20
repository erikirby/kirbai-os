import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { safeCallGemini } from '@/lib/intel';
import { logApiUsageAsync } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { messages, mode } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        const systemInstruction = `
            You are the Elite Kirbai OS Distro Optimizer.
            Your role is to craft and iteratively refine platform-specific content for: TikTok, YouTube Shorts, Instagram Reels, and Facebook.
            
            Current Mode: ${mode === 'kirbai' ? 'Brand "Kirbai"' : 'Music Factory ("AELOW" / "KURAO")'}
            
            1. You MUST use the Google Search tool to look up CURRENT algorithm trends, highly-searched keywords, and active hashtags related to the user's concept. NEVER hallucinate random aesthetic hashtags like #highfashionhorror. Only use tags that have proven search volume or current relevancy. Include a VERY BRIEF summary of what you found out via search in your conversational 'reply'.
            2. You are managing a persistent state block (the JSON output). 
            3. Each time the user prompts you, you must return:
               - 'reply': A conversational response acknowledging their instruction and explaining what you searched/found. Format using basic markdown.
               - 'platforms': The updated 4 content blocks. Each block should have the full final copy (Hook, Body, Tags/Keywords). Emojis and spacing should be tailored to the platform.
               
            PLATFORM RULES:
            - TikTok: Extremely short, punchy hook. Max 3-5 hyper-relevant tags.
            - YouTube Shorts: SEO heavy. Use keywords naturally in paragraphs. 3 tags at the end.
            - Instagram Reels: Aesthetic-focused. Use spacing. Include a localized community tag if relevant.
            - Facebook: Broader reach, engagement questions. Less reliant on hashtags.
        `;

        // Format conversation history for Gemini multi-turn format
        const history = messages.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));

        // The user's last message is taken out of history to be sent as the new prompt
        const lastMessage = history.pop()?.parts[0]?.text || "Hello";

        const response = await safeCallGemini("gemini-2.5-flash", {
            contents: lastMessage,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        reply: { type: Type.STRING, description: "Your conversational response to the user, formatted in markdown." },
                        platforms: {
                            type: Type.OBJECT,
                            properties: {
                                tiktok: { type: Type.STRING },
                                youtube: { type: Type.STRING },
                                instagram: { type: Type.STRING },
                                facebook: { type: Type.STRING },
                            },
                            required: ["tiktok", "youtube", "instagram", "facebook"]
                        }
                    },
                    required: ["reply", "platforms"]
                }
            }
        });

        if (response.usageMetadata) {
            await logApiUsageAsync("/api/distro/chat", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }

        const textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
        
        if (!textResponse) {
             throw new Error("AI returned no text.");
        }

        const parsedResponse = JSON.parse(textResponse);

        return NextResponse.json({ 
            success: true, 
            reply: parsedResponse.reply,
            platforms: parsedResponse.platforms
        });

    } catch (error: any) {
        console.error("Distro Chat Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
    }
}
