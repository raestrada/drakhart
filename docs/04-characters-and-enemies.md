# DRAKHART — Characters & Enemies

## Player: The Warden

### Visual Design

| Attribute | Description |
|-----------|-------------|
| **Form** | Side-view pixel art, facing right |
| **Size** | 48×72 pixels (human), 96×72 (dragon), ~80×100 (mecha) |
| **Color** | Green armor (Draconus homage) with gold/bronze trim, dark red cape |
| **Silhouette** | Horned helmet, broad shoulders, flowing cape, sword extended forward |
| **Key features** | Glowing orange visor (eyes), green layered armor plates, Draconus-style horned helmet. The transformed forms (**Mecha** and **Dragon**) are organic-skeletal constructs of exposed white dragon bones integrated with polished magical steel plates and powered by the glowing crimson Dragon Core in the chest. |

### Personality
- **Silent protagonist** — no spoken dialogue
- Communicates through action: determination, skill, resolve
- The Warden is a vessel for the player; minimal backstory, maximum presence

### Animation States
| State | Frames | Speed | Description |
|-------|--------|-------|-------------|
| Idle | 2 | 600ms | Subtle breathing — 1px vertical bob |
| Walk | 2 | 180ms | Leg stride — front leg alternates forward/back |
| Jump | 1 | — | Static frame, squash on takeoff, stretch on landing |
| Attack | 1 | — | Lunge forward 8px, sword arc appears |
| Damage | — | — | Flash red, knockback |
| Death | — | — | Fade to dark, collapse |

### Form Statistics

| Stat | Human | Mecha | Dragon |
|------|-------|-------|--------|
| **Speed** | 230 px/s | 110 px/s | 390 px/s (free flight) |
| **Acceleration** | 1600 px/s² | 450 px/s² | 1100 px/s² |
| **Jump** | -600 | -420 | N/A (flight) |
| **Max Fall** | 650 | 650 | N/A |
| **Jump Height** | ~240px | ~117px | Infinite (flight, energy cost) |
| **Size** | 48×72 px | 80×100 px | 96×72 px |
| **Body** | 36×60 | TBD | 84×60 |
| **Double Jump** | With The Magician card | No | N/A |
| **Hover** | No | Yes (1.5s max) | No (continuous flight) |
| **Health** | 100 | 100 | 100 |
| **Weapon** | Sword (25 dmg, 56 range) | Claymore (75 dmg, 88 range) | Fire breath (8 dmg, rapid fire) |

---

## Enemy Types

### Iron Scout Drone (Sentinel)
- **Zone**: Ashen Forest, Crystal Mines
- **Appearance**: Side-view profile of a compact octagonal flying drone (32×32 pixels) made of dark steel plates with corner rivets, featuring a horizontal glowing red target visor at the front-right, a stabilizing top rotor, and a back-left exhaust pipe venting soot and orange engine sparks.
- **Behavior**: Patrols horizontally, detects player within 220px, chases
- **Attack**: Contact damage, 10 dmg, 900ms cooldown
- **HP**: 40
- **Speed**: 70 px/s
- **Weakness**: Human sword (2 hits to kill), Mecha overkill
- **Notes**: Standard scout drone of the Iron Empire. Teaches basic combat and evasion.

### Iron Defender (Shield Sentry)
- **Zone**: Ashen Forest, Ruins
- **Appearance**: Side-view profile of a boxy bipedal mecha (32×32 pixels) built of dark steel plates with jointed mechanical legs and a narrow red visor. The front-right features a heavy steel shield plate decorated with diagonal yellow/black hazard warning stripes.
- **Behavior**: Slow patrol, blocks frontal human attacks using its shield, charges with physical pike thrusts.
- **Attack**: Shield block (immune to front-facing human attacks), physical pike thrust (15 damage).
- **HP**: 70
- **Speed**: 45 px/s
- **Weakness**: Mecha claymore (shatters/bypasses shield), attacking from behind.
- **Notes**: Anti-infantry defender. Teaches player to jump over and attack from behind or switch to Mecha form.

