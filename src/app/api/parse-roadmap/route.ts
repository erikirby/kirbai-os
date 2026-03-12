import { NextResponse } from 'next/server';
import { saveRoadmapAsync, getRoadmapAsync, logApiUsage } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || undefined;
        const { rawText, currentPhases, currentTasks } = await request.json();

        if (!rawText) {
            return NextResponse.json({ success: false, error: "Missing roadmap text block" }, { status: 400 });
        }

        const existingContext = (currentPhases?.length || currentTasks?.length)
            ? `CURRENT ROADMAP STATE (you may modify, reorder, add to, or remove items based on the new input):\n${JSON.stringify({ phases: currentPhases, tasks: currentTasks }, null, 2)}\n\n`
            : '';

        const systemPrompt = `You are a ruthlessly concise roadmap parser.
Your job: take the user's raw text input and output a clean JSON roadmap. You may be editing an existing roadmap or building a new one.

Rules:
- Respond ONLY with valid JSON. No markdown, no commentary.
- Phase titles: 2-4 words max.
- Phase descriptions: 1 tight sentence max.
- Tasks: MAXIMUM 5 words each. Use telegraphic style. (e.g. "Release Bye Bye Butterfree", "Film Pheromosa sterile lore drop", "Launch Pink Bois EP")
- Do NOT pad or stylize. Be brutally direct.
- If an existing roadmap is provided, use it as the base. The new input may add phases/tasks, reorder them, change statuses, or remove items — apply intelligently.
- Status must be EXACTLY one of: "Current Objective", "Pending Trajectory", "Completed", "Archived"

Schema:
{
  "phases": [
    {
      "id": "phase-1",
      "title": "Short Title",
      "description": "One tight sentence.",
      "status": "Current Objective"
    }
  ],
  "tasks": [
    "Max 5 word task"
  ]
}`;

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'user', parts: [{ text: `${existingContext}NEW INPUT:\n\n${rawText}` }] }
            ],
            config: { responseMimeType: "application/json" }
        });

        const textOutput = response.text || "";

        try {
            const inputTokens = systemPrompt.length + rawText.length;
            const outputTokens = textOutput.length;
            logApiUsage('/api/parse-roadmap', inputTokens, outputTokens);

            const structuredData = JSON.parse(textOutput);

            if (!structuredData.phases || !Array.isArray(structuredData.phases)) {
                throw new Error("Invalid schema returned: Missing phases array");
            }
            if (!structuredData.tasks || !Array.isArray(structuredData.tasks)) {
                throw new Error("Invalid schema returned: Missing tasks array");
            }

            const existingStatusMap = new Map<string, string>();
            (currentTasks || []).forEach((t: any) => {
                if (t?.text) existingStatusMap.set(t.text.toLowerCase(), t.status || 'todo');
            });

            const taskObjects = structuredData.tasks.map((t: any, i: number) => {
                const text = typeof t === 'string' ? t : t.text;
                const existing = existingStatusMap.get(text.toLowerCase());
                return { id: `task-${Date.now()}-${i}`, text, status: existing || 'todo' };
            });

            const finalData = { phases: structuredData.phases, tasks: taskObjects };

            // Use async save so it actually persists on Vercel
            await saveRoadmapAsync(finalData, mode);

            return NextResponse.json({ success: true, data: finalData });
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON output:", textOutput);
            return NextResponse.json({ success: false, error: "Failed to parse roadmap logic. AI returned invalid JSON." }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Roadmap parsing error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to parse roadmap" }, { status: 500 });
    }
}
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || undefined;
        const roadmap = await getRoadmapAsync(mode);
        return NextResponse.json({ success: true, data: roadmap });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Failed to load roadmap" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || undefined;
        const { taskId, status } = await request.json();
        const roadmap = await getRoadmapAsync(mode);
        const tasks = roadmap.tasks as any[];
        const idx = tasks.findIndex((t: any) => t.id === taskId);
        if (idx === -1) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
        tasks[idx].status = status;
        await saveRoadmapAsync({ phases: roadmap.phases, tasks }, mode);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Failed to update task status" }, { status: 500 });
    }
}
