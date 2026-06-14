# DRAKHART — Gameplay Systems

## Form State Machine

```
                    ┌── requestTransform() ──┐
                    │                         │
    HUMAN ──→ TRANSFORMING ──→ MECHA ──→ TRANSFORMING ──→ DRAGON
      ↑                                                         │
      │                                    energy=0 or          │
      └────────── EXHAUSTED ←────────── requestTransform() ─────┘
                       │
                  cooldown (2.5s)
                       │
                       ▼
                     HUMAN
```

### States

| State | Gravity | Input | Movement | Combat | Camera Zoom |
|-------|---------|-------|----------|--------|-------------|
| **HUMAN** | Arcade (750) | Full | Walk, jump, double jump (with card) | Sword slash | 2.0× |
| **TRANSFORMING** | Disabled | Locked | None | None | Shake + flash |
| **MECHA** | Arcade (750) | Full | Slow walk, jump, hover (1.5s) | Claymore slash | 1.7× |
| **DRAGON** | Disabled | Full | Free flight (8-dir) | Fire breath (auto-fire in shmup) | 1.4× |
| **EXHAUSTED** | Arcade (750) | Full | Human movement | None | 2.0× |

### Transformation Rules

1. **HUMAN → MECHA**: Requires Dragon Core collected. 400ms animation. Camera shake, flash, particles.
2. **MECHA → DRAGON**: Requires Sky Core collected. 400ms animation. Larger VFX.
3. **DRAGON → EXHAUSTED**: Energy depleted OR manual revert. 2.5s cooldown before can transform again.
4. **EXHAUSTED → HUMAN**: Automatic after 2.5s cooldown.
5. **No transform during cooldown or TRANSFORMING state.**

---

## Energy System

A shared resource pool across forms.

| Parameter | Value |
|-----------|-------|
| Max energy | 100 |
| **Regen (Human)** | +7/s |
| **Regen (Dragon, grounded/gliding)** | +14/s |
| **Drain (Dragon, flying upward)** | -12/s |
| **Drain (Mecha, constant while in form)** | -4/s |
| **Drain (Dragon, shooting)** | -0.8/shot |
| **Drain (damage taken, Dragon/Mecha)** | -12/hit |

**Energy management**: 
- Human form is the "recharge" form. Switch back to replenish.
- Dragon flight consumes energy rapidly. Gliding/landing regenerates.
- Mecha form drains slowly. Time in Mecha is limited but generous.
- At 0 energy in Dragon or Mecha, forced EXHAUSTED state.

---

## Heat System (Mecha Only)

Mecha gameplay adds a **heat management** layer inspired by MechWarrior 2.

| Heat Level | Effect | Visual |
|-----------|--------|--------|
| **0–60 (Normal)** | Full operation | Normal |
| **60–80 (Warning)** | Speed -15%, steam particles from joints | Yellow glow |
| **80–100 (Danger)** | Speed -30%, screen edge reddening | Red glow, sparks |
| **100 (Overheat)** | **3s total shutdown**. Vulnerable, can't move or attack. | Screen flash, alarm sound |

### Heat Generation

| Action | Heat Generated |
|--------|---------------|
| Claymore slash | +15 |
| Claymore charged slash | +35 |
| Hover (per second) | +10/s |
| Taking damage | +8/hit |
| Walking (per second) | +1/s |

### Heat Dissipation

| State | Rate |
|-------|------|
| Idle (standing still) | -5/s |
| Walking (not attacking) | -2/s |
| During shutdown | -15/s (rapid cooldown) |

**Design intent**: Heat adds tactical depth to Mecha combat. Spamming attacks causes shutdown, leaving the player vulnerable. Encourages deliberate, timed strikes. Pairs with Strength card (more damage = more efficient heat use) and Emperor card (less damage taken = less heat from hits).

---

## Combat System

### Human — Sword

| Parameter | Base | With Justice card |
|-----------|------|-------------------|
| Damage | 25 | 25 |
| Range | 56 px | 67 px (+20%) |
| Duration (slash visible) | 200 ms | 200 ms |
| Cooldown | 320 ms | 320 ms |
| Critical chance | 0% base | +15% with Death card |

- Slash arc: 4-layer sinusoidal curve (ADD blend mode)
- Visual: white-blue gradient arc, fades with tween
- Hit detection: geometric rectangle intersection (not physics overlap)

### Mecha — Claymore

| Parameter | Base | With Strength card |
|-----------|------|--------------------|
| Damage | 75 | 112 (+50%) |
| Range | 88 px | 88 px |
| Duration | 350 ms | 350 ms |
| Cooldown | 650 ms | 650 ms |
| Heat cost | +15 | +15 |
| Critical chance | 0% base | +15% with Death card |

- Slash arc: 4-layer sinusoidal curve, larger scale, orange tint
- Visual: heavier slash, orange/red instead of blue/white (ADD blend)
- Hit detection: same as Human sword
- **Charged attack** (hold X): +35 heat, 150 damage, 1.2s charge time

### Dragon — Fire Breath

