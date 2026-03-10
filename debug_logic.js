const rssText = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <entry>
  <id>yt:video:fsVTrJHUZFM</id>
  <yt:videoId>fsVTrJHUZFM</yt:videoId>
  <title>The AI Opportunity Everyone Over 35 Is Missing Right Now | Perplexity Computer Chrome Extension</title>
  <published>2026-03-08T17:15:06+00:00</published>
  <media:group>
   <media:description>This is a description</media:description>
  </media:group>
 </entry>
</feed>`;

const videos = [];
const entries = rssText.split("<entry>");

for (let i = 1; i < entries.length && videos.length < 2; i++) {
    const entry = entries[i].split("</entry>")[0];

    // Helper to grab text between tags
    const getTag = (tag) => {
        const startTag = `<${tag}>`;
        const endTag = `</${tag}>`;
        const start = entry.indexOf(startTag);
        const end = entry.indexOf(endTag);
        if (start !== -1 && end !== -1) {
            return entry.substring(start + startTag.length, end);
        }
        return null;
    };

    const id = getTag("yt:videoId") || getTag("id")?.replace("yt:video:", "");
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
console.log("VIDEOS:", JSON.stringify(videos, null, 2));
