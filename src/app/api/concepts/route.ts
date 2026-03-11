import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface Concept {
    id: string;
    title: string;
    type: 'reel' | 'post' | 'music' | 'general';
    status: 'concept' | 'in-dev' | 'executed' | 'archived';
    body: string;
    character?: string;
    created_at: string;
    updated_at: string;
}

async function getConcepts(): Promise<Concept[]> {
    const { data } = await supabase
        .from('persistence')
        .select('value')
        .eq('key', 'concepts')
        .single();
    return (data?.value as Concept[]) ?? [];
}

async function saveConcepts(concepts: Concept[]): Promise<void> {
    await supabase
        .from('persistence')
        .upsert({ key: 'concepts', value: concepts }, { onConflict: 'key' });
}

export async function GET() {
    try {
        const concepts = await getConcepts();
        // Sort by updated_at desc
        concepts.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return NextResponse.json({ success: true, concepts });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json() as Partial<Concept>;
        if (!body.title || !body.body) {
            return NextResponse.json({ success: false, error: 'title and body are required' }, { status: 400 });
        }

        const concepts = await getConcepts();
        const now = new Date().toISOString();

        const existing = concepts.findIndex(c => c.id === body.id);
        if (existing >= 0) {
            // Update
            concepts[existing] = { ...concepts[existing], ...body, updated_at: now };
        } else {
            // Insert
            const newConcept: Concept = {
                id: body.id || `concept_${Date.now()}`,
                title: body.title,
                type: body.type || 'general',
                status: body.status || 'concept',
                body: body.body,
                character: body.character || '',
                created_at: now,
                updated_at: now,
            };
            concepts.unshift(newConcept);
        }

        await saveConcepts(concepts);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

        const concepts = await getConcepts();
        const filtered = concepts.filter(c => c.id !== id);
        await saveConcepts(filtered);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
