# DRAKHART — Current Implementation Status

> **Updated** to reflect the 4-zone campaign + data-driven zone system.
> The earlier "single 3,200px zone / 22 files" status was obsolete.

## Overview

The game has **4 fully playable zones** connected by 4 transition-hub scenes,
with a 5th-zone stub. All three forms (Human, Mecha, Dragon) are functional
across a tutorial arc (one form per zone + a mixer exam). A **data-driven zone
system** (`src/zones/`) is in place for building zones 5-24. See
`docs/zone-design-guide.md` for the design plan and `AGENTS.md` for the full
project structure.

## Zone Flow

```
Zone 1 (GameScene)      forest   "Ashen Woods"         10000×800   HUMAN → unlock MECHA
  ↕ TransitionScene12
Zone 2 (GameScene2)     refinery "Industrial Wasteland" 8000×800   MECHA forced → unlock DRAGON
  ↕ TransitionScene23   (forward requires DRAGON)
Zone 3 (GameScene3)     gorge    "Ashen Gorge"         18000×800   DRAGON forced (shmup)
  ↕ TransitionScene34
Zone 4 (GameScene4)     foundry  "The Foundry Gates"   15000×1400  mixer → Gatekeeper boss
  ↕ TransitionScene45   → "ZONE 5 — COMING SOON" (stub → BootScene)
```

## Implemented Features

### Core Mechanics
- Three forms: Human, Mecha, Dragon — state machine (`HUMAN | TRANSFORMING | MECHA | DRAGON | EXHAUSTED`).
- Transformation: HUMAN→MECHA (400ms, requires Dragon Core), MECHA→DRAGON (800ms, requires Sky Core), revert on energy depletion (cooldown 2.5s).
- Form gating via geometry: low ceilings block Mecha, heat/lava force Mecha, shmup corridors force Dragon.
- Energy pool: drains while dragon/mecha, regens while human/grounded-dragon.
- Mecha heat system: overheat shutdown at 100 (3s lockout).

### Combat
- Human sword: 25 dmg, 80 range, 320ms cooldown.
- Mecha claymore: 75 dmg (×1.5 with Strength), 125 range, 650ms cooldown, +15 heat/swing.
- Dragon fire breath: 20 dmg, 200ms cooldown, 1.5 energy/shot, pierce 2 (3-way with Tower).
- Hitstop, screen shake, particles, damage numbers.

### Enemies (9 types + 6 inline shmup)
- BaseEnemy, LeaperEnemy, SpitterEnemy, ShieldEnemy, FlyingEnemy, MechaEnemy — all accept shared `EnemyConfig`.
- EliteMecha (Zone 2 mini-boss, 650hp, stagger-vulnerable).
- DreadnoughtBoss (Zone 3, cannons + core), Gatekeeper (Zone 4, 750hp, multi-phase).
- Inline shmup classes in GameScene3: SkyHunter, SeekerDrone, MineDropper, HeavyGunship, HomingMissile, DriftMine (to be extracted).

### Zone System (new)
- `src/zones/types.ts` — `ZoneConfig` + all sub-specs (the contract).
- `src/zones/EnemyRegistry.ts` — central catalog + `spawn()` with tier scaling.
- `src/zones/DifficultyDirector.ts` — 4-tier curve (×1.0 / ×1.3 / ×1.7 / ×2.2).
- `src/zones/ZoneBuilder.ts` — world bounds + enemy spawning from config.
- `src/zones/data/zone01-04.ts` — declared designs (source of truth for the 4 built zones).

### Progression
- Dragon Core (Zone 1) → unlock Mecha. Sky Core (Zone 2) → unlock Dragon.
- 5 tarot cards wired: Magician (double jump), Chariot (mecha speed), Tower (3-way fire), Strength (mecha dmg), Star (energy regen). 18 planned.
- EchoFragments: 3 placed (indices 0-2); 24 planned, final boss gated at 18.
- SaveSystem persists cards/unlocks/position/scene.

### Presentation
- Parallax backgrounds, biome postFX, vignette, ember rain, weather.
- Procedural placeholder textures (BootScene).
- i18n (en/es), auto-detected.
- Audio: GameAudio, DynamicMusicSystem, AudioMute.
- Gamepad support, DevPanel cheats.

## Calibration (AA pass)

| Mechanic | Value |
|----------|-------|
| Barricade | 150 hp, 75 dmg threshold (2+ mecha hits) |
| Dragon fire | 200ms cd, 1.5 energy/shot |
| Dragon flight drain | 16/s up, 7/s horizontal |
| Zone 3 depletion | revert + 30 dmg (no instakill) |
| Zone 2 heat | −5 HP/s human |
| EliteMecha | 650 hp |
| Gatekeeper | 750 hp |

## What's Not Done Yet

- Zones 5-24 (use the data-driven system — see `docs/zone-design-guide.md`).
- Scene migration to `ZoneBuilder`/`EnemyRegistry` (zones 1-4 still spawn inline).
- Shmup enemy class extraction from GameScene3.
- 13 unwired tarots; EchoFragment index collisions (Zone 4 reuses 0,1).
- Zone 4 Section A rebalance (9 trivial flyers vs arriving dragon).

## Manual Testing

- `npm run dev` → play the full 4-zone arc end to end.
- `npm run build` → type-check after any change.
- No unit tests yet.
