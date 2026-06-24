import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 1 — "Ashen Woods" (forest)
 *
 * Tutorial arc: HUMAN platforming → earn MECHA at the Dragon Core altar.
 * Pacing target: 6-8 min. Five authored sections + a retrofitted shmup band
 * (x 2900-4500) that activates only in DRAGON form (unavailable on first pass).
 *
 * Form gating: HUMAN primary; MECHA unlocked at the Dragon Core pickup (x 7478).
 * Dragon is NOT unlockable in this zone.
 *
 * Difficulty tier 1. Mini-boss (Leaper 150hp) guards the altar approach.
 */
export const zone01: ZoneConfig = {
  id: 1,
  key: 'GameScene',
  displayNameI18n: 'zones.ashenWoods',
  biome: 'forest',
  worldWidth: 10000,
  worldHeight: 800,
  groundY: 768,
  difficultyTier: 1,
  primaryForm: FormState.HUMAN,
  allowedForms: [FormState.HUMAN, FormState.MECHA],
  sections: [
    {
      name: 'The Wakening',
      xStart: 0,
      xEnd: 1900,
      enemies: [
        { type: 'sentry', x: 600, y: 738, config: { speed: 60, patrolMinX: 450, patrolMaxX: 900 } },
        { type: 'leaper', x: 600, y: 510, config: { speed: 70, patrolMinX: 560, patrolMaxX: 660 } },
        { type: 'spitter', x: 840, y: 590, config: { speed: 50, patrolMinX: 760, patrolMaxX: 920 } },
        { type: 'shield', x: 1130, y: 490, config: { speed: 45, patrolMinX: 1060, patrolMaxX: 1180 } },
        { type: 'leaper', x: 1420, y: 610, config: { speed: 75, patrolMinX: 1360, patrolMaxX: 1480 } },
        { type: 'spitter', x: 1740, y: 490, config: { speed: 50, patrolMinX: 1660, patrolMaxX: 1820 } },
      ],
    },
    {
      name: 'Petrified Ascent',
      xStart: 1900,
      xEnd: 4600,
      enemies: [
        { type: 'shield', x: 2150, y: 738, config: { speed: 45, patrolMinX: 2020, patrolMaxX: 2280 } },
        { type: 'leaper', x: 2950, y: 738, config: { health: 50, damage: 12, speed: 95, patrolMinX: 2820, patrolMaxX: 3080 } },
        { type: 'shield', x: 3850, y: 738, config: { health: 60, damage: 15, speed: 45, patrolMinX: 3720, patrolMaxX: 3980 } },
      ],
    },
    {
      name: 'Sunken Ruins',
      xStart: 4600,
      xEnd: 6800,
      enemies: [
        { type: 'spitter', x: 4680, y: 608, config: { health: 55, damage: 15, speed: 50 } },
        { type: 'shield', x: 4950, y: 488, config: { health: 60, damage: 15, speed: 45 } },
        { type: 'leaper', x: 5230, y: 368, config: { health: 70, damage: 18, speed: 95 } },
        { type: 'sentry', x: 5510, y: 518, config: { health: 60, damage: 15, speed: 80 } },
        { type: 'spitter', x: 5830, y: 568, config: { health: 60, damage: 15, speed: 55 } },
        { type: 'shield', x: 6140, y: 448, config: { health: 70, damage: 18, speed: 50 } },
        { type: 'leaper', x: 6430, y: 548, config: { health: 60, damage: 15, speed: 80 } },
        { type: 'sentry', x: 4700, y: 738, config: { health: 50, damage: 12, speed: 65, patrolMinX: 4550, patrolMaxX: 4850 } },
        { type: 'leaper', x: 5100, y: 738, config: { health: 55, damage: 14, speed: 85, patrolMinX: 4950, patrolMaxX: 5250 } },
        { type: 'spitter', x: 5600, y: 738, config: { health: 50, damage: 13, speed: 50, patrolMinX: 5450, patrolMaxX: 5750 } },
        { type: 'leaper', x: 5950, y: 738, config: { health: 150, damage: 22, speed: 70, attackRange: 55, patrolMinX: 5800, patrolMaxX: 6100 }, scale: 1.3 },
      ],
      notes: 'Mini-boss (scaled Leaper) guards the altar approach; custom die handler in scene.',
    },
    {
      name: 'Altar of the Core',
      xStart: 6800,
      xEnd: 8000,
      enemies: [
        { type: 'shield', x: 6960, y: 628, config: { health: 70, damage: 18, speed: 50, patrolMinX: 6910, patrolMaxX: 7010 } },
        { type: 'shield', x: 7450, y: 428, config: { health: 90, damage: 20, speed: 50, detectRange: 260, patrolMinX: 7360, patrolMaxX: 7560 }, scale: 1.4 },
      ],
    },
    {
      name: 'The Descent',
      xStart: 8000,
      xEnd: 10000,
      enemies: [
        { type: 'shield', x: 8100, y: 738, config: { health: 75, damage: 18, speed: 45, patrolMinX: 8050, patrolMaxX: 8350 } },
        { type: 'spitter', x: 8600, y: 738, config: { health: 65, damage: 16, speed: 55, patrolMinX: 8500, patrolMaxX: 8750 } },
        { type: 'leaper', x: 9000, y: 738, config: { health: 80, damage: 20, speed: 85, patrolMinX: 8900, patrolMaxX: 9100 } },
        { type: 'sentry', x: 9350, y: 738, config: { health: 65, damage: 16, speed: 70, patrolMinX: 9250, patrolMaxX: 9450 } },
      ],
    },
  ],
  ground: [
    { x: 0, y: 768, width: 2000, biome: 'forest', id: 1 },
    { x: 2000, y: 768, width: 300, biome: 'forest', id: 2 },
    { x: 2800, y: 768, width: 300, biome: 'forest', id: 3 },
    { x: 3700, y: 768, width: 300, biome: 'forest', id: 4 },
    { x: 4500, y: 768, width: 2300, biome: 'forest', id: 5 },
    { x: 6800, y: 768, width: 1200, biome: 'forest', id: 6 },
    { x: 8000, y: 768, width: 2000, biome: 'forest', id: 11 },
  ],
  platforms: [
    { x: 300, y: 640, width: 160 }, { x: 550, y: 540, width: 128 }, { x: 750, y: 620, width: 192 },
    { x: 1050, y: 520, width: 160 }, { x: 1350, y: 640, width: 160 }, { x: 1650, y: 520, width: 192 },
    { x: 1950, y: 650, width: 96 }, { x: 2350, y: 650, width: 64 }, { x: 2680, y: 620, width: 64 },
    { x: 2850, y: 650, width: 96 }, { x: 3440, y: 520, width: 64 }, { x: 3750, y: 650, width: 96 },
    { x: 4080, y: 640, width: 64 }, { x: 4360, y: 620, width: 64 }, { x: 4600, y: 640, width: 160 },
    { x: 4850, y: 520, width: 192 }, { x: 5150, y: 400, width: 160 }, { x: 5400, y: 550, width: 224 },
    { x: 5750, y: 600, width: 160 }, { x: 6050, y: 480, width: 192 }, { x: 6350, y: 580, width: 160 },
    { x: 6900, y: 660, width: 128 }, { x: 7100, y: 560, width: 128 }, { x: 7320, y: 460, width: 256 },
  ],
  movingPlatforms: [
    { x: 2500, y: 580, minX: 2450, maxX: 2700, speed: 30 },
    { x: 3250, y: 600, minX: 3180, maxX: 3400, speed: -40 },
    { x: 3570, y: 560, minX: 3500, maxX: 3620, speed: 25 },
    { x: 4200, y: 580, minX: 4150, maxX: 4280, speed: -35 },
  ],
  hazards: [
    { kind: 'thorn-gap', x: 2300, y: 784, width: 500, id: 71 },
    { kind: 'thorn-gap', x: 3100, y: 784, width: 600, id: 72 },
    { kind: 'thorn-gap', x: 4000, y: 784, width: 500, id: 73 },
    { kind: 'thorn-patch', x: 4900, y: 768, width: 64, id: 74 },
    { kind: 'thorn-patch', x: 5480, y: 768, width: 64, id: 75 },
    { kind: 'thorn-patch', x: 6100, y: 768, width: 64, id: 76 },
  ],
  pickups: [
    { kind: 'echo-fragment', x: 3000, y: 630, echoIndex: 0 },
    { kind: 'echo-fragment', x: 6500, y: 600, echoIndex: 1 },
    { kind: 'dragon-core', x: 7478, y: 400 },
  ],
  tarot: [
    { card: 'chariot', x: 2200, y: 738 },
    { card: 'tower', x: 4850, y: 488 },
    { card: 'magician', x: 5400, y: 518 },
  ],
  barricades: [
    { x: 650, y: 736 },
    { x: 7700, y: 736 },
    { x: 9850, y: 704 },
  ],
  transitions: {
    forward: 'TransitionScene12',
    back: 'TransitionScene12',
    forwardTriggerX: 9950,
    startPosForward: { x: 150, y: 650 },
    startPosBack: { x: 720, y: 650 },
  },
  ambient: { musicTrack: 1, biome: 'forest', emberRain: true, weather: 'ember' },
  notes: 'Shmup band x 2900-4500 activates in DRAGON form only (unavailable first pass). See ShmupSystem.buildWaves.',
};
