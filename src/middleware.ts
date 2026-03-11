import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth'];

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

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow login page and auth API through
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Check for valid auth cookie
    const auth = req.cookies.get('kirbai_auth');
    if (auth?.value !== process.env.SITE_PASSWORD) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
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
