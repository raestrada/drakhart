# DRAKHART — RPG Tarot Progression

## The War Echoes System

"War Echoes" are tarot cards scattered across the Shattered Continent. Each card is imprinted with the dying will of a dragon or the final thought of a fallen Warden. Collecting a card permanently enhances one of the three forms.

There are **10 Major Arcana** to collect across 16 zones. 3 drop from major bosses. 7 are hidden in secret areas requiring backtracking with newly acquired forms.

## Card Catalog

### I — The Magician
- **Effect**: Human: **Double Jump**
- **Location**: Ashen Woods (H1, x: 2,000), hidden alcove behind breakable wall
- **Requirement**: Mecha form (to break wall)
- **How to get**: Reach Iron Bastion, unlock Mecha, backtrack to Ashen Woods, break wall
- **Design**: First backtracking secret. Teaches that new forms unlock old areas.
- **Lore**: *"He jumped between worlds. The fall taught him everything."*

### II — The High Priestess
- **Effect**: Human: **Water breathing** — no drowning damage, normal speed in water
- **Location**: Sunken Catacombs (H3, x: 11,000), submerged chamber
- **Requirement**: Mecha form (to break submerged stone door)
- **How to get**: Navigate Catacombs, find flooded chamber, switch to Mecha at nearby checkpoint, break underwater wall
- **Design**: Multi-form environmental puzzle. Water mechanics become trivial after collecting (QoL).
- **Lore**: *"She walked where others drowned. The deep knew her name."*

### VI — The Lovers
- **Effect**: Human: **Heal 5 HP per enemy killed**
- **Location**: Boss drop — Warden's End (H4, Ruined Citadel)
- **How to get**: Defeat Warden's End boss
- **Design**: Late-game Human sustain. Makes Human sections in The Core more survivable.
- **Lore**: *"They fought together. They died together. They wait together still."*

### VII — The Chariot
- **Effect**: Mecha: **Movement speed +30%** (110 → 143 px/s)
- **Location**: Iron Bastion (M5, x: 19,000), behind double barricade
- **Requirement**: Careful heat management to break two barricades in sequence
- **Design**: Tests heat management. Risk of overheating if you spam attacks.
- **Lore**: *"Speed was her armor. The enemy never touched her."*

### VIII — Strength
- **Effect**: Mecha: **Claymore damage +50%** (75 → 112)
- **Location**: The Foundry (M6, x: 24,500), behind lava waterfall
- **Requirement**: Mecha form (lava resistance to traverse)
- **How to get**: Navigate lava chamber as Mecha, find hidden passage behind lava fall
- **Design**: Rewards Mecha's lava resistance. Makes M8 and F15 Mecha sections faster.
- **Lore**: *"She did not fall. She was pushed."*

### IX — The Hermit
- **Effect**: Human: **Enemy detection range -40%** (enemies notice you later)
- **Location**: Thornwood (H2, x: 7,000), high canopy branch
- **Requirement**: Dragon flight to reach the highest branch
- **How to get**: After unlocking Dragon, fly to the canopy top in Thornwood
- **Design**: Stealth option for Human sections. Rewards backtracking to early zone with late-game form.
- **Lore**: *"He watched from the shadows. They never saw him coming."*

### XI — Justice
- **Effect**: Human: **Sword range +20%** (56 → 67 px)
- **Location**: Crystal Mines (M7, x: 28,000), narrow crystal passage
- **Requirement**: Human form (narrow passage, Mecha too wide)
- **How to get**: Navigate labyrinthine crystal passage as Human
- **Design**: Maze challenge. Tests platforming precision.
- **Lore**: *"He gave them every chance. They took none."*

### XVII — The Star
- **Effect**: Dragon: **Energy regeneration +50%** (7 → 10.5 idle, 14 → 21 grounded)
- **Location**: Storm Canyon (D9, x: 38,500), hidden alcove in canyon wall
- **Requirement**: Dragon form with precise flight control during shmup section
- **Design**: High risk — stopping in a shmup zone means enemies catch up.
- **Lore**: *"The stars were her map. She never flew blind."*

