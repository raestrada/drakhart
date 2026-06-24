# DRAKHART — Agent Guidelines

## Vision

DRAKHART is a dark fantasy action-platformer built with Phaser 4 + TypeScript + Vite.
It fuses **Draconus (Atari, 70%)** with **Escaflowne (anime, 30%)**.

- **Draconus DNA**: side-scrolling exploration, dark atmosphere, earned transformation, dual-form gameplay, sword combat, grim fantasy
- **Escaflowne DNA**: the dragon form is a biomechanical draconel (mecha-dragon of bone & metal), destiny/tarot themes as collectibles, epic aerial boss fights
- **The Core Conflict**: The player utilizes **forgotten dragon-based mecha technology** (biomechanical, constructed of ancient dragon bones, steel, and powered by a magical, suppressed Dragon Core). In contrast, the enemy forces use **modern military technology** (MechWarrior-like brutalist design, heavy boxy steel plating, rivets, soot exhaust pipes, diesel/nuclear power generators, and physical railguns/cannons).

The core mechanic: human form (Warrior) for agile platforming, humanoid mecha (Draconel) for heavy combat/barricade smashing, and dragon-mech form for shmup-style flying. Transformation is earned (find the Dragon Core), not given.

## Current State — Campaign Arc (4 of 24 zones built)

The game is a **multi-level campaign** of 24 planned zones. **4 zones are fully playable**, connected by 4 transition-hub scenes. A 5th zone is a stub ("ZONE 5 — COMING SOON").

```
BootScene
  └─ Zone 1 (GameScene)        forest   "Ashen Woods"        10000×800   HUMAN→unlock MECHA
       ↕ TransitionScene12
     Zone 2 (GameScene2)       refinery "Industrial Wasteland" 8000×800   MECHA forced → unlock DRAGON
       ↕ TransitionScene23     (forward requires DRAGON form)
     Zone 3 (GameScene3)       gorge    "Ashen Gorge"        18000×800   DRAGON forced (shmup corridor)
       ↕ TransitionScene34
     Zone 4 (GameScene4)       foundry  "The Foundry Gates"  15000×1400  mixer (all forms) → Gatekeeper boss
       ↕ TransitionScene45     → "ZONE 5 — COMING SOON" (stub → BootScene)
```

The first 4 zones form a **tutorial arc**: one zone per form + a mixer exam. Zone 5+ will use the **data-driven zone system** (`src/zones/`).

## Stack

| Layer       | Tech                        |
|-------------|-----------------------------|
| Engine      | Phaser 4.2+ (npm `phaser`, WebGL only) |
| Language    | TypeScript 5 (strict mode)  |
| Bundler     | Vite 5                      |
| Graphics    | Procedural placeholder textures (generated in BootScene) |
| i18n        | Custom lightweight system (`src/i18n/`) |

## Quick Start

