# DRAKHART — The Dragon's Girdle

![Drakhart Marketing Splash Art](public/marketing/drakhart_splash.png)

> *"Humanity forged the hearts of dragons into biomechanical gods of war. The Dragon War burned the skies, leaving the continent in ash. Now, the Iron Empire seeks the final Cores to complete their army of Corrupted Guymelefs... and the last beating heart lives inside your chest."*

**DRAKHART** is a grimdark fantasy action-platformer that fuses **three distinct genres into a single, continuous, genre-bending adventure**. Blending the earned transformations of Atari’s *Draconus (1988)*, the biomechanical clockwork mecha designs of *Vision of Escaflowne (1996)*, and the tactical arcade scrolling of *R-Type*, DRAKHART casts you as **The Warden**—a silent knight bonded with a living mechanical dragon core, fighting to protect the Shattered Continent from the *Final Forging*.

---

## 🎮 The Three Forms of Destiny

Seamlessly shift between three radically different forms at the press of a key `[C]`. Every transformation triggers a cinematic transition: a burst of screen particles, operatic music swells, camera shakes, and shifts in camera zoom.

| 🟢 Human Form: The Warden | ⚪ Mecha Form: The Guymelef | 🔵 Dragon Form: The Sky Graver |
| :---: | :---: | :---: |
| ![Warden Profile](public/marketing/warrior_card.png) | ![Mecha Profile](public/marketing/mecha_card.png) | ![Dragon Profile](public/marketing/dragon_card.png) |
| **Precision Platformer** | **Heavy Mecha Combat** | **Horizontal Shmup** |
| Agile, swift, and classic. Explore tight caverns, dodge traps, and strike fast with your short sword. Human form is essential for accessing narrow passages. | A titanic, white-and-gold biomechanical knight mecha. Smash through heavy stone gates and obliterate guards with your massive Claymore. | A flying mecha-dragon. Take to the skies in horizontal forced-scrolling shmup sections, dogfight aerial drones, and breathe fire. |

---

## ⚡ The Core Gameplay (The Grace of Drakhart)

### 1. Genre-Bending Synergy
Transition from a tactical metroidvania into an intense arcade horizontal shooter in a single heartbeat. DRAKHART doesn't partition its genres; they coexist. Navigate tunnels as a human, break down ruins as a mecha, and fly over chasms as a dragon to escape collapsing canyons.

### 2. "Wrong-Form-Inconvenience" (The Soft-Gate Philosophy)
No artificial colored keycards or red locked doors. You can explore the continent in any form you choose. However, using the wrong form is **inconvenient and deadly**:
- **Low Ceilings**: The Mecha is too tall and gets physically stuck in low-clearance Warden tunnels.
- **Bottomless Chasms**: Human and Mecha forms will immediately fall to their doom; only the Dragon can soar across.
- **Lava Fields**: Lava drains a human's health in seconds, but Mecha's heavy insulated armor boots can walk right through.
- **Bullet Hell**: Dodging dense drone patterns on foot is a nightmare; transforming into the agile flying Dragon makes navigation a breeze.

### 🂡 3. Tarot RPG Progression (War Echoes)
Discover **10 Major Arcana Tarot Cards** hidden throughout the world. Each card contains a *War Echo*—the final memory of a dragon or Warden who fell during the war. Absorbing these cards unlocks permanent upgrades:
- **The Magician (I)**: Grants the Warden a **Double Jump**.
- **Strength (VIII)**: Increases Mecha Claymore damage by 50%.
- **The Tower (XVI)**: Grants the Dragon a **3-way fire spread shot**.
- **The World (XXI)**: Fully maps the Shattered Continent and unlocks warp checkpoints.

### 🌡️ 4. Tactical Heat Management
The Guymelef Mecha is a powerful engine of destruction, but it runs *hot*. Striking with your 66px Claymore or firing weapons increases your **Heat Level**. Fail to manage your vents and your mecha will trigger an **Emergency Shutdown**—leaving you frozen and vulnerable to the Iron Guard.

### 💾 5. Save & Memory Restoration
Interact with ancient dragon shrines to save your progress, restore your health, and back up your tarot deck to local storage, keeping your adventure preserved.

---

## 📖 Lore & Atmosphere: The Shattered Continent

The continent is a landscape of decaying beauty. Once, dragons ruled, their hearts beating as elemental furnaces. Humanity learned to harvest these cores, building the **Guymelefs**—biomechanical combinations of bone, steel, and dragon-fire. The Dragon War left the world in ruins, and now the **Iron Empire** scours the land to corrupt the remaining cores.

You wear the green scale armor of the **Wardens**—a dead order sworn to protect the cores. When you touched a beating core, it fused into your chest, whispering memories of skies you never saw and battles you never fought. You are silent, because there is no one left to speak to.

---

## 🛠️ Architecture & Tech Stack

- **Game Engine**: Phaser 3.80+ (using Arcade Physics and custom Canvas-rendered shaders).
- **Language**: TypeScript 5 (Strict Mode).
- **Bundler**: Vite 5 for instant development reloading.
- **Systems Core**:
  - **FormStateMachine**: Human ➔ Mecha ➔ Dragon. Handles gravity toggling, physics size shifts, and camera zoom.
  - **TarotSystem**: Manages the deck, card activation, and persistence.
  - **HeatSystem**: Manages mecha temperature, overheating triggers, and shutdowns.
  - **ShmupSystem**: Toggles forced horizontal scroll, auto-camera panning, and wave spawning.
- **Dynamic Physics Scaling**: Sprite assets dynamically scale (Warden `0.8x`, Mecha `1.4x`, Dragon `1.45x`), automatically scaling hitboxes and projecting shadows matching their size.

---

## 🚀 Quick Start

To launch the prototype on your machine:

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite development server with HMR
npm run dev

# 3. Compile TypeScript & build the production package
npm run build
```

---

## 🎮 Default Controls

- **Move / Steer**: `ARROWS` or `WASD`
- **Jump / Fly Up**: `UP` or `W`
- **Attack / Fire**: `X` (hold down for continuous fire in Dragon flight)
- **Transform**: `C` (requests transition: *Human ➔ Mecha ➔ Dragon ➔ Revert*)

---

*DRAKHART is currently in its Level 1 prototype phase, showcasing a single continuous level running through the Warrior Tunnel, the Mecha Ruins, and the Dragon Gorge, culminating in an epic Boss battle against a Corrupted Guymelef.*
