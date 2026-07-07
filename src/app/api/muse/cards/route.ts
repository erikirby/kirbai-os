import { NextResponse } from "next/server";
import { getMuseCardsAsync, saveMuseCardsAsync, addRoadmapTaskAsync, MuseCard } from "@/lib/db";

// Server-side persistence for the Muse deck. MuseDeck previously wrote to
// Supabase directly from the browser via the public anon key — this route
// replaces that so RLS can be enabled on all tables.

export async function GET() {
    try {
        const cards = await getMuseCardsAsync();
        return NextResponse.json({ cards });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to load cards" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { action, cards, mode, title, description } = await req.json();
        if (action === "saveCards") {
            await saveMuseCardsAsync(cards as MuseCard[]);
            return NextResponse.json({ ok: true });
        }
        if (action === "addRoadmapTask") {
            await addRoadmapTaskAsync(mode || "kirbai", title, description);
            return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Failed to save" }, { status: 500 });
    }
}
