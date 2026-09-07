# Kirbai OS: Intelligence & Governance

## 1. Project Identity
**User**: Erik Henry (Musician, Content Creator, Strategist).
**Goal**: A unified dashboard to govern two distinct music ecosystems.

### Project A: Kirbai (The Brand)
- **Goal**: High-fidelity, Pokémon-themed musical storytelling.
- **DNA**: Quality over quantity. Authenticity. World-building.
- **Core Feature**: The Lore Matrix (Persistent character/event tracking).

### Project B: Music Factory (The Utility)
- **Goal**: Pure monetization via AI Guerrilla SEO.
- **Artists**: AELOW (English), KURAO (Japanese).
- **DNA**: Quantity over quality. Rapid experimentation. Keyword dominance.
- **Core Feature**: Creative Engine (Batch lyrics, AI metadata).

---

## 2. Technical Architecture
- **Framework**: Next.js (App Router).
- **Persistence**: Supabase (Single-table `persistence` for KV storage + specialized `lore_nodes`/`lore_edges` tables).
- **AI Engine**: Google Gemini SDK (`@google/genai`).
- **Styling**: Vanilla CSS (CSS Modules). **NO TAILWIND ALLOWED.**
- **Deployment**: Vercel (Serverless).

---

## 3. Module Index
- **`Pulse`**: Analytics hub. YouTube API integration + Meta Business Suite CSV parsing.
- **`Creative`**: Content generation. Ingests Suno/Udio lyrics and outputs SEO-optimized metadata.
- **`Vault`**: Central project management. Tracks status of hundreds of tracks across aliases.
- **`Money`**: Financial intelligence. Parses DistroKid TSV exports for reporting latency and revenue trends.
- **`Core`**: Roadmap development and high-level strategic planning.

---

## 4. Ground Rules for AI Assistants
> [!IMPORTANT]
> **Filesystem Restriction**: NEVER use `fs.writeFileSync` or local storage for dynamic data. The environment is RO (Read-Only) in production. Use `getRow`/`setRow` in `src/lib/db.ts`.

- **Model Preference**: Use `gemini-2.5-flash` for high-volume tasks (Pulse, Creative) and `gemini-2.5-pro` for strategic planning (Lore, Advice).
- **Visual Aesthetic**: Ultra-minimalist dark mode (#FF3366 pink accents). Premium, glassmorphism, zero filler.
- **SDK Syntax**: This project uses a version of the `@google/genai` SDK where `.text` is a property/getter, not a function `.text()`.

---

## 5. Development History (V3.2.1_EVO)
- **Pulse Restoration**: Fixed broken Meta CSV parsing by migrating logic to Supabase persistence.
- **Persistence Migration**: Moved `Vault`, `Style Guide`, and `Projects` from local JSON files to Supabase.
- **Lore Base64 Fix**: Refactored image uploads to use Data URLs (Base64) to bypass cloud storage requirements.
- **Analytics Depth**: Enhanced Pulse to provide Top 3 rankings for Follower Magnets and Engagement Anchors with conversion rates.

---

## 6. AI Autonomy & Command Permissions
- **[AUTO-RUN: ON]**: `git status`, `git diff`, `ls`, `grep`, `find_by_name`.
- **[AUTO-RUN: ON]**: `git add .` and `git commit` (if changes are explained first).
- **[AUTO-RUN: OFF]**: `git push`, `npm install`, file deletions, or any command impacting production state.

---

## 7. Hand-off Instructions
If you are taking over this project:
1. **Check Environment**: Ensure `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, and Supabase credentials are in `.env.local`.
2. **Persistence First**: Before adding any new persistent feature, add a helper to `src/lib/db.ts`.
3. **Keep it Clean**: Do not introduce UI libraries. Keep components focused on performance and minimalism.
4. **Data Gravity**: All intelligence scales through `generate-content`. Keep the System Instructions in that route updated with the latest Brand DNA.

---

## 8. Kirbai Knowledge Contract
- **Read first for any Kirbai task**: `data/vault/brand/identity.json`. It is the durable source for artist identity, audience, voice, social presence, content pillars, music/release architecture, DistroKid rules, verified artist links, and source-of-truth policy.
- **Historical performance baseline**: `data/vault/analytics/kirbai_stats_baseline.json` contains a deduplicated, dated summary of Erik's Instagram, Facebook, and DistroKid exports. Refresh it from `/Users/erikhenry2/Desktop/KIRBAI POKEMON/stats/` with `npm run stats:baseline`.
- **Distribution catalog**: `data/vault/releases/distrokid_catalog.json` is authoritative for exact distributed titles, release/upload dates, UPCs, track ISRCs, delivery status, and store links. `needs_review` means scope is unknown—not non-Pokémon. Releases listed in `vaultPolicy.catalogOnlyByUser` remain distribution history only and must not be made into Vault projects unless Erik changes that decision.
- **Current state is separate from permanent identity**: Vault owns projects/tracklists/status, Lore Matrix owns canon, Pulse owns fresh social performance, and Revenue Engine owns fresh DistroKid/store performance.
- **Runtime context**: `/api/context/kirbai` assembles the identity baseline plus current projects, roadmap, lore, social analytics, and compact distribution performance.
- **Freshness rule**: Never present a metric, release status, platform tactic, or link as current without checking its newest dated source. Never invent missing URLs, IDs, royalties, or metadata.
- **Alias boundary**: Kirbai is the high-fidelity artist brand. AELOW and KURAO are Music Factory aliases and must remain separate unless Erik explicitly requests comparison.