```bash
npm install
npm run dev        # Dev server with HMR on localhost:5173
npm run build      # Type-check + production build
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── main.ts                    # Phaser bootstrap
├── config.ts                  # GameConfig (physics, scenes, dimensions)
├── i18n/
│   ├── index.ts               # TextManager singleton (detect lang, t())
│   ├── en.ts                  # English strings (source of truth)
│   └── es.ts                  # Spanish strings
├── zones/                     # DATA-DRIVEN ZONE SYSTEM (new)
│   ├── types.ts               # ZoneConfig, SectionSpec, EnemySpawnSpec, etc.
│   ├── EnemyRegistry.ts       # Central enemy catalog + spawn() with tier scaling
│   ├── DifficultyDirector.ts  # 4-tier difficulty curve across 24 zones
│   ├── ZoneBuilder.ts         # Consumes ZoneConfig → world bounds + enemy spawning
│   └── data/
│       ├── index.ts           # ZONES registry by id
│       ├── zone01.ts … zone04.ts  # Declared designs (source of truth) for built zones
│       └── (zone05-24 to be added)
├── scenes/
│   ├── BaseLevelScene.ts      # Shared: parallax, fades, iris/wipe, ember rain, transitions
│   ├── BootScene.ts           # Procedural textures, loading bar, title
│   ├── GameScene.ts           # Zone 1 (Ashen Woods)
│   ├── GameScene2.ts          # Zone 2 (Industrial Wasteland)
│   ├── GameScene3.ts          # Zone 3 (Ashen Gorge — shmup; inline shmup enemy classes)
│   ├── GameScene4.ts          # Zone 4 (The Foundry Gates; Gatekeeper boss inline)
│   ├── TransitionScene12/23/34/45.ts  # Hub transitions between zones
│   ├── UIScene.ts             # HUD overlay (health, energy, transform status)
│   ├── PauseScene.ts / TarotCollectionScene.ts  # Menus
├── entities/
│   ├── Player.ts              # Player sprite, input, damage, 3-form container
│   ├── DragonCore.ts          # Pickup → unlock Mecha
│   ├── SkyCore.ts             # Pickup → unlock Dragon (Zone 2 altar)
│   ├── Barricade.ts           # Destructible gate (Mecha claymore target, 150hp)
│   ├── EchoFragment.ts        # Progression collectible
│   ├── TarotCard.ts           # Tarot pickup entity
│   └── enemies/
│       ├── BaseEnemy.ts       # Patrol, detect, chase, attack, die (shared config shape)
│       ├── FlyingEnemy.ts     # Aerial projectile sentinel (now accepts config)
│       ├── MechaEnemy.ts      # Heavy mecha (MechWarrior-style)
│       ├── SpitterEnemy.ts    # Ranged turret enemy
│       ├── ShieldEnemy.ts     # Frontal shield block (only Mecha breaks guard)
│       ├── LeaperEnemy.ts     # Jumping ambush enemy
│       ├── EliteMecha.ts      # Zone 2 mini-boss (650hp, stagger-vulnerable)
│       ├── DreadnoughtBoss.ts # Zone 3 boss (cannons + core)
│       └── Boss.ts            # Base multi-phase boss with UI
├── systems/
│   ├── FormStateMachine.ts    # States: HUMAN | TRANSFORMING | MECHA | DRAGON | EXHAUSTED
│   ├── FlightSystem.ts        # Free-flight physics (accel, damping, cached input)
│   ├── EnergySystem.ts        # Mana pool: drains while dragon/mecha, regens human
│   ├── HeatSystem.ts          # Mecha overheat (shutdown at 100)
│   ├── CombatSystem.ts        # Sword slash, claymore, fire breath, hitboxes, cooldowns
│   ├── ShmupSystem.ts         # Zone 1 retrofitted shmup band (waves)
│   ├── TarotSystem.ts         # Tarot card effects (5 cards wired)
│   ├── SaveSystem.ts          # Persist cards/unlocks/position/scene
│   ├── HitstopSystem.ts       # Frame freeze juice
│   ├── GamepadSystem.ts       # Controller input
│   ├── GameAudio.ts / DynamicMusicSystem.ts / AudioMute.ts  # Audio
│   ├── ParallaxManager.ts / WeatherSystem.ts  # Backgrounds
│   └── DevPanel.ts            # Cheats (god mode, infinite energy)
├── effects/
│   ├── Particles.ts           # Transform burst, hit sparks, death explosion, etc.
│   ├── ScreenEffects.ts       # Camera shake, flash wrappers
│   ├── CameraFilters.ts       # P4 filters: biome postFX, vignette, glow
│   └── DamageNumbers.ts       # Floating damage / immune text
└── utils/
    ├── constants.ts           # All tuning values (speeds, damage, durations)
    └── helpers.ts             # clamp, lerp, distanceBetween, randomRange
```

## The Zone System (src/zones/) — how to build zones 5-24

Zones 1-4 were built imperatively (each `GameScene*` hand-authors terrain, enemies, pickups inline). This does not scale to 24 zones. The **data-driven zone system** is the path forward:

- **`src/zones/types.ts`** — `ZoneConfig` and all sub-specs (`SectionSpec`, `EnemySpawnSpec`, `HazardSpec`, `BossSpec`, etc.). This is the contract for a zone.
- **`src/zones/data/zoneNN.ts`** — one file per zone declaring its full design. Zones 1-4 are declared here as the source of truth (terrain + enemies + pickups + tarot + transitions + metadata).
- **`src/zones/EnemyRegistry.ts`** — single source of enemy base stats + `spawn(spec, player, zoneId)`. Routes through `DifficultyDirector` for tier scaling. **New zones MUST spawn enemies via `EnemyRegistry.spawn`**, not inline constructors.
- **`src/zones/DifficultyDirector.ts`** — 4 tiers (zones 1-6 / 7-12 / 13-18 / 19-24) with hp/dmg/spd multipliers (×1.0 / ×1.3 / ×1.7 / ×2.2). Data files are authored at tier-1 values; higher tiers auto-scale.
- **`src/zones/ZoneBuilder.ts`** — consumes a `ZoneConfig` to set world bounds and spawn all section enemies. Terrain construction is being migrated here (currently scenes still build their own terrain — see Follow-ups).

