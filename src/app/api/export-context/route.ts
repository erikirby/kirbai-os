import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const lines: string[] = [];

        lines.push('=== KIRBAI OS CONTEXT EXPORT ===');
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        lines.push('');

        // --- Brand Identity ---
        try {
            const identityPath = path.join(process.cwd(), 'data', 'vault', 'brand', 'identity.json');
            if (fs.existsSync(identityPath)) {
                const identity = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
                lines.push('--- BRAND IDENTITY ---');
                for (const [key, val] of Object.entries(identity)) {
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
            const dbPath = path.join(process.cwd(), 'data', 'persistence.json');
            if (fs.existsSync(dbPath)) {
                const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                if (db.roadmap) {
                    lines.push('--- MASTER ROADMAP ---');
                    if (db.roadmap.phases?.length) {
                        lines.push('PHASES:');
                        db.roadmap.phases.forEach((p: any) => {
                            lines.push(`  [${p.status}] ${p.title}: ${p.description}`);
                        });
                        lines.push('');
                    }
                    if (db.roadmap.tasks?.length) {
                        lines.push('TASKS:');
                        db.roadmap.tasks.forEach((t: any) => {
                            const text = typeof t === 'string' ? t : t.text;
                            const status = typeof t === 'string' ? 'todo' : t.status;
                            lines.push(`  [${status.toUpperCase()}] ${text}`);
                        });
                        lines.push('');
                    }
                }
            }
        } catch (e) {}

        // --- Vault Projects ---
        try {
            const projectsPath = path.join(process.cwd(), 'data', 'vault', 'projects.json');
            if (fs.existsSync(projectsPath)) {
                const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
                if (projects?.length) {
                    lines.push('--- VAULT PROJECTS ---');
                    projects.forEach((proj: any) => {
                        lines.push(`PROJECT: ${proj.name} [${proj.status || 'active'}]`);
                        if (proj.pokemon) lines.push(`  Pokemon: ${proj.pokemon}`);
                        if (proj.tracklist?.length) {
                            lines.push('  Tracklist:');
                            proj.tracklist.forEach((t: any, i: number) => {
                                const hasLyrics = !!t.lyrics;
                                lines.push(`    ${i + 1}. ${t.title}${hasLyrics ? ' [lyrics saved]' : ''}`);
                            });
                        }
                        lines.push('');
                    });
                }
            }
        } catch (e) {}

        // --- Lore / Characters ---
        try {
            const lorePath = path.join(process.cwd(), 'data', 'vault', 'lore', 'lore.json');
            if (fs.existsSync(lorePath)) {
                const lore = JSON.parse(fs.readFileSync(lorePath, 'utf-8'));
                if (lore.nodes?.length) {
                    lines.push('--- LORE / CHARACTERS & UNIVERSE ---');
                    // Characters and other nodes
                    const characters = lore.nodes.filter((n: any) => n.type === 'character');
                    const others = lore.nodes.filter((n: any) => n.type !== 'character');
                    if (characters.length) {
                        lines.push('CHARACTERS:');
                        characters.forEach((node: any) => {
                            lines.push(`  ${node.data?.label || node.id} [character]`);
                            if (node.data?.description) lines.push(`    ${node.data.description}`);
                        });
                        lines.push('');
                    }
                    if (others.length) {
                        lines.push('OTHER ENTITIES (artifacts, groups, etc.):');
                        others.forEach((node: any) => {
                            lines.push(`  ${node.data?.label || node.id} [${node.type}]`);
                            if (node.data?.description) lines.push(`    ${node.data.description}`);
                        });
                        lines.push('');
                    }
                    // Relationships / edges
                    if (lore.edges?.length) {
                        lines.push('RELATIONSHIPS:');
                        lore.edges.forEach((edge: any) => {
                            const srcNode = lore.nodes.find((n: any) => n.id === edge.source);
                            const tgtNode = lore.nodes.find((n: any) => n.id === edge.target);
                            const src = srcNode?.data?.label || edge.source;
                            const tgt = tgtNode?.data?.label || edge.target;
                            lines.push(`  ${src} → ${edge.label || 'connected to'} → ${tgt}`);
                        });
                        lines.push('');
                    }
                }
            }
        } catch (e) {}

        // --- Prompt Bank ---
        try {
            const promptsPath = path.join(process.cwd(), 'data', 'vault', 'prompts.json');
            if (fs.existsSync(promptsPath)) {
                const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
                lines.push('--- PROMPT BANK ---');
                if (prompts.universal?.length) {
                    lines.push('UNIVERSAL RULES (apply to all video prompts):');
                    prompts.universal.forEach((r: string) => lines.push(`  - ${r}`));
                    lines.push('');
                }
                if (prompts.categories) {
                    for (const [cat, entries] of Object.entries(prompts.categories)) {
                        lines.push(`CATEGORY: ${cat}`);
                        (entries as any[]).forEach((p: any) => {
                            lines.push(`  [${p.name}]`);
                            lines.push(`  ${p.text}`);
                            lines.push('');
                        });
                    }
                }
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
