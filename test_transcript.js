const { YoutubeTranscript } = require("youtube-transcript");

async function test() {
    try {
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        const rssRes = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=UCnsL7Nh-e09D1W5TmC6Yklw");
        const rssText = await rssRes.text();
        const videoRegex = /<entry>.*?<id>yt:video:(.*?)<\/id>.*?<title>(.*?)<\/title>/gs;

        let match = videoRegex.exec(rssText);
        let videoId = match[1];
        console.log("Testing video ID:", videoId);

        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        console.log("Transcript length:", transcript.length);
    } catch (err) {
        console.error("FAILED:");
        console.error(err);
    }
}

test();
