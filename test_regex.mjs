async function test() {
    const rssRes = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=UCnsL7Nh-e09D1W5TmC6Yklw");
    const rssText = await rssRes.text();

    const videos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(rssText)) !== null && videos.length < 2) {
        let entry = match[1];
        const idMatch = /<id>yt:video:(.*?)<\/id>/.exec(entry);
        const titleMatch = /<title>(.*?)<\/title>/.exec(entry);
        const pubMatch = /<published>(.*?)<\/published>/.exec(entry);
        const descMatch = /<media:description>([\s\S]*?)<\/media:description>/.exec(entry);

        if (idMatch && titleMatch && pubMatch) {
            videos.push({
                id: idMatch[1],
                title: titleMatch[1],
                published: new Date(pubMatch[1]),
                description: descMatch ? descMatch[1] : ""
            });
        }
    }
    console.log("Videos length:", videos.length);
    console.log("Snippets:", videos.map(v => v.title));
}
test();
