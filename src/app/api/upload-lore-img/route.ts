import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        // Return the Data URL instead of a file path
        return NextResponse.json({ url: dataUrl });
    } catch (e: any) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: e.message || 'Failed to process image' }, { status: 500 });
    }
}