### Adding a new zone (5+)
1. Create `src/zones/data/zoneNN.ts` exporting a `ZoneConfig` (copy `zone01.ts` as a template).
2. Register it in `src/zones/data/index.ts`.
3. Spawn enemies via `EnemyRegistry.spawn(scene, spec, player, zoneId)` or `ZoneBuilder.spawnAllEnemies(...)`.
4. Add the scene + transition scenes; wire transitions in the `ZoneConfig.transitions`.
5. Add i18n strings for the zone display name.
6. See `docs/zone-design-guide.md` for the full design rules (pacing, form-gating, tarot economy).

### Difficulty tiers
| Tier | Zones | hp | dmg | spd | Arc |
|------|-------|----|-----|-----|-----|
| 1 | 1-6 | ×1.0 | ×1.0 | ×1.0 | tutorial/mastery of single forms |
| 2 | 7-12 | ×1.3 | ×1.3 | ×1.1 | mixed-form mastery |
| 3 | 13-18 | ×1.7 | ×1.6 | ×1.15 | challenge |
| 4 | 19-24 | ×2.2 | ×1.9 | ×1.2 | endgame |

Boss HP is hand-tuned per boss (not auto-scaled) — bosses are authored set-pieces.

## Balance & Calibration (current values)

All balance lives in `src/utils/constants.ts` — never hardcode numbers in game logic. Key current values:

| Mechanic | Value | Notes |
|----------|-------|-------|
| Human sword | 25 dmg, 320ms cd | agile single-target |
| Mecha claymore | 75 dmg, 650ms cd | crowds + barricades (×1.5 with Strength) |
| Dragon fire | 20 dmg, 200ms cd, 1.5 energy/shot | pierce 2; falloff to 70% at end-of-life; 3-way with Tower |
| Barricade | 150 hp, 75 dmg threshold | requires 2+ mecha hits; human can't dent |
| Energy (dragon fly up) | 16/s drain | ~6s climb on full bar |
| Energy (dragon horizontal) | 7/s drain | ~14s on full bar |
| Energy (mecha) | 5/s drain | ~20s on full bar |
| Energy depletion (Zone 3) | revert + 30 dmg | fall death follows naturally (no instakill) |
| Zone 2 ambient heat | −5 HP/s human | forces mecha; calibrated AA |
| EliteMecha (Zone 2 boss) | 650 hp | stagger-vulnerable ×2 dmg; no knockback/hitstun |
| Gatekeeper (Zone 4 boss) | 750 hp | armor/flight/duel phases |
| Combo multiplier | ×1.0/×1.2/×1.5 | at 0/3/6 consecutive hits; resets on damage taken |
| Enemy knockback | base 80 + dmg×0.6 | divided by knockbackResistance (mecha 0.25, flying 1.5, etc.) |
| Enemy hitstun | 100ms + dmg×0.3 | mecha/boss = 0 (no flinch); shield = 60ms |
| Dragon shot hitstop | 25ms micro-pulse | per bullet impact |

See `docs/zone-design-guide.md` for the full calibration rationale and TTK targets.

## Conventions

### Code
- All code and comments in **English**
- TypeScript **strict mode** — no implicit `any`, proper null checks
- No comments unless a piece of logic is genuinely confusing
- Use `const enum` for state enums, `export const` for constants
- File names: PascalCase for classes/entities, camelCase for utilities
- Imports: use `import type { ... }` when only types are needed (optional)

### Phaser 4 (do NOT write Phaser 3 style)
This codebase is on **Phaser 4.2+**. The renderer is `Phaser.WEBGL` (Canvas is deprecated in P4 and breaks all filters/lighting). Key differences from P3 that agents must follow:

