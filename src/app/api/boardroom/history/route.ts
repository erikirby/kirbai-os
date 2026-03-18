import { NextResponse } from 'next/server';
import { getBoardroomHistoryAsync } from "@/lib/db";

export async function GET() {
    try {
        const history = await getBoardroomHistoryAsync();
        return NextResponse.json(history);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
