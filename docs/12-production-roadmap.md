# DRAKHART — Production Roadmap

> **UPDATED** — the campaign is now **24 zones** built via the data-driven
> `src/zones/` system (not the 16-zone / H/M/D/F layout below). **4 zones are
> complete** (the tutorial arc: Zones 1-4) + an AA calibration pass. The phase
> structure below is retained for reference; zone numbering and the build order
> should follow `docs/zone-design-guide.md`. Current next step: wire scenes to
> `ZoneBuilder`/`EnemyRegistry`, then build zones 5-24.

## Phase 0: Foundation ✅ COMPLETE

**Duration**: Completed
**Goal**: Playable prototype with core mechanics

- [x] Project scaffolding (Phaser 4, TypeScript, Vite)
- [x] Three-form system (Human, Mecha, Dragon)
- [x] Form state machine with transitions
- [x] Energy system
- [x] Combat system (sword, claymore, fire breath)
- [x] Base enemy AI
- [x] Boss (2 phases, UI)
- [x] Procedural texture generation
- [x] Parallax backgrounds
- [x] HUD (health, energy, transform indicator)
- [x] i18n system (EN, ES)
- [x] Platform physics (one-way platforms)
- [x] Barricade system
- [x] Game feel (jump buffer, coyote time, animations)
- [x] AGENTS.md and docs/

---

## Phase 1: Alpha — First 5 Zones + Core Loop

**Duration**: 5–7 weeks
**Goal**: 5 zones playable (H1, H2, M5, M6, D9). Full core loop: Human→Mecha→Dragon unlock sequence.

### World Building
- [ ] Build H1: Ashen Woods (0–4,500px) — finalize platforming tutorial, Dragon Core placement
- [ ] Build H2: Thornwood (4,500–9,000px) — vertical platforming, Thorn Colossus mid-boss
- [ ] Build M5: Iron Bastion (17,000–22,000px) — Mecha tutorial, barricades, Sky Core placement
- [ ] Build M6: The Foundry (22,000–27,000px) — lava hazards, heat management gauntlet
- [ ] Build D9: Storm Canyon (35,000–39,000px) — first shmup zone, R-Type tutorial
- [ ] Zone transition system (walk between zones, no loading screens)

### Shmup System
- [ ] Forced-scroll camera mode (lock at player.x + 400, 100 px/s auto-scroll)
- [ ] Shmup enemy wave spawner (formations, timing, pattern definitions)
- [ ] Auto-fire in Dragon form during shmup sections
- [ ] Floating rest platforms (land → energy regen, checkpoint)
- [ ] Shmup-specific UI (score? wave counter?)
- [ ] Environmental hazards (wind currents in D10, lightning in D11 — Phase 2)

### Mecha Heat System
- [ ] Heat bar (0–100) with 3 visual states (normal, warning, danger)
- [ ] Heat generation: claymore (+15), hover (+10/s), damage (+8)
- [ ] Heat dissipation: idle (-5/s), moving (-2/s), lava near (-1/s)
- [ ] Overheat shutdown (3s, vulnerable, rapid cooldown -15/s)
- [ ] HUD integration (heat bar below energy bar)

### Progression
- [ ] Dragon Core pickup in H1 (unlocks Mecha)
- [ ] Sky Core pickup in M5 (unlocks Dragon)
- [ ] Tarot cards: The Magician (H1), The Chariot (M5), The Star (D9)

### Art
- [ ] Mecha form sprite (placeholder or semi-final)
- [ ] Iron Guard and Sky Hunter enemy sprites
- [ ] Barricade broken states (cracked at 50%, shattered at 0%)
- [ ] Zone-specific parallax backgrounds (forest, bastion, storm)
- [ ] Tarot card pickup sprites

---

## Phase 2: Beta — All 16 Zones + All Bosses

**Duration**: 10–12 weeks
**Goal**: Complete world, all 16 zones, all bosses (5 major + 5 mid + 1 secret), all 10 tarot cards

