import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROMPTS_PATH = path.join(process.cwd(), 'data', 'vault', 'prompts.json');

function getPrompts() {
    try {
        if (!fs.existsSync(PROMPTS_PATH)) {
            const initial = { universal: [], categories: {} };
            fs.writeFileSync(PROMPTS_PATH, JSON.stringify(initial, null, 2));
            return initial;
        }
        return JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf-8'));
    } catch (e) {
        return { universal: [], categories: {} };
    }
}

export async function GET() {
    const data = getPrompts();
    return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const dir = path.dirname(PROMPTS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(PROMPTS_PATH, JSON.stringify(body, null, 2));
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
