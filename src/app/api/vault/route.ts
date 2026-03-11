import { NextResponse } from 'next/server';
import { getRow, setRow } from '@/lib/db';

const VALID_TYPES = ['projects', 'lyrics'];

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (!type || !VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const data = await getRow(`vault_${type}`) ?? [];

        return NextResponse.json({ data });
    } catch (e: any) {
        console.error("Vault GET Error:", e);
        return NextResponse.json({ error: "Failed to read vault" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, payload } = body;

        if (!type || !VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        // Write to Supabase persistence
        await setRow(`vault_${type}`, payload);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Vault POST Error:", e);
        return NextResponse.json({ error: "Failed to write to vault" }, { status: 500 });
    }
}