### World Expansion
- [ ] Build H3: Sunken Catacombs (9,000–13,500px) — water mechanics
- [ ] Build H4: Ruined Citadel (13,500–18,000px) — final Human zone, Warden's End boss
- [ ] Build M7: Crystal Mines (27,000–32,000px) — hub zone, Crystal Warden mid-boss, mine cart system
- [ ] Build M8: War Arsenal (32,000–37,000px) — Iron Warmaster boss, conveyor hazards
- [ ] Build D10: Shattered Skyway (39,000–43,000px) — wind currents, Sky Kraken mid-boss
- [ ] Build D11: Thunder Spine (43,000–47,000px) — lightning hazards, Storm Wyrm mid-boss
- [ ] Build D12: Graveyard of Scales (47,000–51,000px) — Bone Dragon boss
- [ ] Build F14: The Ascent (51,000–56,500px) — form-switching gauntlet
- [ ] Build F15: The Core (56,500–62,000px) — final dungeon
- [ ] Build F16: Iron Throne (62,000–65,000px) — final boss arena
- [ ] Build S17: Echo Chamber (secret) — Forgemaster boss
- [ ] Full interconnection: shortcuts, backtracking paths, mine cart hub

### Zone-Specific Mechanics
- [ ] Crystal Mines: lava hazards, narrow tunnels vs wide chambers
- [ ] Crystal Mines: backtracking shortcuts connect to Iron Bastion and Storm Gorge
- [ ] Sky Temple: wind currents (push player), vertical ascension design
- [ ] Sky Temple: monastery interiors (lore rooms, NPC echoes)
- [ ] The Core: rapid form-switching required
- [ ] The Core: pipe maze (Human), forge floor (Mecha), ascension shaft (Dragon)

### Bosses
- [ ] Boss 2: Crystal Guardian (Crystal Mines) — form-switching fight
- [ ] Boss 3: Sky Empress (Sky Temple) — 3-phase cinematic boss
- [ ] Final Boss: The Iron Heart (The Core) — 3-phase (one per form)
- [ ] Secret Boss: The Forgemaster (hidden, post-game)

### Tarot Cards (all 10)
- [ ] The Magician — Human double jump (Ashen Forest secret)
- [ ] The Chariot — Mecha speed +30% (Iron Bastion secret)
- [ ] Strength — Mecha damage +50% (Boss 1 drop) ✅
- [ ] Justice — Human sword range +20% (Crystal Mines secret)
- [ ] Death — All forms crit +15% (Crystal Mines secret)
- [ ] The Star — Dragon energy regen +50% (Storm Gorge secret)
- [ ] The Moon — Dragon flight +40% (Sky Temple secret)
- [ ] The Tower — Dragon 3-way fire (Boss 2 drop)
- [ ] The Emperor — Mecha armor -30% damage (Boss 3 drop)
- [ ] The World — Full map reveal (The Core secret)

### Progression System
- [ ] Tarot card pickup entities
- [ ] Card effect application (modify player stats)
- [ ] Card collection HUD display

---

## Phase 3: Polish & Content Complete

**Duration**: 4–6 weeks
**Goal**: All systems polished, game feel finalized, content complete

### Audio
- [ ] Audio manager
- [ ] Dynamic music layers (ambient, combat, boss, zone-specific)
- [ ] SFX for all actions (walk, jump, attack, damage, transform, collect)
- [ ] Transformation stingers
- [ ] Boss music tracks

### Visual Polish
- [ ] Final sprite sheets (replace all procedural textures with artist-created art)
- [ ] Sprite animation frames (8+ frames per animation)
- [ ] Dynamic lighting (Phaser lights or normal maps on tiles)
- [ ] Post-processing pipeline (bloom on fire/energy, subtle blur on background)
- [ ] Screen transitions (fade to black between major zones)
- [ ] NPC interactions (Echo fragments, lore delivery)

