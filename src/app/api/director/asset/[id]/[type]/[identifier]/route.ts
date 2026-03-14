import { NextRequest, NextResponse } from 'next/server';
import { getMissionAssetAsync } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, type: string, identifier: string }> }
) {
    try {
        const { id, type, identifier } = await params;

        if (!id || !type || !identifier) {
            return new NextResponse("Missing parameters", { status: 400 });
        }

        const base64 = await getMissionAssetAsync(id, type as any, identifier);

        if (!base64) {
            return new NextResponse("Asset not found", { status: 404 });
        }

        // Extract mime type and data
        const matches = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
        if (!matches || matches.length !== 3) {
            // Fallback: if it's not a data URL, return as text (unlikely but safe)
            return new NextResponse(base64, { status: 200 });
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e: any) {
        console.error("Asset API Error:", e);
        return new NextResponse(e.message, { status: 500 });
    }
}