| Parameter | Base | With The Tower card |
|-----------|------|---------------------|
| Damage | 8/bullet | 8/bullet (3 bullets) |
| Fire rate | 110 ms cooldown | 110 ms cooldown |
| Bullet speed | 700 px/s | 700 px/s |
| Bullet lifetime | 1200 ms | 1200 ms |
| Energy cost | 0.8/shot | 0.8/shot (per bullet set) |
| Pattern | Single straight | 3-way spread (0°, ±15°) |

- Bullet: 16×8 fire projectile with 4-layer color gradient (ADD blend)
- In shmup sections: auto-fire enabled
- Hit detection: physics overlap (Arcade group)

### Bullet & Hit Detection

- Player bullets use Arcade physics groups with `allowGravity: false`
- Bullets vs enemies/boss: physics overlap → damage + spawn hit particles
- Bullets vs platforms: physics collider → bullet destroyed
- Sword/claymore: geometric `RectangleToRectangle` intersection in update loop
- Off-screen bullets: automatically deactivated (camera boundary + 100px margin)

---

## Flight System (Dragon)

| Parameter | Value |
|-----------|-------|
| Max speed (any axis) | 390 px/s |
| Acceleration | 1100 px/s² |
| Damping (no input) | 0.92 |
| Input | 8-direction: arrows OR WASD |
| Physics | Custom velocity-based, no gravity |

### Flight Modes

| Mode | Behavior | Zone |
|------|----------|------|
| **Free Flight** | Full 8-dir control, no scroll | Sky Temple, Crystal Mines |
| **Forced Scroll Shmup** | Camera locks at x+400, auto-scrolls right at 100 px/s. Player flies within viewport. | Storm Gorge, The Core (Phase 3) |
| **Grounded/Gliding** | Energy regenerates at 14/s when not actively flying upward | All zones |

---

## Platforming Physics

| Parameter | Human | Mecha |
|-----------|-------|-------|
| Speed | 230 px/s | 110 px/s |
| Acceleration | 1600 px/s² | 450 px/s² |
| Drag (ground friction) | 0.80 | 0.94 |
| Jump velocity | -600 | -420 |
| Jump height | ~240 px | ~117 px |
| Max fall speed | 650 px/s | 650 px/s |
| Gravity | 750 px/s² | 750 px/s² |
| Double jump | With The Magician | No |

### Game Feel Mechanics

| Mechanic | Description | Window |
|----------|-------------|--------|
| **Jump buffer** | Press jump slightly before landing → jumps on landing | 100 ms |
| **Coyote time** | Walk off ledge → still able to jump briefly | 80 ms |
| **Variable jump height** | Hold jump = full height, tap = short hop | Via key release |
| **Afterimages** | Ghost trail on dash/transform | Tween-based alpha |
| **Landing squash** | ScaleY compress on landing | 100 ms tween |
| **Takeoff stretch** | ScaleY extend on jump | 100 ms tween |

---

## Camera System

| Form | Zoom | Behavior |
|------|------|----------|
| Human | 2.0× | Smooth follow with 0.1 lerp, deadzone 50×50 |
| Mecha | 1.7× | Same follow, slightly wider view |
| Dragon (free) | 1.4× | Wide view for flight |
| Dragon (shmup) | 1.4× | Locked at player.x + 400, forced right scroll |
| Transforming | — | Zoom tween between values (600ms), shake, flash |
| Boss fights | Boss-dependent | May lock camera to arena boundaries |

---

## Collision Design

| Pair | Type | Behavior |
|------|------|----------|
| Player ↔ Platforms | Collider | Standard platformer collision. Thin platforms are one-way (pass through from below). |
| Player ↔ Enemies | Collider | Separation. No clipping. Enemies attack on contact. |
| Player ↔ Dragon Core | Overlap | Collect → unlock Mecha form |
| Player ↔ Barricades | Collider | Solid wall. Must be destroyed by Mecha. |
| Player bullets ↔ Enemies | Overlap | Damage enemy, destroy bullet, spawn hit particles |
| Player bullets ↔ Platforms | Collider | Destroy bullet |
| Player bullets ↔ Boss | Overlap | Damage boss, destroy bullet |
| Player ↔ Boss bullets | Overlap | Damage player, destroy bullet, knockback |
| Player ↔ Boss | Collider | Separation. Boss activation via distance trigger. |
| Enemies ↔ Platforms | Collider | Enemies walk on platforms |
| Enemies ↔ Barricades | Collider | Enemies blocked by barricades |

---

## Barricade System

- **Appearance**: Heavy stone/metal gate, 64×128 pixels, dark texture with Imperial insignia
- **HP**: 1000
- **Damage received**:
  - Human sword: 25 (40 hits — impractical)
  - Mecha claymore: 75 (14 hits — intended)
  - Mecha charged: 150 (7 hits — efficient)
  - Dragon fire: 8 (125 hits — impractical)
- **Visual states**: Cracked at 50% HP, shattered at 0%
- **Destroyed state**: Fade out with particle explosion
- **Purpose**: Soft gate. Human CAN break them (technically) but it's tedious, directing player to use Mecha.
