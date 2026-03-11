import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const [nodesRes, edgesRes] = await Promise.all([
            supabase.from('lore_nodes').select('*'),
            supabase.from('lore_edges').select('*')
        ]);

        if (nodesRes.error) throw nodesRes.error;
        if (edgesRes.error) throw edgesRes.error;

        // Reshape to match the format the frontend expects
        const nodes = (nodesRes.data || []).map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.pos_x, y: n.pos_y },
            data: {
                label: n.label,
                description: n.description,
                traits: n.traits || undefined,
                imagePath: n.image_path || undefined
            }
        }));

        const edges = (edgesRes.data || []).map(e => ({
            source: e.source,
            target: e.target,
            label: e.label
        }));

        return NextResponse.json({ nodes, edges, history: [] });
    } catch (e: any) {
        console.error('Lore GET error:', e);
        return NextResponse.json({ nodes: [], edges: [], history: [] });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body.nodes || !body.edges) throw new Error('Missing nodes or edges');

        // Upsert all nodes
        const nodeRows = body.nodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'character',
            label: n.data?.label || n.id,
            description: n.data?.description || '',
            traits: n.data?.traits || '',
            image_path: n.data?.imagePath || '',
            pos_x: n.position?.x ?? 0,
            pos_y: n.position?.y ?? 0
        }));

        // Clear and reinsert edges (simplest approach for sync)
        const { error: nodeErr } = await supabase
            .from('lore_nodes')
            .upsert(nodeRows, { onConflict: 'id' });
        if (nodeErr) throw nodeErr;

        // Delete nodes that no longer exist
        const currentIds = nodeRows.map((n: any) => n.id);
        if (currentIds.length > 0) {
            await supabase.from('lore_nodes').delete().not('id', 'in', `(${currentIds.map((id: string) => `"${id}"`).join(',')})`);
        }

        // Replace all edges
        await supabase.from('lore_edges').delete().neq('id', 0);
        if (body.edges.length > 0) {
            const edgeRows = body.edges.map((e: any) => ({
                source: e.source,
                target: e.target,
                label: e.label || ''
            }));
            const { error: edgeErr } = await supabase.from('lore_edges').insert(edgeRows);
            if (edgeErr) throw edgeErr;
        }

        return NextResponse.json({ success: true, updated: true });
    } catch (e: any) {
        console.error('Lore POST error:', e);
        return NextResponse.json({ error: e.message || 'Failed to save lore graph' }, { status: 500 });
    }
}
