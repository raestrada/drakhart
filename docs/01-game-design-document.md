# DRAKHART — Game Design Document (GDD)

## Elevator Pitch

DRAKHART is a dark fantasy action-platformer that fuses **three genres into a single continuous world**. Dramatic, cinematic shifts between classic precision platforming, tactical mecha combat with heat management, and forced-scroll shoot-em-up sections. A lone warrior bonds with an ancient dragon heart to unlock transformation powers, exploring a shattered continent where destiny is written in tarot.

## References & DNA

| Source | Weight | Contribution |
|--------|--------|-------------|
| **Draconus** (Atari 8-bit, 1988) | 70% | Earned transformation, dark atmosphere, dual-form gameplay, sword combat, grim loneliness |
| **Escaflowne** (anime, 1996) | 30% | Dragon = biomechanical guymelef (bone & metal mecha), tarot/destiny themes, epic aerial duels, steampunk-fantasy fusion |
| **R-Type** (arcade, 1987) | Shmup sections | Forced horizontal scroll, bullet patterns, charge shot, wave-based enemy formations |
| **MechWarrior 2** (PC, 1995) | Mecha heat system | Heat management, shutdown risk, weapon-heat tradeoffs |

## Design Pillars

1. **Triple-Form Cinematic Shifts** — Human (platformer) → Mecha (heavy combat) → Dragon (shmup). Each transformation is a dramatic, unskippable cinematic moment with camera shake, particle burst, zoom change, and music shift.

2. **Open World, Natural Guidance** — The entire continent is accessible from the start. No locked doors. Instead, using the wrong form in a zone is *inconvenient* — slow, tedious, or dangerous — naturally guiding the player toward the intended form without removing agency.

3. **Tarot RPG Progression** — 10 "War Echo" cards hidden throughout the world. Each grants a permanent ability tied to a specific form. Bosses drop cards; secret cards require backtracking with newly acquired forms.

4. **Genre-Bending Surprise** — Players who came for the platformer are shocked by the shmup. Players who came for the mecha are delighted by the platforming. The genre shifts are the game's signature.

## Target Audience

- Fans of metroidvanias (Hollow Knight, Blasphemous, SotN)
- Fans of classic shmups (R-Type, Gradius)
- Fans of mecha anime and games (Escaflowne, Armored Core)
- Indie game enthusiasts looking for innovation in a familiar genre

## Duration

- **Main path**: 8–10 hours
- **Completionist** (all tarot cards, secrets): 12–15 hours
- **Speedrun potential**: 2–3 hours (community target)

## Platform

- **Primary**: Web (Phaser 3 + TypeScript + Vite) — instant access, no install
- **Distribution**: itch.io (free demo), Steam (full release via Electron wrapper)
- **Controls**: Keyboard (primary), Gamepad (planned)

## World Size & Zone Count — Research-Based Estimate

### Zone Count Research

Analysis of comparable metroidvania zone counts vs. playtime:

| Game | Zones / Areas | Playtime | Zones per Hour |
|------|--------------|----------|----------------|
| Hollow Knight | 17 areas | 30–50h | ~0.4 |
| Blasphemous | 17–20 areas | 15–25h | ~0.9 |
| Castlevania SotN | 12 areas × 2 castles = 24 | 10–15h | ~1.6 |
| Bloodstained RotN | 15+ areas | 15–20h | ~0.9 |
| Ori Blind Forest | 8 areas | 8–12h | ~0.8 |

**DRAKHART target**: 16 zones for a 10-hour game (~1.6 zones/hour).
This accounts for DRAKHART's forced-scroll shmup sections, which compress playtime into shorter spaces through bullet hell difficulty and retries.

### World Dimensions

With DRAKHART's three gameplay modes:
- Human platforming: slow, careful (~1,500 px/h effective, ~4,500px per zone)
- Mecha combat: tactical, heavy enemies (~1,200 px/h, ~5,000px per zone)
- Dragon shmup: forced scroll at 100 px/s, retries inflate time (~800 px/h of designed content, ~4,000px per zone)

| Type | Zones | Avg Width | Total |
|------|-------|-----------|-------|
| Human/Platformer | 4 | 4,500 px | 18,000 px |
| Mecha/Heavy Combat | 4 | 5,000 px | 20,000 px |
| Dragon/Shmup | 4 | 4,000 px | 16,000 px |
| Final Gauntlet | 3 | 5,500 px | 16,500 px |
| Secret | 1 | 2,500 px | 2,500 px |
| **Total** | **16** | | **~73,000 px** |

With vertical branches and side areas adding ~30%: **~95,000 px equivalent world content**.

## Key Innovation: Wrong-Form-Inconvenience Design

Traditional metroidvanias use hard gates: "You need double jump to reach this ledge." DRAKHART uses *soft gates*:

| Obstacle | Human Form | Mecha Form | Dragon Form |
|----------|-----------|------------|-------------|
| Low ceiling tunnel | Passes easily | **Cannot fit, gets stuck** | Can fly over |
| Armored enemy (50 def) | Sword: 25 dmg (20 hits) | Claymore: 75 dmg (7 hits) | Fire: 8 dmg (63 hits) |
| Barricade (1000 HP) | Sword: 40 hits | Claymore: 14 hits, or 1 charged | Fire: 125 hits |
| Bottomless chasm | **Falls and dies** | **Falls and dies** | Flies freely |
| Dense bullet pattern | Dodge on foot (hard) | Dodge slowly (very hard) | Flight dodging (intended) |
| Narrow maze tunnels | Navigates easily | **Too wide, gets stuck** | Too fast, overshoots |
| Lava floor | 8 dmg/s contact | 2 dmg/s (armor) | Flies over, ignores |
| Magnetic field | Normal movement | **Pulled toward walls** | Normal flight |

The player CAN attempt any area with any form, but the inconvenience makes the intended form the natural choice. This respects player agency while providing clear guidance.

## Core Loop

```
EXPLORE zone in suitable form
    │
    ├── Fight enemies → earn XP/echoes
    ├── Find secret areas → tarot cards
    ├── Reach zone boundary
    │       │
    │       ├── Dragon Core → [UNLOCK MECHA]
    │       ├── Sky Core → [UNLOCK DRAGON]  
    │       └── Boss arena → [TAROT CARD]
    │
    ▼
BACKTRACK with new forms/abilities
    │
    ├── Access previously inconvenient areas
    ├── Find hidden tarot cards
    └── Discover shortcuts connecting zones
```

## Tone & Atmosphere

- **Grimdark fantasy** — the old world is ash, beauty is found in decay
- **Loneliness** — the protagonist is alone against a hostile continent
- **Show, don't tell** — story delivered through environment, tarot cards, boss encounters
- **Sacred and profane** — ancient dragon spirits vs. corrupted imperial technology
- **Biomechanical horror** — dragons fused with metal, bone, and machinery