- **Pipelines → Filters/RenderNodes.** P3 `Pipeline`/`PreFXPipeline`/`postFX` do not exist. Use the Filter system via `<obj>.filters.internal` / `<obj>.filters.external` or `camera.filters.internal` / `camera.filters.external`.
- **No preFX/postFX distinction.** Filters are `internal` (affects just the object) or `external` (affects the object in its rendering context). Filters can be applied to **any** GameObject or Camera — there are no object restrictions.
- **Camera filters** live in `src/effects/CameraFilters.ts` (`applyBiomePostFX`, `setVignetteFromPlayer`). Available native filters: `addColorMatrix`, `addVignette`, `addGlow`, `addBlur`, `addShadow`, `addBokeh`/`addTiltShift`, `addDisplacement`, `addBarrel`, `addWipe`, etc. **There is no `addBloom`** — use `Phaser.Actions.AddEffectBloom(objects, config)` or `addGlow` for glow.
- **Lighting** uses `obj.setLighting(true)` (NOT P3 `setPipeline('Light2D')`). Enable per scene with `scene.lights.enable()` + `scene.lights.setAmbientColor()`. Add lights via `scene.lights.addLight(x, y, radius, rgb, intensity)` or `scene.add.pointlight(...)`. Lights have a `.z` height property (P4 explicit depth, not P3 implicit). Lighting is available on most GameObjects (Sprite, Image, Text, TileSprite, Graphics, Particles, etc.).
- **Cone Lights (P4.2)**: `scene.lights.addConeLight(x, y, radius, rgb, intensity, rotation, innerAngle, outerAngle, z)` for flashlight/visor/searchlight/beam effects. Configure via `light.setCone(...)`.
- **Tint**: P3 `setTintFill()` is removed. Use `setTint(color).setTintMode(Phaser.TintModes.FILL)`. P4.2 adds `TintModes.MULTIPLY_TWO` + `setTint2()` for a secondary per-corner tint.
- **Geometry**: `Geom.Point` is removed — use `Phaser.Math.Vector2`.
- **Masks**: `BitmapMask` is removed — use `obj.filters.internal.addMask(maskObject)` or the `Stencil` GameObject (P4.2).
- **Data structures**: `Phaser.Struct.Set`/`Phaser.Struct.Map` are removed — use native `Set`/`Map`.
- **`DynamicTexture`/`RenderTexture`** require an explicit `render()` call to flush buffered draw commands.
- **Typing**: P4.2 ships proper types for the filter system. Do NOT cast `camera.filters.internal` to `any`. Filter controllers live in `Phaser.Filters.*` (`ColorMatrix`, `Vignette`, `Glow`, etc.). `camera.filters.internal.list` is `Phaser.Filters.Controller[]` (has `.renderNode: string`).
- **`setLighting` in forEach**: `group.getChildren()` returns `GameObject[]` which does not have `setLighting`. Cast inline: `.forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true))` — do not use `(child: any)`.
- **`Mesh`/`Plane` removed**: use `Mesh2D` (P4.2) for textured triangles. **Spine** bundled plugins are unsupported — use the official Esoteric Software plugin.

### i18n
- **en.ts** is the source of truth — add new strings there first
- **es.ts** mirrors the exact same structure with `typeof en`
- All user-facing text goes through `t('key.path')` from `src/i18n`
- Key convention: `category.specificName` (e.g. `ui.health`, `boss.name`)
- Language auto-detected from `navigator.language`
- Never hardcode display strings in game code

### Adding new strings
1. Add to `src/i18n/en.ts` under the appropriate section
2. Add matching Spanish translation to `src/i18n/es.ts`
3. Use `t('your.new.key')` in game code

### Creating new enemies
1. Extend `BaseEnemy` from `src/entities/enemies/BaseEnemy.ts` — accept the shared `EnemyConfig` in the constructor (all current subclasses do).
2. Override `doAttack()` for custom attack patterns.
3. **Register it in `src/zones/EnemyRegistry.ts`** with its type string, factory, and base stats.
4. Spawn via `EnemyRegistry.spawn(scene, spec, player, zoneId)` — do NOT call constructors inline in scenes.
5. Add collision handling in the scene's `setupCollisions()`.
6. For shmup-only enemies, they are managed by `ShmupSystem` (wave geometry owner); declare base stats in the registry but spawn via the shmup system.

### Tuning the game
All balance values live in `src/utils/constants.ts`. Change them there — never hardcode numbers in game logic. For per-zone difficulty, author stats in the zone data file (tier-1 values) and let `DifficultyDirector` scale them.

### Placeholder Assets
All textures are generated procedurally in `BootScene.generateTextures()`.
- Format: colored rectangles with optional borders
- When real art is ready, replace generation with `this.load.image()` calls and asset files in `public/assets/`
- Sizes must match between placeholder and final art

