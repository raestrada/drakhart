# DRAKHART — Controls & Input

## Keyboard Layout

### Default Bindings

| Action | Key 1 | Key 2 | Notes |
|--------|-------|-------|-------|
| **Move Left** | Arrow Left | A | |
| **Move Right** | Arrow Right | D | |
| **Jump / Fly Up** | Arrow Up | W | Hold for higher jump (variable height) |
| **Crouch / Fly Down** | Arrow Down | S | Dragon flight only |
| **Attack** | X | | Sword (Human/Mecha), Fire (Dragon) |
| **Transform** | C | | Cycle: Human → Mecha → Dragon → Human |
| **Pause** | Escape | | Menu overlay |
| **Confirm** | Enter | | Menu navigation |
| **Cancel** | Space | | Menu navigation |

### Form-Specific Controls

| Action | Human | Mecha | Dragon |
|--------|-------|-------|--------|
| Move horizontal | Arrow L/R or A/D | Arrow L/R or A/D (slower) | Arrow L/R or A/D (flight) |
| Jump | Arrow Up or W (press) | Arrow Up or W (press) | N/A |
| Variable jump height | Hold for higher, release for lower | Hold for higher, release for lower | N/A |
| Double jump | Arrow Up/W mid-air (with The Magician) | No | N/A |
| Hover | No | Hold Jump (Arrow Up/W) while airborne | N/A |
| Fly up | No | No | Arrow Up or W |
| Fly down | No | No | Arrow Down or S |
| Light attack | X (tap) | X (tap) | X (tap, auto-fire in shmup) |
| Charged attack | No | X (hold 1.2s, release) | No |
| Transform | C | C (becomes Dragon) | C (reverts to Exhausted) |

## Control Feel Mechanics

### Jump Buffer
- **Window**: 100ms before landing
- If the player presses jump within 100ms of landing, the jump executes on the frame they land.
- Prevents "I pressed jump but nothing happened" frustration.

### Coyote Time
- **Window**: 80ms after walking off a ledge
- The player can still jump for 80ms after leaving a platform edge.
- Prevents "I was pressing jump but walked off the edge" frustration.

### Variable Jump Height
- **Hold jump**: Full jump height
- **Tap jump**: Short hop (~60% of full height)
- Implemented via: release jump key → set velocity.y to a fraction of current upward velocity

### Mecha Hover
- **Activation**: Hold Jump while airborne as Mecha
- **Duration**: 1.5 seconds maximum
- **Heat cost**: +10/s
- **Visual**: Thrust particles below Mecha
- **Usage**: Cross wide gaps, position for precise platforming, dodge ground attacks

### Dragon Free Flight
- **Movement**: 8-directional via Arrow keys or WASD
- **Physics**: Acceleration-based with damping (smooth, not twitchy)
- **Energy drain**: Only when actively flying UPWARD. Gliding/descending regenerates energy.
- **Shmup mode (forced scroll)**: Camera auto-scrolls right at 100 px/s. Player controls only within viewport.

## Gamepad Support (Planned)

| Action | Xbox | PlayStation | Notes |
|--------|------|-------------|-------|
| Move | Left Stick / D-Pad | Left Stick / D-Pad | |
| Jump / Fly Up | A | ✕ | Hold for variable height |
| Crouch / Fly Down | Left Stick Down / D-Pad Down | Left Stick Down / D-Pad Down | |
| Attack | X | □ | Tap light, Hold charge (Mecha) |
| Transform | Y | △ | |
| Pause | Start | Options | |

## Settings & Accessibility (Planned)

| Setting | Options | Default |
|---------|---------|---------|
| **Language** | English, Spanish (auto-detect) | Auto |
| **Master Volume** | 0–100% | 80% |
| **Music Volume** | 0–100% | 70% |
| **SFX Volume** | 0–100% | 100% |
| **Screen Shake** | Off / Low / Full | Full |
| **Camera Zoom** | Fixed / Dynamic | Dynamic |
| **Control Remapping** | All keys rebindable | — |
| **Auto-Fire** (shmup) | On / Off | On |
| **Damage Numbers** | On / Off | On |
| **High Contrast Mode** | On / Off | Off |

## Input Handling Architecture

```typescript
// In Player.ts
private setupInput(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    // Additional keys: W, A, D, C, X
    // Event listeners: key.on('down', callback)
}

// Form-based input delegation:
// - Human/Mecha: updateHuman() handles horizontal + jump
// - Dragon: FlightSystem.update() handles 8-dir via cursors + WASD
// - Attack: key.on('down') → CombatSystem.attack(state, facingRight)
// - Transform: key.on('down') → FormStateMachine.requestTransform()
```

## Prevented Input Issues

- **Key repeat spam**: Attack key uses `Phaser.Input.Keyboard.Events.DOWN` (fires once per press, not per frame)
- **Transform spam**: `canTransform` flag with cooldown prevents rapid form switching
- **Jump while paused**: Jump buffer resets on scene pause/resume
- **Simultaneous left+right**: Last pressed wins (common game feel pattern)
