import { NextRequest, NextResponse } from 'next/server';
import { getBrandIdentityAsync, saveBrandIdentityAsync } from '@/lib/db';

export async function GET() {
    try {
        return NextResponse.json(await getBrandIdentityAsync('kirbai'));
    } catch (error) {
        console.error('Error reading identity:', error);
        return NextResponse.json({ error: 'Failed to read identity' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        await saveBrandIdentityAsync(body);

        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('Error saving identity:', error);
        return NextResponse.json({ error: 'Failed to save identity' }, { status: 500 });
    }
}
