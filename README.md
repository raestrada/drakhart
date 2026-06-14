# DRAKHART

![Drakhart Marketing Splash Art](public/marketing/drakhart_splash.png)

> *"The sky remembers the age when dragon hearts beat inside metal, bone, and stone. Humanity called them Guymelefs—biomechanical gods of war. Empires forged them, wars broke them, and the world burned to ash. Now, only the Cores remain... and one has chosen you."*

**DRAKHART** is a dark fantasy action-platformer that seamlessly fuses **three distinct gameplay genres into a single, continuous, genre-bending adventure**. Inspired by the earned transformations of *Draconus (1988)*, the biomechanical fantasy mechas of *Vision of Escaflowne (1996)*, and the tactical pacing of classic arcade shmups (*R-Type*), DRAKHART casts you as **The Warden**—a silent warrior fighting to protect the last breathing dragon hearts from the industrial claws of the **Iron Empire**.

---

## 📖 The Lore: The Final Forging

In a ruined world where beauty has decayed into ash, the **Iron Empire** hunts for the last beating **Dragon Cores**. Their goal: to forge a corrupted army of **Guymelefs**—titanic biomechanical war machines—and enforce the *Final Forging* across the Shattered Continent. 

As a nameless Warden of the old guard, you wear the green scale armor of a dead order. But when you touched a surviving Dragon Core, it did not burn you. It fused with your chest. Now, it whispers in a language older than steel, granting you the earned power of transformation. You are the only thing standing between the Empire's forge and the continent's complete annihilation. Your destiny is written in tarot... and forged in dragon-fire.

---

## 🎮 The Three Forms of Destiny

DRAKHART features **Triple-Form Cinematic Shifts**. At the press of a key `[C]`, experience dramatic, seamless transitions between three wildly different gameplay styles, each with its own screen effects, camera zooms, and visual feedback:

| 🟢 Human Form: The Warden | ⚪ Mecha Form: The Guymelef | 🔵 Dragon Form: The Sky Graver |
| :---: | :---: | :---: |
| ![Warden Profile](public/marketing/warrior_card.png) | ![Mecha Profile](public/marketing/mecha_card.png) | ![Dragon Profile](public/marketing/dragon_card.png) |
| **Precision Platforming** | **Heavy Tactical Combat** | **Horizontal Shmup Flight** |
| Run, dodge, jump, and slash through tight tunnels and narrow pathways. Agile and swift, but fragile. | Taller, heavily armored biomechanical mecha knight. Smash through heavy gates and barrier walls with your massive Claymore. | Free-flight shmup-style gorge navigation. Navigate bullet-hell waves, unleash fire breath, and fight colossal aerial bosses. |

---

## ⚡ Key Gameplay Innovations

### 1. The "Soft-Gate" (Wrong-Form-Inconvenience) Design
Unlike traditional Metroidvanias that use hard locks ("You need double-jump to enter"), DRAKHART uses **soft-gate design**. The entire continent is accessible from the start. However, attempting a zone in the wrong form is highly *inconvenient*—slow, hazardous, or clunky. 
- *A mecha is too wide to fit into narrow tunnels.*
- *A human warrior will immediately fall and die in bottomless chasms.*
- *Lava floors drain a human's health but barely tickle the mecha's armored boots.*
You have the agency to try anything, but the game naturally guides you toward mastering all three forms.

### 🂡 2. Tarot RPG Progression (War Echoes)
Collect **10 Major Arcana "War Echo" cards** hidden across the Shattered Continent. Each card is imprinted with the dying will of ancient dragons and fallen Wardens, unlocking permanent upgrades and game-changing abilities for your forms (e.g., charge slashes, faster energy regeneration, air dashes).

### ⚙️ 3. Steampunk-Mechanical Aesthetics
Every sprite is procedurally drawn using Phaser's Graphics API, dynamically scaling to create a high-fidelity retro look. The mecha features exposed gold clockwork gears, abdominal rib braces, steam exhaust vents emitting embers, and a massive 66px claymore with a pulsing ruby core.

---

## 🛠️ Architecture & Tech Stack

- **Game Engine**: Phaser 3.80+ (using custom Graphics texture generation, ADD blend modes for glows, and camera vignette overlays).
- **Language**: TypeScript 5 (Strict Mode) for clean, safe type management.
- **Bundler**: Vite 5 for fast Hot Module Replacement (HMR) during dev.
- **Parallax System**: 4-layer depth scrolling background (Sky ➔ Mountains ➔ Forest ➔ Ruins) simulating high depth.
- **Dynamic Physics Scaling**: Sprite scales change on state transition (Human `0.8x`, Mecha `1.4x`, Dragon `1.45x`), automatically adjusting the Arcade physics hitboxes and shadow projection Y-offsets.

---

## 🚀 Quick Start

To run the development server locally:

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite development server with HMR
npm run dev

# 3. Compile TypeScript & build the optimized production package
npm run build
```

---

## 🎮 Default Controls

- **Move / Steer**: `ARROWS` or `WASD`
- **Jump / Fly Up**: `UP` or `W`
- **Attack / Fire**: `X` (holds down for continuous firing in Dragon mode)
- **Transform**: `C` (requests transformation to the next form: *Human ➔ Mecha ➔ Dragon ➔ Revert*)

---

*DRAKHART is currently in its Level 1 prototype phase, showcasing a single continuous level running through the Warrior Tunnel, the Mecha Ruins, and the Dragon Gorge, culminating in an epic Boss battle against a Corrupted Guymelef.*