### Iron Mortar Sentry (Ranged Spitter)
- **Zone**: Ashen Forest, Smelting Refinery
- **Appearance**: Side-view profile of a boxy tracked drone (32×32 pixels) in industrial military green, resting on dark tank tracks. Features an angled physical mortar barrel pointing up-right and a glowing orange targeting lens.
- **Behavior**: Fires fireballs at a distance, backs away slowly if approached.
- **Attack**: Spits fast-moving magma fireballs (15 damage).
- **HP**: 35
- **Speed**: 50 px/s
- **Weakness**: Rapid fire, Mecha claymore.
- **Notes**: Artillerist sentry drone firing diesel-combusted magma blobs.

### Iron Hopper (Leaper Sentry)
- **Zone**: Ashen Forest, Ruins
- **Appearance**: Side-view profile of a lightweight bipedal mecha (32×32 pixels) in dark iron plates, featuring a circular red target lens, jointed mechanical legs with spring absorber struts, and a booster backpack venting blue thruster flames.
- **Behavior**: Patrols and leaps high towards the player when detected.
- **Attack**: High leap landing contact damage (20 damage).
- **HP**: 50
- **Speed**: 90 px/s
- **Weakness**: Ground attacks, claymore.
- **Notes**: High-agility shock trooper. Tests jump timing and spatial awareness.


### Iron Guard
- **Zone**: Iron Bastion, The Core
- **Appearance**: Brutalist humanoid mecha, 48×64 pixels. Built of heavy, square-angled dark steel plates, held together with massive industrial rivets. Features a smoking exhaust pipe on its back, a glaring red narrow visor, and carries a mechanical, physical-hydraulic energy pike.
- **Behavior**: Slow patrol, detects player, charges with shoulder bash
- **Attack**: Pike thrust (20 dmg), shoulder charge (15 dmg + knockback)
- **HP**: 80
- **Armor**: Reduces damage by 30%
- **Speed**: 40 px/s
- **Weakness**: Mecha claymore (75 dmg = effective). Human sword (25 - 30% = ~18 dmg, 5 hits — inefficient)
- **Notes**: Designed to highlight the thematic contrast between the player's ancient, skeletal dragon-bone mecha (organic curves) and the Empire's boxy, brutalist, industrialized military power.
- **Visuals**: MechWarrior-style military aesthetics.

### Sky Hunter
- **Zone**: Storm Gorge (shmup), Sky Temple
- **Appearance**: Mass-produced military surveillance drone, 24×16 pixels, blocky dark steel chassis with directional physical thrusters and a physical gatling gun muzzle.
- **Behavior**: Flies in formation patterns (V, line, diamond), shoots aimed bullets
- **Attack**: Single aimed bullet, 10 dmg, fires every 1.5s
- **HP**: 15
- **Speed**: 120 px/s
- **Weakness**: Dragon fire (2 hits), Mecha can't reach, Human can't reach
- **Notes**: Shmup enemy. Appears in waves of 3–5. Teaches basic bullet dodging.


### Gorge Turret
- **Zone**: Storm Gorge (shmup)
- **Appearance**: Stationary gun emplacement, 32×16 pixels, mounted on cliff walls
- **Behavior**: Stationary, shoots spread patterns
- **Attack**: 3-way spread every 2s, 10 dmg per bullet
- **HP**: 25
- **Speed**: 0 (stationary)
- **Weakness**: Dragon fire (4 hits)
- **Notes**: Teaches spread-pattern dodging. Classic R-Type turret.

### Bone Serpent
- **Zone**: Storm Gorge (shmup), Crystal Mines
- **Appearance**: Animated dragon skeleton fragment, 48×16 pixels, serpentine
- **Behavior**: Enters from screen edge, charges at player, exits opposite side
- **Attack**: Contact damage, 15 dmg
- **HP**: 20
- **Speed**: 200 px/s (fast charge)
- **Weakness**: Dragon fire (3 hits), Mecha claymore (1 hit)
- **Notes**: Glass cannon. Hits hard but dies fast. Tests reaction speed.

### Crystal Shard
- **Zone**: Crystal Mines
- **Appearance**: Floating crystal fragment, 24×24 pixels, bioluminescent blue
- **Behavior**: Slowly homes in on player, detonates on contact
- **Attack**: Contact explosion, 20 dmg, destroys itself
- **HP**: 10
- **Speed**: 50 px/s (slow homing)
- **Weakness**: Any weapon (1–2 hits). Dodge before they reach you.
- **Notes**: Area denial. Forces player to keep moving. Easy to kill, dangerous if ignored.

