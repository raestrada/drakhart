# DRAKHART — Art Direction

## Visual Identity

**Dark pixel art with modern rendering techniques.** The pixel art is authentic (nearest-neighbor scaling, limited palettes) but the engine applies dynamic lighting, particles, ADD blend glows, vignette, and screen effects to create depth and atmosphere beyond what retro hardware could achieve.

### Technology Style Contrast
The world is defined by a stark visual clash between two distinct types of technology:
1. **Forgotten Biomechanical Dragon Magic (Player)**:
   - *Aesthetic*: Art Nouveau curves, organic skeletal fusions of bone and steel, polished white bone textures, and glowing magical energy conduits.
   - *Forms*: The Warden's transformed Mecha and Dragon states show exposed, skeletal white dragon bones, bound by gold-trimmed plates and powered by the pulsing crimson-red Dragon Core.
   - *FX*: Swelling magical swells, glowing red/orange embers, and volumetric light sweeps.
2. **Modern Industrial Brutalist Military (Enemies)**:
   - *Aesthetic*: Blocky shapes, sharp angles, mass-produced machinery, heavy riveted dark iron, hazard warning stripes, treadmills/treads, hydraulic cylinders, and smoke exhaust pipes.
   - *Forces*: The Iron Guards and Elite Mechas resemble classic *MechWarrior* armor, showing heavy militaristic, industrial power that rejects and suppresses the old magic.
   - *FX*: Dark diesel/steam smoke clouds, physical sparks, and harsh red visors/sensors.


## Color Palette

### Global Palette (32 colors)

```
Background void:     #06040c  →  #0a0815  →  #0e0c1a
Environment dark:    #141210  →  #1c1715  →  #26201a
Environment mid:     #2a221c  →  #332a22  →  #3d3228
Environment light:   #4a3d30  →  #5a4a3a  →  #6a5844

Warrior green:       #0b1a0b  →  #153015  →  #1d4a1d  →  #2a6a2a
Warrior gold trim:   #665522  →  #887733  →  #997733  →  #aa8844
Warrior cape:        #1a0808  →  #220d0d

Dragon body:         #111122  →  #181830  →  #222240  →  #2a2a45
Dragon steel:        #334455  →  #445566  →  #556677
Dragon gold accent:  #aa8844  →  #cc9944

Fire / energy:       #cc3300  →  #ff4400  →  #ff6600  →  #ff8800  →  #ffcc00  →  #ffffff

Enemy purple:        #220044  →  #441166  →  #663388  →  #cc44ff  →  #ff88ff

Boss corruption:     #110a14  →  #1a0f22  →  #2a1533  →  #ff1166  →  #ff2288  →  #ffaacc
```

### Zone-Specific Palettes

Each zone shifts the environmental palette slightly:

| Zone | Tint | Atmosphere |
|------|------|------------|
| Ashen Forest | Cool green-gray | Petrified forest, ash |
| Iron Bastion | Warm red-brown | Forge heat, metal |
| Storm Gorge | Deep blue-purple | Storm sky, lightning |
| Crystal Mines | Cool blue-cyan | Bioluminescent crystals |
| Sky Temple | Pale gold-white | Sacred, celestial |
| The Core | Dark red-orange | Industrial, hellish |

---

## Sprite Specifications

### Sizes (current implementation)

| Sprite | Size | Frames | Notes |
|--------|------|--------|-------|
| Human Warrior | 48×72 px | 4 (idle×2, walk×2) | Green armor, visor glow |
| Mecha | TBD | TBD (planned 2 idle, 2 walk) | Larger, heavier silhouette |
| Dragon Draconel | 96×72 px | 3 (fly×2, neutral) | Wings animate, head on right |
| Iron Scout Drone | 32×32 px | 1 | Floating scout drone, side-view |
| Iron Defender | 32×32 px | 1 | Shield biped mecha, side-view |
| Iron Mortar Sentry | 32×32 px | 1 | Tracked mortar turret, side-view |
| Iron Hopper | 32×32 px | 1 | Booster scout hopper, side-view |
| Iron Guard | 48×64 px | 1 (planned 2) | Heavy mecha |
| Sky Hunter | 24×16 px | 1 | Small drone |
| Boss 1 | 128×128 px | 1 | Corrupted Draconel |
| Boss 2 | 128×128 px | 1 | Crystal Golem |
| Boss 3 | 160×160 px | 1 | Imperial Draconel |
| Final Boss | 256×256 px | 1 | The Iron Heart |
| Dragon Core | 16×16 px | 1 | Glowing pickup |
| Barricade | 64×128 px | 1 (planned cracked variants) | Destructible wall |
| Platform tile | 32×16 px | 1 | Stone edge |
| Ground tile | 32×32 px | 1 | Dark earth |