### Game Feel Final Pass
- [ ] Controller rumble support (gamepad)
- [ ] Hit stop (brief freeze frame on heavy impacts)
- [ ] Screen shake tuning per action
- [ ] Death animation + respawn flow
- [ ] Checkpoint visual (Altar of Rest activation)

### Content
- [ ] All enemy types implemented across zones
- [ ] All tarot card secret areas built
- [ ] NPC dialogue (Echo fragments — short lore snippets)
- [ ] Lore collectibles (scattered texts, environmental storytelling)

### Menus & UI
- [ ] Main menu (New Game, Continue, Settings, Credits)
- [ ] Pause menu
- [ ] Settings screen (audio, controls, accessibility)
- [ ] Map screen (revealed via The World card)
- [ ] Tarot collection screen
- [ ] Game over / respawn screen

---

## Phase 4: Testing & Balance

**Duration**: 2–3 weeks
**Goal**: Balanced, bug-free experience

### Balance Pass
- [ ] Enemy HP/damage tuning per zone
- [ ] Boss difficulty curve
- [ ] Tarot card power balance (no card trivializes the game)
- [ ] Energy drain rates balance (Dragon flight feels good but limited)
- [ ] Mecha heat balance (punishing enough to matter, forgiving enough to be fun)
- [ ] Zone pacing (no zone feels too long or too short)

### Bug Fixing
- [ ] Full playthrough testing (all zones, all forms)
- [ ] Edge case testing (rapid form switching, sequence breaking)
- [ ] Physics edge cases (getting stuck in geometry)
- [ ] Enemy AI edge cases (pathfinding, detection)
- [ ] Save/load integrity

### Performance
- [ ] Object pooling audit
- [ ] Memory leak check (long play sessions)
- [ ] Particle budget per zone
- [ ] Frame rate stability (target 60fps)

### Accessibility
- [ ] High contrast mode
- [ ] Disable screen shake option
- [ ] Disable camera zoom option
- [ ] Control remapping
- [ ] Auto-fire toggle

---

## Phase 5: Release

**Duration**: 2–3 weeks
**Goal**: Published and playable by the public

### Distribution
- [ ] Production build optimization
- [ ] itch.io page setup (game page, description, screenshots, trailer)
- [ ] Steam page setup (if pursuing Steam release via Electron wrapper)
- [ ] PWA manifest (installable web app)

### Launch Content
- [ ] Game trailer (1–2 minutes)
- [ ] Screenshot pack (10+ high quality screenshots)
- [ ] Press kit (description, features, screenshots, logo)
- [ ] Social media presence (Twitter/X, Discord, Reddit)

### Post-Launch
- [ ] Bug fix patches (first week)
- [ ] Community feedback integration
- [ ] Speedrun mode (timer, leaderboard integration)
- [ ] Boss rush mode
- [ ] New Game+ (carry over tarot cards, harder enemies)

---

## Timeline Summary

| Phase | Name | Duration | Zones Built | Key Deliverable |
|-------|------|----------|-------------|----------------|
| 0 | Foundation | ✅ Done | 1 prototype | Prototype with core mechanics |
| **1** | **Alpha** | 5–7 weeks | 5 zones | H1, H2, M5, M6, D9. Full unlock loop. Shmup + Heat systems. |
| **2** | **Beta** | 10–12 weeks | 16 zones (all) | Complete world. All 10 bosses. All 10 tarot cards. |
| **3** | Polish | 4–6 weeks | — | Audio, final art, VFX, menus, game feel |
| **4** | Testing | 3–4 weeks | — | Balance, bugs, performance, accessibility |
| **5** | Release | 2–3 weeks | — | Distribution, marketing, launch |

**Total estimated time**: 24–32 weeks (~6–8 months) from Phase 1 start.

**Current position**: Phase 0 complete. Ready to begin Phase 1.
