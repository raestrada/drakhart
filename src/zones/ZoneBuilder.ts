import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import type { ZoneConfig } from './types';
import { EnemyRegistry } from './EnemyRegistry';

/**
 * ZoneBuilder — consumes a ZoneConfig and constructs the generic parts of a zone.
 *
 * Currently handles:
 *   - World + camera physics bounds
 *   - Enemy spawning across all sections (via EnemyRegistry + DifficultyDirector)
 *
 * Terrain (ground segments, platforms, hazards) and scripted elements (bosses,
 * cutscenes, barricades, tarot pickups) remain in the scene classes for now,
 * because they are tightly coupled to per-zone geometry and collision setup.
 * The zone data files (src/zones/data/zoneNN.ts) declare the FULL intended
 * design so the remaining terrain migration is a mechanical pass.
 */
export class ZoneBuilder {
  static setupWorldBounds(scene: Phaser.Scene, config: ZoneConfig): void {
    scene.physics.world.setBounds(0, 0, config.worldWidth, config.worldHeight);
    scene.cameras.main.setBounds(0, 0, config.worldWidth, config.worldHeight);
  }

  /**
   * Spawn every enemy declared in the zone's sections. Returns the array so the
   * caller can add them to a physics group and wire collisions.
   */
  static spawnAllEnemies(scene: Phaser.Scene, config: ZoneConfig, player: Player): BaseEnemy[] {
    const enemies: BaseEnemy[] = [];
    for (const section of config.sections) {
      for (const spec of section.enemies) {
        enemies.push(EnemyRegistry.spawn(scene, spec, player, config.id));
      }
    }
    return enemies;
  }

  /**
   * Spawn enemies for a single section by name. Useful when a scene wants to
   * gate spawns behind section triggers instead of front-loading the whole zone.
   */
  static spawnSectionEnemies(
    scene: Phaser.Scene,
    config: ZoneConfig,
    sectionName: string,
    player: Player
  ): BaseEnemy[] {
    const section = config.sections.find((s) => s.name === sectionName);
    if (!section) return [];
    return section.enemies.map((spec) => EnemyRegistry.spawn(scene, spec, player, config.id));
  }
}
