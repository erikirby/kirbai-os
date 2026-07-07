import { NextRequest, NextResponse } from "next/server";

// Site-wide password gate (HTTP Basic Auth).
// Uses the SITE_PASSWORD env var that already exists in the project.
// - If SITE_PASSWORD is unset, the gate is disabled (local dev convenience).
// - The weekly backup cron path is excluded via the matcher (it has its own secret).
// Browser will prompt once and remember; username can be anything.

export function middleware(req: NextRequest) {
    const pass = process.env.SITE_PASSWORD;
    if (!pass) return NextResponse.next();

    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Basic ")) {
        try {
            const decoded = atob(auth.slice(6));
            const idx = decoded.indexOf(":");
            const pwd = idx >= 0 ? decoded.slice(idx + 1) : decoded;
            if (pwd === pass) return NextResponse.next();
        } catch { /* fall through to 401 */ }
    }

    return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Kirbai OS"' },
    });
}

export const config = {
    matcher: [
        // Everything except static assets and the cron-secured backup route
        "/((?!_next/static|_next/image|favicon.ico|assets|api/admin/backup).*)",
    ],
};
