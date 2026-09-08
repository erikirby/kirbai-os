import { NextRequest, NextResponse } from 'next/server';


// AI routes to rate limit (protects Gemini API from abuse)
const AI_ROUTES = [
    '/api/generate-lore-action',
    '/api/generate-content',
    '/api/generate-metadata',
    '/api/strategic-advice',
    '/api/synthesize-analytics',
    '/api/parse-roadmap',
    '/api/batch-lyrics',
    '/api/format-lyric',
];

// In-memory rate limiter: 30 AI calls per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    if (entry.count >= LIMIT) return true;
    entry.count++;
    return false;
}

const AUTH_COOKIE = 'kos';
// Endpoints that authenticate themselves (cron/manual ?secret=) stay open.
const AUTH_EXEMPT = ['/api/admin/backup', '/api/admin/restore'];

export function proxy(req: NextRequest) {
    const { pathname, searchParams, origin } = req.nextUrl;

    // Access gate. Inert until KIRBAI_OS_SECRET is set, so it never locks
    // anyone out unexpectedly. Once set, every page and API route requires the
    // `kos` cookie. Authenticate once by visiting any URL with ?kos=<secret>.
    const secret = process.env.KIRBAI_OS_SECRET;
    if (secret && !AUTH_EXEMPT.some(p => pathname.startsWith(p))) {
        if (searchParams.get(AUTH_COOKIE) === secret) {
            const clean = req.nextUrl.clone();
            clean.searchParams.delete(AUTH_COOKIE);
            const res = NextResponse.redirect(clean);
            res.cookies.set(AUTH_COOKIE, secret, {
                httpOnly: true,
                secure: origin.startsWith('https'),
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 180,
            });
            return res;
        }
        if (req.cookies.get(AUTH_COOKIE)?.value !== secret) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return new NextResponse('Unauthorized. Append ?kos=<secret> to sign in.', {
                status: 401,
                headers: { 'content-type': 'text/plain' },
            });
        }
    }

    // Rate limit AI endpoints
    if (AI_ROUTES.some(r => pathname.startsWith(r))) {
        const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Slow down.' },
                { status: 429 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
};
