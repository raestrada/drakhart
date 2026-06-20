# DRAKHART — Agent Guidelines

## Vision

DRAKHART is a dark fantasy action-platformer built with Phaser 4 + TypeScript + Vite.
It fuses **Draconus (Atari, 70%)** with **Escaflowne (anime, 30%)**.

- **Draconus DNA**: side-scrolling exploration, dark atmosphere, earned transformation, dual-form gameplay, sword combat, grim fantasy
- **Escaflowne DNA**: the dragon form is a biomechanical draconel (mecha-dragon of bone & metal), destiny/tarot themes as collectibles, epic aerial boss fights
- **The Core Conflict**: The player utilizes **forgotten dragon-based mecha technology** (biomechanical, constructed of ancient dragon bones, steel, and powered by a magical, suppressed Dragon Core). In contrast, the enemy forces use **modern military technology** (MechWarrior-like brutalist design, heavy boxy steel plating, rivets, soot exhaust pipes, diesel/nuclear power generators, and physical railguns/cannons).

The core mechanic: human form (Warrior) for agile platforming, humanoid mecha (Draconel) for heavy combat/barricade smashing, and dragon-mech form for shmup-style flying. Transformation is earned (find the Dragon Core), not given.

Currently in **Level 1 prototype phase** — a continuous zone divided into three fluid sections:
1. **Warrior Zone (0 - 1300)**: Classic platforming through a low-clearance tunnel (too small for Mecha) to reach the Dragon Core.
2. **Mecha Zone (1300 - 2100)**: Heavy combat inside ruins. Blocked by heavy stone Gates (Barricades) that can only be shattered by the Mecha claymore.
3. **Dragon Zone (2100 - 3200)**: Shmup-style horizontal flying gorge. Bottomless chasm with floating islands and FlyingEnemy waves, leading to the Boss.

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
├── scenes/
│   ├── BootScene.ts           # Generates placeholder textures, loading bar
│   ├── GameScene.ts           # Level creation, player, enemies, boss, collisions
│   └── UIScene.ts             # HUD overlay (health, energy, transform status)
├── entities/
│   ├── Player.ts              # Player sprite, input, damage, dual-form container
│   ├── DragonCore.ts          # Pickup that unlocks dragon transformation
│   ├── Barricade.ts           # Destructible heavy stone gate (Mecha claymore target)
│   └── enemies/
│       ├── BaseEnemy.ts       # Patrol, detect, chase, attack, die (includes ground/elite config)
│       ├── FlyingEnemy.ts     # Fly-by chase and project-shooting sentinel (shmup phase)
│       └── Boss.ts            # Multi-phase draconel boss with UI
├── systems/
│   ├── FormStateMachine.ts    # States: HUMAN | TRANSFORMING | DRAGON | EXHAUSTED
│   ├── FlightSystem.ts        # Free-flight physics (accel, damping, input)
│   ├── EnergySystem.ts        # Mana pool: drains while dragon, regens while human
│   └── CombatSystem.ts        # Sword slash, fire breath, hitboxes, cooldowns
├── effects/
│   ├── Particles.ts           # Transform burst, hit sparks, death explosion
│   └── ScreenEffects.ts       # Camera shake, flash
└── utils/
    ├── constants.ts           # All tuning values (speeds, damage, durations)
    └── helpers.ts             # clamp, lerp, distanceBetween, randomRange
```

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
1. Extend `BaseEnemy` from `src/entities/enemies/BaseEnemy.ts`
2. Override `doAttack()` for custom attack patterns
3. Pass custom config in constructor: `{ health, speed, detectRange, attackRange, damage, attackCooldown }`
4. Add collision handling in `GameScene.setupCollisions()`

### Tuning the game
All balance values live in `src/utils/constants.ts`. Change them there — never hardcode numbers in game logic.

### Placeholder Assets
All textures are generated procedurally in `BootScene.generateTextures()`.
- Format: colored rectangles with optional borders
- When real art is ready, replace generation with `this.load.image()` calls and asset files in `public/assets/`
- Sizes must match between placeholder and final art

### FormStateMachine architecture
```
HUMAN ──[transform]──> TRANSFORMING ──[delayed]──> DRAGON
  ^                                                    │
  └────────────────[cooldown]──── EXHAUSTED <──[energy=0]─┘
```

States control: physics (gravity on/off), input handling, texture, camera zoom.
Do NOT bypass the state machine — always use `requestTransform()`.

## Testing

In this prototype phase, testing is manual:
- Run `npm run dev`
- Open browser at the Vite URL (usually `http://localhost:5173`)
- Verify: human movement/platforming → Dragon Core pickup → transformation → free flight → boss fight
- Check both English and Spanish strings appear correctly

No unit tests yet — they will be added when core systems stabilize.
