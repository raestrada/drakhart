# DRAKHART — World Map & Zone Design

## Overview

**16 zones total**: 4 Human/Platformer, 4 Mecha/Heavy Combat, 4 Dragon/Shmup, 3 Final Gauntlet, 1 Secret.
**Total world**: ~73,000 horizontal pixels + vertical branches (~95,000 px equivalent).

## Zone Count Rationale

Per research on comparable metroidvanias:
- Hollow Knight: 17 areas for 30-50h
- Blasphemous: 17-20 areas for 15-25h
- Castlevania SotN: 12 areas × 2 castles for 10-15h
- Bloodstained RotN: 15+ areas for 15-20h

For a 10-hour game, 6 zones is far too few. 16 zones (~1.6 zones/hour) is in the correct range, matching the density of SotN and slightly exceeding Blasphemous.

## World Map Diagram

```
                           ┌──────────────────────────┐
                           │     THUNDER SPINE (D12)  │
                           │   Dragon/Shmup (4,000px) │
                           │   Mid-boss: Storm Wyrm   │
                           └───────────┬──────────────┘
                                       │
                           ┌───────────▼──────────────┐
                           │   GRAVEYARD OF SCALES    │
                           │      (D13) Dragon/Shmup  │
                           │      Boss: Bone Dragon   │
                           └───────────┬──────────────┘
                                       │
┌──────────────────────┐   ┌───────────▼──────────────┐
│    RUINED CITADEL    │   │      THE ASCENT (F14)    │
│   (H4) Human final   │──▶│    All Forms Gauntlet    │
│   Boss: Warden's End │   │     (5,500px)            │
└──────────┬───────────┘   └───────────┬──────────────┘
           │                           │
┌──────────▼───────────┐   ┌───────────▼──────────────┐
│    THORNWOOD (H2)    │   │      THE CORE (F15)      │
│  Human (4,500px)     │   │    Final Dungeon         │
│  Mid-boss: Thorn     │   │    (5,500px)             │
│  Colossus            │   └───────────┬──────────────┘
└──────────┬───────────┘               │
           │                ┌──────────▼──────────────┐
┌──────────▼───────────┐   │    IRON THRONE (F16)    │
│    ASHEN WOODS (H1)  │   │      Final Boss         │
│  Human (4,500px)     │   │   The Iron Heart        │
│  START                │   │   (3,000px arena)      │
│  Dragon Core → MECHA  │   └─────────────────────────┘
└──────────┬───────────┘
           │                          ┌──────────────────────────┐
┌──────────▼───────────┐              │  ECHO CHAMBER (S17)      │
│  SINKEN CATACOMBS(H3)│              │  Secret Boss: Forgemaster │
│  Human (4,500px)     │              │  (2,500px)               │
│  Water mechanics     │              └──────────────────────────┘
└──────────┬───────────┘
           │
┌──────────▼───────────┐   ┌───────────┐   ┌──────────────────────┐
│   IRON BASTION (M5)  │──▶│THE FOUNDRY│──▶│   CRYSTAL MINES (M7) │
│  Mecha (5,000px)     │   │  (M6)     │   │  Mecha Hub (5,000px) │
│  Sky Core → DRAGON   │   │  Mecha    │   │  Mid-boss: Crystal   │
│  Barricade tutorial  │   │  (5,000px)│   │  Warden              │
└──────────────────────┘   └─────┬─────┘   └──────────┬───────────┘
                                 │                     │
                      ┌──────────▼───────────┐         │
                      │   WAR ARSENAL (M8)   │◀────────┘
                      │  Mecha (5,000px)     │
                      │  Boss: Iron          │
                      │  Warmaster           │
                      └──────────────────────┘
                                 │
┌──────────────────────┐   ┌─────▼──────────────────────────┐
│   STORM CANYON (D9)  │◀──│                                │
│  Dragon/Shmup        │   │  All Mecha zones connect back  │
│  (4,000px)           │   │  to Crystal Mines (hub)        │
│  R-Type tutorial     │   │                                │
└──────────┬───────────┘   └────────────────────────────────┘
           │
┌──────────▼───────────┐
│ SHATTERED SKYWAY(D10)│
│  Dragon/Shmup         │
│  (4,000px)            │
│  Mid-boss: Sky Kraken │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  THUNDER SPINE (D11) │
│  Dragon/Shmup         │
│  (4,000px)            │
│  Mid-boss: Storm Wyrm │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│ GRAVEYARD OF SCALES  │
│     (D12)             │
│  Dragon/Shmup         │
│  (4,000px)            │
│  Boss: Bone Dragon    │
└──────────────────────┘
```