### Lava Wyrm
- **Zone**: Crystal Mines
- **Appearance**: Worm-like creature, 64×16 pixels, emerges from lava pools
- **Behavior**: Emerges from lava at random intervals, spits fireball, submerges
- **Attack**: Fireball projectile, 15 dmg
- **HP**: 35
- **Speed**: 0 (stationary while emerged)
- **Weakness**: Ranged attacks. Mecha can stand in lava (2 dmg/s) to reach it. Human takes 8 dmg/s.
- **Notes**: Form-based puzzle enemy. Mecha is ideal. Human needs ranged option or very fast approach.

### Storm Eagle
- **Zone**: Sky Temple
- **Appearance**: Large bird-like Draconel, 64×48 pixels, metallic feathers, glowing eyes
- **Behavior**: Circles overhead, dives at player, swoops back up
- **Attack**: Dive slash, 25 dmg. Wind gust (push player off platform).
- **HP**: 60
- **Speed**: 180 px/s (dive)
- **Weakness**: Dragon fire mid-flight, Mecha claymore when it lands, Human sword when it's low
- **Notes**: Requires spatial awareness. Keeping track of its dive pattern is key.

### Temple Guardian
- **Zone**: Sky Temple
- **Appearance**: Animated suit of Warden armor, 48×72 pixels, corrupted green glow
- **Behavior**: Patrols on platforms, thrusts with spectral sword
- **Attack**: Sword thrust, 20 dmg. Energy wave (ranged), 15 dmg.
- **HP**: 70
- **Speed**: 60 px/s
- **Weakness**: Mecha claymore (1–2 hits), Human sword (3–4 hits)
- **Notes**: Tragic enemy — these are fallen Wardens. Defeating them drops lore fragments.

### Mine Drone
- **Zone**: Crystal Mines, The Core
- **Appearance**: Empire excavation machine, 40×32 pixels, industrial, drills and saws
- **Behavior**: Moves in straight lines, turns at walls, continuous spin attack
- **Attack**: Contact with drill/saw, 10 dmg per tick (rapid)
- **HP**: 50
- **Speed**: 80 px/s
- **Weakness**: Any weapon. Keep distance, attack between spin cycles.
- **Notes**: Environmental hazard as much as enemy. Patience test.

---

## Bosses

### Level 2 Mini-Boss: Draconel Bastion
- **Zone**: Smelting Refinery (Level 2 Arena)
- **Appearance**: A colossal modern militaristic war machine, scaled to 1.8x player size. Features dark, blocky iron plates, hazard warning lines, turning mechanical spine gears, heavy tank treads/hydraulic mechanical legs, and a glowing diesel combustion chamber core. Armed with a heavy thermal arm cannon and a mechanical tower shield.
- **Behavior**: Patrols arena, switches attacks dynamically, responds with physical stomps and cannon fires.
- **Attack**: Plasma spit (fires a spread of 3 fast-moving magma projects, 24 damage), Colossal ground stomp (leaps and slams the ground, shaking camera, spawning expanding ground shockwaves, 32 damage).
- **HP**: 2500
- **Armor**: Fully immune to human warrior attacks (sword/sparks block), requiring the player to use Mecha or Dragon forms.
- **Notes**: Represents the pinnacle of the Empire's modern military technology. Heavily armored, industrial, and highly destructive.

### Boss 1: Corrupted Draconel
- **Zone**: Storm Gorge (x: 16,000–17,000)
- **Appearance**: Ancient dragon-mecha, 128×128 pixels, twisted metal, exposed corrupted core
- **Phases**: 2 (Armored → Exposed Core)
- **Phase 1 — Armored**: 
  - Bullet patterns: aimed volleys (3 bursts of 5 bullets), spiral spread (12 bullets rotating)
  - HP: 180
  - Weak point: Core partially visible between armor plates
