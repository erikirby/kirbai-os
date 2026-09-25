import { NextResponse } from 'next/server';
import { applyOps, getContext, OPS_HELP, type Op } from '@/lib/kirbai-ops';

export const dynamic = 'force-dynamic';

// Optional shared key: if KIRBAI_AI_KEY is set on the server, writes must send it as x-kirbai-key.
function allowed(req: Request) {
    const key = process.env.KIRBAI_AI_KEY;
    return !key || req.headers.get('x-kirbai-key') === key || new URL(req.url).searchParams.get('key') === key;
}

/** GET /api/ai -> current plans as JSON. GET /api/ai?format=md -> the same as a readable brief. */
export async function GET(req: Request) {
    const ctx = await getContext();
    if (new URL(req.url).searchParams.get('format') === 'md') {
        return new NextResponse(`${ctx.markdown}\n\n---\n${OPS_HELP}\n`, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }
    return NextResponse.json({ success: true, howToUpdate: OPS_HELP, ...ctx });
}

/** POST /api/ai {ops:[...], source} -> applies each op and reports what happened. */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const ops: Op[] = Array.isArray(body) ? body : Array.isArray(body.ops) ? body.ops : body.op ? [body] : [];
        // Dismissing a note from the Home page is harmless housekeeping; every other change needs the key.
        const housekeepingOnly = ops.length > 0 && ops.every(o => o.op === 'dismiss_note');
        if (!housekeepingOnly && !allowed(req)) return NextResponse.json({ success: false, error: 'Missing or wrong x-kirbai-key' }, { status: 401 });
        if (!ops.length) return NextResponse.json({ success: false, error: 'Send {"ops":[...]}', help: OPS_HELP }, { status: 400 });
        const { results } = await applyOps(ops, String(body.source || 'ai').slice(0, 40));
        return NextResponse.json({ success: results.every(r => r.ok), results });
    } catch (e) {
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
