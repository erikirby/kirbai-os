async function test() {
    try {
        const rssRes = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=UCnsL7Nh-e09D1W5TmC6Yklw");
        const rssText = await rssRes.text();

        // Extract out entry
        const entryRegex = /<entry>(.*?)<\/entry>/gs;
        let match = entryRegex.exec(rssText);
        let entry = match[1];

        // Extract description
        const descRegex = /<media:description>(.*?)<\/media:description>/gs;
        let descMatch = descRegex.exec(entry);
        console.log("Found Description Length:", descMatch[1].length);
        console.log("Snippet:", descMatch[1].slice(0, 500));

    } catch (err) {
        console.error("FAILED:");
        console.error(err);
    }
}
test();
