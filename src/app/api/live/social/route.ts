import { NextResponse } from 'next/server';
import { getMetaLive } from '@/lib/meta-live';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const force = new URL(req.url).searchParams.get('force') === '1';
    const live = await getMetaLive(force);
    if (!live) return NextResponse.json({ success: false, error: 'META_ACCESS_TOKEN is not set' }, { status: 503 });
    return NextResponse.json({ success: !live.error || !!live.instagram, live });
}
