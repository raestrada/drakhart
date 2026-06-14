# DRAKHART — Technical Architecture

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Game Engine** | Phaser 3 | ^3.80.1 | 2D rendering, physics, input, audio |
| **Language** | TypeScript | ^5.4.0 | Type safety, IDE support, strict mode |
| **Bundler** | Vite | ^5.4.0 | Dev server with HMR, production builds |
| **Package Manager** | npm | — | Dependency management |
| **i18n** | Custom (see below) | — | Lightweight bilingual text system |
| **Graphics** | Procedural placeholder | — | Generated in BootScene via Phaser Graphics API |
| **Persistence** | localStorage | — | Save/load game state |

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on localhost:5173
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
```

## Project Structure

```
drakhart/
├── index.html                    # Entry point
├── package.json
├── tsconfig.json                 # Strict mode, ES2020, bundler resolution
├── vite.config.ts
├── .gitignore
├── AGENTS.md                     # Agent/developer workflow guide
├── docs/                         # Game design documentation
│   ├── 01-game-design-document.md
│   ├── 02-story-and-lore.md
│   ├── 03-world-map-and-zones.md
│   ├── 04-characters-and-enemies.md
│   ├── 05-gameplay-systems.md
│   ├── 06-rpg-tarot-progression.md
│   ├── 07-art-direction.md
│   ├── 08-technical-architecture.md
│   ├── 09-audio-design.md
│   ├── 10-controls-and-input.md
│   ├── 11-current-implementation.md
│   └── 12-production-roadmap.md
├── public/
│   └── assets/                   # Future: real sprite files, audio, fonts
│       ├── sprites/
│       │   └── placeholder/
│       ├── tilesets/
│       ├── audio/
│       └── fonts/
└── src/
    ├── main.ts                   # Phaser bootstrap + i18n init
    ├── config.ts                 # Phaser GameConfig
    ├── i18n/
    │   ├── index.ts              # TextManager singleton (detectLang, t())
    │   ├── en.ts                 # English strings (source of truth)
    │   └── es.ts                 # Spanish strings (mirror structure)
    ├── scenes/
    │   ├── BootScene.ts          # Procedural texture generation
    │   ├── GameScene.ts          # Level creation, player, enemies, collisions
    │   └── UIScene.ts            # HUD overlay (health, energy, transform, tarot)
    ├── entities/
    │   ├── Player.ts             # Player sprite, input, forms, animations
    │   ├── DragonCore.ts         # Pickup → unlock Mecha
    │   ├── Barricade.ts          # Destructible wall (Mecha target)
    │   └── enemies/
    │       ├── BaseEnemy.ts      # Abstract enemy: patrol, detect, chase, attack
    │       ├── FlyingEnemy.ts    # Aerial enemy for shmup sections
    │       └── Boss.ts           # Multi-phase boss with UI
    ├── systems/
    │   ├── FormStateMachine.ts   # HUMAN ↔ MECHA ↔ DRAGON ↔ EXHAUSTED
    │   ├── FlightSystem.ts       # Dragon free-flight physics
    │   ├── EnergySystem.ts       # Shared resource pool
    │   └── CombatSystem.ts       # Sword, claymore, fire breath, hitboxes
    ├── effects/
    │   ├── Particles.ts          # Burst, hit sparks, death explosion
    │   └── ScreenEffects.ts      # Camera shake, flash
    └── utils/
        ├── constants.ts          # All tuning values (~70 constants)
        └── helpers.ts            # clamp, lerp, distanceBetween, randomRange
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Phaser.Game                             │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                    │
│  │BootScene │──▶│GameScene │   │ UIScene  │ (parallel overlay) │
│  │(generate │   │(gameplay)│   │  (HUD)   │                    │
│  │ textures)│   └────┬─────┘   └────┬─────┘                    │
│  └──────────┘        │              │                           │
│                      │              │                           │
│           ┌──────────▼──────────────▼──────────┐               │
│           │              Player                 │               │
│           │  ┌─────────────────────────────┐    │               │
│           │  │     FormStateMachine        │    │               │
│           │  │  HUMAN │ MECHA │ DRAGON     │    │               │
│           │  └────┬───────┬───────┬────────┘    │               │
│           │       │       │       │              │               │
│           │  ┌────▼──┐ ┌──▼───┐ ┌─▼──────────┐  │               │
│           │  │Energy │ │Heat  │ │FlightSystem│  │               │
│           │  │System │ │System│ │            │  │               │
│           │  └───────┘ └──────┘ └────────────┘  │               │
│           │                                     │               │
│           │  ┌──────────────────────────┐       │               │
│           │  │     CombatSystem         │       │               │
│           │  │  Sword │ Claymore │ Fire │       │               │
│           │  └──────────────────────────┘       │               │
│           └─────────────────────────────────────┘               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Enemies    │  │  Barricades  │  │  Dragon Core │          │
│  │ (BaseEnemy,  │  │  (breakable  │  │  (pickup)    │          │
│  │  FlyingEnemy,│  │   walls)     │  │              │          │
│  │  Boss)       │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Physics (Arcade)                     │          │
│  │  Platforms │ Colliders │ Overlaps │ Groups       │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Effects                              │          │
│  │  Particles │ Screen Shake │ Flash │ Blend Modes  │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Systems

