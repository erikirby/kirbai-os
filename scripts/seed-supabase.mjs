#!/usr/bin/env node
/**
 * Kirbai OS — Supabase Seed Script (no npm packages needed)
 * Uses built-in Node.js fetch to call the Supabase REST API directly.
 * 
 * Run: node scripts/seed-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Read .env.local
const envPath = path.join(root, '.env.local');
const envVars = {};
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) envVars[key.trim()] = val.join('=').trim();
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
};

async function upsert(table, rows) {
    if (!rows.length) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(rows)
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`${table}: ${err}`);
    }
}

async function deleteAll(table) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=gte.0`, {
        method: 'DELETE',
        headers
    });
    // Ignore errors on delete
}

async function deleteAllText(table) {
    // For tables with text PK, use a different filter
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.NONE_MATCH`, {
        method: 'DELETE',
        headers
    });
}

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
            await upsert('lore_nodes', nodeRows);
            console.log(`✅ Lore nodes: ${nodes.length} uploaded`);
        }

        if (edges.length) {
            // Delete all edges first (they use serial PK)
            await fetch(`${SUPABASE_URL}/rest/v1/lore_edges?id=gte.0`, { method: 'DELETE', headers });
            const edgeRows = edges.map(e => ({ source: e.source, target: e.target, label: e.label || '' }));
            await upsert('lore_edges', edgeRows);
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

        if (data.universal?.length) {
            const ruleRows = data.universal.map((content, i) => ({ id: `rule_${i}`, content }));
            await upsert('prompt_rules', ruleRows);
            console.log(`✅ Prompt rules: ${ruleRows.length} uploaded`);
        }

        const promptRows = [];
        if (data.categories) {
            for (const [category, entries] of Object.entries(data.categories)) {
                entries.forEach((p, i) => {
                    promptRows.push({ id: `${category}_${i}`, category, label: p.name, content: p.text });
                });
            }
            if (promptRows.length) {
                await upsert('prompts', promptRows);
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
        await upsert('brand_identity', [{ key: 'brand_identity', value: identity }]);
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
            await upsert('persistence', [{ key: 'roadmap', value: db.roadmap }]);
            console.log(`✅ Roadmap uploaded (${db.roadmap.phases?.length || 0} phases, ${db.roadmap.tasks?.length || 0} tasks)`);
        }
    } else {
        console.log('⚠️  No persistence.json found, skipping');
    }
} catch (e) {
    console.error('❌ Roadmap seed failed:', e.message);
}

console.log('\n✨ Seed complete! Your Supabase database is populated.');
console.log('   Open your live Vercel app and the data should be there.');
