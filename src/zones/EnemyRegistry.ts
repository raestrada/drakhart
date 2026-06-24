import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { LeaperEnemy } from '../entities/enemies/LeaperEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { MechaEnemy } from '../entities/enemies/MechaEnemy';
import { EliteMecha } from '../entities/enemies/EliteMecha';
import type { EnemyConfig, EnemySpawnSpec, EnemyType } from './types';
import { DifficultyDirector } from './DifficultyDirector';

type EnemyFactory = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: Player,
  config?: EnemyConfig
) => BaseEnemy;

interface EnemyEntry {
  factory: EnemyFactory;
  base: Required<Pick<EnemyConfig, 'health' | 'speed' | 'detectRange' | 'attackRange' | 'damage' | 'attackCooldown'>>;
  boss: boolean;
}

/**
 * EnemyRegistry — single source of truth for enemy base stats and construction.
 *
 * Scenes should spawn enemies via `EnemyRegistry.spawn(...)` instead of calling
 * enemy constructors directly with inline config objects. This guarantees every
 * spawn flows through the DifficultyDirector tier scaling and that base stats are
 * defined in exactly one place.
 *
 * Shmup-only types (sky-hunter, seeker-drone, mine-dropper, gunship, bone-serpent)
 * are declared here for documentation but are spawned by ShmupSystem, which owns
 * their wave geometry. Their base stats mirror the inline subclasses that lived
 * in GameScene3 prior to extraction.
 */
export class EnemyRegistry {
  private static entries: Record<string, EnemyEntry> = {
    sentry: {
      factory: (s, x, y, p, c) => new BaseEnemy(s, x, y, 'enemy-sentry', p, c),
      base: { health: 40, speed: 70, detectRange: 220, attackRange: 50, damage: 10, attackCooldown: 900 },
      boss: false,
    },
    leaper: {
      factory: (s, x, y, p, c) => new LeaperEnemy(s, x, y, p, c),
      base: { health: 40, speed: 90, detectRange: 250, attackRange: 45, damage: 10, attackCooldown: 800 },
      boss: false,
    },
    spitter: {
      factory: (s, x, y, p, c) => new SpitterEnemy(s, x, y, p, c),
      base: { health: 45, speed: 50, detectRange: 320, attackRange: 220, damage: 12, attackCooldown: 1800 },
      boss: false,
    },
    shield: {
      factory: (s, x, y, p, c) => new ShieldEnemy(s, x, y, p, c),
      base: { health: 70, speed: 45, detectRange: 200, attackRange: 45, damage: 15, attackCooldown: 1200 },
      boss: false,
    },
    flying: {
      factory: (s, x, y, p, c) => new FlyingEnemy(s, x, y, p, c),
      base: { health: 20, speed: 80, detectRange: 380, attackRange: 280, damage: 10, attackCooldown: 1800 },
      boss: false,
    },
    mecha: {
      factory: (s, x, y, p, c) => new MechaEnemy(s, x, y, p, c),
      base: { health: 350, speed: 65, detectRange: 320, attackRange: 80, damage: 35, attackCooldown: 2000 },
      boss: false,
    },
    'elite-mecha': {
      factory: (s, x, y, p) => new EliteMecha(s, x, y, p),
      base: { health: 650, speed: 40, detectRange: 480, attackRange: 180, damage: 40, attackCooldown: 1600 },
      boss: true,
    },
    'sky-hunter': {
      factory: EnemyRegistry.unsupported('sky-hunter'),
      base: { health: 20, speed: 180, detectRange: 800, attackRange: 600, damage: 10, attackCooldown: 1800 },
      boss: false,
    },
    'seeker-drone': {
      factory: EnemyRegistry.unsupported('seeker-drone'),
      base: { health: 15, speed: 100, detectRange: 600, attackRange: 500, damage: 10, attackCooldown: 2500 },
      boss: false,
    },
    'mine-dropper': {
      factory: EnemyRegistry.unsupported('mine-dropper'),
      base: { health: 15, speed: 40, detectRange: 500, attackRange: 400, damage: 15, attackCooldown: 1800 },
      boss: false,
    },
    gunship: {
      factory: EnemyRegistry.unsupported('gunship'),
      base: { health: 25, speed: 50, detectRange: 700, attackRange: 600, damage: 12, attackCooldown: 2000 },
      boss: false,
    },
    'bone-serpent': {
      factory: EnemyRegistry.unsupported('bone-serpent'),
      base: { health: 15, speed: 240, detectRange: 9999, attackRange: 9999, damage: 15, attackCooldown: 1800 },
      boss: false,
    },
  };

  private static unsupported(type: string): EnemyFactory {
    return () => {
      throw new Error(
        `EnemyRegistry: '${type}' is a shmup type managed by ShmupSystem. Spawn it via ShmupSystem, not EnemyRegistry.spawn.`
      );
    };
  }

  static baseConfig(type: EnemyType): EnemyConfig {
    const entry = this.entries[type];
    if (!entry) throw new Error(`EnemyRegistry: unknown enemy type '${type}'`);
    return { ...entry.base };
  }

  /**
   * Returns a tier-scaled config for the given enemy type, merged with any
   * per-spawn overrides. Boss types ignore tier scaling (authored set-pieces).
   */
  static configFor(type: EnemyType, zoneId: number, overrides?: EnemyConfig): EnemyConfig {
    const entry = this.entries[type];
    if (!entry) throw new Error(`EnemyRegistry: unknown enemy type '${type}'`);
    const merged = { ...entry.base, ...overrides };
    if (entry.boss) return merged;
    return DifficultyDirector.scaleConfig(merged, zoneId);
  }

  /**
   * Spawn an enemy into the scene. Returns the constructed enemy so the caller
   * can add it to a physics group / set up collisions.
   */
  static spawn(
    scene: Phaser.Scene,
    spec: EnemySpawnSpec,
    player: Player,
    zoneId: number
  ): BaseEnemy {
    const entry = this.entries[spec.type];
    if (!entry) throw new Error(`EnemyRegistry: unknown enemy type '${spec.type}'`);
    const config = this.configFor(spec.type, zoneId, spec.config);
    const enemy = entry.factory(scene, spec.x, spec.y, player, config);
    if (spec.scale != null) enemy.setScale(spec.scale);
    return enemy;
  }

  static isBoss(type: EnemyType): boolean {
    return this.entries[type]?.boss ?? false;
  }
}
