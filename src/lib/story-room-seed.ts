// PRC Story Room seed — imported from the desktop "Pretty Rare Candies Corkboard" (2026-09-06).
// Used only to populate an empty board on first load; after that the Supabase copy is authoritative.

export interface StoryCharacter {
  id: string;
  name: string;
  icon: string;
  tag: string;
  x: number;
  y: number;
  role: "lead" | "supporting" | "mystery";
  tension: string;
  seeds: string[];
  payoff: string;
  open: string;
  related: string[];
}

export interface RoadmapField {
  label: string;
  value: string;
}

export interface RoadmapCard {
  step: number;
  status: "done" | "next" | "optional" | "event";
  statusLabel: string;
  title: string;
  cast: string;
  fields: RoadmapField[];
}

export interface SkitRoadmap {
  intro: string;
  kirbaiFit: string;
  greenlightTests: { name: string; description: string }[];
  greenlightRule: string;
  cards: RoadmapCard[];
  howToChoose: string[];
  hookAuditFields: string[];
  tarotWarning: string;
  coldViewerRule: string;
}

export interface MusicVideoBeat {
  label: string;
  title: string;
  description: string;
}

export interface MusicVideoPerformer {
  tier: string;
  name: string;
  role: string;
  action: string;
}

export interface MusicVideoSheet {
  kicker: string;
  title: string;
  summary: string;
  locks: string[];
  storyEngine: RoadmapField[];
  storyNote: string;
  locationPlan: RoadmapField[];
  locationNote: string;
  timeline: MusicVideoBeat[];
  performers: MusicVideoPerformer[];
  hookRules: string[];
  productionNotes: string[];
}

export interface BattleBeat {
  number: number;
  title: string;
  description: string;
  finisher?: boolean;
}

export interface StoryRoomState {
  era: string;
  characters: StoryCharacter[];
  skitRoadmap?: SkitRoadmap;
  musicVideos?: MusicVideoSheet[];
  finalBattle?: BattleBeat[];
}

