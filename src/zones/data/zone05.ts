import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 5 — "The Hunt" (foundry → amazon)
 *
 * The Empire, alerted by the Dragon Core's awakening, mounts a frenetic pursuit.
 * The player arrives in DRAGON form from the industrial peaks (continuity with
 * Zone 4) and escapes through a free-flight pursuit corridor (2/3), then crashes
 * into the emerald jungle — home of the old Resistance clans — and escapes on
 * foot as a WARRIOR (1/3) until welcomed at the Resistance camp.
 *
 * Pacing target: 6-8 min. Difficulty tier 1 (zones 1-6 are the tutorial arc).
 *
 *   Section A (0–2500)     — Besieged Peaks: dragon free-flight warmup; flying
 *                            sentinels + ground AA mecha firing up.
 *   Section B (2500–10000) — Pursuit Corridor: dense waves of flying pursuers,
 *                            mecha AA emplacements, spitter turrets. Lava floor
 *                            instakill below (no ground to land on). Energy
 *                            pickups band every 400-800px.
 *   Section C (10000–11200)— The Pursuer: EliteMecha interceptor (registered
 *                            mini-boss, 650hp) on an elevated platform + flying
 *                            escorts. On death → forced landing cinematic:
 *                            revert to HUMAN + 30 dmg, teleport to jungle.
 *   Section D (11200–16000)— The Emerald Jungle: HUMAN-only platforming under
 *                            a low canopy (Mecha cannot fit). Amazon biome +
 *                            bioluminescent cyan flora. Spitters, leapers, and
 *                            imperial sentry trackers. Ends at the Resistance
 *                            camp → forward to Zone 6.
 *
 * No authored boss — the climax is the Pursuer mini-boss + the survival escape.
 * Reuses: dragon free-flight (Zone 4-style), lava floor hazard (Zone 4),
 * EnemyRegistry.spawn for all enemies, Forest thorn hazards, amazon biome.
 */