## Zone Progression Flow

```
H1 → H2 → H3 ──────────────────────────────┐
 │                                          │
 ├── Dragon Core → [UNLOCK MECHA]           │
 │                                          │
 ▼                                          ▼
M5 → M6 → M7 ──→ M8                    H4 (Ruined Citadel)
 │                │                         │
 ├── Sky Core     │                         │
 │   → [UNLOCK    │                         │
 │    DRAGON]     │                         │
 │                │                         │
 ▼                │                         │
D9 → D10 → D11 → D12                        │
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                          F14 → F15 → F16

Secret: S17 (accessible after collecting all tarot cards)
```

**Key**: H=Human zone, M=Mecha zone, D=Dragon/Shmup zone, F=Final, S=Secret

## Backtracking & Shortcuts

- **H3 ↔ M5**: Underground passage discovered after Mecha unlock
- **M7 (Crystal Mines)** is the central hub — connects to M6, M8, H3, and D9
- **D12 → F14**: The Bone Dragon's defeat opens the path to The Ascent
- **H4 → F14**: Alternate entrance to The Ascent from the surface
- **M8 → S17**: Secret passage to Forgemaster's Lair (requires all tarot cards)
- **Any zone → Crystal Mines**: Mine cart system activated after clearing M7

---

## Human / Platformer Zones

### H1 — Ashen Woods (4,500 px)

**Theme**: Petrified forest. Ash-covered ground, dead trees, faint ember glow. The remnants of the first dragon fire.

**Gameplay**: Human platforming tutorial.
- Movement, jumping, attacking tutorial
- First Sentinel encounters
- Environmental storytelling (burned homesteads, skeletal remains)

