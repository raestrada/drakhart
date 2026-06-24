# DRAKHART — Zone Design Guide

This is the working reference for building zones 5-24 with the data-driven system
(`src/zones/`). It supersedes the 16-zone concept in `docs/03-world-map-and-zones.md`
where the two conflict. The campaign is now **24 zones**, paced at **6-8 minutes
each** (indie AA action-platformer cadence), for a ~2.5-3h main path.

## 1. The zone contract

Every zone is a `ZoneConfig` in `src/zones/data/zoneNN.ts`. Required fields:

| Field | Purpose |
|-------|---------|
| `id`, `key`, `displayNameI18n` | Identity + scene key + i18n label |
| `biome` | `forest` \| `refinery` \| `gorge` \| `foundry` (extend the union for new biomes) |
| `worldWidth`, `worldHeight`, `groundY` | World bounds + ground line |
| `difficultyTier` | 1-4; drives `DifficultyDirector` stat scaling |
| `primaryForm`, `allowedForms`, `forcedForm` | Form-gating (see §3) |
| `sections` | Array of `SectionSpec` (name + x-range + enemies + notes) |
| `ground`, `platforms`, `hazards`, `pickups`, `tarot`, `barricades` | Declared geometry + content |
| `boss` | Optional `BossSpec` |
| `transitions` | Forward/back scene keys + trigger X + start positions |
| `ambient` | Music track + biome + weather |

Copy `zone01.ts` as a template. Author stats at **tier-1 values**; the director
scales them for higher tiers automatically.

## 2. Pacing & density (6-8 min/zone)

- **World width**: 6000-18000 px depending on form (shmup zones are wider because
  of auto-scroll compression). Aim for ~4-6 authored sections.
- **Enemy density**: 1-2 enemies per "screen" of primary-form gameplay. Escalate
  within the zone: front 1/3 is introductory, middle 1/3 ramps, back 1/3 peaks,
  boss/exit is the climax.
- **Checkpoints**: 2-3 per zone (SaveAltar). Place one before any spike (mini-boss,
  hazard gauntlet) and one mid-zone.
- **Recovery valley**: the section *after* a boss is the easiest section of the
  *next* zone — let the player breathe and regen.

### TTK targets (design compass)
Human sword ≈ 78 dps (25 dmg / 320ms). Mecha claymore ≈ 115 dps. Dragon fire ≈
100 dps sustained (20 dmg / 200ms, pierce lets it hit multiple).

| Tier | Grunt HP | Human TTK | Mecha TTK | Dragon shots |
|------|----------|-----------|-----------|--------------|
| 1 (z1-6) | 40 | ~0.5s | 1 hit | 2 |
| 2 (z7-12) | 52 | ~0.7s | 1 hit | 3 |
| 3 (z13-18) | 68 | ~0.9s | 1-2 hits | 4 |
| 4 (z19-24) | 88 | ~1.1s | 2 hits | 5 |

Dragon DPS looks high but shmup enemies come in waves — the real metric is
*screen-clear rate*, not single-target TTK. Keep grunt HP low in shmup zones.

## 3. Form-gating (the pilar mechanic)

