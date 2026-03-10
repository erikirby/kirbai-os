async function test() {
    const CHANNEL_ID = "UCnsL7Nh-e09D1W5TmC6Yklw";
    const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
    const rssText = await rssRes.text();
    const fs = await import('fs');
    fs.writeFileSync('raw_rss.xml', rssText);
    console.log("Wrote raw_rss.xml, length:", rssText.length);
}
test();
