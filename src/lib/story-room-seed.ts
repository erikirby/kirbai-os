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

export interface StoryRoomState {
  era: string;
  characters: StoryCharacter[];
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
};