### FormStateMachine

States control: physics (gravity on/off), input handling, texture, camera zoom, and which subsystems are active.

```
HUMAN ──[transform]──▶ TRANSFORMING ──[400ms]──▶ MECHA
  │                                                    │
  │                                         [transform] │
  │                                                    ▼
  │                                            TRANSFORMING
  │                                                    │
  │                                            [400ms] │
  │                                                    ▼
  │                                                  DRAGON
  │                                                    │
  │                       [energy=0 or manual revert]   │
  │                                                    ▼
  └──────────────[2.5s cooldown]────────────── EXHAUSTED
```

### EnergySystem

- `currentEnergy: number` (0–100)
- `update(delta, formState, isFlyingUp)` — called each frame
- Human: regen +7/s
- Mecha: drain -4/s
- Dragon flying up: drain -12/s
- Dragon gliding/grounded: regen +14/s
- Methods: `canShoot()`, `consumeShoot()`, `consumeDamage()`, `isDepleted()`

### CombatSystem

- Manages attack hitboxes, sword/claymore slash visuals, fire bullet groups
- Sword hit detection: geometric `RectangleToRectangle` in update loop
- Fire bullet detection: physics overlap with enemy/boss groups
- ADD blend mode on all attack visuals
- Slash visuals: multi-layer sinusoidal arcs with fade tweens

### FlightSystem

- Dragon only. Custom velocity-based physics (no Arcade gravity).
- 8-directional input (arrows + WASD)
- Acceleration + damping for smooth movement
- `isFlyingUp()` — used by EnergySystem to determine energy drain

### Particle System (manual)

Located in `effects/Particles.ts`. Uses tween-based particle emitters (rectangle + position/alpha/scale tweens) rather than Phaser's built-in particle system (for compatibility). Functions:
- `spawnTransformParticles(scene, x, y)` — 20 particles, radial burst, orange/gold
- `spawnHitParticles(scene, x, y, count)` — burst from impact point
- `spawnDeathExplosion(scene, x, y)` — 30 particles, multi-color

### i18n System

- `TextManager` singleton
- Auto-detects browser language on init (`navigator.language`)
- `t('key.path')` retrieves translated string using dot-notation traversal
- `en.ts` is source of truth; `es.ts` mirrors structure with `typeof en`
- Adding new strings: add to `en.ts` first, then `es.ts`, then use `t('key')`

## Game Scenes Lifecycle

```
BootScene.create()
  │
  ├── generateTextures()      ← procedural sprite generation
  ├── Show title screen
  └── ENTER key pressed → scene.start('GameScene')
  
GameScene.create()
  │
  ├── createParallax()         ← background tileSprites
  ├── createLevel()            ← platforms + barricades
  ├── createPlayer()           ← Player + shadow
  ├── createEnemies()          ← enemy spawns
  ├── createDragonCore()       ← pickup
  ├── createBarricades()       ← destructible walls
  ├── createBoss()             ← boss spawn
  ├── setupCamera()            ← follow + deadzone
  ├── setupCollisions()        ← all physics pairs
  ├── showIntroText()          ← flavor text + controls
  ├── createVignette()         ← dark edge overlay
  └── scene.launch('UIScene')  ← parallel HUD scene

GameScene.update(time, delta)
  │
  ├── updateParallax()         ← scroll backgrounds
  ├── updateShadow()           ← shadow follows player
  ├── updateSwordVsEnemies()   ← melee hit detection
  ├── updateBulletCleanup()    ← off-screen bullet removal
  ├── updateEmbers(delta)      ← ambient particles
  └── updateBossTrigger()      ← boss activation range

UIScene.update()               ← runs parallel to GameScene
  │
  ├── Update health bar width
  ├── Update energy bar width
  ├── Update form indicator
  ├── Update core hint
  └── Update tarot card display (planned)
```

## Physics Notes

- **Arcade Physics** used for: Human, Mecha, enemies, platforms, barricades, bullets
- **Custom physics** used for: Dragon flight (velocity-based, no gravity)
- **Platforms**: Static group. Thin platforms are one-way (`checkCollision.down = false`)
- **Bullets**: Arcade groups with `allowGravity: false`, `maxSize` for pooling
- **Collisions**: Mix of colliders (separation) and overlaps (detection, no separation)

## Performance Considerations

- **Object pooling**: Fire bullet groups use `maxSize` and recycle inactive sprites
- **Off-screen cleanup**: Bullets deactivated when beyond camera + 100px margin
- **Particle lifecycle**: All tweens auto-destroy game objects on complete
- **Texture generation**: Runs once in BootScene (O(1) cost during gameplay)
- **Enemy limits**: Capped per zone (4-8 active at a time)
- **Parallax**: tileSprites with scrollFactor 0 (GPU-friendly, no per-pixel work)