**Key locations**:
| x | Feature |
|----|---------|
| 100 | **START** — Warden wakes among ashes |
| 600 | Tutorial platforms |
| 1,500 | First checkpoint (Altar of Rest) |
| 2,000 | **Secret**: The Magician card (requires Mecha backtrack) |
| 3,000 | Forest clearing — 4 Sentinel fight |
| 4,000 | **Dragon Core Altar** — first transformation unlock → MECHA |
| 4,000–4,500 | Low ceiling tunnel (Mecha can't fit) |

**Enemies**: Sentinels (crystal shards, 40 HP)
**Secrets**: The Magician (double jump)
**Checkpoints**: 3

---

### H2 — Thornwood (4,500 px)

**Theme**: Dense, overgrown forest. Thorny vines, massive ancient trees, bioluminescent fungi. Darker, more claustrophobic than Ashen Woods.

**Gameplay**: Vertical platforming emphasis.
- Wall jumps (if implemented) or tight double-jump sections
- Thorn hazards (contact damage)
- Vine-swing mechanics (optional)

**Key locations**:
| x | Feature |
|----|---------|
| 4,500 | Zone entrance from Ashen Woods |
| 5,500 | Vertical climb section |
| 6,500 | **Mid-boss: Thorn Colossus** — giant animated tree |
| 7,000 | **Secret**: The Hermit card (requires Dragon flight to reach high branch) |
| 8,000 | Canopy village (lore, NPC echoes) |
| 8,500 | Exit to Sunken Catacombs (H3) or Iron Bastion (via shortcut) |

**Enemies**: Thorn Wraiths, Spore Sentinels, Vine Snakes
**Mid-boss**: Thorn Colossus — animated tree, vine whip attacks, spore clouds
**Secrets**: The Hermit (enemy detection range reduced — not implemented in prototype)
**Checkpoints**: 3

---

### H3 — Sunken Catacombs (4,500 px)

**Theme**: Underground tomb flooded with dark water. Ancient burial chambers, dripping stalactites, submerged passages. Eerie, silent, oppressive.

**Gameplay**: Water mechanics.
- Flooded sections: slow movement, limited jump height
- Air pockets: must reach before drowning
- Pressure plates and ancient mechanisms

**Key locations**:
| x | Feature |
|----|---------|
| 8,500 | Entrance from Thornwood |
| 9,000 | Flooded chamber (water mechanics tutorial) |
| 10,000 | Sunken library (lore, NPC echoes) |
| 11,000 | **Secret**: The High Priestess card (underwater passage, requires Mecha to break submerged wall) |
| 12,000 | Tomb of the First Warden (story beat) |
| 12,500 | Exit to Iron Bastion (underground passage) |

**Enemies**: Drowned Sentinels, Tomb Guardians, Water Wyrms
**Secrets**: The High Priestess (water breathing — not yet implemented)
**Checkpoints**: 3

---

### H4 — Ruined Citadel (4,500 px)

**Theme**: The capital city of the old world, now in ruins. Crumbling towers, collapsed bridges, overgrown plazas. The seat of the Wardens before the fall.

**Gameplay**: Final Human zone. Challenging platforming.
- Crumbling platforms (break after stepping on them)
- Wind gusts on exposed bridges
- Enemy gauntlets in city plazas
- Vertical tower climbs

**Key locations**:
| x | Feature |
|----|---------|
| 12,500 | Entrance from Catacombs or Iron Bastion |
| 14,000 | Plaza of the Fallen (story beat, large battle) |
| 15,000 | Tower ascent (vertical platforming challenge) |
| 16,000 | **Boss: Warden's End** — corrupted spirit of the last Warden commander |
| 16,500 | Exit to The Ascent (F14) or path back to earlier zones |

**Boss**: Warden's End — ghost of the last Warden commander. Sword duel. Teaches advanced Human combat. Drops The Lovers card (healing on kill — not yet implemented).

**Enemies**: Citadel Guards (corrupted Wardens), Gargoyles, Collapsing Debris
**Secrets**: The Lovers (boss drop)
**Checkpoints**: 3

---

## Mecha / Heavy Combat Zones

### M5 — Iron Bastion (5,000 px)

**Theme**: Imperial fortress built into ancient ruins. Metal walkways, steam vents, forge-light. The Empire's forward outpost.

**Gameplay**: Mecha combat tutorial.
- First Barricade (must use Mecha)
- Iron Guard enemies (armored, Mecha efficient)
- Heat management introduction

**Key locations**:
| x | Feature |
|----|---------|
| 17,000 | Entrance from Ashen Woods |
| 17,500 | First barricade (requires Mecha) |
| 18,000 | Guard barracks (multiple Iron Guards) |
| 19,000 | **Secret**: The Chariot card (double barricade puzzle) |
| 20,000 | Forge chamber |
| 21,000 | **Sky Core Chamber** — transformation unlock → DRAGON |
| 21,500 | Exit to The Foundry (M6) or underground passage to Catacombs |

**Enemies**: Iron Guards (heavy mecha, 80 HP, armored)
**Barricades**: 5 total
**Secrets**: The Chariot (Mecha speed +30%)
**Checkpoints**: 2

---

### M6 — The Foundry (5,000 px)

**Theme**: Industrial hellscape. Rivers of molten metal, massive pistons, conveyor belts. The Empire's production line for Draconel parts.

**Gameplay**: Heat management test. Lava hazards, heavy combat.
- Lava pools (contact damage: Human 8/s, Mecha 2/s, Dragon flies over)
- Moving platforms over lava
- Heat management gauntlet (must break barricades while managing heat near lava — which reduces cooling)

**Key locations**:
| x | Feature |
|----|---------|
| 21,500 | Entrance from Iron Bastion |
| 22,500 | Lava bridge (Mecha hover challenge) |
| 23,500 | Piston corridor (timing challenge) |
| 24,500 | **Secret**: Strength card (behind lava waterfall, Mecha required) |
| 25,500 | Assembly line (story beat — see what the Empire is building) |
| 26,000 | Exit to Crystal Mines (M7) |

**Enemies**: Forge Guardians, Lava Wyrms, Assembly Drones
**Secrets**: Strength (Mecha damage +50%) — moved here from Boss 1 to give Mecha progression before Crystal Mines
**Checkpoints**: 2

---

### M7 — Crystal Mines (5,000 px)

**Theme**: Vast underground excavation. Bioluminescent crystals, ancient dragon fossils embedded in walls, mine cart tracks. The Empire's Core mining operation.

**Gameplay**: Central hub zone. Backtracking focus.
- Connects to M6, M8, H3 (via underground passage), D9 (via mine shaft)
- Mixed Human/Mecha sections
- Mine cart fast travel between sections
- Multiple paths and secrets

**Key locations**:
| x | Feature |
|----|---------|
| 26,000 | Entrance from The Foundry |
| 27,000 | Crystal cavern (beautiful, safe zone) |
| 28,000 | **Secret**: Justice card (requires Human to navigate narrow crystal passage) |
| 29,000 | **Mid-boss: Crystal Warden** — corrupted mining Draconel |
| 29,500 | Mine cart hub (connects to H3, M8, D9) |
| 30,000 | Deep shaft to D9 (Storm Canyon entrance) |
| 30,500 | Exit to War Arsenal (M8) |

**Enemies**: Crystal Shards, Mine Drones, Fossil Sentinels
**Mid-boss**: Crystal Warden — Mining Draconel. Crystal beam attack, summon Shards.
**Secrets**: Justice (sword range +20%)
**Checkpoints**: 4 (hub has extra)

---

### M8 — War Arsenal (5,000 px)

**Theme**: The Empire's weapon factory. Assembly lines for Iron Guards, prototype Draconel parts, ammunition stockpiles. Industrial, loud, dangerous.

**Gameplay**: Heavy Mecha combat finale.
- Conveyor belts (push player, environmental hazard)
- Press machines (instant kill if caught)
- Armored enemy waves
- Final Mecha boss

**Key locations**:
| x | Feature |
|----|---------|
| 30,500 | Entrance from Crystal Mines |
| 31,500 | Assembly hall (Iron Guard gauntlet) |
| 32,500 | Press corridor (timing + combat) |
| 33,500 | Ammunition depot (explosive barrels — environmental damage) |
| 34,000 | **Secret**: The Emperor card (break through wall with charged claymore) |
| 34,500 | **Boss: Iron Warmaster** — the Empire's chief military Draconel |

**Boss**: Iron Warmaster — Heavy artillery Draconel. Missile barrages, flame thrower, ground slam. Tests all Mecha skills: hover dodging, charged attacks, heat management. Drops The Emperor card (Mecha armor -30%).

**Enemies**: Elite Iron Guards, Artillery Drones, Press Drones
**Secrets**: The Emperor (boss drop)
**Checkpoints**: 2

---

## Dragon / Shmup Zones

### D9 — Storm Canyon (4,000 px)

**Theme**: A canyon carved by eternal storms. Lightning illuminates cliff walls covered in ancient dragon carvings. The first place where dragons were known to nest.

**Gameplay**: First shmup zone. R-Type tutorial.
- Forced scroll right (100 px/s)
- Easy enemy formations
- Teaches bullet dodging, positioning
- Floating rest platforms

**Shmup features**:
| Feature | Value |
|---------|-------|
| Scroll speed | 100 px/s |
| Duration | ~40 seconds (4,000px ÷ 100px/s) |
| Actual playtime | 8-12 minutes (with retries) |
| Enemy waves | 8 formations |
| Rest points | 2 floating platforms |

**Key locations**:
| x | Feature |
|----|---------|
| 35,000 | Canyon entrance (from Crystal Mines shaft) |
| 36,000 | Rest platform 1 |
| 37,000 | Mid-section: turret gauntlet |
| 38,000 | Rest platform 2 + checkpoint |
| 38,500 | **Secret**: The Star card (hidden alcove in canyon wall, precise flight required) |

**Enemies**: Sky Hunters, Gorge Turrets, Wind Wisps
**Secrets**: The Star (Dragon energy regen +50%)
**Checkpoints**: 2
**Exit to**: Shattered Skyway (D10)

---

### D10 — Shattered Skyway (4,000 px)

**Theme**: The remnants of an ancient sky-bridge connecting floating islands. Broken stone pathways, collapsed arches, wind currents. Once a sacred pilgrimage route.

**Gameplay**: Medium difficulty shmup.
- Tighter corridors between floating debris
- Enemy formations from above and below
- Wind current zones (push player in specific directions)
- Mid-boss encounter

**Shmup features**:
| Feature | Value |
|---------|-------|
| Scroll speed | 100 px/s |
| Duration | ~40 seconds |
| Actual playtime | 10-15 minutes |
| Enemy waves | 10 formations |
| Environmental hazards | Wind currents, falling debris |

**Key locations**:
| x | Feature |
|----|---------|
| 39,000 | Skyway entrance |
| 39,500 | Wind current section |
| 40,000 | **Mid-boss: Sky Kraken** — giant aerial creature |
| 40,500 | Rest platform |
| 41,000 | Debris field (tight dodging) |
| 42,000 | **Secret**: The Moon card (behind waterfall on floating island) |

**Mid-boss**: Sky Kraken — Tentacled sky creature. Multi-directional bullet spreads, tentacle swipe (melee range).
**Enemies**: Storm Eagles, Sky Hunters, Boulder Shards
**Secrets**: The Moon (Dragon flight +40%)
**Checkpoints**: 2
**Exit to**: Thunder Spine (D11)

---

### D11 — Thunder Spine (4,000 px)

**Theme**: A mountain range perpetually wrapped in storm clouds. Lightning strikes at random intervals, briefly illuminating the narrow mountain pass. Dragon skeletons embedded in the peaks.

**Gameplay**: Hard shmup. Lightning hazards + bullet patterns.
- Lightning strikes (telegraphed by flash, 0.5s warning)
- Narrow pass (less room to dodge)
- Tougher enemy formations
- Mid-boss

**Shmup features**:
| Feature | Value |
|---------|-------|
| Scroll speed | 100 px/s |
| Duration | ~40 seconds |
| Actual playtime | 12-18 minutes |
| Environmental hazards | Lightning strikes (15 dmg, random, telegraphed) |

**Key locations**:
| x | Feature |
|----|---------|
| 43,000 | Mountain pass entrance |
| 44,000 | Lightning field (first strikes) |
| 45,000 | Narrow corridor (tight dodging) |
| 46,000 | **Mid-boss: Storm Wyrm** — electric dragon spirit |
| 46,500 | Rest platform + checkpoint |

**Mid-boss**: Storm Wyrm — Electric dragon spirit. Lightning rings, homing orbs, charge dash.
**Enemies**: Thunderbirds, Storm Wisps, Peak Turrets
**Secrets**: The Tower card (behind a lightning-struck rock that reveals a cave when hit by lightning — requires timing/risk)
**Checkpoints**: 2
**Exit to**: Graveyard of Scales (D12)

---

### D12 — Graveyard of Scales (4,000 px)

**Theme**: Where dragons went to die. Massive dragon skeletons form the terrain. Bones as large as buildings. The air is thick with ancient sorrow and residual dragon-fire energy.

**Gameplay**: Final shmup zone. Boss fight.
- Emotional tone: this is sacred ground
- Dense bullet patterns from skeletal enemies
- Boss: ancient dragon spirit

**Shmup features**:
| Feature | Value |
|---------|-------|
| Scroll speed | 110 px/s (slightly faster) |
| Duration | ~36 seconds |
| Actual playtime | 15-25 minutes (boss fight is the bulk) |

**Key locations**:
| x | Feature |
|----|---------|
| 47,000 | Graveyard entrance |
| 48,000 | Bone corridor (tight, skeletal turrets) |
| 49,000 | Rest platform + checkpoint (last before boss) |
| 50,000 | **Boss: Bone Dragon** — ancient dragon spirit guarding the way to The Ascent |
| 51,000 | Exit portal to The Ascent (F14) opens after boss defeat |

**Boss**: Bone Dragon — Ancient dragon spirit, the last true dragon. Multi-phase shmup boss. Homing soul orbs, bone shard spreads, spirit flame breath. Emotional — this isn't an enemy, it's a test. Defeating it earns its blessing to enter The Ascent. Drops The World card (full map reveal).

**Enemies**: Bone Serpents, Spirit Wisps, Skeletal Turrets
**Checkpoints**: 2
**Exit to**: The Ascent (F14)

---

## Final Gauntlet Zones

### F14 — The Ascent (5,500 px)

**Theme**: The path from the mortal world to the Empire's heart. Ascending through layers of reality — forest gives way to machinery, machinery gives way to pure energy. Disorienting, dreamlike.

**Gameplay**: Form-switching gauntlet. All three forms required.
- Sections alternate between Human, Mecha, and Dragon
- Some sections require rapid switching mid-combat
- Tests mastery of all forms

**Key locations**:
| x | Feature |
|----|---------|
| 51,000 | Entrance from Graveyard of Scales or Ruined Citadel |
| 52,000 | Human section — platforming through reality fragments |
| 53,000 | Mecha section — breaking through Imperial barriers |
| 54,000 | Dragon section — flying through energy fields |
| 55,000 | All-forms arena — fight waves while switching forms |
| 56,000 | Gate to The Core |

**Enemies**: All previous enemy types, in mixed waves
**Checkpoints**: 3

---

### F15 — The Core (5,500 px)

**Theme**: The Empire's heart. A colossal underground-industrial complex built around the largest Dragon Core ever found. The air screams with mechanical noise and something deeper — the Core itself, still alive, still angry.

**Gameplay**: Final dungeon. All three forms required.
- Entry: Human pipe maze
- Mid: Mecha forge floor (lava, heavy combat)
- End: Dragon vertical shaft (turret gauntlet)
- Boss approach corridor

**Key locations**:
| x | Feature |
|----|---------|
| 56,500 | Pipe maze entrance (Human) |
| 58,000 | Forge floor (Mecha) — lava, Iron Guards, heat gauntlet |
| 59,500 | Vertical shaft (Dragon) — turrets, ascending bullet patterns |
| 61,000 | Boss approach — quiet before the storm |
| 61,500 | **Secret**: The World card (hidden in pipe maze, requires careful exploration) |

**Enemies**: Elite versions of all enemy types
**Checkpoints**: 3

---

### F16 — Iron Throne (3,000 px arena)

**Theme**: The throne room of the Iron Empire. The Iron Chancellor's seat of power. The largest Draconel ever built — The Iron Heart — stands guard. The room is a cathedral of industry: pipes like organ pipes, furnaces like altars, the Core like a god.

**Gameplay**: Final boss fight. No exploration — pure combat.
- Three phases, one per form
- Each phase tests mastery of that form's mechanics
- Cinematic transitions between phases
- After defeat: ending sequence

**Boss**: The Iron Heart (see Characters & Enemies doc for full details)

**Ending**: The Iron Heart collapses. All Cores are freed. The Warden walks into the ash, the last Core still beating in their chest.

---

## Secret Zone

### S17 — Echo Chamber (2,500 px)

**Theme**: A pocket dimension outside reality. Fragments of every zone float in a void. The Forgemaster's sanctuary — where he experimented on Dragon Cores and himself.

**Access**: Collect all 10 tarot cards. Hidden passage opens in Crystal Mines (M7).

**Gameplay**: Boss-only zone. Short approach corridor, then boss arena.
- Lore fragments scattered in the approach
- The Forgemaster is the hardest fight in the game

**Boss**: The Forgemaster (see Characters & Enemies doc for full details)
- Unique fight: summons waves of every enemy type from the entire game
- Tests knowledge of all enemy patterns
- Reward: unique weapon skins + achievement

---

## Zone Summary Table

| # | Zone | Type | Width | Mid-Boss / Boss | Tarot Card | Playtime |
|---|------|------|-------|-----------------|------------|----------|
| H1 | Ashen Woods | Human | 4,500 | — | The Magician (secret) | 30 min |
| H2 | Thornwood | Human | 4,500 | Thorn Colossus | The Hermit (secret) | 35 min |
| H3 | Sunken Catacombs | Human | 4,500 | — | The High Priestess (secret) | 30 min |
| H4 | Ruined Citadel | Human | 4,500 | Warden's End | The Lovers (boss) | 40 min |
| M5 | Iron Bastion | Mecha | 5,000 | — | The Chariot (secret) | 35 min |
| M6 | The Foundry | Mecha | 5,000 | — | Strength (secret) | 35 min |
| M7 | Crystal Mines | Mecha | 5,000 | Crystal Warden | Justice (secret) | 45 min |
| M8 | War Arsenal | Mecha | 5,000 | Iron Warmaster | The Emperor (boss) | 40 min |
| D9 | Storm Canyon | Dragon | 4,000 | — | The Star (secret) | 20 min |
| D10 | Shattered Skyway | Dragon | 4,000 | Sky Kraken | The Moon (secret) | 25 min |
| D11 | Thunder Spine | Dragon | 4,000 | Storm Wyrm | The Tower (secret) | 25 min |
| D12 | Graveyard of Scales | Dragon | 4,000 | Bone Dragon | The World (boss) | 30 min |
| F14 | The Ascent | All | 5,500 | — | — | 35 min |
| F15 | The Core | All | 5,500 | — | — | 40 min |
| F16 | Iron Throne | All | 3,000 | **Iron Heart** | — | 15 min |
| S17 | Echo Chamber | Secret | 2,500 | **Forgemaster** | — | 10 min |
| **Totals** | **16 zones** | | **73,000 px** | **5 bosses, 4 mid-bosses** | **10 cards** | **~9 hours** |

*Total playtime: ~9 hours main path + ~2 hours secrets/backtracking = ~11 hours.*
*Shmup zones clock lower because forced scroll compresses space, but retries inflate actual playtime significantly.*
