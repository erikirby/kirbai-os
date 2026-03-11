import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const [promptsRes, rulesRes] = await Promise.all([
            supabase.from('prompts').select('*'),
            supabase.from('prompt_rules').select('*')
        ]);

        if (promptsRes.error) throw promptsRes.error;
        if (rulesRes.error) throw rulesRes.error;

        // Reshape to match the frontend's { universal: [], categories: {} } format
        const universal = (rulesRes.data || []).map(r => r.content);
        const categories: Record<string, any[]> = {};
        for (const p of (promptsRes.data || [])) {
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push({ name: p.label, text: p.content });
        }

        return NextResponse.json({ success: true, data: { universal, categories } });
    } catch (e: any) {
        console.error('Prompts GET error:', e);
        return NextResponse.json({ success: true, data: { universal: [], categories: {} } });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // body = { universal: string[], categories: { [cat]: [{name, text}] } }

        // Replace all rules
        await supabase.from('prompt_rules').delete().neq('id', '');
        if (body.universal?.length) {
            const ruleRows = body.universal.map((content: string, i: number) => ({
                id: `rule_${i}`,
                content
            }));
            await supabase.from('prompt_rules').insert(ruleRows);
        }

        // Replace all prompts
        await supabase.from('prompts').delete().neq('id', '');
        if (body.categories) {
            const promptRows: any[] = [];
            for (const [category, entries] of Object.entries(body.categories)) {
                (entries as any[]).forEach((p: any, i: number) => {
                    promptRows.push({
                        id: `${category}_${i}_${Date.now()}`,
                        category,
                        label: p.name,
                        content: p.text
                    });
                });
            }
            if (promptRows.length > 0) {
                await supabase.from('prompts').insert(promptRows);
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Prompts POST error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
