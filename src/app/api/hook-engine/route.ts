import { NextResponse } from "next/server";
import { getRow, setRow, logApiUsageAsync } from "@/lib/db";
import { safeCallGemini, extractJsonFromText } from "@/lib/intel";
import { HOOK_FRAMEWORK } from "@/lib/hooks";

const HISTORY_KEY = "hook_engine_history";

export async function GET() {
    try {
        const history = (await getRow(HISTORY_KEY)) || [];
        return NextResponse.json({ history });
    } catch {
        return NextResponse.json({ history: [] });
    }
}

export async function POST(req: Request) {
    try {
        const { action, song, character, notes, concept } = await req.json();

        if (action === "generate") {
            const prompt = `${HOOK_FRAMEWORK}

TASK: Generate 6 hook concepts. Privately generate the obvious first idea and DISCARD
it — output only ideas at least two steps past obvious. Then output the best 5.
${song ? `SONG: "${song}" — the hook must make a cold viewer want this song.` : ""}
${character ? `CHARACTER: ${character}. Apply tier rules — if niche, pair with an S-tier co-star or S-tier concept.` : "CHARACTER: choose per the weighting rules; vary across concepts."}
${notes ? `ERIK'S NOTES: ${notes}` : ""}

Every concept must run on at least two attention mechanics and must NOT be an anti-hook.
Vary archetypes across the 5. Every shot described must contain motion or a state
change — never a static beat.

Return ONLY JSON:
{ "concepts": [ { "name": "", "archetype": "", "frame1": "what is on screen at 0.0s — instantly legible + the one deviant element", "sec0to3": "motion/tension already in progress", "second5": "the state change timed to the drop", "openLoop": "the question the viewer now needs answered", "butThen": "mid-video twist that chains the next loop", "arousal": "which high-arousal emotion", "character": "pick + one-clause tier justification", "coldCheck": "one sentence proving a zero-context viewer parses frame 1" } ] }`;

            const res = await safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });
            const data = JSON.parse(extractJsonFromText(res.text || "{}"));
            if (!Array.isArray(data.concepts) || data.concepts.length === 0) {
                throw new Error("Model returned no concepts — try again.");
            }
            await logApiUsageAsync("hook-engine/generate", 0, 0);
            // persist to history (last 20 entries)
            try {
                const history = (await getRow(HISTORY_KEY)) || [];
                history.unshift({ ts: new Date().toISOString(), action, song, character, notes, result: data });
                await setRow(HISTORY_KEY, history.slice(0, 20));
            } catch { /* history is best-effort */ }
            return NextResponse.json(data);
        }

        if (action === "score") {
            if (!concept?.trim()) return NextResponse.json({ error: "Nothing to score." }, { status: 400 });
            const prompt = `${HOOK_FRAMEWORK}

TASK: Score this hook/concept ruthlessly against the framework. If it resembles a
measured failure (anti-hook), say which one and cite its number. Do not be polite —
Erik wants the truth, delivered constructively.

CONCEPT TO SCORE:
"""${concept}"""
${song ? `SONG: "${song}"` : ""}

Score 1–5 on each axis. Any axis ≤3 REQUIRES a concrete fix (a rewritten beat, not
advice). Then write the strongest version of this same concept in 2–3 sentences.

Return ONLY JSON:
{ "verdict": "one blunt sentence", "total": 0-35, "axes": [ { "axis": "Frame-1 legibility", "score": 0, "note": "", "fix": "" }, { "axis": "One deviant element", "score": 0, "note": "", "fix": "" }, { "axis": "Gap opened by 3s", "score": 0, "note": "", "fix": "" }, { "axis": "Second-5 shift", "score": 0, "note": "", "fix": "" }, { "axis": "Arousal level", "score": 0, "note": "", "fix": "" }, { "axis": "Cold-viewer safety", "score": 0, "note": "", "fix": "" }, { "axis": "Character tier", "score": 0, "note": "", "fix": "" } ], "strongestVersion": "" }`;

            const res = await safeCallGemini("gemini-2.5-flash", {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });
            const data = JSON.parse(extractJsonFromText(res.text || "{}"));
            if (!Array.isArray(data.axes)) throw new Error("Model returned no scorecard — try again.");
            await logApiUsageAsync("hook-engine/score", 0, 0);
            try {
                const history = (await getRow(HISTORY_KEY)) || [];
                history.unshift({ ts: new Date().toISOString(), action, concept: concept.slice(0, 200), result: data });
                await setRow(HISTORY_KEY, history.slice(0, 20));
            } catch { /* best-effort */ }
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Hook Engine failed." }, { status: 500 });
    }
}
