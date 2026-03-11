#!/usr/bin/env node
/**
 * Kirbai OS — One-time Supabase Seed Script
 * 
 * Run this ONCE from your terminal to upload all existing local data to Supabase:
 *   node scripts/seed-supabase.mjs
 * 
 * After running, your cloud database will have all your lore, prompts, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Read .env.local manually
const envPath = path.join(root, '.env.local');
const envVars = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length) envVars[key.trim()] = val.join('=').trim();
    });
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Could not find Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Seeding Supabase from local JSON files...\n');

// ─── 1. LORE ────────────────────────────────────────────────────────────────
try {
    const lorePath = path.join(root, 'data', 'vault', 'lore', 'lore.json');
    if (fs.existsSync(lorePath)) {
        const lore = JSON.parse(fs.readFileSync(lorePath, 'utf-8'));
        const nodes = lore.nodes || [];
        const edges = lore.edges || [];

        if (nodes.length) {
            const nodeRows = nodes.map(n => ({
                id: n.id,
                type: n.type || 'character',
                label: n.data?.label || n.id,
                description: n.data?.description || '',
                traits: n.data?.traits || '',
                image_path: n.data?.imagePath || '',
                pos_x: n.position?.x ?? 0,
                pos_y: n.position?.y ?? 0
            }));
            const { error } = await supabase.from('lore_nodes').upsert(nodeRows, { onConflict: 'id' });
            if (error) throw error;
            console.log(`✅ Lore nodes: ${nodes.length} uploaded`);
        }

        if (edges.length) {
            await supabase.from('lore_edges').delete().neq('id', 0);
            const edgeRows = edges.map(e => ({ source: e.source, target: e.target, label: e.label || '' }));
            const { error } = await supabase.from('lore_edges').insert(edgeRows);
            if (error) throw error;
            console.log(`✅ Lore edges: ${edges.length} uploaded`);
        }
    } else {
        console.log('⚠️  No lore.json found, skipping');
    }
} catch (e) {
    console.error('❌ Lore seed failed:', e.message);
}

// ─── 2. PROMPTS ─────────────────────────────────────────────────────────────
try {
    const promptsPath = path.join(root, 'data', 'vault', 'prompts.json');
    if (fs.existsSync(promptsPath)) {
        const data = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

        // Rules
        await supabase.from('prompt_rules').delete().neq('id', '');
        if (data.universal?.length) {
            const ruleRows = data.universal.map((content, i) => ({ id: `rule_${i}`, content }));
            await supabase.from('prompt_rules').insert(ruleRows);
            console.log(`✅ Prompt rules: ${ruleRows.length} uploaded`);
        }

        // Category prompts
        await supabase.from('prompts').delete().neq('id', '');
        const promptRows = [];
        if (data.categories) {
            for (const [category, entries] of Object.entries(data.categories)) {
                entries.forEach((p, i) => {
                    promptRows.push({ id: `${category}_${i}`, category, label: p.name, content: p.text });
                });
            }
            if (promptRows.length) {
                await supabase.from('prompts').insert(promptRows);
                console.log(`✅ Prompts: ${promptRows.length} uploaded`);
            }
        }
    } else {
        console.log('⚠️  No prompts.json found, skipping');
    }
} catch (e) {
    console.error('❌ Prompts seed failed:', e.message);
}

// ─── 3. BRAND IDENTITY ──────────────────────────────────────────────────────
try {
    const identityPath = path.join(root, 'data', 'vault', 'brand', 'identity.json');
    if (fs.existsSync(identityPath)) {
        const identity = JSON.parse(fs.readFileSync(identityPath, 'utf-8'));
        const { error } = await supabase.from('brand_identity').upsert({ key: 'brand_identity', value: identity }, { onConflict: 'key' });
        if (error) throw error;
        console.log('✅ Brand identity uploaded');
    } else {
        console.log('⚠️  No brand identity file found, skipping');
    }
} catch (e) {
    console.error('❌ Brand identity seed failed:', e.message);
}

// ─── 4. ROADMAP ─────────────────────────────────────────────────────────────
try {
    const persistencePath = path.join(root, 'data', 'persistence.json');
    if (fs.existsSync(persistencePath)) {
        const db = JSON.parse(fs.readFileSync(persistencePath, 'utf-8'));
        if (db.roadmap) {
            const { error } = await supabase.from('persistence').upsert({ key: 'roadmap', value: db.roadmap }, { onConflict: 'key' });
            if (error) throw error;
            console.log(`✅ Roadmap uploaded (${db.roadmap.phases?.length || 0} phases, ${db.roadmap.tasks?.length || 0} tasks)`);
        }
    } else {
        console.log('⚠️  No persistence.json found, skipping');
    }
} catch (e) {
    console.error('❌ Roadmap seed failed:', e.message);
}

console.log('\n✨ Seed complete! Your Supabase database is ready.');
console.log('   Re-start your dev server (Ctrl+C then npm run dev) and test the app.');
