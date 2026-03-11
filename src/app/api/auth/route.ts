import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { password } = await req.json();

    if (password === process.env.SITE_PASSWORD) {
        const res = NextResponse.json({ success: true });
        res.cookies.set('kirbai_auth', process.env.SITE_PASSWORD!, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/'
        });
        return res;
    }

    return NextResponse.json({ success: false, error: 'Wrong password' }, { status: 401 });
}
