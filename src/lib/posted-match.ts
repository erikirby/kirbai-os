// Spot calendar items that already went out on Instagram but aren't marked posted yet.
// Pure function so both the Home page and the daily brief can use it.

interface CardLike { id: string; title: string; status: string; scheduledDate?: string }
interface PostLike { caption: string; timestamp: string; permalink: string }

/** "Poké Island: Episode 5 — Minior shower" -> "poké island: episode 5" */
function core(title: string) {
    return title.split(/\s+[—-]\s+/)[0].replace(/["“”]/g, '').trim().toLowerCase();
}

export function findPostedOnInstagram<C extends CardLike>(cards: C[], posts: PostLike[]) {
    const out: { card: C; post: PostLike }[] = [];
    for (const card of cards) {
        if (card.status === 'posted') continue;
        const key = core(card.title);
        if (key.length < 8) continue;
        const post = posts.find(p => p.caption.toLowerCase().includes(key));
        if (post) out.push({ card, post });
    }
    return out;
}
