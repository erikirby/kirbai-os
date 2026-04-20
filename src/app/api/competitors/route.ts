import { NextResponse } from 'next/server';
import { getCompetitorsAsync, saveCompetitorsAsync, CompetitorProfile } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const mode = url.searchParams.get('mode') || 'kirbai';
        const cols = await getCompetitorsAsync(mode);
        return NextResponse.json({ competitors: cols });
    } catch (e: any) {
        console.error("Failed to load competitors:", e);
        return NextResponse.json({ error: "Failed to load competitors" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const mode = url.searchParams.get('mode') || 'kirbai';
        const body = await req.json();
        
        const competitors = await getCompetitorsAsync(mode);
        const newCompetitor: CompetitorProfile = {
            id: body.id || `comp_${Date.now()}`,
            name: body.name,
            platform: body.platform,
            handleUrl: body.handleUrl,
            notes: body.notes || "",
            createdAt: body.createdAt || new Date().toISOString()
        };
        
        competitors.unshift(newCompetitor);
        await saveCompetitorsAsync(mode, competitors);
        
        return NextResponse.json({ success: true, competitor: newCompetitor });
    } catch (e: any) {
        console.error("Failed to save competitor:", e);
        return NextResponse.json({ error: "Failed to save competitor" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const mode = url.searchParams.get('mode') || 'kirbai';
        const id = url.searchParams.get('id');
        
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        
        const competitors = await getCompetitorsAsync(mode);
        const filtered = competitors.filter(c => c.id !== id);
        await saveCompetitorsAsync(mode, filtered);
        
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Failed to delete competitor:", e);
        return NextResponse.json({ error: "Failed to delete competitor" }, { status: 500 });
    }
}
