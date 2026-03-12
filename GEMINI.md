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

## 6. Hand-off Instructions
If you are taking over this project:
1. **Check Environment**: Ensure `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, and Supabase credentials are in `.env.local`.
2. **Persistence First**: Before adding any new persistent feature, add a helper to `src/lib/db.ts`.
3. **Keep it Clean**: Do not introduce UI libraries. Keep components focused on performance and minimalism.
4. **Data Gravity**: All intelligence scales through `generate-content`. Keep the System Instructions in that route updated with the latest Brand DNA.
