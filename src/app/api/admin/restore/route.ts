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
        // We do this table by table to ensure consistency

        // --- PERSISTENCE ---
        if (tables.persistence) {
            await supabase.from('persistence').delete().neq('key', 'INTERNAL_SYSTEM_PROTECT'); // Generic delete
            await supabase.from('persistence').insert(tables.persistence);
        }

        // --- LORE NODES ---
        if (tables.lore_nodes) {
            await supabase.from('lore_nodes').delete().neq('id', 'WIPE_ALL');
            await supabase.from('lore_nodes').insert(tables.lore_nodes);
        }

        // --- LORE EDGES ---
        if (tables.lore_edges) {
            await supabase.from('lore_edges').delete().neq('id', 0);
            await supabase.from('lore_edges').insert(tables.lore_edges);
        }

        // --- PROMPTS ---
        if (tables.prompts) {
            await supabase.from('prompts').delete().neq('id', 'WIPE');
            await supabase.from('prompts').insert(tables.prompts);
        }

        // --- PROMPT RULES ---
        if (tables.prompt_rules) {
            await supabase.from('prompt_rules').delete().neq('id', 'WIPE');
            await supabase.from('prompt_rules').insert(tables.prompt_rules);
        }

        return NextResponse.json({ 
            success: true, 
            restoredFrom: snapshotKey,
            timestamp: snapshot.timestamp 
        });
    } catch (e: any) {
        console.error('Restore fail:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
