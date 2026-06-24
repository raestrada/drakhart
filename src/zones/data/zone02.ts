import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 2 — "Industrial Wasteland" (refinery)
 *
 * Mecha gauntlet: ambient heat burns the Warrior (−5 HP/s), lava pits kill the
 * human instantly but only damage + heat the Mecha. Forces MECHA play.
 * DRAGON is unlocked at the SkyCore altar (x 7478) near the end.
 *
 * Pacing target: 6-8 min. Five gauntlet segments escalate MechaEnemy HP/damage,
 * capped by the EliteMecha mini-boss (650hp, stagger-vulnerable).
 *
 * Difficulty tier 1. Boss mercy: energy pickups auto-drop near the arena when
 * energy is low.
 */
export const zone02: ZoneConfig = {
  id: 2,
  key: 'GameScene2',
  displayNameI18n: 'zones.industrialWasteland',
  biome: 'refinery',
  worldWidth: 8000,
  worldHeight: 800,
  groundY: 736,
  difficultyTier: 1,
  primaryForm: FormState.MECHA,
  allowedForms: [FormState.HUMAN, FormState.MECHA, FormState.DRAGON],
  sections: [
    {
      name: 'Entry Ruins',
      xStart: 0,
      xEnd: 1360,
      enemies: [
        { type: 'mecha', x: 365, y: 736, config: { health: 350, speed: 65, damage: 35, patrolMinX: 50, patrolMaxX: 680 } },
        { type: 'mecha', x: 1015, y: 736, config: { health: 350, speed: 65, damage: 35, patrolMinX: 680, patrolMaxX: 1350 } },
        { type: 'mecha', x: 1070, y: 736, config: { health: 350, speed: 65, damage: 35, patrolMinX: 800, patrolMaxX: 1340 } },
      ],
    },
    {
      name: 'Pincer Crossing',
      xStart: 1500,
      xEnd: 2920,
      enemies: [
        { type: 'mecha', x: 1800, y: 736, config: { health: 380, speed: 70, damage: 40, patrolMinX: 1500, patrolMaxX: 2100 } },
        { type: 'mecha', x: 2100, y: 736, config: { health: 380, speed: 70, damage: 40, patrolMinX: 1700, patrolMaxX: 2500 } },
        { type: 'mecha', x: 2650, y: 736, config: { health: 400, speed: 55, damage: 45, patrolMinX: 2400, patrolMaxX: 2900 } },
        { type: 'shield', x: 2050, y: 700 },
      ],
    },
    {
      name: 'Gauntlet',
      xStart: 3060,
      xEnd: 4520,
      enemies: [
        { type: 'mecha', x: 3300, y: 736, config: { health: 400, speed: 70, damage: 40, patrolMinX: 3060, patrolMaxX: 3600 } },
        { type: 'mecha', x: 3800, y: 736, config: { health: 400, speed: 70, damage: 40, patrolMinX: 3500, patrolMaxX: 4100 } },
        { type: 'mecha', x: 4100, y: 736, config: { health: 400, speed: 75, damage: 40, patrolMinX: 3800, patrolMaxX: 4400 } },
        { type: 'mecha', x: 4350, y: 736, config: { health: 420, speed: 75, damage: 45, patrolMinX: 4100, patrolMaxX: 4520 } },
      ],
    },
    {
      name: 'Apex',
      xStart: 4660,
      xEnd: 6100,
      enemies: [
        { type: 'mecha', x: 5000, y: 736, config: { health: 450, speed: 80, damage: 50, patrolMinX: 4660, patrolMaxX: 5350 } },
        { type: 'mecha', x: 5450, y: 736, config: { health: 450, speed: 80, damage: 50, patrolMinX: 5000, patrolMaxX: 5900 } },
        { type: 'mecha', x: 5790, y: 736, config: { health: 480, speed: 60, damage: 55, patrolMinX: 5500, patrolMaxX: 6080 } },
        { type: 'shield', x: 5200, y: 700 },
      ],
    },
    {
      name: 'Final Stand + Arena',
      xStart: 6280,
      xEnd: 7400,
      enemies: [
        { type: 'mecha', x: 6350, y: 736, config: { health: 480, speed: 85, damage: 55, patrolMinX: 6280, patrolMaxX: 6420 } },
        { type: 'elite-mecha', x: 6880, y: 500 },
      ],
      notes: 'EliteMecha mini-boss; custom die handler triggers boss-death cinematic. Stagger mechanic doubles incoming damage.',
    },
  ],
  ground: [
    { x: 0, y: 736, width: 1360, biome: 'refinery', id: 10 },
    { x: 1500, y: 736, width: 1420, biome: 'refinery', id: 11 },
    { x: 3060, y: 736, width: 1460, biome: 'refinery', id: 12 },
    { x: 4660, y: 736, width: 1460, biome: 'refinery', id: 13 },
    { x: 6280, y: 736, width: 1720, biome: 'refinery', id: 14 },
  ],
  hazards: [
    { kind: 'lava-pit', x: 1360, y: 736, width: 140 },
    { kind: 'lava-pit', x: 2920, y: 736, width: 140 },
    { kind: 'lava-pit', x: 4520, y: 736, width: 140 },
    { kind: 'lava-pit', x: 6100, y: 736, width: 180 },
  ],
  pickups: [
    { kind: 'energy', x: 2400, y: 700 },
    { kind: 'energy', x: 2870, y: 700 },
    { kind: 'energy', x: 3200, y: 700 },
    { kind: 'energy', x: 3900, y: 700 },
    { kind: 'energy', x: 4400, y: 700 },
    { kind: 'energy', x: 4720, y: 700 },
    { kind: 'energy', x: 5050, y: 700 },
    { kind: 'energy', x: 5550, y: 700 },
    { kind: 'energy', x: 5980, y: 700 },
    { kind: 'energy', x: 6400, y: 700 },
    { kind: 'energy', x: 6950, y: 700 },
    { kind: 'echo-fragment', x: 3800, y: 630, echoIndex: 2 },
    { kind: 'sky-core', x: 7478, y: 480 },
  ],
  tarot: [
    { card: 'strength', x: 3800, y: 704 },
  ],
  boss: { type: 'elite-mecha', x: 6880, y: 500, nameKey: 'boss.eliteName' },
  transitions: {
    forward: 'TransitionScene23',
    back: 'TransitionScene12',
    forwardTriggerX: 7850,
    backTriggerX: 80,
    startPosForward: { x: 150, y: 650 },
    startPosBack: { x: 720, y: 650 },
  },
  ambient: { musicTrack: 2, biome: 'refinery', emberRain: true, weather: 'ash' },
  notes: 'Heat: HUMAN/EXHAUSTED drains 5 HP/s. Lava: human instakill, mecha 15 dmg + 25 heat + knock-up. 8 FlyingEnemies patrol y~440 across the level. Forward transition to L3 requires DRAGON form (enforced in TransitionScene23).',
};
