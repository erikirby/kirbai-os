import { NextResponse } from "next/server";
import { getTelemetryAsync, resetTelemetryAsync } from "@/lib/db";

export async function GET() {
    try {
        const telemetry = await getTelemetryAsync();
        return NextResponse.json({ success: true, data: telemetry });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        if (action === "reset") {
            const initial = await resetTelemetryAsync();
            return NextResponse.json({ success: true, data: initial });
        }

        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