- **Phase 2 — Exposed Core**:
  - Faster, more aggressive. Charge beam (telegraphed, high damage 30), desperate bullet spam
  - HP: 120
  - Weak point: Fully exposed core, takes double damage from Dragon fire
- **Drops**: Strength tarot card (Mecha claymore +50%)
- **Design notes**: Classic shmup boss. Teaches bullet pattern recognition.

### Boss 2: Crystal Guardian
- **Zone**: Crystal Mines (x: 23,500)
- **Appearance**: Animated golem, 128×128 pixels, crystal and dragon bone fused
- **Phases**: 2 (Crystal Shell → Core Fragments)
- **Phase 1 — Crystal Shell**:
  - Attacks: Crystal shard spreads (3-way, 5-way), ground smash (shockwave, must jump)
  - HP: 200
  - Armor: Reduces damage by 20%. Mecha claymore effective.
  - Strategy: Human dodges, Mecha damages. Form switching required.
- **Phase 2 — Core Fragments**:
  - Shell shatters. Multiple small cores orbit the golem, shooting independently.
  - Attacks: Orbiting bullet circles, laser beams from fragments
  - HP: 150 (main body), 30 each (fragments)
  - Strategy: Destroy fragments first, then main body. Dragon fire good for fragments.
- **Drops**: The Tower tarot card (Dragon fire spread — 3-way shot)
- **Design notes**: Form-switching tutorial boss. Teaches that some fights require multiple forms.

### Boss 3: Sky Empress
- **Zone**: Sky Temple (y: -800)
- **Appearance**: Imperial royal Draconel, 160×160 pixels, ornate gold and dark steel, cape of energy
- **Phases**: 3
- **Phase 1 — Aerial**:
  - Flight-based. Dragon form needed to engage.
  - Attacks: Wind blades (horizontal slashes), lightning strikes (targeted AoE)
  - HP: 200
- **Phase 2 — Platform Battle**:
  - Lands on temple platform. Mecha form optimal.
  - Attacks: Energy sword (melee, 30 dmg), summon Storm Eagles (2 at a time), ground pound (stun)
  - HP: 180
- **Phase 3 — Desperation**:
  - Low HP. Uses all attacks from phases 1 and 2, faster.
  - Core exposed. All forms deal full damage.
  - HP: 100
  - Music intensifies. Screen shakes. Cinematic finale.
- **Drops**: The Emperor tarot card (Mecha armor — -30% damage taken)
- **Design notes**: Most cinematic boss. The "rival" fight. Escaflowne duel energy.

### Final Boss: The Iron Heart
- **Zone**: The Core (x: 34,000)
- **Appearance**: Colossal Draconel, 256×256 pixels. Dozens of corrupted Cores visible through translucent armor. Industrial nightmare.
- **Phases**: 3 (one per form)
- **Phase 1 — Conduits (Human)**:
  - Giant boss in background, attacks via conduits in the arena
  - Player (Human) must dodge bullet patterns and strike exposed conduits
  - Attacks: Rotating laser walls, bullet spreads from Core vents
  - HP: 6 conduits at 50 HP each
- **Phase 2 — Armor (Mecha)**:
  - Boss descends. Direct combat.
  - Attacks: Arm sweeps (melee, 35 dmg), Core beam (continuous laser, 20 dmg/s), summon Iron Guards
  - Must break armor plates with Mecha claymore. Heat management critical.
  - HP: 300 (armor)
- **Phase 3 — Core (Dragon)**:
  - Armor destroyed. Boss flies up. Aerial duel.
  - Attacks: Dense bullet patterns, rotating lasers, homing missiles
  - Final shmup sequence. Dragon fire with The Tower (3-way spread) is key.
  - HP: 250 (core)
- **Ending**: The Iron Heart collapses. All Cores are freed. Cinematic sequence.
- **Design notes**: Tests mastery of all three forms. Epic finale. The fight IS the story.

### Secret Boss: The Forgemaster
- **Appearance**: Half-human, half-machine. 96×128 pixels. Suspended in mechanical harness.
- **Fight style**: Summons waves of every enemy type. Forgemaster is vulnerable between waves.
- **Unlock**: Collect all 10 tarot cards. Access through secret chamber beneath The Core.
- **Reward**: Unique weapon skins for each form.
