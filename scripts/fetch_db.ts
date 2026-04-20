import fs from 'fs';

const SUPABASE_URL = "https://byfyaosbjuzttbfrnzkn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5Znlhb3NianV6dHRiZnJuemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI0NjAxMSwiZXhwIjoyMDg4ODIyMDExfQ.jAJa2ZcoHx_3mXRUfTVxCDRyQ3rfiKBvWkK8W6-XKpM";

async function fetchDb() {
  const url = `${SUPABASE_URL}/rest/v1/persistence?select=key,value`;
  const res = await fetch(url, {
    headers: {
      apikey: "sb_publishable_O3GoBSkEYhAPmjQgpwDuEg_rebScZcX",
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await res.json();
  const db = Object.fromEntries(data.map((r: any) => [r.key, r.value]));

  let text = '=== KIRBAI OS SYSTEM DUMP ===\n\n';

  text += '--- BRAND IDENTITY ---\n';
  text += 'KIRBAI ALIAS:\n' + JSON.stringify(db['brand_identity'] || null, null, 2) + '\n\n';
  text += 'MUSIC FACTORY ALIAS:\n' + JSON.stringify(db['brand_identity_factory'] || null, null, 2) + '\n\n';

  text += '--- PULSE & ANALYTICS ---\n';
  text += 'Kirbai Analytics:\n' + JSON.stringify(db['pulse_state_kirbai'] || null, null, 2) + '\n\n';
  text += 'Factory Analytics:\n' + JSON.stringify(db['pulse_state_factory'] || null, null, 2) + '\n\n';

  text += '--- MISSIONS / RELEASES ---\n';
  const km = db['missions_kirbai'] || [];
  const fm = db['missions_factory'] || [];
  const slim = (m: any[]) => m?.map(x => ({ title: x.title, alias: x.alias, status: x.status, concept: x.conceptDescription }));
  text += 'Kirbai Missions:\n' + JSON.stringify(slim(km), null, 2) + '\n\n';
  text += 'Factory Missions:\n' + JSON.stringify(slim(fm), null, 2) + '\n\n';

  text += '--- ROADMAP (PROGRESS) ---\n';
  text += 'Kirbai Roadmap:\n' + JSON.stringify(db['roadmap_kirbai'] || null, null, 2) + '\n\n';
  text += 'Factory Roadmap:\n' + JSON.stringify(db['roadmap_factory'] || null, null, 2) + '\n\n';

  fs.writeFileSync('tmp/dump_out.txt', text);
  console.log("Dump done!");
}

fetchDb().catch(console.error);
