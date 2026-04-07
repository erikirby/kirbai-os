import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRoadmapAsync, getRow, getMissionsAsync, getPulseStateAsync } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const lines: string[] = [];

        lines.push('=== SYSTEM DIRECTIVE ===');
        lines.push('You are acting as an expert consultant and strategist for the Kirbai OS ecosystem.');
        lines.push('The following is a total situational awareness dump of the brand, project goals, past releases, social analytics, lyric writing strategy, and character lore.');
        lines.push('Use this information to implicitly understand the aesthetic, rules, and trajectory of the user. Never ask for this information again.');
        lines.push(`Exported At: ${new Date().toLocaleString()}`);
        lines.push('\n');

        // --- Brand Identity & Goals ---
        try {
            lines.push('--- BRAND DNA & GUIDELINES ---');
            const [kirbaiBrand, factoryBrand] = await Promise.all([
                getRow('brand_identity'),
                getRow('brand_identity_factory') // Just in case it exists separately
            ]);
            
            if (kirbaiBrand) {
                lines.push('--- KIRBAI ALIAS ---');
                for (const [key, val] of Object.entries(kirbaiBrand)) {
                    if (val && typeof val === 'string') {
                        lines.push(`[${key.toUpperCase()}]`);
                        lines.push(val as string);
                        lines.push('');
                    }
                }
            }
        } catch (e) {}

        // --- Performance Pulse (Broad Social Stats) ---
        try {
            lines.push('--- PERFORMANCE PULSE (SOCIAL ANALYTICS) ---');
            const [pulseKirbai, pulseFactory] = await Promise.all([
                getPulseStateAsync('kirbai'),
                getPulseStateAsync('factory')
            ]);

            if (pulseKirbai) {
                lines.push(`[KIRBAI ALIAS]`);
                if (pulseKirbai.instagram) lines.push(`Instagram: ${pulseKirbai.instagram.followers || 0} Followers, ${pulseKirbai.instagram.reach || 0} Reach`);
                if (pulseKirbai.youtube) lines.push(`YouTube: ${pulseKirbai.youtube.subscribers || 0} Subscribers, ${pulseKirbai.youtube.views || 0} Views`);
                if (pulseKirbai.lastUpdated) lines.push(`Data Last Updated: ${pulseKirbai.lastUpdated}`);
                if (pulseKirbai.analysis?.summary) lines.push(`\nAI Tactical Summary (Instagram): ${pulseKirbai.analysis.summary}`);
                if (pulseKirbai.ttNarrative) lines.push(`\nAI Tactical Summary (TikTok): ${pulseKirbai.ttNarrative}`);
                lines.push('');
            }
            if (pulseFactory) {
                lines.push(`[MUSIC FACTORY ALIAS]`);
                if (pulseFactory.instagram) lines.push(`Instagram: ${pulseFactory.instagram.followers || 0} Followers`);
                if (pulseFactory.youtube) lines.push(`YouTube: ${pulseFactory.youtube.subscribers || 0} Subscribers`);
                if (pulseFactory.analysis?.summary) lines.push(`\nAI Tactical Summary: ${pulseFactory.analysis.summary}`);
                lines.push('');
            }
        } catch (e) {}

        // --- Release Catalog (Missions) ---
        try {
            lines.push('--- RELEASE CATALOG & PROJECTS ---');
            const [missionsKirbai, missionsFactory] = await Promise.all([
                getMissionsAsync('kirbai'),
                getMissionsAsync('factory')
            ]);
            const allMissions = [...(missionsKirbai || []), ...(missionsFactory || [])];
            
            if (allMissions.length > 0) {
                allMissions.forEach((m: any) => {
                    lines.push(`[${m.alias?.toUpperCase() || 'UNKNOWN'}] Title: ${m.title}`);
                    lines.push(`  Status: ${m.status?.toUpperCase() || 'ACTIVE'}`);
                    if (m.conceptDescription) lines.push(`  Concept: ${m.conceptDescription}`);
                    if (m.shots && m.shots.length > 0) lines.push(`  Shots Tracker: ${m.shots.length} planned shots`);
                    lines.push('');
                });
            } else {
                lines.push('No releases logged.');
                lines.push('');
            }
        } catch (e) {}

        // --- Lyric Strategy & Examples ---
        try {
            lines.push('--- LYRIC WRITING STRATEGY & EXAMPLES ---');
            const lyricsPath = path.join(process.cwd(), 'data', 'vault', 'lyrics.json');
            if (fs.existsSync(lyricsPath)) {
                const lyricsData = JSON.parse(fs.readFileSync(lyricsPath, 'utf-8'));
                // Target "Lovely Kiss" and "Bye Bye Butterfree" or fallback to first two valid
                const targets = ['Lovely Kiss (Jynx Anthem)', 'Bye Bye Butterfree (The Pink Hierarchy)'];
                let examples = lyricsData.filter((l: any) => targets.includes(l.trackName) && l.content);
                
                if (examples.length === 0) {
                    examples = lyricsData.filter((l: any) => l.content && l.content.length > 100).slice(0, 2);
                }

                if (examples.length > 0) {
                    lines.push('The following are "Gold Standard" structural and stylistic examples of finished lyrics. Observe the tone, phrasing, syllable density, and character-driven focus:');
                    lines.push('');
                    examples.forEach((ex: any) => {
                        lines.push(`Track: ${ex.trackName}`);
                        lines.push('---');
                        // Replace <br> with newlines if present
                        lines.push((ex.content || '').replace(/<br>/g, '\n'));
                        lines.push('---');
                        lines.push('');
                    });
                } else {
                    lines.push('No legacy lyric examples available.');
                }
            } else {
                lines.push('Lyrics database not locally available.');
            }
        } catch(e) {}

        // --- Prompt Bank & Rules ---
        try {
            const [promptsRes, rulesRes] = await Promise.all([
                supabase.from('prompts').select('*'),
                supabase.from('prompt_rules').select('*')
            ]);
            const promptRows = promptsRes.data || [];
            const ruleRows = rulesRes.data || [];

            lines.push('--- UNIVERSAL CREATIVE RULES ---');
            if (ruleRows.length > 0) {
                ruleRows.forEach(r => lines.push(`- ${r.content}`));
                lines.push('');
            }
            if (promptRows.length > 0) {
                lines.push('--- CORE PROMPT ARCHITECTURES ---');
                const categories: Record<string, any[]> = {};
                for (const p of promptRows) {
                    if (!categories[p.category]) categories[p.category] = [];
                    categories[p.category].push(p);
                }
                for (const [cat, entries] of Object.entries(categories)) {
                    lines.push(`[${cat.toUpperCase()}]`);
                    entries.forEach(p => {
                        lines.push(`  Label: ${p.label}`);
                        lines.push(`  Template: ${p.content}`);
                        lines.push('');
                    });
                }
            }
        } catch (e) {}

        // --- Lore Matrix ---
        try {
            lines.push('--- THE LORE CONTINUITY (CHARACTERS & UNIVERSE) ---');
            const [nodesRes, edgesRes] = await Promise.all([
                supabase.from('lore_nodes').select('*'),
                supabase.from('lore_edges').select('*')
            ]);
            const nodes = nodesRes.data || [];
            const edges = edgesRes.data || [];

            if (nodes.length > 0) {
                const characters = nodes.filter(n => n.type === 'character');
                const others = nodes.filter(n => n.type !== 'character');
                if (characters.length > 0) {
                    lines.push('CHARACTERS:');
                    characters.forEach(n => {
                        lines.push(`- ${n.label}`);
                        if (n.description) lines.push(`  Desc: ${n.description}`);
                        if (n.traits) lines.push(`  Psyche: ${n.traits}`);
                    });
                    lines.push('');
                }
                if (others.length > 0) {
                    lines.push('ENTITIES (Artifacts, Locations):');
                    others.forEach(n => {
                        lines.push(`- ${n.label} [${n.type.toUpperCase()}]`);
                        if (n.description) lines.push(`  Desc: ${n.description}`);
                    });
                    lines.push('');
                }
                if (edges.length > 0) {
                    lines.push('CANON RELATIONSHIPS:');
                    edges.forEach(e => {
                        const src = nodes.find(n => n.id === e.source)?.label || e.source;
                        const tgt = nodes.find(n => n.id === e.target)?.label || e.target;
                        lines.push(`- ${src} --> [${e.label || 'connected to'}] --> ${tgt}`);
                    });
                    lines.push('');
                }
            }
        } catch (e) {}

        // --- Roadmap ---
        try {
            lines.push('--- MASTER ROADMAP (Current Strategic Focus) ---');
            const [kirbaiRoadmap, factoryRoadmap] = await Promise.all([
                getRoadmapAsync('kirbai'),
                getRoadmapAsync('factory')
            ]);
            
            const dumpRoadmap = (r: any, tag: string) => {
                if (r?.phases?.length > 0) {
                    lines.push(`[${tag} ALIAS]`);
                    r.phases.forEach((p: any) => {
                        lines.push(`PHASE: [${p.status}] ${p.title} - ${p.description}`);
                        if (p.tasks?.length > 0) {
                            p.tasks.forEach((t: any) => {
                                lines.push(`  > [${t.status.toUpperCase()}] ${t.title}: ${t.description}`);
                            });
                        }
                    });
                    lines.push('');
                }
            };

            dumpRoadmap(kirbaiRoadmap, 'KIRBAI');
            dumpRoadmap(factoryRoadmap, 'MUSIC FACTORY');
            
        } catch (e) {}

        lines.push('=== END OF SITUATIONAL AWARENESS DUMP ===');

        const text = lines.join('\n');
        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="kirbai_ai_megaprompt_${new Date().toISOString().slice(0, 10)}.txt"`,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
