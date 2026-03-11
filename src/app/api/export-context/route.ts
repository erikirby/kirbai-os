import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRoadmapAsync } from '@/lib/db';

export async function GET() {
    try {
        const lines: string[] = [];

        lines.push('=== KIRBAI OS CONTEXT EXPORT ===');
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        lines.push('');

        // --- Brand Identity ---
        try {
            const { data } = await supabase
                .from('brand_identity')
                .select('value')
                .eq('key', 'brand_identity')
                .single();
            if (data?.value) {
                lines.push('--- BRAND IDENTITY ---');
                for (const [key, val] of Object.entries(data.value)) {
                    if (val && typeof val === 'string') {
                        lines.push(`[${key.toUpperCase()}]`);
                        lines.push(val as string);
                        lines.push('');
                    }
                }
            }
        } catch (e) {}

        // --- Roadmap ---
        try {
            const roadmap = await getRoadmapAsync();
            if (roadmap.phases?.length || roadmap.tasks?.length) {
                lines.push('--- MASTER ROADMAP ---');
                if (roadmap.phases?.length) {
                    lines.push('PHASES:');
                    roadmap.phases.forEach((p: any) => {
                        lines.push(`  [${p.status}] ${p.title}: ${p.description}`);
                    });
                    lines.push('');
                }
                if (roadmap.tasks?.length) {
                    lines.push('TASKS:');
                    roadmap.tasks.forEach((t: any) => {
                        const text = typeof t === 'string' ? t : t.text;
                        const status = typeof t === 'string' ? 'todo' : t.status;
                        lines.push(`  [${status.toUpperCase()}] ${text}`);
                    });
                    lines.push('');
                }
            }
        } catch (e) {}

        // --- Lore / Characters ---
        try {
            const [nodesRes, edgesRes] = await Promise.all([
                supabase.from('lore_nodes').select('*'),
                supabase.from('lore_edges').select('*')
            ]);
            const nodes = nodesRes.data || [];
            const edges = edgesRes.data || [];

            if (nodes.length) {
                lines.push('--- LORE / CHARACTERS & UNIVERSE ---');
                const characters = nodes.filter(n => n.type === 'character');
                const others = nodes.filter(n => n.type !== 'character');
                if (characters.length) {
                    lines.push('CHARACTERS:');
                    characters.forEach(n => {
                        lines.push(`  ${n.label} [character]`);
                        if (n.description) lines.push(`    ${n.description}`);
                        if (n.traits) lines.push(`    Profile: ${n.traits}`);
                    });
                    lines.push('');
                }
                if (others.length) {
                    lines.push('OTHER ENTITIES (artifacts, groups, etc.):');
                    others.forEach(n => {
                        lines.push(`  ${n.label} [${n.type}]`);
                        if (n.description) lines.push(`    ${n.description}`);
                        if (n.traits) lines.push(`    Profile: ${n.traits}`);
                    });
                    lines.push('');
                }
                if (edges.length) {
                    lines.push('RELATIONSHIPS:');
                    edges.forEach(e => {
                        const src = nodes.find(n => n.id === e.source)?.label || e.source;
                        const tgt = nodes.find(n => n.id === e.target)?.label || e.target;
                        lines.push(`  ${src} → ${e.label || 'connected to'} → ${tgt}`);
                    });
                    lines.push('');
                }
            }
        } catch (e) {}

        // --- Prompt Bank ---
        try {
            const [promptsRes, rulesRes] = await Promise.all([
                supabase.from('prompts').select('*'),
                supabase.from('prompt_rules').select('*')
            ]);
            const promptRows = promptsRes.data || [];
            const ruleRows = rulesRes.data || [];

            lines.push('--- PROMPT BANK ---');
            if (ruleRows.length) {
                lines.push('UNIVERSAL RULES (apply to all video prompts):');
                ruleRows.forEach(r => lines.push(`  - ${r.content}`));
                lines.push('');
            }
            const categories: Record<string, any[]> = {};
            for (const p of promptRows) {
                if (!categories[p.category]) categories[p.category] = [];
                categories[p.category].push(p);
            }
            for (const [cat, entries] of Object.entries(categories)) {
                lines.push(`CATEGORY: ${cat}`);
                entries.forEach(p => {
                    lines.push(`  [${p.label}]`);
                    lines.push(`  ${p.content}`);
                    lines.push('');
                });
            }
        } catch (e) {}

        lines.push('=== END OF EXPORT ===');

        const text = lines.join('\n');
        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="kirbai_context_${new Date().toISOString().slice(0, 10)}.txt"`,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
