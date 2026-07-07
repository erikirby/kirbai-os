import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Full database export as a downloadable JSON file — a REAL backup that lives
// OUTSIDE Supabase (unlike /api/admin/backup which writes into the same DB).
// Usage: /api/admin/export?secret=kirbai_backup_safe  → browser downloads the file.

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== "kirbai_backup_safe") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const tables = ["persistence", "lore_nodes", "lore_edges"];
    const dump: Record<string, any[]> = {};
    const errors: Record<string, string> = {};

    for (const table of tables) {
        const rows: any[] = [];
        const PAGE = 200;
        try {
            for (let from = 0; ; from += PAGE) {
                const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
                if (error) { errors[table] = error.message || "read failed"; break; }
                if (!data || data.length === 0) break;
                rows.push(...data);
                if (data.length < PAGE) break;
            }
            dump[table] = rows;
        } catch (e: any) {
            errors[table] = e?.message || "unexpected failure";
        }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const payload = {
        exportedAt: new Date().toISOString(),
        project: "kirbai-os",
        tables: dump,
        errors: Object.keys(errors).length ? errors : undefined,
    };

    return new NextResponse(JSON.stringify(payload), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="kirbai-backup-${stamp}.json"`,
        },
    });
}
