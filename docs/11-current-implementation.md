# DRAKHART — Current Implementation Status

## Overview

This document reflects the state of the codebase as of the prototype phase. The game currently has a single continuous zone (3,200px) with all three forms functional, basic enemies, one boss, and placeholder visuals generated procedurally.

## Files Inventory (22 TypeScript files)

```
src/
├── main.ts                        ✓ Phaser bootstrap
├── config.ts                      ✓ GameConfig (1920×1080, Arcade physics)
├── i18n/
│   ├── index.ts                   ✓ TextManager singleton
│   ├── en.ts                      ✓ English strings
│   └── es.ts                      ✓ Spanish strings
├── scenes/
│   ├── BootScene.ts               ✓ Title screen + procedural texture generation
│   ├── GameScene.ts               ✓ Level, collisions, enemies, boss
│   └── UIScene.ts                 ✓ HUD (health, energy, transform indicator)
├── entities/
│   ├── Player.ts                  ✓ Player with 3 forms, animations, game feel
│   ├── DragonCore.ts              ✓ Pickup → unlock Mecha
│   ├── Barricade.ts               ✓ Destructible wall
│   └── enemies/
│       ├── BaseEnemy.ts           ✓ Abstract enemy (patrol, detect, chase, attack)
│       ├── FlyingEnemy.ts         ✓ Aerial enemy for shmup
│       └── Boss.ts                ✓ Multi-phase boss with UI
├── systems/
│   ├── FormStateMachine.ts        ✓ HUMAN → MECHA → DRAGON → EXHAUSTED
│   ├── FlightSystem.ts            ✓ Dragon free-flight physics
│   ├── EnergySystem.ts            ✓ Resource pool
│   └── CombatSystem.ts            ✓ Sword, claymore, fire breath
├── effects/
│   ├── Particles.ts               ✓ Manual particle bursts
│   └── ScreenEffects.ts           ✓ Camera shake, flash
└── utils/
    ├── constants.ts               ✓ All tuning values
    └── helpers.ts                 ✓ clamp, lerp, distanceBetween
```

## Implemented Features

### ✅ Core Mechanics
- Three forms: Human, Mecha, Dragon
- Form state machine with TRANSFORMING and EXHAUSTED states
- Transformation animations (camera shake, flash, particles)
- Cooldown on revert (2.5s)
- Physical barrier: low ceiling tunnel blocks Mecha

### ✅ Combat
- Human sword: 25 dmg, 56 range, 320ms cooldown
- Mecha claymore: 75 dmg, 88 range, 650ms cooldown
- Dragon fire breath: 8 dmg, rapid fire, 110ms cooldown
- Sword hit detection (geometric rectangle intersection)
- Fire bullet detection (physics overlap)
- ADD blend mode on all attack visuals
- Hit particles (sparks on impact)

### ✅ Enemies
- BaseEnemy: patrol, detect (220px), chase, attack on cooldown
- FlyingEnemy: aerial movement, shoot projectiles
- Boss: 2 phases, UI health bar, projectile patterns, movement bobbing

### ✅ Level
- Continuous 3,200px world
- Tile-based platforms (ground + thin platforms)
- One-way platforms (pass through from below)
- Barricades (1000 HP, breakable by Mecha)
- Dragon Core pickup at x=1320
- Boss at x=2500
- Parallax backgrounds (mountains, forest, ruins)
- Vignette overlay
- Ambient ember particles

### ✅ Player Game Feel
- Jump buffer (100ms)
- Coyote time (80ms)
- Variable jump height
- Mecha hover (1.5s max)
- Landing squash/stretch
- Afterimages on dash
- Visor glow effect
- Shadow under player (scales with height)
- Idle animation (2 frames, breathing)
- Walk animation (2 frames, leg stride)
- Dragon animation (2 frames, wing flap)

### ✅ UI / HUD
- Health bar (animated)
- Energy bar (animated)
- Form indicator with core dot
- Controls display (bottom bar)
- Dragon Core hint system (proximity-based)
- Intro text with fade
- Boss health bar

### ✅ i18n
- English (source of truth)
- Spanish (complete translation)
- Auto-detect browser language
- All user-facing strings use `t('key')` — no hardcoded strings

## Partially Implemented / Needs Work

### 🔶 Three-Form Progression
- **Mecha form**: Basic implementation. Needs heat system, charged attack, proper mecha sprite, unique animations
- **Dragon form**: Flight works. Needs Sky Core pickup, forced-scroll shmup mode, proper shmup enemy waves
- **Form unlock flow**: Only Dragon Core implemented (unlocks Mecha). Sky Core not yet implemented.

### 🔶 Level Design
- Current: 1 zone, 3,200px (prototype only)
- Needs: 6 zones, 35,000px total
- Zone-specific mechanics not yet implemented (lava, wind, magnetism)

### 🔶 RPG Tarot System
- Not implemented. Needs card pickup entities, effects system, save/load, HUD display

### 🔶 Shmup Mode
- Forced scroll exists in concept but not implemented
- Camera lock, auto-scroll, wave spawning needed

### 🔶 Audio
- No audio implemented

### 🔶 Save System
- Not implemented

## Known Issues / Technical Debt

1. **Dragon Core pickup**: Currently placed at x=1320 in the prototype zone. Needs to be repositioned for the full 6-zone map.
2. **Enemy spawn positions**: Hardcoded coordinates. Needs data-driven spawn system.
3. **Hardcoded text positions**: UI text uses pixel coordinates. Needs responsive positioning for different resolutions.
4. **Static body creation**: Platform tiles are created individually. For large worlds, a tiled approach via Tiled editor would be more efficient.
5. **Sprite generation**: All sprites are procedural. For final art, all `generateTexture` calls should be replaced with `this.load.image()`.

## What the Current Build Can Do

1. Start game, see title screen
2. Press ENTER to start
3. Walk right, jump on platforms, climb staircase
4. Find Dragon Core → unlock Mecha (press C)
5. Transform to Mecha, break barricades
6. Transform to Dragon, fly freely
7. Reach boss area → boss activates, 2-phase fight
8. Defeat boss → prototype complete message
