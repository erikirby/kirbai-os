import { config } from "dotenv";
config({ path: ".env.local" });

import { saveMissionAsync } from "../src/lib/db";

const missionId = `mission-${Date.now()}`;

const mission = {
    id: missionId,
    conceptId: `promoted-${Date.now()}`,
    title: "Golden Liquidation",
    conceptDescription: "Opulent, high-fashion K-Pop performance blended with the chilling reality of corporate control. Shiny golds, corrupted pinks, and hyper-realistic textures. Gholdengo and the Heart Scales Girl Group.",
    alias: "Kirbai",
    mode: "kirbai",
    targetRuntime: "85",
    references: [],
    requiredReferences: [
        { label: "Gholdengo", description: "The golden CEO executive", category: "Character" },
        { label: "Ditto", description: "Untransformed blob workers in purple goo form", category: "Character" },
        { label: "Lopunny", description: "Heart Scales Girl Group member", category: "Character" },
        { label: "Meowscarada", description: "Heart Scales Girl Group member", category: "Character" },
        { label: "Pheromosa", description: "Heart Scales Girl Group member", category: "Character" },
        { label: "Meloetta", description: "Heart Scales Girl Group member", category: "Character" },
        { label: "Golden Throne Room", description: "Vast hall dripping in polished gold with holographic financial screens", category: "Location" },
        { label: "The Vault", description: "Luxurious contract and transformation chamber, glowing pink accents", category: "Location" },
        { label: "Destiny Knot", description: "Glowing red thread wrapping around victims", category: "Object" },
        { label: "Heart Scale Locket", description: "Pristine pink mind-control locket choker", category: "Object" },
        { label: "Luvdisc Remote", description: "Sleek golden remote control with pink accents", category: "Object" },
        { label: "Production Floor", description: "Infinite warehouse testing lab under clinical spotlights", category: "Location" }
    ],
    cameos: ["Gholdengo", "Ditto", "Lopunny", "Meowscarada", "Pheromosa", "Meloetta", "Luvdisc"],
    shots: [
        {
            id: `${missionId}-shot-0`,
            timestamp: "0.0s",
            lyric: "I found a blank slate in the nursery pen (Ditto Ditto)",
            visualDescription: "Int. The Vault - Wide shot. In a glowing pink holographic chamber, untransformed Dittos gaze longingly at a dazzling K-Pop fame contract projecting holographic wealth.",
            personaCritiques: {
                director: "Set the stakes immediately in the Vault.",
                strategist: "Great visual hook to establish the desire for fame.",
                audience: "Make sure the holographic wealth looks extremely alluring."
            },
            bananaPromptV2: "A cinematic high-fashion wide shot inside [The Vault]. Untransformed [Ditto] blobs gaze longingly upward at a glowing pink holographic contract projecting wealth. Shiny golds, corrupted pinks, 35mm lens, rim lighting. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. Untransformed purple blobs gazing at a glowing pink hologram in a golden room.",
            refLabels: ["The Vault", "Ditto"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-1`,
            timestamp: "7.7s",
            lyric: "Use him once then I use him again",
            visualDescription: "Int. The Vault - Close up. A Ditto willingly extends a purple limb to press onto the glowing pink contract, leaving a perfect, round print. The text flashes 'identity forfeiture'.",
            personaCritiques: {
                director: "Show the tragic moment of consent.",
                strategist: "The flash of the text provides a great Easter egg for rewatches.",
                audience: "Heartbreaking but cunty."
            },
            bananaPromptV2: "A cinematic extreme close-up inside [The Vault]. An untransformed [Ditto] extends a purple limb to press onto a glowing pink holographic contract. The contract text glows intensely. 35mm lens, macro shot. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. A purple blob pressing a limb against a glowing digital screen.",
            refLabels: ["The Vault", "Ditto"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-2`,
            timestamp: "15.4s",
            lyric: "He doesn't need a face he just needs to provide",
            visualDescription: "Int. The Vault - Medium shot. Gholdengo gestures from a screen. Glowing red Destiny Knot threads erupt from the contracts and violently wrap tightly around the contorting Dittos.",
            personaCritiques: {
                director: "Make the transformation visceral and uncomfortable.",
                strategist: "Intense action will retain viewers.",
                audience: "Ariel transformation tease!"
            },
            bananaPromptV2: "A cinematic medium shot inside [The Vault]. Glowing red [Destiny Knot] threads emerge from holographic screens and violently wrap tightly around contorting [Ditto] forms. Dramatic lighting, high contrast. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. Red glowing threads wrapping tightly around struggling purple blobs.",
            refLabels: ["The Vault", "Destiny Knot", "Ditto"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-3`,
            timestamp: "23.1s",
            lyric: "While I sell the beauty that he's carrying inside",
            visualDescription: "Int. The Vault - Wide shot. The red threads sink in. The Dittos solidify into high-fashion K-Pop forms of Lopunny, Meowscarada, Pheromosa, and Meloetta. A pristine pink Heart Scale locket snaps into place on their necks.",
            personaCritiques: {
                director: "The payoff of the transformation.",
                strategist: "The visual switch to high-fashion idols is the primary hook.",
                audience: "Absolutely sickening glow-up."
            },
            bananaPromptV2: "A cinematic high-fashion wide shot inside [The Vault]. [Lopunny], [Meowscarada], [Pheromosa], and [Meloetta] striking powerful poses, each wearing a glowing pink [Heart Scale Locket] choker. Opulent, shiny golds. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. Four stylish anime characters posing dramatically with glowing pink chokers.",
            refLabels: ["The Vault", "Lopunny", "Meowscarada", "Pheromosa", "Meloetta", "Heart Scale Locket"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-4`,
            timestamp: "30.8s",
            lyric: "(Instrumental Build - The Empire)",
            visualDescription: "Int. Golden Throne Room - Establishing shot. Gholdengo sits on a massive throne that sits on a performance stage. Holographic screens flash financial data. Untransformed Dittos in the background perform perfectly synchronized K-Pop dance moves.",
            personaCritiques: {
                director: "Establish the sheer scale of Gholdengo's operation.",
                strategist: "Good pacing breather before the main dance break.",
                audience: "The capitalism aesthetic is serving."
            },
            bananaPromptV2: "A cinematic wide establishing shot of the [Golden Throne Room]. [Gholdengo] sits on a massive golden throne stage. Holographic financial screens flash. Dozens of [Ditto] in the background in synchronized poses. Opulent lighting. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. A golden mascot character on a huge throne while purple blobs stand in formation behind him.",
            refLabels: ["Golden Throne Room", "Gholdengo", "Ditto"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-5`,
            timestamp: "38.5s",
            lyric: "You're the product I'm the price",
            visualDescription: "Int. Golden Throne Room - Wide shot. The Heart Scales girls join the stage. They perform a sharp, powerful, perfectly synchronized unison K-Pop choreography alongside Gholdengo.",
            personaCritiques: {
                director: "High energy performance shot.",
                strategist: "This is the 'TikTok dance' moment.",
                audience: "Slay the house down choreography."
            },
            bananaPromptV2: "A cinematic wide shot in the [Golden Throne Room]. [Lopunny], [Meowscarada], [Pheromosa], and [Meloetta] performing synchronized sharp K-Pop dance poses around [Gholdengo]. High energy, dynamic club lighting, 35mm lens. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. Characters dancing in perfect unison on a golden stage.",
            refLabels: ["Golden Throne Room", "Lopunny", "Meowscarada", "Pheromosa", "Meloetta", "Gholdengo"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-6`,
            timestamp: "46.2s",
            lyric: "Welcome to the glitter and the sacrifice",
            visualDescription: "Int. Golden Throne Room - Close up. Meowscarada breaks formation momentarily. A flicker of genuine emotion and purple Ditto goo corruption appears in her wide eyes.",
            personaCritiques: {
                director: "The illusion breaking. Focus on the facial expression.",
                strategist: "A great pattern interrupt to keep viewer attention.",
                audience: "The psychological horror aspect!"
            },
            bananaPromptV2: "A cinematic extreme close-up of [Meowscarada] in the [Golden Throne Room]. Her expression is confused and frightened, her eyes flickering with purple goo corruption. Cinematic lighting, shallow depth of field. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. Close up of an anime cat character looking confused and scared.",
            refLabels: ["Golden Throne Room", "Meowscarada"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-7`,
            timestamp: "53.9s",
            lyric: "We signed the contract ignored the fine print",
            visualDescription: "Int. Golden Throne Room - Medium shot. Gholdengo subtly pulls out a sleek golden Luvdisc remote with pink accents and presses a button. A focused pink beam shoots from the remote towards the stage.",
            personaCritiques: {
                director: "The mechanism of control is deployed.",
                strategist: "Keep it slick and fast.",
                audience: "Villain era behavior."
            },
            bananaPromptV2: "A cinematic medium shot of [Gholdengo] in the [Golden Throne Room]. He is holding a sleek golden [Luvdisc Remote] with glowing pink accents and pressing a button. A pink energy beam shoots forward. Cold, calculating mood. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. A golden mascot character pressing a button on a remote control shooting a pink laser.",
            refLabels: ["Golden Throne Room", "Gholdengo", "Luvdisc Remote"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-8`,
            timestamp: "61.6s",
            lyric: "Only worth the gold that you're about to mint",
            visualDescription: "Int. Golden Throne Room - Close up. The pink beam hits Meowscarada's Heart Scale locket, which glows intensely. Her expression snaps violently back to a flawless, vacant, forced K-Pop idol smile.",
            personaCritiques: {
                director: "The terrifying return to compliance.",
                strategist: "The contrast between fear and the forced smile is powerful.",
                audience: "Stepford wives but make it K-Pop."
            },
            bananaPromptV2: "A cinematic extreme close-up of [Meowscarada]. A pink energy beam is hitting her glowing [Heart Scale Locket]. Her facial expression is a flawless, vacant, terrifyingly wide K-Pop idol smile. Rim lighting. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. An anime character being hit by a pink beam and suddenly smiling perfectly.",
            refLabels: ["Golden Throne Room", "Meowscarada", "Heart Scale Locket"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-9`,
            timestamp: "69.3s",
            lyric: "(The Golden Flex)",
            visualDescription: "Ext. Abstract Space - Epic wide shot. Gholdengo surfs on a colossal wave of cascading gold coins and shimmering pink Heart Scales. Beneath the wave, churning raw purple Ditto goo is visible.",
            personaCritiques: {
                director: "Showcase absolute mastery and excess.",
                strategist: "This is the visually impressive 'sick' moment meant to be clipped.",
                audience: "Pure opulence."
            },
            bananaPromptV2: "A cinematic epic wide shot. [Gholdengo] surfing dynamically on a massive towering wave composed entirely of gold coins and glowing pink Heart Scales. Underneath the wave is churning purple [Ditto] goo. High contrast, hyper-realistic, dramatic action shot. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. A golden character surfing on a huge wave of gold coins.",
            refLabels: ["Gholdengo", "Ditto"],
            status: "planned"
        },
        {
            id: `${missionId}-shot-10`,
            timestamp: "77.0s",
            lyric: "Liquidate!",
            visualDescription: "Int. Production Floor - Epic sweeping wide shot. The camera pulls back to reveal the stage is a massive high-tech showroom. Endless, perfectly identical formations of the Heart Scales Girl Group stretch into the distance under clinical spotlights. Gholdengo stands colossal, hand extended in absolute command.",
            personaCritiques: {
                director: "The chilling climax. Infinite replication.",
                strategist: "Incredible sense of scale to end the video on a high note.",
                audience: "Mother is a factory now."
            },
            bananaPromptV2: "A cinematic ultra-wide shot inside an infinite, clinical [Production Floor]. Hundreds of identical replica groups of [Lopunny], [Meowscarada], [Pheromosa], and [Meloetta] standing in perfect rows. [Gholdengo] stands as a tiny but commanding silhouette in the foreground, hand extended. Dramatic clinical spotlights. [High Fidelity]",
            grokPromptV2: "models stay consistent and do not morph. no music, only sound effects. An infinitely massive warehouse filled with thousands of identical anime pop stars standing in rows.",
            refLabels: ["Production Floor", "Lopunny", "Meowscarada", "Pheromosa", "Meloetta", "Gholdengo"],
            status: "planned"
        }
    ],
    shotCount: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

saveMissionAsync(mission as any).then(() => {
    console.log("Mission Successfully Created: " + mission.id);
    process.exit(0);
}).catch(e => {
    console.error("Failed to create mission:", e);
    process.exit(1);
});