### XVIII — The Moon
- **Effect**: Dragon: **Flight duration +40%** (energy drain up: 12 → 7.2/s)
- **Location**: Shattered Skyway (D10, x: 42,000), behind waterfall on floating island
- **Requirement**: Dragon flight to reach the island during shmup
- **Design**: Exploration reward in a zone designed for Dragon.
- **Lore**: *"He flew through the night. The moon was his only witness."*

### XVI — The Tower
- **Effect**: Dragon: **Fire spread — 3-way shot** (0°, ±15°)
- **Location**: Thunder Spine (D11, x: 45,500), behind a lightning-struck rock
- **Requirement**: Wait for lightning to strike a specific rock, revealing a hidden cave
- **How to get**: Position near the rock during shmup section, wait for lightning strike, fly into revealed cave
- **Design**: Patience + risk puzzle. Lightning is random but telegraphed. Transforms Dragon fire from single stream to spread.
- **Lore**: *"He held the line. Alone. For three days."*

### IV — The Emperor
- **Effect**: Mecha: **Damage reduction -30%** (armor: 25 dmg → 17.5 dmg)
- **Location**: Boss drop — Iron Warmaster (M8, War Arsenal)
- **How to get**: Defeat Iron Warmaster boss
- **Design**: Makes Mecha tankier for final zones. Pairs with Strength for a powerful endgame Mecha.
- **Lore**: *"She chose the crown over the heart. The heart never forgave her."*

### XXI — The World
- **Effect**: **Full map reveal** — all zones, secrets, unexplored passages shown, all checkpoints warp-unlocked
- **Location**: Boss drop — Bone Dragon (D12, Graveyard of Scales)
- **How to get**: Defeat Bone Dragon boss
- **Design**: QoL reward before the final gauntlet. Also unlocks Echo Chamber (if all other cards collected).
- **Lore**: *"The world was his. He just had to take it."*

---

## Card Distribution by Zone Type

| Type | Cards | Zones |
|------|-------|-------|
| Boss Drops | 3 | Warden's End (H4), Iron Warmaster (M8), Bone Dragon (D12) |
| Human Zone Secrets | 3 | The Magician (H1), The Hermit (H2), The High Priestess (H3) |
| Mecha Zone Secrets | 2 | The Chariot (M5), Strength (M6) |
| Mixed Zone Secrets | 2 | Justice (M7), The Emperor (M8 — boss drop) |
| Dragon Zone Secrets | 3 | The Star (D9), The Moon (D10), The Tower (D11) |
| Final Zones | 1 | The World (D12 — boss drop) |

---

## Progression Flow

```
START (H1)
  │
  ├── H1 → H2 → H3 → H4 (Human path)
  │     │
  │     └── Dragon Core → [UNLOCK MECHA]
  │
  ├── Backtrack H1 with Mecha → The Magician
  │
  ├── M5 → M6 → M7 → M8 (Mecha path)
  │     │
  │     ├── The Chariot (M5)
  │     ├── Strength (M6)
  │     ├── Justice (M7, requires Human in crystal passage)
  │     └── Sky Core → [UNLOCK DRAGON]
  │          │
  │          └── The Emperor (M8 boss)
  │
  ├── Backtrack H2 with Dragon → The Hermit
  ├── Backtrack H3 with Mecha → The High Priestess
  │
  ├── D9 → D10 → D11 → D12 (Dragon/Shmup path)
  │     │
  │     ├── The Star (D9)
  │     ├── The Moon (D10)
  │     ├── The Tower (D11)
  │     └── The World (D12 boss)
  │
  ├── H4 → The Lovers (boss)
  │
  ├── F14 → F15 → F16 (Final gauntlet)
  │
  └── S17 → Forgemaster (requires ALL 10 cards)
```

## Foreshadowing Through Tarot

Each tarot card's lore quote foreshadows an aspect of the story revealed later:
- The High Priestess hints at the Sunken Catacombs' backstory (the Wardens died in a flood)
- The Lovers references a pair of Wardens who died together — their ghosts appear in H4
- The Hermit references the Forgemaster before you meet him
- The World references the Warden's true name (revealed in the true ending)
