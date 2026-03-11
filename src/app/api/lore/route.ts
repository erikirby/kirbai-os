import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'vault', 'lore', 'lore.json');

// Ensure DB exists
const ensureLoreDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const dir = path.dirname(DB_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DB_PATH, JSON.stringify({ nodes: [], edges: [], history: [] }, null, 2));
        }
    } catch (e) {
        console.error("Lore DB init error:", e);
    }
};

export async function GET() {
    ensureLoreDB();
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (e: any) {
        return NextResponse.json({ nodes: [], edges: [], history: [] });
    }
}

export async function POST(req: Request) {
    ensureLoreDB();
    try {
        const body = await req.json();
        
        // We expect the frontend to send the full updated state: { nodes, edges, history }
        if (!body.nodes || !body.edges) throw new Error("Missing nodes or edges");

        fs.writeFileSync(DB_PATH, JSON.stringify(body, null, 2));
        
        return NextResponse.json({ success: true, updated: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to save lore graph" }, { status: 500 });
    }
}
