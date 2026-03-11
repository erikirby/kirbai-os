import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper to ensure file exists and return path
async function getFilePath(filename: string) {
    // Traverse out of .next/server/app/api/vault/ to get to the project root
    const dataDir = path.join(process.cwd(), 'data', 'vault');
    const filePath = path.join(dataDir, filename);

    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }

    try {
        await fs.access(filePath);
    } catch {
        // Init with empty array if doesn't exist
        await fs.writeFile(filePath, '[]', 'utf-8');
    }

    return filePath;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        if (type !== 'projects' && type !== 'lyrics') {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const filePath = await getFilePath(`${type}.json`);
        const data = await fs.readFile(filePath, 'utf-8');

        return NextResponse.json({ data: JSON.parse(data) });
    } catch (e: any) {
        console.error("Vault GET Error:", e);
        return NextResponse.json({ error: "Failed to read vault" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, payload } = body;

        if (type !== 'projects' && type !== 'lyrics') {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const filePath = await getFilePath(`${type}.json`);

        // Write entire new array/object payload replacing the old file
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Vault POST Error:", e);
        return NextResponse.json({ error: "Failed to write to vault" }, { status: 500 });
    }
}
