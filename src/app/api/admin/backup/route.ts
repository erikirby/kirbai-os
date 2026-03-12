import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRow, setRow } from '@/lib/db';

export async function GET(req: Request) {
    try {
        // Simple secret check for Cron/Manual trigger
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        
        // Use a default secret or check against environment
        if (secret !== process.env.CRON_SECRET && secret !== 'kirbai_backup_safe') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("🚀 Starting System Snapshot...");

        // 1. Fetch all critical data
        const [
            persistenceRes,
            nodesRes,
            edgesRes,
            promptsRes,
            rulesRes
        ] = await Promise.all([
            supabase.from('persistence').select('*'),
            supabase.from('lore_nodes').select('*'),
            supabase.from('lore_edges').select('*'),
            supabase.from('prompts').select('*'),
            supabase.from('prompt_rules').select('*')
        ]);

        if (persistenceRes.error) throw persistenceRes.error;
        if (nodesRes.error) throw nodesRes.error;
        if (edgesRes.error) throw edgesRes.error;
        if (promptsRes.error) throw promptsRes.error;
        if (rulesRes.error) throw rulesRes.error;

        // 2. Bundle into snapshot
        const snapshot = {
            timestamp: new Date().toISOString(),
            tables: {
                persistence: persistenceRes.data,
                lore_nodes: nodesRes.data,
                lore_edges: edgesRes.data,
                prompts: promptsRes.data,
                prompt_rules: rulesRes.data
            }
        };

        // 3. Save snapshot to persistence table
        const snapshotKey = `snapshot_${Date.now()}`;
        await setRow(snapshotKey, snapshot);

        // 4. Update index
        const index = await getRow('snapshots_index') || [];
        index.unshift({
            key: snapshotKey,
            timestamp: snapshot.timestamp,
            label: `System Backup - ${new Date().toLocaleString()}`
        });
        
        // Keep only last 10 snapshots to save space
        const cappedIndex = index.slice(0, 10);
        await setRow('snapshots_index', cappedIndex);

        return NextResponse.json({ 
            success: true, 
            snapshot: snapshotKey,
            count: index.length
        });
    } catch (e: any) {
        console.error('Backup fail:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
