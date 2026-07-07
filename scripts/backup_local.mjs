// Local full-database backup. Run from the repo root:
//   node scripts/backup_local.mjs
// Writes backups/kirbai-backup-YYYY-MM-DD.json on your Mac — outside Supabase.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// minimal .env.local parser (no dependencies)
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0 && !line.startsWith("#")) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const tables = ["persistence", "lore_nodes", "lore_edges"];
const dump = {};

for (const table of tables) {
    const rows = [];
    const PAGE = 200;
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
        if (error) { console.warn(`[${table}] ${error.message}`); break; }
        if (!data?.length) break;
        rows.push(...data);
        if (data.length < PAGE) break;
    }
    dump[table] = rows;
    console.log(`[${table}] ${rows.length} rows`);
}

fs.mkdirSync("backups", { recursive: true });
const file = path.join("backups", `kirbai-backup-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }));
console.log(`Saved ${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
