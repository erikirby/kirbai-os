import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRow, setRow } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'kirbai';
        const key = mode === 'factory' ? 'lore_factory' : 'lore_kirbai';

        let data = await getRow(key);

        // Migration logic for Kirbai mode (the original data)
        if (mode === 'kirbai' && !data) {
            console.log('Migrating Lore from dedicated tables to persistence KV...');
            const [nodesRes, edgesRes] = await Promise.all([
                supabase.from('lore_nodes').select('*'),
                supabase.from('lore_edges').select('*')
            ]);

            if (!nodesRes.error && !edgesRes.error && nodesRes.data.length > 0) {
                const nodes = nodesRes.data.map(n => ({
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

                const edges = edgesRes.data.map(e => ({
                    id: `edge-${e.source}-${e.target}`,
                    source: e.source,
                    target: e.target,
                    label: e.label
                }));

                data = { nodes, edges, history: [] };
                await setRow('lore_kirbai', data);
            }
        }

        if (!data) {
            data = { nodes: [], edges: [], history: [] };
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Lore GET error:', e);
        return NextResponse.json({ nodes: [], edges: [], history: [] });
    }
}

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'kirbai';
        const key = mode === 'factory' ? 'lore_factory' : 'lore_kirbai';

        const body = await req.json();
        if (!body.nodes || !body.edges) throw new Error('Missing nodes or edges');

        // Since we are using KV, we just save the whole blob.
        // This is much safer and easier than individual row updates.
        await setRow(key, body);

        return NextResponse.json({ success: true, updated: true });
    } catch (e: any) {
        console.error('Lore POST error:', e);
        return NextResponse.json({ error: e.message || 'Failed to save lore graph' }, { status: 500 });
    }
}