export const PRC_STORY_ROOM_SEED: StoryRoomState = {
  era: "Pretty Rare Candies",
  characters: [
  {
    "id": "gholdengo",
    "name": "Gholdengo",
    "icon": "/story-room/gholdengo.png",
    "tag": "Producer / secret villain",
    "x": 49.5,
    "y": 15.3,
    "role": "lead",
    "tension": "Treats the cast's real emotions as content and quietly escalates danger whenever ratings soften.",
    "seeds": [
      "Moves cameras toward every fight instead of helping.",
      "Rewards the cast after especially cruel scenes.",
      "Handles Diancie's cake topper, leaving it with one suspicious pulse.",
      "A ratings monitor briefly reflects in his eyes."
    ],
    "payoff": "The post-credit control-room reveal shows that he amplified the beacon and gambled with the island for record ratings.",
    "open": "How much did he plan: only the beacon amplification, or also the timing of the Minior shower? Keeping Deoxys genuinely unpredictable preserves the danger.",
    "related": [
      "jynx",
      "meowth",
      "alolanMeowth",
      "diancie",
      "deoxys"
    ]
  },
  {
    "id": "jynx",
    "name": "Jynx",
    "icon": "/story-room/jynx.png",
    "tag": "Gholdengo's glamorous mistress",
    "x": 61.1,
    "y": 15.3,
    "role": "supporting",
    "tension": "She wants Gholdengo's money and status; he knows it and keeps her close because her glamour and appetite suit his world. Their arrangement is knowingly transactional on both sides.",
    "seeds": [
      "Appears beside him with the same crimped hair from his original video.",
      "Accepts an extravagant gift while Meowth records the expense.",
      "Notices the green heart case in his control room and chooses not to ask."
    ],
    "payoff": "Her presence in the ratings reveal shows that Gholdengo has an intimate circle, not merely employees—but leaves open how much of the Deoxys gamble she actually knew.",
    "open": "Best version: Jynx knows he manufactures drama, but not that this scheme could destroy the island.",
    "related": [
      "gholdengo",
      "meowth",
      "alolanMeowth"
    ]
  },
  {
    "id": "meowth",
    "name": "Meowth",
    "icon": "/story-room/meowth.png",
    "tag": "Cash-counting assistant",
    "x": 71.8,
    "y": 15.3,
    "role": "supporting",
    "tension": "Treats every emotional disaster as a line item and keeps Gholdengo's operation profitable.",
    "seeds": [
      "Counts coins while the cast fights on a monitor.",
      "Carries a sealed expense envelope marked for Diancie's production.",
      "Exchanges a knowing look with Alolan Meowth when ratings spike."
    ],
    "payoff": "Appears in the control room tallying the record audience while the island celebrates outside.",
    "open": "Keep Meowth complicit but mostly administrative; the comedy is ruthless office efficiency.",
    "related": [
      "gholdengo",
      "jynx",
      "alolanMeowth"
    ]
  },
  {
    "id": "alolanMeowth",
    "name": "Alolan Meowth",
    "icon": "/story-room/meowth-alola.png",
    "tag": "Luxury and image assistant",
    "x": 82.4,
    "y": 15.3,
    "role": "supporting",
    "tension": "Protects the producer's image and treats genuine catastrophe as a branding inconvenience.",
    "seeds": [
      "Adjusts Jynx's look before a supposedly candid scene.",
      "Removes evidence from frame just before filming begins.",
      "Delivers a beautiful green package without revealing who sent it."
    ],
    "payoff": "Tidies the control room as Gholdengo greenlights the next season, proving the machine is already resetting.",
    "open": "The delivery can show only a paw or tail if identifying Gholdengo that early feels too obvious.",
    "related": [
      "gholdengo",
      "jynx",
      "meowth",
      "diancie"
    ]
  },
  {
    "id": "deoxys",
    "name": "Deoxys",
    "icon": "/story-room/deoxys.png",
    "tag": "Unseen signal / season threat",
    "x": 9.5,
    "y": 15.3,
    "role": "mystery",
    "tension": "A purple Deoxys in space is searching for the dormant green Deoxys hidden inside Diancie's heart-shaped topper.",
    "seeds": [
      "A purple point of light reacts when the green case pulses.",
      "Froslass's Star card briefly reflects an unfamiliar silhouette.",
      "A monitor loses signal for one frame as something turns toward the island."
    ],
    "payoff": "The beacon reveals the dormant green Deoxys's location and draws the purple Deoxys to Poké Island.",
    "open": "Keep the early glimpses readable but incomplete: repeat the purple light and green pulse without showing a full explanation.",
    "related": [
      "gholdengo",
      "diancie",
      "minior"
    ]
  },
  {
    "id": "minior",
    "name": "Minior",
    "icon": "/story-room/minior.png",
    "tag": "Cute omen / falling-star swarm",
    "x": 19.2,
    "y": 15.3,
    "role": "mystery",
    "tension": "They initially read as charming shooting stars, then become the first physical danger caused by the approaching space disturbance.",
    "seeds": [
      "One crosses the background of an unrelated romantic skit.",
      "A childlike character makes a wish as several more appear.",
      "The number of falling stars quietly increases from video to video."
    ],
    "payoff": "The shower ignites island fires and a giant Minior becomes the sub-boss defeated by Diamond Aria.",
    "open": "Keep early Minior appearances adorable so the escalation feels like a visual betrayal.",
    "related": [
      "deoxys",
      "diancie",
      "primarina"
    ]
  },
  {
    "id": "roserade",
    "name": "Roserade",
    "icon": "/story-room/roserade.png",
    "tag": "Mean girl hiding an old wound",
    "x": 15.7,
    "y": 34.4,
    "role": "lead",
    "tension": "Once a sweet Roselia, she became cruel after Rillaboom dumped her. She targets Milotic because effortless beauty and kindness expose her insecurity.",
    "seeds": [
      "Creates a Burn Book with Florges and Lilligant.",
      "Rillaboom returns with Tsareena, cracking Roserade's composure.",
      "A poison attack accidentally makes Milotic stronger through Marvel Scale.",
      "The Mean Girls bus moment leaves Roserade bandaged and publicly humbled."
    ],
    "payoff": "She poisons Milotic strategically, enabling Mirror Coat, then protects Milotic from falling debris. Their quiet smile completes the turn.",
    "open": "Give her one private Roselia flashback before the bus scene so vulnerability arrives before redemption—not only after punishment.",
    "related": [
      "milotic",
      "rillaboom",
      "tsareena",
      "lilligant",
      "florges"
    ]
  },
  {
    "id": "rillaboom",
    "name": "Rillaboom",
    "icon": "/story-room/rillaboom.png",
    "tag": "Roserade's ex / musical wound",
    "x": 9.5,
    "y": 22.8,
    "role": "supporting",
    "tension": "He once made music with sweet Roselia, then left the island and broke her heart. His return makes Roserade's mean-girl armor visibly crack.",
    "seeds": [
      "A warm flashback shows him drumming while Roselia dances.",
      "He returns without warning with Tsareena on his arm.",
      "A familiar rhythm makes Roserade freeze before she covers it with cruelty.",
      "He tries to speak to her while the posse blocks him."
    ],
    "payoff": "His return exposes the origin of Roserade's cruelty, but her eventual choice to protect Milotic proves that he no longer controls who she becomes.",
    "open": "Did he abandon Roselia cruelly, or did she misunderstand why he left? Cruel is cleaner visually; complicated gives Roserade more uncomfortable vulnerability.",
    "related": [
      "roserade",
      "tsareena"
    ]
  },
  {
    "id": "tsareena",
    "name": "Tsareena",
    "icon": "/story-room/tsareena.png",
    "tag": "The ex's glamorous return",
    "x": 21.9,
    "y": 22.8,
    "role": "supporting",
    "tension": "She arrives beside Rillaboom looking like everything Roserade fears she was replaced by: poised, powerful, and perfectly matched with him.",
    "seeds": [
      "Steps off the boat holding Rillaboom's arm as Roserade drops the Burn Book.",
      "Returns Roserade's stare without flinching.",
      "Effortlessly draws Florges and Lilligant's attention away from their leader.",
      "Privately reveals she may know less about the breakup than Roserade assumes."
    ],
    "payoff": "She forces Roserade's buried heartbreak into the open; she does not need to be the true villain for her presence to detonate the season.",
    "open": "Is Tsareena knowingly provoking Roserade, or simply confident and unaware? Unaware makes Roserade's spiral sadder and funnier.",
    "related": [
      "roserade",
      "rillaboom",
      "florges",
      "lilligant"
    ]
  },
  {
    "id": "lilligant",
    "name": "Lilligant",
    "icon": "/story-room/lilligant.png",
    "tag": "Posse follower / loose cannon",
    "x": 9.5,
    "y": 46,
    "role": "supporting",
    "tension": "She enjoys the status of Roserade's clique but is too eager, making private cruelty public at the worst possible time.",
    "seeds": [
      "Adds an unexpectedly vicious page to the Burn Book.",
      "Laughs too loudly at Milotic and exposes the group's setup.",
      "Becomes fascinated by Tsareena's confidence.",
      "Tries to hide the Burn Book after the bus incident."
    ],
    "payoff": "Her wavering loyalty shows Roserade that fear built the posse, not genuine affection.",
    "open": "Decide whether Lilligant defects to Tsareena or becomes the first posse member to check on injured Roserade.",
    "related": [
      "roserade",
      "florges",
      "tsareena"
    ]
  },
  {
    "id": "florges",
    "name": "Florges",
    "icon": "/story-room/florges.png",
    "tag": "Posse strategist / enabler",
    "x": 19.2,
    "y": 46,
    "role": "supporting",
    "tension": "She gives Roserade's cruelty polish and plausible deniability, turning emotional wounds into organized social warfare.",
    "seeds": [
      "Presents Roserade with the Burn Book like a ceremonial gift.",
      "Directs a coordinated Milotic humiliation from behind the scenes.",
      "Notices Roserade's panic when Rillaboom returns.",
      "Quietly closes the Burn Book when the joke stops being funny."
    ],
    "payoff": "She is the first posse member to recognize that Roserade's campaign has become self-destruction, even if she is too cowardly to stop it publicly.",
    "open": "Should Florges genuinely care about Roserade beneath the enabling, or abandon her the moment her social power collapses?",
    "related": [
      "roserade",
      "lilligant",
      "tsareena"
    ]
  },
  {
    "id": "milotic",
    "name": "Milotic",
    "icon": "/story-room/milotic.png",
    "tag": "Bullied beauty / resilient healer",
    "x": 35.3,
    "y": 34.4,
    "role": "lead",
    "tension": "Roserade humiliates her, but Milotic's refusal to become cruel makes Roserade even angrier.",
    "seeds": [
      "Tries to include Roserade and is rejected.",
      "Survives Roserade's poison and visibly becomes tougher.",
      "Uses Aqua Ring after an attack rather than retaliating.",
      "Sees Roserade vulnerable but does not exploit it."
    ],
    "payoff": "Marvel Scale turns Roserade's poison into strength; Mirror Coat reflects Deoxys's blast. Milotic then accepts Roserade's protection.",
    "open": "Decide whether Milotic knows Roserade's finale poison is intentional help immediately, or understands only after the reflected blast.",
    "related": [
      "roserade",
      "dragonair"
    ]
  },
  {
    "id": "dragonair",
    "name": "Dragonair",
    "icon": "/story-room/dragonair.png",
    "tag": "Milotic's steadfast friend",
    "x": 35.3,
    "y": 22.8,
    "role": "supporting",
    "tension": "Dragonair sees through Roserade's treatment of Milotic and wants Milotic to defend herself, while Milotic refuses to become cruel.",
    "seeds": [
      "Comforts Milotic after a public humiliation.",
      "Silently blocks the posse from filming Milotic at her lowest moment.",
      "Helps Milotic practice controlling Mirror Coat without turning it into revenge."
    ],
    "payoff": "Stays beside Milotic during the Minior crisis and is the first to recognize that Roserade's final poison is meant to activate Marvel Scale, not destroy her.",
    "open": "Keep this the cast's uncomplicated loyal friendship; it does not need a betrayal twist.",
    "related": [
      "milotic",
      "roserade"
    ]
  },
  {
    "id": "ninetales",
    "name": "Ninetales",
    "icon": "/story-room/ninetales-alola.png",
    "tag": "Elegant flirt / guarded powerhouse",
    "x": 60.2,
    "y": 34.4,
    "role": "lead",
    "tension": "Flirts with Lucario while Diancie spirals, but keeps Kanto Ninetales at a distance. Her deepest wound is the broken friendship with Froslass.",
    "seeds": [
      "Froslass's tarot publicly reveals Ninetales's hidden feelings for Kanto Ninetales—the strongest candidate for their falling-out.",
      "Ninetales dismisses the reading and freezes Froslass out.",
      "Their powers accidentally form a tiny aurora during an argument.",
      "She quietly checks on Froslass when nobody is looking."
    ],
    "payoff": "They reunite to create the Aurora Veil. When Froslass falls, Ninetales protects her and holds the barrier alone.",
    "open": "Lock the exact betrayal. Best visual option: Froslass reveals the Kanto Ninetales card in front of everyone, exposing a secret Ninetales had trusted her with.",
    "related": [
      "froslass",
      "lucario",
      "kanto"
    ]
  },
  {
    "id": "froslass",
    "name": "Froslass",
    "icon": "/story-room/froslass.png",
    "tag": "Tarot confidante / hidden predator",
    "x": 80.6,
    "y": 34.4,
    "role": "lead",
    "tension": "Everyone seeks her advice, but nobody knows the darkness beneath her calm exterior. She misses Ninetales while refusing to admit fault.",
    "seeds": [
      "Reads The Star, The Tower, Lovers reversed, Temperance, and the King of Coins.",
      "Gives different cast members warnings they misread as romance drama.",
      "She and Primarina lure or curse men together and discover genuine chemistry.",
      "A private predator-mode glimpse complicates her trusted-adviser image."
    ],
    "payoff": "Repairs her friendship with Ninetales to form the veil; her fall forces Ninetales to prove she still cares. Her romance with Primarina remains a separate relationship.",
    "open": "How dangerous is predator mode? It should threaten trust without making her impossible to root for as Primarina's eventual partner.",
    "related": [
      "ninetales",
      "primarina",
      "mismagius",
      "diancie"
    ]
  },
  {
    "id": "mismagius",
    "name": "Mismagius",
    "icon": "/story-room/mismagius.png",
    "tag": "Froslass's glamorous ex",
    "x": 88.7,
    "y": 22.8,
    "role": "supporting",
    "tension": "She returns just as Froslass's connection with Primarina becomes real, carrying intimate knowledge of the predator side Froslass hides from everyone else.",
    "seeds": [
      "Appears unannounced during a tarot reading and turns over a card herself.",
      "Greets Froslass with effortless familiarity while Primarina watches.",
      "Hints that Froslass once used her curses for something darker than romantic revenge."
    ],
    "payoff": "Forces Froslass to choose honesty with Primarina instead of retreating into the secrecy that ruined her previous relationship.",
    "open": "Decide whether Mismagius genuinely wants Froslass back or simply enjoys proving she still has power over her.",
    "related": [
      "froslass",
      "primarina"
    ]
  },
  {
    "id": "alcremie",
    "name": "Alcremie",
    "icon": "/story-room/alcremie.png",
    "tag": "Perfectionist baker",
    "x": 15.7,
    "y": 61,
    "role": "lead",
    "tension": "Hates the chaos Lillipup creates around her work and blames Regirock for carrying it everywhere.",
    "seeds": [
      "Lillipup destroys or contaminates an elaborate dessert.",
      "Regirock refuses to abandon Lillipup, deepening the feud.",
      "Alcremie angrily splashes cream onto Regirock and accidentally powers her up.",
      "Builds Diancie's enormous romantic cake and unknowingly houses the beacon."
    ],
    "payoff": "Despite everything, Alcremie deliberately uses Decorate on Regirock before the space attack.",
    "open": "Make Regirock earn the help with one earlier act that protects Alcremie's work or reputation—without resolving the feud too soon.",
    "related": [
      "regirock",
      "lillipup",
      "diancie",
      "slurpuff"
    ]
  },
  {
    "id": "slurpuff",
    "name": "Slurpuff",
    "icon": "/story-room/slurpuff.png",
    "tag": "Baking friend / enthusiastic taster",
    "x": 8.6,
    "y": 73.4,
    "role": "supporting",
    "tension": "Alcremie trusts Slurpuff's palate, but Slurpuff's enthusiasm can turn a controlled kitchen into cheerful chaos.",
    "seeds": [
      "Helps Alcremie test fillings for Diancie's cake.",
      "Smells that something inside the mysterious topper is wrong.",
      "Distracts Lillipup with treats before a dessert disaster."
    ],
    "payoff": "Helps Alcremie finish the enormous cake under pressure and recognizes that the cracked topper does not smell like food or magic.",
    "open": "Keep Slurpuff useful and funny without creating another full feud for Alcremie.",
    "related": [
      "alcremie",
      "lillipup",
      "diancie"
    ]
  },
  {
    "id": "regirock",
    "name": "Regirock",
    "icon": "/story-room/regirock.png",
    "tag": "Comic diva / unlikely commander",
    "x": 35.3,
    "y": 61,
    "role": "lead",
    "tension": "Alcremie sees her as irresponsible; the other Regis treat her like the embarrassing sibling rather than a leader.",
    "seeds": [
      "Keeps choosing Lillipup over social approval.",
      "Calls in the Regi family and discovers they are all enormous divas.",
      "Attempts a smaller team pose that collapses into sibling chaos.",
      "Shows one unexpected moment of tactical competence."
    ],
    "payoff": "Alcremie powers her up; the Regis finally follow her command and join hands for the finishing attack.",
    "open": "Give her one pre-finale decision where her ridiculous instinct is secretly correct, establishing leadership without losing the joke.",
    "related": [
      "alcremie",
      "lillipup",
      "regice",
      "registeel",
      "regidrago",
      "regieleki",
      "regigigas"
    ]
  },
  {
    "id": "regice",
    "name": "Regice",
    "icon": "/story-room/regice.png",
    "tag": "Ice-cold diva sibling",
    "x": 29,
    "y": 50.2,
    "role": "supporting",
    "tension": "Treats Regirock's chaos like a public embarrassment and refuses to believe she can command the family.",
    "seeds": [
      "Answers Regirock's call wearing full diva styling.",
      "Freezes a collapsing group pose instead of admitting it failed.",
      "Competes with Registeel over who looks least impressed."
    ],
    "payoff": "Stops judging long enough to follow Regirock into space and channels ice energy into the family finisher.",
    "open": "Give Regice one unmistakable silent reaction gag that becomes her signature within the family.",
    "related": [
      "regirock",
      "registeel"
    ]
  },
  {
    "id": "registeel",
    "name": "Registeel",
    "icon": "/story-room/registeel.png",
    "tag": "Deadpan fashion sibling",
    "x": 41.5,
    "y": 50.2,
    "role": "supporting",
    "tension": "Acts too sophisticated for Regirock's plans while quietly competing for control of every family entrance.",
    "seeds": [
      "Corrects the family's pose with one precise gesture.",
      "Uses Fidough and the beret to stage an absurdly polished arrival.",
      "Pretends not to care when Regirock's instinct proves correct."
    ],
    "payoff": "Adds steel strength to the linked Regi formation and visibly accepts Regirock's command.",
    "open": "Should Registeel be Regirock's primary sibling rival, or the dry observer who makes every disaster funnier?",
    "related": [
      "regirock",
      "regice"
    ]
  },
  {
    "id": "regidrago",
    "name": "Regidrago",
    "icon": "/story-room/regidrago.png",
    "tag": "Gothic dragon diva",
    "x": 24.6,
    "y": 73.4,
    "role": "supporting",
    "tension": "Her theatrical mourning energy clashes with Regirock's loud confidence, turning every family meeting into a melodrama.",
    "seeds": [
      "Arrives floating beneath an enormous fascinator and veil.",
      "Uses one dragon jaw to carry the handbag like a funeral procession.",
      "Overreacts to a tiny sibling insult as if betrayed for centuries."
    ],
    "payoff": "Brings dragon energy to the family attack and becomes the most visually dramatic part of the space formation.",
    "open": "Keep her humor rooted in solemn overreaction rather than dialogue-heavy lore.",
    "related": [
      "regirock"
    ]
  },
  {
    "id": "regieleki",
    "name": "Regieleki",
    "icon": "/story-room/regieleki.png",
    "tag": "Hyperactive pop diva",
    "x": 45.9,
    "y": 73.4,
    "role": "supporting",
    "tension": "Moves too fast for the family's choreography and treats every serious plan like a runway entrance.",
    "seeds": [
      "Electric wings ruin the first synchronized pose.",
      "Yamper mirrors her frantic energy from the cyan bag.",
      "Her speed accidentally saves a sibling before anyone can react."
    ],
    "payoff": "Supplies the speed and electric charge that launches the linked Regis through the aurora path.",
    "open": "Let her cause one disaster and solve another with the exact same impulsive behavior.",
    "related": [
      "regirock"
    ]
  },
  {
    "id": "regigigas",
    "name": "Regigigas",
    "icon": "/story-room/regigigas.png",
    "tag": "Luxury titan / family elder",
    "x": 35.3,
    "y": 73.4,
    "role": "supporting",
    "tension": "Her enormous scale and expensive taste make every sibling argument feel like a formal family summit.",
    "seeds": [
      "Arrives last carrying the smallest-looking dog and most expensive bag.",
      "Needs everyone else to wait through a painfully slow entrance.",
      "Silently tests whether Regirock can give an order worth following."
    ],
    "payoff": "Her raw power anchors the family formation once Regirock finally earns her respect.",
    "open": "Use her sparingly so the size gag and slow-start entrance stay special.",
    "related": [
      "regirock"
    ]
  },
  {
    "id": "diancie",
    "name": "Diancie",
    "icon": "/story-room/diancie.png",
    "tag": "Desperate princess / romantic chaos",
    "x": 60.2,
    "y": 61,
    "role": "lead",
    "tension": "Chases Lucario and resents how effortlessly Primarina receives attention. Ninetales's casual flirting makes her increasingly desperate.",
    "seeds": [
      "Alcremie helps build her gigantic proposal cake.",
      "Primarina attracts a crowd while Diancie's grand gesture fails.",
      "Diancie and Primarina attack the same nuisance from opposite sides—their powers nearly spiral together before they stop.",
      "Her crystal beacon travels beyond the clouds as a Minior crosses the sky."
    ],
    "payoff": "She fires Diamond Storm simultaneously with Sparkling Aria to create Diamond Aria and defeat the giant Minior.",
    "open": "Their feud needs one moment where Diancie blames Primarina for stealing a spotlight Primarina never actually asked for.",
    "related": [
      "primarina",
      "lucario",
      "alcremie",
      "froslass",
      "carbink"
    ]
  },
  {
    "id": "carbink",
    "name": "Carbink",
    "icon": "/story-room/carbink.png",
    "tag": "Diancie's loyal attendant",
    "x": 59.3,
    "y": 73.4,
    "role": "supporting",
    "tension": "Carbink dutifully supports every oversized romantic scheme, even when it can plainly see Diancie is spiraling.",
    "seeds": [
      "Carries tiny pieces of the proposal-cake display into place.",
      "Inspects the mysterious green heart topper but obeys when Diancie waves the concern away.",
      "Tries to contain the first crystal surge when the casing cracks."
    ],
    "payoff": "Helps Diancie stabilize her position long enough to launch Diamond Storm beside Primarina's Sparkling Aria.",
    "open": "Use one Carbink as Diancie's recurring personal attendant rather than adding a crowd of interchangeable servants.",
    "related": [
      "diancie",
      "alcremie"
    ]
  },
  {
    "id": "primarina",
    "name": "Primarina",
    "icon": "/story-room/primarina.png",
    "tag": "Effortless siren / future partner",
    "x": 80.6,
    "y": 61,
    "role": "lead",
    "tension": "Seduces Gallade for amusement and dismisses Diancie's romantic desperation. Beneath the performance, she connects with Froslass.",
    "seeds": [
      "Gallade believes her performance is sincere; she walks away at the romantic peak.",
      "Rolls her eyes at Diancie's failed Lucario spectacle.",
      "Joins Froslass in enchanting or cursing predatory men.",
      "Sparkling Aria heals someone's burn before the finale establishes its secondary power."
    ],
    "payoff": "She and Diancie launch Diamond Aria as equals. Sparkling Aria cools the giant Minior and heals the island's burns.",
    "open": "Let her show one sincere protective instinct toward Froslass so the lesbian relationship is more than two glamorous predators teaming up.",
    "related": [
      "diancie",
      "froslass",
      "gallade",
      "krabby",
      "finneon"
    ]
  },
  {
    "id": "krabby",
    "name": "Krabby",
    "icon": "/story-room/krabby.png",
    "tag": "Fussy stage manager",
    "x": 72.6,
    "y": 73.4,
    "role": "supporting",
    "tension": "Treats Primarina's romantic performances like serious theater and panics whenever Gallade misses his cue.",
    "seeds": [
      "Snaps its claws like a conductor to start Primarina's number.",
      "Physically redirects Gallade into the correct mark.",
      "Throws up both claws when Primarina abandons the scene at its romantic peak."
    ],
    "payoff": "Keeps Primarina's high-ground attack platform organized during the crisis.",
    "open": "Use Krabby as a visual Sebastian reference without requiring dialogue or a full subplot.",
    "related": [
      "primarina",
      "gallade",
      "finneon"
    ]
  },
  {
    "id": "finneon",
    "name": "Finneon",
    "icon": "/story-room/finneon.png",
    "tag": "Loyal little confidant",
    "x": 85.1,
    "y": 73.4,
    "role": "supporting",
    "tension": "Admires Primarina completely but reacts honestly when her flirtation with Gallade becomes cruel.",
    "seeds": [
      "Swims beside Primarina during the Little Mermaid tableau.",
      "Looks worried while Gallade mistakes the performance for real affection.",
      "Tries unsuccessfully to pull Primarina back after she walks away."
    ],
    "payoff": "Helps guide Primarina's Sparkling Aria safely across the battlefield without hitting the others.",
    "open": "Keep Finneon expressive and silent—the audience should understand its concern from one look.",
    "related": [
      "primarina",
      "gallade",
      "krabby"
    ]
  },
  {
    "id": "smeargle",
    "name": "Smeargle",
    "icon": "/story-room/smeargle.png",
    "tag": "Roaming photographer / production staff",
    "x": 80.6,
    "y": 85,
    "role": "supporting",
    "tension": "Photographed Diancie for the promo and now wanders into everyone else's drama with a camera already raised.",
    "seeds": [
      "Directs an increasingly desperate Diancie through a romantic photo shoot.",
      "Accidentally captures a scandal in the background while posing someone else.",
      "Trades exhausted staff looks with Aipom as the cast spirals."
    ],
    "payoff": "No personal arc required—Smeargle is a recurring visual witness who can connect otherwise separate skits.",
    "open": "Let the photographs reveal jokes or evidence, but keep Smeargle neutral rather than turning him into another schemer.",
    "related": [
      "diancie",
      "aipom"
    ]
  },
  {
    "id": "aipom",
    "name": "Aipom",
    "icon": "/story-room/aipom.png",
    "tag": "Peppy helper / Rare Candy dependency",
    "x": 12.1,
    "y": 85,
    "role": "lead",
    "tension": "Always helpful and upbeat—but increasingly needs Rare Candies to maintain that energy, like a stimulant dependency.",
    "seeds": [
      "Takes one candy before an impossible chore and becomes superhumanly useful.",
      "Hides a growing stash while insisting everything is fine.",
      "Crashes at the worst possible moment.",
      "Others exploit his manic helpfulness before realizing the cost."
    ],
    "payoff": "His arc can remain unresolved during the battle; evolving into Ambipom and becoming a player works better as a later-season transformation, not a crowded finale beat.",
    "open": "Choose which girl first notices the addiction. Milotic gives the most compassionate version; Roserade gives the cruelest and funniest version.",
    "related": []
  },
  {
    "id": "lillipup",
    "name": "Lillipup",
    "icon": "/story-room/lillipup.png",
    "tag": "Chaos puppy / Regirock's heart",
    "x": 27.3,
    "y": 85,
    "role": "lead",
    "tension": "Its innocent destruction drives Alcremie insane, while Regirock's unconditional loyalty makes the conflict worse.",
    "seeds": [
      "Ruins a showpiece cake without understanding why it matters.",
      "Regirock disguises or protects it from Alcremie's anger.",
      "Lillipup secretly tries to repair something it broke.",
      "It alerts the cast to the first falling Minior."
    ],
    "payoff": "Helps endangered islanders during the fires, proving why Regirock never abandoned it and softening Alcremie just enough to Decorate her.",
    "open": "Its heroic action should directly echo the original cake disaster: digging, carrying, or following a scent becomes the rescue skill.",
    "related": [
      "regirock",
      "alcremie"
    ]
  },
  {
    "id": "lucario",
    "name": "Lucario",
    "icon": "/story-room/lucario.png",
    "tag": "Unwilling center of a triangle",
    "x": 47.7,
    "y": 85,
    "role": "supporting",
    "tension": "Diancie pursues him intensely while Ninetales flirts for fun. His reactions create escalating humiliation without requiring dialogue.",
    "seeds": [
      "Misreads Diancie's gigantic gesture and walks past it.",
      "Responds to Ninetales's understated flirtation, infuriating Diancie.",
      "Tries to escape both women and accidentally enters another skit's conflict."
    ],
    "payoff": "He does not need a battle pairing. His job is to create the Diancie/Ninetales tension that pushes Diancie's insecurity toward Primarina.",
    "open": "Keep him reactive rather than cruel; Diancie's chaos is funnier if Lucario has never actually promised her anything.",
    "related": [
      "diancie",
      "ninetales"
    ]
  },
  {
    "id": "gallade",
    "name": "Gallade",
    "icon": "/story-room/gallade.png",
    "tag": "Primarina's dazzled target",
    "x": 64.6,
    "y": 85,
    "role": "supporting",
    "tension": "Takes Primarina's theatrical seduction seriously while she treats it as entertainment.",
    "seeds": [
      "Receives a grand Little Mermaid–style rescue or serenade.",
      "Mistakes performance choreography for a confession.",
      "Prepares a romantic response only to find Primarina with Froslass."
    ],
    "payoff": "His heartbreak helps reveal that Primarina's real intimacy is with Froslass, while her seduction of men is performance and sport.",
    "open": "Avoid making him only pathetic—one dignified walk-away will make Primarina briefly confront the damage she causes.",
    "related": [
      "primarina"
    ]
  },
  {
    "id": "kanto",
    "name": "Kanto Ninetales",
    "icon": "/story-room/ninetales.png",
    "tag": "The love Ninetales avoids",
    "x": 70,
    "y": 22.8,
    "role": "supporting",
    "tension": "Alolan Ninetales genuinely wants him but keeps him at a distance because commitment threatens her elegant control.",
    "seeds": [
      "He approaches; she freezes the path between them and turns away.",
      "Froslass's tarot exposes that Ninetales still watches him.",
      "He becomes an off-island victim or evacuation figure during the crisis rather than shooting fire at fire."
    ],
    "payoff": "The battle does not need to resolve their romance. Ninetales choosing vulnerability with Froslass first prepares her to follow her heart later.",
    "open": "Decide whether he understands her fear or interprets the distance as rejection; the latter creates stronger later drama.",
    "related": [
      "ninetales",
      "froslass"
    ]
  }
],
  skitRoadmap: {
    intro: "Start with the image or situation a cold viewer would instantly understand, laugh at, fear, or send to a friend. Then map the relationship that belongs inside it. Continuity deepens the payoff; it is not the reason the skit exists.",
    kirbaiFit: "Pokémon doing something they absolutely should not be doing — but it somehow fits them perfectly.",
    greenlightTests: [
      { name: "Camp / Meme", description: "Is the image absurd, glamorous, gay, quotable, or instantly shareable?" },
      { name: "Danger / Energy", description: "Is something escalating, moving, breaking, chasing, transforming, or about to go wrong?" },
      { name: "Curiosity", description: "Does frame one create a visual question a cold viewer needs answered?" },
      { name: "Character Heat", description: "Is there lust, jealousy, humiliation, rivalry, betrayal, or diva behavior that reads without context?" },
    ],
    greenlightRule: "No strong 2-of-4 pass = do not produce yet. Reframe the premise, not the lore explanation.",
    cards: [
      {
        step: 1, status: "done", statusLabel: "Bankable anchor",
        title: "Luxury shopping returns", cast: "Jynx · Gholdengo · rotating guest",
        fields: [
          { label: "Premise", value: "Periodically return to Jynx and Gholdengo treating luxury shopping like a competitive sport, social ritual, or financial emergency." },
          { label: "Why it works", value: "The characters, setting, fashion, and consumption are readable before any plot begins. Their established chemistry can buy a little setup time." },
          { label: "Story use", value: "Bring one new character into the shopping machine so the proven premise introduces a relationship without feeling like homework." },
          { label: "Keep it fresh", value: "Vary the objective and guest. It is a recurring anchor, not the whole channel." },
        ],
      },
      {
        step: 2, status: "next", statusLabel: "Strong reframe",
        title: "Glam session exposes the past", cast: "Froslass · Alolan Ninetales · makeover · tarot",
        fields: [
          { label: "Visual premise", value: "Froslass is already giving Ninetales an excessive icy glam transformation: tails posed, crystals flying, dramatic mirror reveal." },
          { label: "Frame 1", value: "Ninetales sits under a ridiculous constellation of styling tools while Froslass directs the makeover with unnerving precision." },
          { label: "0–3s action", value: "Froslass snaps her fan shut; the styling rig activates and turns Ninetales's tails into an impossible ice-couture silhouette." },
          { label: "Second-5 change", value: "A tarot card used as a styling reference flips by accident and reveals the secret neither of them planned to discuss." },
          { label: "Open loop", value: "Why does one card instantly turn a glamorous reunion into a frozen standoff?" },
          { label: "Rehook", value: "The makeover freezes mid-reveal. Their old intimacy becomes obvious before either admits what happened." },
          { label: "Tarot function", value: "The card complicates a strong action premise; it is not the opening proposition or an exposition device." },
          { label: "Final gag", value: "Ninetales storms out wearing only half the finished look; Froslass quietly straightens the abandoned final accessory." },
          { label: "Share emotion", value: "Camp transformation collides with betrayal, wounded pride, and the unmistakable ache of former best friends." },
          { label: "Relationship established", value: "Froslass and Ninetales were once deeply close and are now ruptured; the exact betrayal remains a future reward." },
          { label: "Guardrail", value: "Do not begin with a quiet reading. The fashion transformation must be legible, funny, and in motion before the lore arrives." },
          { label: "Green-light read", value: "Camp / Meme + Character Heat, with Curiosity added by the accidental card reveal." },
        ],
      },
      {
        step: 3, status: "optional", statusLabel: "Premise candidate",
        title: "Absurd staged seduction", cast: "Primarina · Krabby · Gallade",
        fields: [
          { label: "Visual premise", value: "Primarina mounts a ludicrously overproduced seduction number while Krabby runs the set like a furious stage manager." },
          { label: "Escalation", value: "Fans, bubbles, lighting cues, costume pieces, and emergency resets grow more theatrical while Gallade believes every cue is a sincere confession." },
          { label: "Payoff", value: "Gallade prepares a romantic answer just as Primarina calls cut, checks the footage, and treats him like a prop." },
          { label: "Relationship established", value: "Gallade's earnest misreading and Primarina's seduction-as-performance become clear without explanation." },
          { label: "Green-light read", value: "Camp / Meme + Character Heat + Danger / Energy through escalating production chaos." },
        ],
      },
      {
        step: 4, status: "event", statusLabel: "Creative weapon",
        title: "Fashion transformations — selectively", cast: "Outfits · accessories · glam reveals · status objects",
        fields: [
          { label: "Use", value: "Treat clothes, handbags, nails, jewelry, shopping bags, uniforms, and makeover reveals as recurring shorthand for status and personality." },
          { label: "Restraint", value: "Do not give every Pokémon the full Regirock diva treatment. Reserve major transformations for a fresh character fit and a strong before/after proposition." },
          { label: "Rule", value: "An accessory should create the premise, sharpen the joke, or reveal character — not decorate an otherwise weak setup." },
          { label: "Why", value: "Selective repetition builds a recognizable KIRBAI language while keeping the next handbag-level surprise special." },
        ],
      },
    ],
    howToChoose: [
      "Collect premises first: meme-worthy behavior, danger, motion, mystery, public humiliation, absurd jobs, fashion, or transformation.",
      "Score the hook: require two strong green-light passes before spending a day animating it.",
      "Map in the cast: choose the relationship whose personalities make that premise feel inevitable.",
      "Leave one relationship clear: several characters may appear, but a cold viewer should understand one central bond by the end.",
      "Reward returning viewers: plant continuity, clues, and future conflict after the standalone entertainment is working.",
      "Do not sequence by missing bonds: Froslass/Ninetales, Primarina/Froslass, Roserade's past, Mismagius, and Aipom's dependency remain useful story inventory — not a mandatory release order.",
    ],
    hookAuditFields: ["Premise in one image", "2+ strong tests", "Frame 1", "0–3s action", "Second-5 change", "Open loop / rehook", "Central relationship", "Production risk"],
    tarotWarning: "Do not prioritize the Froslass/Ninetales reading as-is. “A card reveals their history” is lore-first and visually weak unless tarot interrupts a stronger action premise — such as Froslass's excessive Ninetales glam session.",
    coldViewerRule: "The skit must be satisfying with zero lore homework. By the end, one central relationship should still be understandable. Story is the extra reward for viewers who return.",
  },
  musicVideos: [
    {
      kicker: "Active event video · locked runtime 2:04",
      title: "Runway Regi: House of Regi Temple Runway",
      summary: "Regirock's transformation story grows into a runway power struggle. Regice and Registeel first challenge her; when the newer Regidrago and Regieleki arrive, the original trio temporarily unites. The conflict is dangerous fashion warfare, not a lethal battle, and ends with Regirock unmistakably leading the complete House.",
      locks: ["Lead: Regirock", "Format: 9:16 music video", "Runtime: 2:04", "Final act: Regirock-led House pose"],
      storyEngine: [
        { label: "Origin", value: "Centuries of being ignored turn Regirock into a diva who demands the entire room." },
        { label: "First rivalry", value: "Regice and Registeel enter as sophisticated challengers to Regirock's authority." },
        { label: "State change", value: "Drago and Eleki arrive as brighter, faster new kids, forcing the original trio into a temporary alliance." },
        { label: "Payoff", value: "Nobody is killed; attacks reshape the runway, destroy poses, and determine who controls the House." },
      ],
      storyNote: "Regirock is never one of six equal contestants. Every reveal must ultimately affect her rise, her rivalry, or her leadership.",
      locationPlan: [
        { label: "Sealed dressing chamber", value: "A dark reliquary/antechamber with a cracked mirror, stone vanity, relics, and accessories. Functions as backstage without resembling a television green room." },
        { label: "Illuminated temple runway", value: "The stone aisle becomes the arena; sealed side chambers create entrances and the architecture reacts to elemental attacks." },
        { label: "Third visual texture", value: "Editorial body-detail close-ups create variety without adding another location." },
      ],
      locationNote: "Do not return to the resort. A future standalone House of Regi song belongs on the next Fusion album and must not influence this Runway Regi video.",
      timeline: [
        { label: "0–3s", title: "Rivalry teaser", description: "Ice facets, frost, polished steel, illuminated dots, Regirock's purple nails, then her heel cracking through the ice. Tease Ice and Steel before explaining anything." },
        { label: "Opening chorus", title: "Fractured flash-forward", description: "Finished-diva fragments: hoops, textures, nails, heels, runway flashes, and hints of the three-way confrontation. Do not reveal Drago or Eleki yet." },
        { label: "Verse", title: "Regirock origin", description: "Rewind to the forgotten statue in the sealed chamber. Show the emotional cause of the persona, the transformation, Lillipup's brief purse reveal if used, and Regirock breaking onto the runway." },
        { label: "Middle chorus", title: "Solo dominance becomes rivalry", description: "Regirock commands the runway through Rock-type spectacle. Regice freezes it; Registeel enters from the opposite side with controlled Parisian contempt. End on the full original-trio standoff." },
        { label: "Instrumental", title: "Silent character acting", description: "Ice looks Regirock over, Steel adjusts the scarf, and Regirock answers with a pose. If Lillipup appears, Regirock places the purse safely aside before the clash." },
        { label: "Bridge", title: "New kids change the fight", description: "Drago and Eleki interrupt the original rivalry with a brighter, faster joint entrance. Rock, Ice, and Steel exchange one look and combine their powers against the newcomers." },
        { label: "Final chorus", title: "Runway warfare and coronation", description: "Attacks freeze light, redirect energy, crack stone, and knock rivals out of formation. Regigigas arrives sparingly to halt the chaos; everyone snaps into a final House pose with Regirock front and center." },
      ],
      performers: [
        { tier: "Lead", name: "Regirock", role: "Ignored relic to self-created diva to House leader.", action: "Purple nails, hoops, textured stone, heel impacts, purse detail, Rock Tomb platforms, and the decisive attack/pose. Most screen time, owns the final frame." },
        { tier: "Original", name: "Regice", role: "Ice-cold challenger who silently judges Regirock before joining her.", action: "Freezes the runway, glides rather than walks, and converts Eleki's light into crystalline spotlights." },
        { tier: "Original", name: "Registeel", role: "Precise Parisian rival whose contempt reads through minimal movement.", action: "Polished metal reflections, scarf adjustment, exact gestures, and redirection of Drago's energy like controlled stage lighting." },
        { tier: "New kid", name: "Regidrago", role: "Gothic disruption arriving with Eleki during the bridge.", action: "Veil, fascinator, dragon appendages used as a funeral cape, and a theatrical energy attack that threatens the original trio's status." },
        { tier: "New kid", name: "Regieleki", role: "Hypermodern pop threat paired with Drago.", action: "Jubilee glasses, cyan-magenta strobing, electrical rings and cables in close-up, and speed that destabilizes the older Regis' choreography." },
        { tier: "Elder", name: "Regigigas", role: "Sparse final authority, not another equal-length runway contestant.", action: "Moss, gold bands, tiny pink stilettos, and one enormous step that cracks the runway and forces the final formation." },
      ],
      hookRules: [
        "Open on close-up conflict, never a temple exterior or neutral establishing shot.",
        "Reveal new information or change power approximately every three to five seconds.",
        "Use faster fragment cuts in hooks and choruses; allow slightly longer shots during the origin so the pacing has shape.",
        "Reserve full-body wide shots for entrances, confrontations, major attacks, and the final formation. Their scarcity makes them important.",
        "Do not repeat chorus visuals. Each chorus advances Regirock from tease to dominance to coronation.",
      ],
      productionNotes: [
        "Primary character models are the companion-free images in regirock / Final Regi Diva References / Base Characters.",
        "Temple sources are in regirock / Temple References. Preserve both the game ruins and anime exterior/interior references.",
        "The dogs are not an ensemble dance act. Use only Lillipup if the lyric or Regirock's emotional identity needs it; one purse reveal, one reaction, and the final pose are enough.",
        "Preserve each definitive body shape, coloring, texture, accessory placement, and appendage design. Close-ups should make those details feel expensive, not distort them.",
        "Judges are optional. If retained, use one reaction insert totaling no more than about five seconds; they receive no entrances or subplot.",
      ],
    },
  ],
  finalBattle: [
    { number: 1, title: "The beautiful warning", description: "Froslass's Star and Tower cards pay off. Diancie's romantic cake beacon reaches space — secretly amplified by Gholdengo." },
    { number: 2, title: "Shooting stars become fires", description: "The cute Minior shower turns dangerous. Milotic fights fires on the ground while Lillipup helps trapped islanders." },
    { number: 3, title: "Sub-boss: Diamond Aria", description: "Diamond Storm and Sparkling Aria fire simultaneously, twisting into a double helix. The attack cracks and cools the giant Minior while healing burns across the island." },
    { number: 4, title: "False victory — Deoxys arrives", description: "Deoxys appears behind the defeated Minior. Former friends Ninetales and Froslass combine snow and ice into the island-wide Aurora Veil." },
    { number: 5, title: "The toxic rescue", description: "Bandaged Roserade intentionally poisons Milotic, activating Marvel Scale. Milotic uses Mirror Coat on Deoxys's blast; Roserade then shields her from a falling Minior." },
    { number: 6, title: "The veil breaks", description: "A blast knocks Froslass down. Ninetales holds the failing veil alone, protects her friend, then reshapes its last light into an aurora launch path." },
    { number: 7, title: "Finale: Regi planet power", description: "Alcremie chooses to Decorate Regirock despite their feud. Regirock leads the diva Regi family up the aurora path; they join hands in space and unleash the Sailor Moon–coded finishing attack.", finisher: true },
    { number: 8, title: "Post-credit sting: record ratings", description: "Gholdengo watches the ratings spike in a hidden control room. The replaced beacon topper reveals his sabotage. He presses: SEASON 2: GREENLIT.", finisher: true },
  ],
};
