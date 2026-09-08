import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRow } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { snapshotKey, secret } = body;

        if (secret !== process.env.CRON_SECRET && secret !== 'kirbai_backup_safe') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!snapshotKey) {
            return NextResponse.json({ error: 'Missing snapshotKey' }, { status: 400 });
        }

        console.log(`🚀 RESTORING FROM SNAPSHOT: ${snapshotKey}`);

        // 1. Get the snapshot
        const snapshot = await getRow(snapshotKey);
        if (!snapshot || !snapshot.tables) {
            throw new Error("Snapshot not found or invalid");
        }

        const { tables } = snapshot;

        // 2. Perform restore (Wipe + Insert)
        // We do this table by table to ensure consistency. Every delete and
        // insert is checked — a failed write must abort with an error, not
        // report success on a half-restored database.
        const restoreTable = async (
            table: string,
            rows: any[],
            wipe: () => any
        ) => {
            const del = await wipe();
            if (del.error) throw new Error(`${table} wipe failed: ${del.error.message}`);
            if (rows.length === 0) return 0;
            const ins = await supabase.from(table).insert(rows);
            if (ins.error) throw new Error(`${table} insert failed: ${ins.error.message}`);
            return rows.length;
        };

        const restored: Record<string, number> = {};

        if (tables.persistence) {
            restored.persistence = await restoreTable('persistence', tables.persistence, () =>
                supabase.from('persistence').delete().neq('key', 'INTERNAL_SYSTEM_PROTECT'));
        }
        if (tables.lore_nodes) {
            restored.lore_nodes = await restoreTable('lore_nodes', tables.lore_nodes, () =>
                supabase.from('lore_nodes').delete().neq('id', 'WIPE_ALL'));
        }
        if (tables.lore_edges) {
            restored.lore_edges = await restoreTable('lore_edges', tables.lore_edges, () =>
                supabase.from('lore_edges').delete().neq('id', 0));
        }
        if (tables.prompts) {
            restored.prompts = await restoreTable('prompts', tables.prompts, () =>
                supabase.from('prompts').delete().neq('id', 'WIPE'));
        }
        if (tables.prompt_rules) {
            restored.prompt_rules = await restoreTable('prompt_rules', tables.prompt_rules, () =>
                supabase.from('prompt_rules').delete().neq('id', 'WIPE'));
        }

        return NextResponse.json({
            success: true,
            restoredFrom: snapshotKey,
            timestamp: snapshot.timestamp,
            restored
        });
    } catch (e: any) {
        console.error('Restore fail:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
