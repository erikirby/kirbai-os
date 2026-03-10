async function test() {
    try {
        const CHANNEL_ID = "UCnsL7Nh-e09D1W5TmC6Yklw";
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
        const rssText = await rssRes.text();

        const videos = [];
        // Use a split that accounts for spaces/attributes in the tag
        const entries = rssText.split(/<entry/i).slice(1);

        for (const part of entries) {
            if (videos.length >= 2) break;
            // The part starts with the attributes and content of the entry
            const entry = part.split(/<\/entry>/i)[0];

            const getTag = (tag) => {
                // Handle namespaces or standard tags by looking for the tag name
                const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
                const match = regex.exec(entry);
                return match ? match[1] : null;
            };

            const id = getTag("yt:videoId") || getTag("id")?.split("yt:video:")[1];
            const title = getTag("title");
            const published = getTag("published");
            const description = getTag("media:description");

            if (id && title && published) {
                videos.push({
                    id: id.trim(),
                    title: title.trim(),
                    published: new Date(published.trim()),
                    description: (description || "").trim()
                });
            }
        }
        console.log("VIDEOS FOUND:", videos.length);
        console.log("TITLES:", videos.map(v => v.title));
    } catch (e) {
        console.error(e);
    }
}
test();