Each zone declares `primaryForm` (the form it's designed around) and
`allowedForms`. Gate forms via geometry, not scripts:
- **HUMAN-only**: low-clearance tunnels (ceiling < mecha body height 76px scaled).
- **MECHA-forced**: ambient damage to human (heat/lava), barricades blocking the
  path (75 dmg threshold), enemies too tanky for the sword.
- **DRAGON-forced**: shmup corridors (no ground, auto-scroll), chasms only
  flight can cross.

**Form unlocks happen only twice in the whole campaign**: MECHA at Zone 1
(Dragon Core), DRAGON at Zone 2 (Sky Core). After that, progression is tarots +
echos + enemy variety, NOT new forms. Keep this simple.

### The 4-zone tutorial arc (built)
- Zone 1: HUMAN primary → unlock MECHA at the end.
- Zone 2: MECHA forced (heat) → unlock DRAGON at the end.
- Zone 3: DRAGON forced (shmup).
- Zone 4: mixer (A dragon / B mecha / C human tunnels / boss) = the "exam".

### Arcs 2-4 (zones 5-24) — proposed structure
- **Arc 2 (zones 5-12)**: mixed-form mastery. Each zone blends 2 forms. Tier 2.
- **Arc 3 (zones 13-18)**: challenge. Tighter hazard density, mini-bosses. Tier 3.
- **Arc 4 (zones 19-24)**: endgame. All forms, hardest bosses. Tier 4. Final boss
  gated behind 18 EchoFragments.

## 4. Enemy spawning

**Always via `EnemyRegistry.spawn(scene, spec, player, zoneId)`**. The registry
applies `DifficultyDirector` tier scaling to health/damage/speed. Per-spawn
`config` overrides handle intra-zone escalation (section ramps). Boss types
(`elite-mecha`, etc.) skip tier scaling — their HP is hand-tuned.

```ts
// In a zone data file:
{ type: 'leaper', x: 5230, y: 368, config: { health: 70, damage: 18, speed: 95 } }
// Tier 1: 70/18/95 as authored. Tier 3: 119/29/109 (×1.7/×1.6/×1.15).
```

Adding a new enemy type: extend `BaseEnemy`, accept `EnemyConfig`, register in
`EnemyRegistry.entries` with `factory` + `base` + `boss` flag.

## 5. Tarot economy (18 cards across 24 zones)

22 Major Arcana available; 5 are wired. **1 tarot per non-boss zone** (~18);
boss zones drop an EchoFragment instead. No duplicates.

| Arc | Zones | Tarots | Effect category |
|-----|-------|--------|-----------------|
| 1 (tutorial) | 1-6 | Magician ✓, Chariot ✓, Tower ✓, Strength ✓, Star ✓, **High Priestess** | existing + ground regen |
| 2 (mastery) | 7-12 | **Emperor**, **Empress**, **Hierophant**, **Lovers**, **Hermit** | mecha armor, fire pierce, checkpoint heal, revive, detection |
| 3 (challenge) | 13-18 | **Wheel**, **Justice**, **Hanged Man**, **Death**, **Temperance**, **Devil** | crit, parry, slow-mo, kill-heal, heat cap, risk/reward |
| 4 (endgame) | 19-24 | **Moon**, **Sun**, **Judgement**, **World** | vision, aura, no-cooldown transform, finale |

Bold = not yet implemented. Implement effects in `TarotSystem.ts` + the consuming
system (Player/CombatSystem/FormStateMachine).

## 6. EchoFragments

- **1 per zone, 24 total.** Unique index per zone (zone N → index N-1).
- **Final boss gate: 18 collected** (allows skipping 6 optional/secret zones).
- Current bug: Zone 4 reuses indices 0,1 (should be 3,4). Fix when wiring the
  progression counter.

## 7. Hazards library (by biome)

| Hazard | Biome | Effect |
|--------|-------|--------|
| Thorn gap/patch | forest | 15 dmg contact |
| Lava pit | refinery | human instakill; mecha 15 dmg + 25 heat + knock-up |
| Ambient heat | refinery | −5 HP/s human (forces mecha) |
| Steam pipe | gorge | 5 dmg + screenX pushback |
| Piston | gorge | crush damage |
| Laser gate | gorge | block path; nodes destroyable (40hp) |
| Lava floor | foundry | instakill on overlap |

Author hazards in `ZoneConfig.hazards`. New hazard types: add to `HazardSpec.kind`
union + handle in the scene (terrain migration pending).

## 8. Transitions

Each zone's `transitions` declares forward/back scene keys + trigger X + start
positions. Transition hub scenes (`TransitionSceneNN.ts`) show the zone label,
propagate tarots/unlocks via `SaveSystem`, and can enforce form requirements
(e.g. `TransitionScene23` requires DRAGON to cross forward).

## 9. Calibration changelog (this pass)

What was tuned in the AA calibration pass (see git history on this branch):

### Balance values
- Barricade 75hp → 150hp (was 1-hit; now 2+ mecha hits).
- Fire breath cooldown 80ms → 200ms; energy/shot 0.3 → 1.5 (was spammy/free).
- Dragon flight drain 12/s → 16/s up, 4.8/s → 7/s horiz.
- Mecha drain 4/s → 5/s.
- Zone 3 depletion: instakill → revert + 30 dmg (no hard fail-state).
- Zone 2 ambient heat −8 → −5 HP/s.
- EliteMecha 1200 → 650 hp; Gatekeeper 900 → 750 hp (tier-1 outliers).
- Removed duplicate Strength tarot from Zone 4; removed duplicate Star+Tower from Zone 3.
- Moved Chariot tarot from thorn-gap hazard to safe ground (x 2200).
- Fixed: GameScene3 debris bounds, FlightSystem key caching, transform duration constants, Player shake constant.

### Bug fixes
- `syncBodyPosition` formula corrected to match Phaser's `updateFromGameObject` (mecha was sinking 25.6px into terrain, falling through thin platforms).
- Zone 2 SkyCore altar platforms lowered so the Mecha can actually reach it (was 60px above jump apex → soft-lock).

### Dragon illumination
- Core pointlight added to dragon body (radius 140, 0xff5500, intensity 2.0) — follows player per-frame.
- Glow filter outerStrength boosted from 2 → 6 in dragon form.
- Thruster pointlight added at exhaust position per flight-particle spawn (fades over 250ms).

### Combat feel (punch feel pass)
- **Enemy knockback**: enemies now get pushed back on hit, scaled by damage and `knockbackResistance` (mecha 0.25, flying 1.5, shield 0.6, leaper 1.2, boss 0).
- **Enemy hitstun**: 100ms AI freeze on hit (+ dmg×0.3); mecha/boss = 0 (no flinch), shield = 60ms. AI skips patrol/chase/attack during stun but physics + knockback remain visible.
- **Damage type tagging**: mecha hits show pink, fire hits show orange, human hits show red in damage numbers (was all red). Auto-crit on ≥50 dmg removed; crit is now skill-based only.
- **Dragon shot hitstop**: 25ms micro-pulse per bullet impact (was zero). Fire damage falloff to 70% at end-of-life (was flat).

### Combo system
- Combo counter (was cosmetic-only) now multiplies damage: ×1.2 at 3 hits, ×1.5 at 6+ hits. Resets when player takes damage.

### Planned but not yet implemented
- A3: Real critical hits (falling onto enemy head = ×1.5)
- A5: EchoFragment milestone damage bonus (+5% per 3 fragments)
- A6: Low-HP "Last Ember" damage boost (+30% below 30% HP, gated by tarot)
- A7: Weapon-tier upgrades per arc (sword [25,35,50,70], mecha [75,105,145,200])
- C1: Per-form kill mastery (50 kills → form-specific bonus)
- D1: Damage-type resistance table (mecha +1.5× fire, spitter +2.0× fire, leaper +1.5× physical)
- D2: Staggerable mixin (generalize EliteMecha stagger to all heavy enemies)
- D4: Shield chip mechanic (human can break shield after 3 hits)
