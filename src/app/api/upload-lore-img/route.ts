import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean filename of spaces and special chars
        let origName = (file as any).name || 'uploaded_image.png';
        origName = origName.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const filename = `${Date.now()}-${origName}`;

        const uploadDir = path.join(process.cwd(), 'public', 'vault', 'lore');
        
        // Ensure directory exists
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        // Return the public URL path
        return NextResponse.json({ url: `/vault/lore/${filename}` });
    } catch (e: any) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: e.message || 'Failed to upload image' }, { status: 500 });
    }
}