### FormStateMachine architecture
```
HUMAN ──[transform, 400ms]──> MECHA ──[transform, 800ms]──> DRAGON
  ^                                │                          │
  └──[cooldown 2.5s]── EXHAUSTED <──┘──────[energy=0]──────────┘
```
States: `HUMAN | TRANSFORMING | MECHA | DRAGON | EXHAUSTED`.
States control: physics (gravity on/off), input handling, texture, body size, camera zoom.
- HUMAN→MECHA: requires `transformUnlocked` (Dragon Core pickup). Duration `TRANSFORM_DURATION_MECHA` (400ms).
- MECHA→DRAGON: requires `dragonUnlocked` (Sky Core pickup). Duration `TRANSFORM_DURATION` (800ms).
- DRAGON/MECHA→EXHAUSTED→HUMAN: on energy depletion (revert) or manual revert. Cooldown 2500ms.
- Zone 3 exception: energy depletion → revert + 30 dmg penalty (fall death follows).
Do NOT bypass the state machine — always use `requestTransform()`.

### Tarot progression (5 cards wired, 18 planned)
Currently wired (see `TarotSystem.ts`):
- **Magician** (Zone 1) — double jump
- **Chariot** (Zone 1) — mecha speed +30%
- **Tower** (Zone 1) — dragon 3-way fire spread
- **Strength** (Zone 2) — mecha damage +50%
- **Star** (Zone 4) — dragon energy regen +50%

Planned 18-card distribution across 24 zones is in `docs/zone-design-guide.md`. No duplicates (the Zone 4 Strength duplicate was removed). EchoFragments (1/zone, 24 total) gate the final boss at 18 collected.

## Known Follow-ups (next agent)

1. **Migrate Zone 1-4 enemy spawning to `EnemyRegistry.spawn`** — scenes still use inline constructors. The data files (`src/zones/data/zone01-04.ts`) declare the designs; wire scenes to consume them via `ZoneBuilder`. Mechanical, low-risk, but verify in browser.
2. **Extract inline shmup enemy classes** from `GameScene3.ts` (SkyHunter, SeekerDrone, MineDropper, HeavyGunship, HomingMissile, DriftMine — ~340 lines) into `src/entities/enemies/shmup/`. Register base stats in `EnemyRegistry`.
3. **Migrate terrain construction to `ZoneBuilder`** — currently scenes hand-build ground/platforms/hazards; the data files declare them.
4. **Fix EchoFragment index collisions** — Zone 4 reuses indices 0,1 (should be 3,4). Make indices unique across the campaign.
5. **Rebalance Zone 4 Section A** — 9 trivial FlyingEnemies vs arriving DRAGON; replace with mixed shmup wave once shmup enemies are extracted.
6. **Wire remaining dead constants** — `BOSS_FIRE_COOLDOWN`, `BOSS_SPEED_VERTICAL`, `HITSTOP.SWORD_HEAVY`, `DAMAGE_NUMBER.*` are defined but unused. Wire them or remove.
7. **Build zones 5-24** using the data-driven system per `docs/zone-design-guide.md`.
8. **Implement remaining AA progression features** — weapon-tier upgrades per arc (A7), EchoFragment milestone damage bonus (A5), damage-type resistance table (D1), real critical hits by fall speed (A3), low-HP damage boost (A6). See the full proposal in `docs/zone-design-guide.md` §9.
9. **Wire remaining tarots** — 13 of 18 planned tarots still need effects (High Priestess, Emperor, Empress, Hierophant, Lovers, Hermit, Wheel, Justice, Hanged Man, Death, Temperance, Devil, Moon, Sun, Judgement, World). See distribution in `docs/zone-design-guide.md` §5.

## Testing

In this prototype phase, testing is manual:
- Run `npm run dev`
- Open browser at the Vite URL (usually `http://localhost:5173`)
- Verify the full arc: Zone 1 human platforming → Dragon Core → mecha → Zone 2 mecha gauntlet + heat → Sky Core → dragon → Zone 3 shmup corridor → Dreadnought → Zone 4 mixer → Gatekeeper → "ZONE 5" stub.
- Check both English and Spanish strings appear correctly.
- Run `npm run build` to type-check after any change.

No unit tests yet — they will be added when core systems stabilize.
