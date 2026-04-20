import { getRow } from './src/lib/db';
async function run() {
    const data = await getRow('vault_projects');
    const jsonStr = JSON.stringify(data || []);
    console.log("Vault Projects Size:", Math.round(jsonStr.length / 1024), "KB");
    
    // Check if any coverArt is huge
    let largest = 0;
    for (const p of data || []) {
       if (p.coverArt) largest = Math.max(largest, p.coverArt.length);
    }
    console.log("Largest Cover Art base64 length:", Math.round(largest / 1024), "KB");
}
run();
