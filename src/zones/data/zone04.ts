import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 4 — "The Foundry Gates" (foundry)
 *
 * Mixer exam: three form-specific sections test mastery of all forms, capped by
 * the Gatekeeper boss. Player starts in DRAGON form.
 *   Section A (0-5000)    — Sky Gate: dragon flight over a molten gorge.
 *   Section B (5000-9000) — Smelting Refinery: mecha combat + barricade walls.
 *   Section C (9000-12000)— Warrior Tunnels: narrow low-clearance corridors
 *                            (Mecha cannot fit) — human platforming + thorns.
 *   Arena (12000-15000)   — Gatekeeper boss (750hp, armor/flight/duel phases).
 *
 * Pacing target: 6-8 min. Difficulty tier 1.
 *
 * KNOWN ISSUE: EchoFragment indices in the current code reuse 0,1 (should be
 * 3,4 to continue the campaign counter). Flagged for the progression pass.
 */
export const zone04: ZoneConfig = {
  id: 4,
  key: 'GameScene4',
  displayNameI18n: 'zones.foundryGates',
  biome: 'foundry',
  worldWidth: 15000,
  worldHeight: 1400,
  groundY: 768,
  difficultyTier: 1,
  primaryForm: FormState.DRAGON,
  allowedForms: [FormState.HUMAN, FormState.MECHA, FormState.DRAGON],
  sections: [
    {
      name: 'Sky Gate',
      xStart: 0,
      xEnd: 5000,
      enemies: [
        { type: 'flying', x: 500, y: 350 }, { type: 'flying', x: 900, y: 400 },
        { type: 'flying', x: 1400, y: 300 }, { type: 'flying', x: 2000, y: 350 },
        { type: 'flying', x: 2400, y: 400 }, { type: 'flying', x: 3000, y: 300 },
        { type: 'flying', x: 3500, y: 400 }, { type: 'flying', x: 4100, y: 350 },
        { type: 'flying', x: 4500, y: 400 },
        { type: 'leaper', x: 2800, y: 738, config: { health: 60, damage: 15, speed: 80, patrolMinX: 2750, patrolMaxX: 2900 } },
      ],
      notes: 'DESIGN TODO: replace the 9 trivial FlyingEnemies with a mixed shmup wave (gunship + mine-dropper) once shmup enemies are extracted from GameScene3. Currently too easy for an arriving DRAGON.',
    },
    {
      name: 'Smelting Refinery',
      xStart: 5000,
      xEnd: 9000,
      enemies: [
        { type: 'mecha', x: 5400, y: 768, config: { health: 380, speed: 65, patrolMinX: 5100, patrolMaxX: 5700 } },
        { type: 'mecha', x: 6200, y: 768, config: { health: 400, speed: 70, patrolMinX: 5900, patrolMaxX: 6500 } },
        { type: 'shield', x: 6800, y: 768, config: { health: 70, damage: 16, speed: 50, patrolMinX: 6700, patrolMaxX: 6900 } },
        { type: 'mecha', x: 7300, y: 768, config: { health: 420, speed: 70, patrolMinX: 7100, patrolMaxX: 7500 } },
        { type: 'spitter', x: 7800, y: 650, config: { health: 50, damage: 14, patrolMinX: 7700, patrolMaxX: 7900 } },
        { type: 'shield', x: 8200, y: 768, config: { health: 75, damage: 18, speed: 55, patrolMinX: 8100, patrolMaxX: 8300 } },
        { type: 'mecha', x: 8600, y: 768, config: { health: 420, speed: 70, patrolMinX: 8500, patrolMaxX: 8800 } },
      ],
    },
    {
      name: 'Warrior Tunnels',
      xStart: 9000,
      xEnd: 12000,
      enemies: [
        { type: 'spitter', x: 9300, y: 676, config: { health: 40, damage: 12, patrolMinX: 9100, patrolMaxX: 9400 } },
        { type: 'leaper', x: 10000, y: 490, config: { health: 50, damage: 15, speed: 70, patrolMinX: 9800, patrolMaxX: 10300 } },
        { type: 'spitter', x: 10800, y: 676, config: { health: 40, damage: 12, patrolMinX: 10600, patrolMaxX: 11000 } },
        { type: 'flying', x: 11500, y: 350 },
      ],
      notes: 'Low-clearance corridors — Mecha cannot enter (ceiling y=706). Forces HUMAN form.',
    },
    {
      name: 'Gatekeeper Arena',
      xStart: 12000,
      xEnd: 15000,
      enemies: [],
      notes: 'Boss triggers at x>=12000. Gatekeeper 750hp, scale 2.5, armor/flight/duel phases.',
    },
  ],
  ground: [
    { x: 0, y: 768, width: 600, biome: 'refinery', id: 1 },
    { x: 1000, y: 768, width: 500, biome: 'refinery', id: 2 },
    { x: 1900, y: 768, width: 400, biome: 'refinery', id: 3 },
    { x: 2700, y: 768, width: 600, biome: 'refinery', id: 4 },
    { x: 3700, y: 768, width: 500, biome: 'refinery', id: 5 },
    { x: 4600, y: 768, width: 400, biome: 'refinery', id: 6 },
    { x: 4600, y: 768, width: 4400, biome: 'refinery', id: 8 },
    { x: 9000, y: 768, width: 3000, biome: 'refinery', id: 9 },
    { x: 12000, y: 768, width: 3000, biome: 'gorge', id: 10 },
  ],
  platforms: [
    { x: 12400, y: 520, width: 80 }, { x: 12800, y: 520, width: 80 },
    { x: 13200, y: 520, width: 80 }, { x: 13600, y: 520, width: 80 },
    { x: 14000, y: 520, width: 80 },
  ],
  hazards: [
    { kind: 'lava-pit', x: 0, y: 1300, width: 15000, id: 'lava-floor', extra: { height: 'lavaHeight strip at world bottom' } },
    { kind: 'thorn-patch', x: 9750, y: 520, width: 160, id: 'tunnel-thorns' },
  ],
  barricades: [
    { x: 5200, y: 768 }, { x: 7000, y: 768 }, { x: 8800, y: 768 },
  ],
  pickups: [
    { kind: 'echo-fragment', x: 6000, y: 630, echoIndex: 0 },
    { kind: 'echo-fragment', x: 12000, y: 600, echoIndex: 1 },
  ],
  tarot: [
    { card: 'star', x: 2600, y: 380 },
  ],
  boss: { type: 'gatekeeper', x: 13000, y: 500, nameKey: 'boss.gatekeeperName' },
  transitions: {
    forward: 'TransitionScene45',
    back: 'TransitionScene34',
    backTriggerX: 40,
    startPosForward: { x: 960, y: 650 },
    startPosBack: { x: 960, y: 650 },
  },
  ambient: { musicTrack: 4, biome: 'foundry', emberRain: true, weather: 'ember' },
  notes: 'World bounds act as the forward wall (player cannot pass x=15000 without boss death triggering the transition). Tall barricade walls (scale 1.2×3.8) at 5200/7000/8800 gate the refinery.',
};
