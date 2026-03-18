import { NextResponse } from 'next/server';
import { getAuditLedgerAsync } from "@/lib/db";

export async function GET() {
    try {
        const ledger = await getAuditLedgerAsync();
        return NextResponse.json(ledger);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