export const zone05: ZoneConfig = {
  id: 5,
  key: 'GameScene5',
  displayNameI18n: 'zones.theHunt',
  biome: 'foundry',
  worldWidth: 16000,
  worldHeight: 800,
  groundY: 704,
  difficultyTier: 1,
  primaryForm: FormState.DRAGON,
  allowedForms: [FormState.HUMAN, FormState.DRAGON],
  forcedForm: FormState.DRAGON,
  sections: [
    {
      name: 'Besieged Peaks',
      xStart: 0,
      xEnd: 2500,
      enemies: [
        { type: 'flying', x: 600, y: 320 },
        { type: 'flying', x: 1050, y: 380 },
        { type: 'flying', x: 1500, y: 280 },
        { type: 'flying', x: 1950, y: 360 },
        { type: 'mecha', x: 1200, y: 704, config: { health: 350, speed: 60, damage: 30, patrolMinX: 1100, patrolMaxX: 1300 } },
        { type: 'spitter', x: 1700, y: 580, config: { health: 45, damage: 14, patrolMinX: 1650, patrolMaxX: 1800 } },
        { type: 'mecha', x: 2200, y: 704, config: { health: 380, speed: 65, damage: 30, patrolMinX: 2100, patrolMaxX: 2350 } },
      ],
      notes: 'Dragon free-flight. Lava floor below (no ground in A/B). Warmup density.',
    },
    {
      name: 'Pursuit Corridor',
      xStart: 2500,
      xEnd: 10000,
      enemies: [
        { type: 'flying', x: 2900, y: 300 }, { type: 'flying', x: 3150, y: 260 }, { type: 'flying', x: 3400, y: 340 },
        { type: 'spitter', x: 3800, y: 600, config: { health: 50, damage: 16, patrolMinX: 3750, patrolMaxX: 3900 } },
        { type: 'flying', x: 4200, y: 280 }, { type: 'flying', x: 4450, y: 340 }, { type: 'flying', x: 4700, y: 300 },
        { type: 'mecha', x: 5100, y: 704, config: { health: 380, speed: 65, damage: 30, patrolMinX: 5000, patrolMaxX: 5250 } },
        { type: 'flying', x: 5500, y: 320 }, { type: 'flying', x: 5750, y: 260 }, { type: 'flying', x: 6000, y: 360 },
        { type: 'spitter', x: 6300, y: 590, config: { health: 50, damage: 16, patrolMinX: 6250, patrolMaxX: 6400 } },
        { type: 'flying', x: 6700, y: 300 }, { type: 'flying', x: 6950, y: 340 }, { type: 'flying', x: 7200, y: 280 },
        { type: 'mecha', x: 7600, y: 704, config: { health: 400, speed: 70, damage: 32, patrolMinX: 7500, patrolMaxX: 7750 } },
        { type: 'flying', x: 8000, y: 320 }, { type: 'flying', x: 8250, y: 260 }, { type: 'flying', x: 8500, y: 360 },
        { type: 'spitter', x: 8800, y: 600, config: { health: 50, damage: 16, patrolMinX: 8750, patrolMaxX: 8900 } },
        { type: 'flying', x: 9100, y: 300 }, { type: 'flying', x: 9350, y: 340 }, { type: 'flying', x: 9600, y: 280 },
      ],
      notes: 'Dense pursuit pressure. Lava floor instakill. Energy pickups band 400-800px keeps dragon airborne.',
    },
    {
      name: 'The Pursuer',
      xStart: 10000,
      xEnd: 11200,
      enemies: [
        { type: 'elite-mecha', x: 10400, y: 704 },
        { type: 'flying', x: 10100, y: 300 }, { type: 'flying', x: 10700, y: 360 },
      ],
      notes: 'Mini-boss interceptor. On EliteMecha death → forced landing cinematic (revert to HUMAN + 30 dmg), teleport player to x=11400, switch biome postFX to amazon.',
    },
    {
      name: 'The Emerald Jungle',
      xStart: 11200,
      xEnd: 16000,
      enemies: [
        { type: 'spitter', x: 11600, y: 600, config: { health: 45, damage: 12, patrolMinX: 11550, patrolMaxX: 11700 } },
        { type: 'leaper', x: 12100, y: 608, config: { health: 50, damage: 14, speed: 80, patrolMinX: 11980, patrolMaxX: 12220 } },
        { type: 'sentry', x: 12600, y: 608, config: { health: 45, damage: 12, speed: 65, patrolMinX: 12500, patrolMaxX: 12700 } },
        { type: 'spitter', x: 13100, y: 520, config: { health: 50, damage: 14, patrolMinX: 13050, patrolMaxX: 13200 } },
        { type: 'leaper', x: 13600, y: 608, config: { health: 55, damage: 16, speed: 85, patrolMinX: 13480, patrolMaxX: 13720 } },
        { type: 'sentry', x: 14100, y: 608, config: { health: 50, damage: 14, speed: 70, patrolMinX: 14000, patrolMaxX: 14200 } },
        { type: 'leaper', x: 14600, y: 520, config: { health: 55, damage: 16, speed: 85, patrolMinX: 14480, patrolMaxX: 14720 } },
        { type: 'spitter', x: 15000, y: 600, config: { health: 50, damage: 14, patrolMinX: 14950, patrolMaxX: 15100 } },
      ],
      notes: 'Low-clearance canopy (ceiling y=636) forces HUMAN. Amazon biome. Ends at Resistance camp (transition forward at x=15900).',
    },
  ],
  ground: [
    // Dragon sections A/B/C — no walkable ground (lava floor below); thin ledges for AA emplacements only.
    { x: 1100, y: 704, width: 300, biome: 'refinery', id: 51 },
    { x: 2100, y: 704, width: 300, biome: 'refinery', id: 52 },
    { x: 5000, y: 704, width: 300, biome: 'refinery', id: 53 },
    { x: 7500, y: 704, width: 300, biome: 'refinery', id: 54 },
    // Pursuer arena — elevated platform the interceptor stands on.
    { x: 10100, y: 704, width: 700, biome: 'foundry', id: 55 },
    // Emerald Jungle — walkable amazon ground for the human escape.
    { x: 11200, y: 768, width: 2200, biome: 'amazon', id: 56 },
    { x: 13600, y: 768, width: 2400, biome: 'amazon', id: 57 },
  ],
  platforms: [
    // Canopy ledges (amazon) — high canopy branches for platforming.
    { x: 11450, y: 520, width: 128 }, { x: 11850, y: 440, width: 160 },
    { x: 12300, y: 520, width: 128 }, { x: 12750, y: 460, width: 160 },
    { x: 13250, y: 520, width: 128 }, { x: 13700, y: 440, width: 160 },
    { x: 14150, y: 520, width: 128 }, { x: 14600, y: 460, width: 160 },
    { x: 15050, y: 520, width: 128 }, { x: 15500, y: 440, width: 160 },
  ],
  movingPlatforms: [
    // Liana-style horizontal movers through the canopy.
    { x: 12100, y: 420, minX: 11980, maxX: 12320, speed: 28 },
    { x: 13000, y: 400, minX: 12850, maxX: 13200, speed: -32 },
    { x: 14300, y: 420, minX: 14180, maxX: 14520, speed: 26 },
    { x: 15200, y: 400, minX: 15050, maxX: 15420, speed: -30 },
  ],
  hazards: [
    // Lava floor under the dragon pursuit sections (instakill on overlap).
    { kind: 'lava-pit', x: 0, y: 768, width: 10000, id: 'hunt-lava-floor', extra: { height: 'strip at world bottom under flight corridor' } },
    // Jungle thorns (reuse forest hazard sets).
    { kind: 'thorn-patch', x: 12850, y: 768, width: 96, id: 'jungle-thorns-1' },
    { kind: 'thorn-patch', x: 13850, y: 768, width: 96, id: 'jungle-thorns-2' },
    { kind: 'thorn-gap', x: 14850, y: 784, width: 140, id: 'jungle-thorn-gap' },
  ],
  pickups: [
    // Energy band for the dragon flight (A/B/C) — keeps the dragon airborne.
    { kind: 'energy', x: 700, y: 360, extra: { band: 'every 400-800px to 10500, Y 240-460' } },
    // EchoFragment — index 4 (zone 5 → index 4; fixes the campaign counter).
    { kind: 'echo-fragment', x: 13400, y: 380, echoIndex: 4 },
  ],
  tarot: [
    // High Priestess — ground HP regen (new effect). Placed in the jungle where
    // a grounded Warrior heals naturally among the moss.
    { card: 'high-priestess', x: 15800, y: 690 },
  ],
  barricades: [],
  transitions: {
    forward: 'TransitionScene56',
    back: 'TransitionScene45',
    forwardTriggerX: 15900,
    startPosForward: { x: 150, y: 650 },
    startPosBack: { x: 15500, y: 650 },
  },
  ambient: { musicTrack: 6, biome: 'foundry', emberRain: false, weather: 'none' },
  notes: 'Dragon 2/3 free-flight pursuit (lava floor, no auto-scroll) → EliteMecha pursuer mini-boss → forced landing cinematic (revert→HUMAN + 30dmg, teleport to x=11400) → Human 1/3 amazon canopy escape to Resistance camp. No authored boss. Spawns via EnemyRegistry.spawn (no inline constructors). Scene switches biome postFX to amazon when player crosses x≈11200.',
};