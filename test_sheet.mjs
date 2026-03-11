import fetch from 'node-fetch';

async function testSheetIngestion() {
    try {
        console.log("Sending Heart Scales Master Sheet to API...");
        const res = await fetch('http://localhost:3000/api/ingest-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://docs.google.com/spreadsheets/d/1lojWjJi3DslIbxUAEer8Nk2c2v0MR4lxGcSYJgjXVJw/edit?gid=1811981406#gid=1811981406' })
        });

        const json = await res.json();
        console.log("API Response:");
        console.dir(json, { depth: null, colors: true });

        if (json.success && json.data.tracklist && json.data.lore) {
            console.log("✅ SUCCESS: AI successfully extracted the Title, Vibe, Lore, and Tracklist.");
        } else {
            console.log("❌ FAILED: Schema missing required pieces.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testSheetIngestion();
