import type { ZoneConfig } from '../types';
import { FormState } from '../../systems/FormStateMachine';

/**
 * ZONE 3 — "Ashen Gorge" (gorge)
 *
 * Shmup-only flying corridor. DRAGON form is forced; the auto-scrolling camera
 * advances and the player is clamped to screen space (Y 120-680). Reversion is
 * lethal (fall into the chasm) — energy management is the core tension.
 *
 * Pacing target: 6-8 min. Procedural waves (3-7 enemies) from x 1400-11500 with
 * shrinking spacing for escalation, plus V-formation sky-hunter bonuses. Hazards:
 * steam pipes, pistons, and destroyable laser gates. Ends with the Dreadnought
 * boss (destroy 2× 600hp cannons, then the 120hp core).
 *
 * Difficulty tier 1. Energy depletion → revert + 30 dmg penalty (fall death
 * follows naturally).
 */
export const zone03: ZoneConfig = {
  id: 3,
  key: 'GameScene3',
  displayNameI18n: 'zones.ashenGorge',
  biome: 'gorge',
  worldWidth: 18000,
  worldHeight: 800,
  groundY: 704,
  difficultyTier: 1,
  primaryForm: FormState.DRAGON,
  allowedForms: [FormState.DRAGON],
  forcedForm: FormState.DRAGON,
  sections: [
    {
      name: 'Gorge Approach',
      xStart: 0,
      xEnd: 1400,
      enemies: [],
      notes: 'Camera lock-in + form enforcement. No waves yet.',
    },
    {
      name: 'Wave Corridor',
      xStart: 1400,
      xEnd: 11500,
      enemies: [],
      notes: 'Procedural waves via ShmupSystem.buildWaves: 3-7 enemies/wave, types [sky-hunter, bone-serpent, seeker-drone, mine-dropper, gunship], 30% chance V-formation of 5 sky-hunters. Spacing shrinks from ~300-600px to ~200px. EnergyPickups every 400-800px.',
    },
    {
      name: 'Dreadnought',
      xStart: 11500,
      xEnd: 16000,
      enemies: [],
      notes: 'Boss arena. Dreadnought: 2× cannons (600hp, 20dmg, 1200ms cd) + core (120hp, 12dmg). Destroy cannons first.',
    },
  ],
  ground: [
    { x: 0, y: 704, width: 16000, biome: 'gorge', id: 40 },
  ],
  hazards: [
    { kind: 'steam-pipe', x: 1200, y: 0, id: 'steam-bands', extra: { count: 'every 700-1100px to 14800', toggle: 2000, damage: 5, pushback: 30 } },
    { kind: 'piston', x: 1600, y: 0, id: 'piston-bands', extra: { count: 'every 600-1000px to 14800', travel: 200, cycle: 1800 } },
    { kind: 'laser-gate', x: 2500, y: 0, id: 'laser-bands', extra: { count: 'every 1500-2500px to 14800', nodeHp: 40 } },
  ],
  pickups: [
    { kind: 'energy', x: 500, y: 400, extra: { band: 'every 400-800px to 14800, Y 200-600' } },
  ],
  boss: { type: 'dreadnought', x: 12500, y: 350, nameKey: 'boss.dreadnoughtName' },
  transitions: {
    forward: 'TransitionScene34',
    back: 'TransitionScene23',
    startPosForward: { x: 150, y: 650 },
    startPosBack: { x: 960, y: 650 },
  },
  ambient: { musicTrack: 3, biome: 'gorge', emberRain: false, weather: 'ash' },
  notes: 'Ceiling at y=32. Player clamped to screenY 120-680. Pushback crush death at screenX<=55. Shmup enemy base stats are declared in EnemyRegistry but spawned by ShmupSystem (wave geometry owner). Inline subclasses (SkyHunter, SeekerDrone, MineDropper, HeavyGunship, HomingMissile, DriftMine) currently live in GameScene3 — extraction to src/entities/enemies/shmup/ is a documented follow-up.',
};