### Drawing Technique

All sprites are generated **procedurally** in `BootScene.generateTextures()` using Phaser's Graphics API:
- `fillCircle()` — heads, joints, cores, eyes
- `fillRoundedRect()` — armor plates, body segments
- `fillTriangle()` — horns, spikes, teeth, cape folds
- `beginPath()` / `arc()` / `fillPath()` — wings, organic shapes, crystal outlines
- Custom sinusoidal curves for sword slash and fire arcs
- Multi-layer drawing for glow effects (core, eyes, fire)

**Advantage**: No external asset files needed during prototype phase. All visual iteration happens in code. When real pixel art is ready, replace `generateTextures()` with `this.load.image()` calls.

**Limitation**: Procedural art lacks the nuance of hand-pixeled sprites. The final game will replace all procedural textures with artist-created sprite sheets.

---

## Rendering Techniques

### Blend Modes
- **ADD**: Sword slash, fire breath, Dragon Core glow, visor glow, hit sparks
- **NORMAL**: All other sprites, tiles, backgrounds

### Particle System
- **Ambient embers**: Rise from bottom of screen, fade out
- **Hit sparks**: Burst from impact point, 5-8 particles, gold/white
- **Transform burst**: Radial explosion, 20+ particles, orange/gold
- **Death explosion**: Large burst, 30+ particles, multi-color
- **Fire trail**: Follows fire breath projectiles (planned)

### Screen Effects
- **Vignette**: Dark gradient at screen edges (alpha 0.4 top/bottom, 0.25 sides)
- **Camera shake**: On damage (light), transform (medium), boss hits (heavy), boss death (extreme)
- **Camera flash**: White on transform, red on damage, gold on card collection, orange on fire
- **Tint flash**: Player/enemies flash red on damage (100ms)

### Depth Layering

| Depth | Content |
|-------|---------|
| -30 | Sky background |
| -20 | Far mountains parallax |
| -15 | Mid forest parallax |
| -10 | Near ruins parallax |
| -5 | Character shadows |
| 0 | Platforms, enemies, player, projectiles (default) |
| 100 | Vignette overlay |
| 200 | HUD elements |

### Parallax Scrolling
- Sky: scroll factor 0.05 (barely moves)
- Mountains: tilePositionX = cameraX * 0.08
- Forest: tilePositionX = cameraX * 0.20
- Ruins: tilePositionX = cameraX * 0.35

---

## Resolution & Scaling

| Parameter | Value |
|-----------|-------|
| Game resolution | 1920 × 1080 px |
| Scale mode | `Phaser.Scale.FIT` with `autoCenter: CENTER_BOTH` |
| Pixel art | `pixelArt: true` (nearest-neighbor interpolation) |
| Background | `#06040c` |

The game renders at 1920×1080 natively. On smaller screens, Phaser's FIT mode scales down while preserving aspect ratio. All pixel art uses nearest-neighbor filtering for crisp edges.

---

## UI / HUD Design

### In-Game HUD (top-left panel)

```
┌─────────────────────────┐
│      D R A K H A R T    │
│                         │
│  HEALTH                 │
│  ████████████████░░░░   │  ← segmented bar, red
│                         │
│  ENERGY                 │
│  ██████████░░░░░░░░░░   │  ← bar, orange
│                         │
│  ● DRAGON READY    [C]  │  ← form indicator with dot
│                         │
│  🂡 🂧 🂈 🂔             │  ← collected tarot cards (icons)
└─────────────────────────┘
```

### Bottom Bar (permanent)
```
  ARROWS / WASD : Move    UP / W : Jump    X : Attack    C : Transform
```

### Boss Health Bar (top-center, appears during boss fights)
```
┌──────────────────────────────────┐
│     CORRUPTED DRACONEL           │
│  ████████████████████░░░░░░░░░░  │
└──────────────────────────────────┘
```

---

## Visual References

### Draconus (Atari 8-bit, 1988)
- Dark, moody sprite work for its era
- Green-armored barbarian protagonist
- Transformation into dragon as core mechanic
- Atmospheric forest/ruin environments

### Escaflowne (anime, 1996)
- Draconels: organic-mechanical fusion design
- Gold trim on dark armor
- Glowing energy cores
- Dramatic, theatrical visual style
- Floating islands and sky temples

### Blasphemous (2019)
- Modern dark pixel art with dynamic lighting
- Religious/gothic horror aesthetic
- Detailed sprite animation
- Atmospheric parallax backgrounds

### R-Type (1987)
- Industrial/organic enemy design
- Force pod mechanic (inspiration for multi-form)
- Dense, readable bullet patterns
- Imposing boss designs
