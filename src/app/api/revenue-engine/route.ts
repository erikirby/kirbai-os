import { NextResponse } from "next/server";
import { getRow, setRow } from "@/lib/db";

// Revenue Engine persistence. Analysis is computed client-side (deterministic math,
// no AI) and stored here per-mode so it survives sessions.

const key = (mode: string) => `revenue_engine_${mode === "factory" ? "factory" : "kirbai"}`;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "kirbai";
        const stored = await getRow(key(mode));
        return NextResponse.json({ analysis: stored });
    } catch {
        return NextResponse.json({ error: "Failed to retrieve stored analysis" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mode, analysis } = body;
        if (!analysis || !analysis.kpis) {
            return NextResponse.json({ error: "No analysis payload provided." }, { status: 400 });
        }
        await setRow(key(mode || "kirbai"), analysis);
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to save analysis" }, { status: 500 });
    }
}
