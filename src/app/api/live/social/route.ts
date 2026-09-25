import { NextResponse } from 'next/server';
import { getMetaLive } from '@/lib/meta-live';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const force = new URL(req.url).searchParams.get('force') === '1';
    const live = await getMetaLive(force);
    if (!live) return NextResponse.json({ success: false, error: 'Live social data unavailable' }, { status: 503 });
    return NextResponse.json({ success: !live.error || !!live.instagram, live });
}
