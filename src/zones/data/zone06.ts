import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 6 — "The Reforging" (amazon + ancient ruins)
 *
 * Tutorial-arc capstone (tier 1, last of zones 1-6). The Resistance elders lead
 * the Warden into the deep ruins where the old Wardens forged their bone-and-steel
 * pact with the Dragon Cores. A mixer trial of all three forms tests mastery,
 * capped by the Ancient Corrupted Warden mini-boss (a failed guardian bound to a
 * dead core). Victory attunes the Core and opens Arc 2 (zones 7-12, tier 2).
 *
 * Pacing target: 6-8 min. Difficulty tier 1. Arrives on foot as HUMAN from the
 * TransitionScene56 camp (Z5's Resistance camp).
 *
 *   Section A (0–3500)    — Pilgrim Tunnels: HUMAN-only low-clearance canopy +
 *                            ancient ruins; platforming + spitters/leapers.
 *   Section B (3500–7000) — Forging Hall: MECHA-forced by barricades blocking
 *                            the path; heavy mecha enemies + a shield line.
 *   Section C (7000–10500)— Sky Trial: short DRAGON flight over a chasm to the
 *                            arena, with flying sentinels.
 *   Arena (10500–14000)   — Ancient Corrupted Warden (EliteMecha recolored to a
 *                            bone/gold verdigris, scale 2.0). On death →
 *                            reforging cinematic + Emperor tarot drop.
 *
 * Biome: amazon ground segments with ruins-column props layered by the scene
 * (reuses existing 'fg-column'/'fg-vine' + bone overlays). No new biome added.
 *
 * Reuses: EnemyRegistry.spawn, Barricade (Mecha claymore target 150hp), all
 * three forms (HUMAN tunnels, MECHA barricades, DRAGON flight), EliteMecha
 * recolored as mini-boss, EnergyPickup, EchoFragment (index 5), TarotCard
 * ('emperor' — new Arc 2 tarot, mecha armor -50% damage).
 */
export const zone06: ZoneConfig = {
  id: 6,
  key: 'GameScene6',
  displayNameI18n: 'zones.theReforging',
  biome: 'amazon',
  worldWidth: 14000,
  worldHeight: 800,
  groundY: 768,
  difficultyTier: 1,
  primaryForm: FormState.HUMAN,
  allowedForms: [FormState.HUMAN, FormState.MECHA, FormState.DRAGON],
  sections: [
    {
      name: 'Pilgrim Tunnels',
      xStart: 0,
      xEnd: 3500,
      enemies: [
        { type: 'spitter', x: 600, y: 600, config: { health: 45, damage: 12, patrolMinX: 540, patrolMaxX: 660 } },
        { type: 'leaper', x: 1100, y: 608, config: { health: 50, damage: 14, speed: 80, patrolMinX: 980, patrolMaxX: 1220 } },
        { type: 'sentry', x: 1600, y: 608, config: { health: 45, damage: 12, speed: 65, patrolMinX: 1500, patrolMaxX: 1700 } },
        { type: 'spitter', x: 2100, y: 520, config: { health: 50, damage: 14, patrolMinX: 2050, patrolMaxX: 2200 } },
        { type: 'leaper', x: 2600, y: 608, config: { health: 55, damage: 16, speed: 85, patrolMinX: 2480, patrolMaxX: 2720 } },
        { type: 'sentry', x: 3100, y: 608, config: { health: 50, damage: 14, speed: 70, patrolMinX: 3000, patrolMaxX: 3200 } },
      ],
      notes: 'Low-clearance canopy (ceiling y=636) forces HUMAN. Ruins-column props over amazon ground.',
    },
    {
      name: 'Forging Hall',
      xStart: 3500,
      xEnd: 7000,
      enemies: [
        { type: 'mecha', x: 4100, y: 768, config: { health: 380, speed: 65, damage: 32, patrolMinX: 4000, patrolMaxX: 4300 } },
        { type: 'shield', x: 4800, y: 768, config: { health: 80, damage: 18, speed: 50, patrolMinX: 4700, patrolMaxX: 4900 } },
        { type: 'mecha', x: 5400, y: 768, config: { health: 400, speed: 70, damage: 32, patrolMinX: 5300, patrolMaxX: 5600 } },
        { type: 'shield', x: 6100, y: 768, config: { health: 85, damage: 20, speed: 55, patrolMinX: 6000, patrolMaxX: 6250 } },
        { type: 'mecha', x: 6600, y: 768, config: { health: 420, speed: 70, damage: 34, patrolMinX: 6500, patrolMaxX: 6800 } },
      ],
      notes: 'Barricades at 4000/5300/6300 gate the hall — only Mecha claymore (75 dmg) cracks them (150hp). Shields only break to Mecha. Forces MECHA.',
    },
    {
      name: 'Sky Trial',
      xStart: 7000,
      xEnd: 10500,
      enemies: [
        { type: 'flying', x: 7400, y: 320 }, { type: 'flying', x: 7800, y: 360 }, { type: 'flying', x: 8200, y: 300 },
        { type: 'flying', x: 8600, y: 340 }, { type: 'flying', x: 9100, y: 320 }, { type: 'flying', x: 9600, y: 360 },
      ],
      notes: 'Lava-floor chasm (no ground) forces DRAGON flight to cross; energy pickups keep the dragon airborne. Short aerial combat trial.',
    },
    {
      name: 'Warden Arena',
      xStart: 10500,
      xEnd: 14000,
      enemies: [],
      notes: 'Mini-boss triggers at x>=10500. Ancient Corrupted Warden = EliteMecha recolored (verdigris bone/gold tint), scale 2.0, 650hp. Emperor tarot spawns on death; reforging cinematic then forward to Zone 7.',
    },
  ],
  ground: [
    // Pilgrim Tunnels — amazon walkable ground.
    { x: 0, y: 768, width: 3500, biome: 'amazon', id: 61 },
    // Forging Hall — amazon floor with barricades on top.
    { x: 3500, y: 768, width: 3500, biome: 'amazon', id: 62 },
    // Sky Trial — no ground (lava floor chasm); thin ledges for the player to fly over.
    // Warden Arena — amazon stone plaza.
    { x: 10500, y: 768, width: 3500, biome: 'amazon', id: 64 },
  ],
  platforms: [
    // Pilgrim Tunnels canopy ledges.
    { x: 350, y: 520, width: 128 }, { x: 800, y: 440, width: 160 },
    { x: 1300, y: 520, width: 128 }, { x: 1850, y: 460, width: 160 },
    { x: 2400, y: 520, width: 128 }, { x: 2850, y: 440, width: 160 },
    { x: 3200, y: 520, width: 128 },
    // Forging Hall elevated forge platforms (combat staging).
    { x: 4250, y: 580, width: 128 }, { x: 5750, y: 580, width: 128 }, { x: 6850, y: 580, width: 128 },
    // Warden Arena pillars (cover during the fight).
    { x: 11200, y: 520, width: 96 }, { x: 11800, y: 460, width: 96 },
    { x: 12600, y: 520, width: 96 }, { x: 13200, y: 460, width: 96 },
  ],
  hazards: [
    // Sky Trial lava-floor chasm (instakill below; forces DRAGON to cross).
    { kind: 'lava-pit', x: 7000, y: 768, width: 3500, id: 'sky-trial-chasm', extra: { height: 'strip at world bottom under flight corridor' } },
    // Pilgrim Tunnels jungle thorns.
    { kind: 'thorn-patch', x: 1500, y: 768, width: 96, id: 'tunnel-thorns-1' },
    { kind: 'thorn-patch', x: 2750, y: 768, width: 96, id: 'tunnel-thorns-2' },
  ],
  barricades: [
    { x: 4000, y: 768 }, { x: 5300, y: 768 }, { x: 6300, y: 768 },
  ],
  pickups: [
    // Sky Trial energy band keeps the dragon airborne across the chasm.
    { kind: 'energy', x: 7200, y: 340, extra: { band: 'every 500-700px to 10400, Y 260-440' } },
    // EchoFragment — index 5 (zone 6 → campaign counter continues).
    { kind: 'echo-fragment', x: 12200, y: 400, echoIndex: 5 },
  ],
  tarot: [
    // Emperor — Mecha armor (-50% damage). New Arc 2 tarot; first drop. Placed
    // at the arena exit, awarded after the Warden dies (scene spawns it on death).
    { card: 'emperor', x: 13600, y: 690 },
  ],
  transitions: {
    forward: 'TransitionScene67',
    back: 'TransitionScene56',
    forwardTriggerX: 13900,
    startPosForward: { x: 150, y: 650 },
    startPosBack: { x: 13500, y: 650 },
  },
  ambient: { musicTrack: 7, biome: 'amazon', emberRain: false, weather: 'none' },
  notes: 'Mixer capstone: HUMAN tunnels (A) → MECHA barricade hall (B) → DRAGON chasm flight (C) → Corrupted Warden mini-boss arena. Mini-boss = EliteMecha recolored (setTint verdigris, scale 2.0), spawned via EnemyRegistry then post-mutated. Emperor tarot spawns at arena exit after boss death. No new biome (amazon reused + ruins props). Closes tutorial arc 1-6; Zone 7 starts Arc 2 tier 2.',
};