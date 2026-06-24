import type { DifficultyTier, EnemyConfig } from './types';

/**
 * DifficultyDirector — global difficulty curve across the 24-zone campaign.
 *
 * The campaign is split into 4 tiers of 6 zones each:
 *   Tier 1 (zones  1- 6) — tutorial/mastery of single forms
 *   Tier 2 (zones  7-12) — mixed-form mastery
 *   Tier 3 (zones 13-18) — challenge
 *   Tier 4 (zones 19-24) — endgame
 *
 * Zone data files are authored at TIER 1 values. The director scales enemy
 * health/damage/speed by the tier multiplier so zones 5-24 auto-balance from a
 * single declared stat block. Per-spawn overrides in the data files handle
 * intra-zone escalation (section-to-section ramps); the tier multiplier handles
 * inter-zone escalation.
 *
 * TTK targets (design compass, human-form sword @ 25 dmg / 320ms cooldown ≈ 78 dps):
 *   Tier 1 grunt 40hp  → ~0.5s      Tier 3 grunt 68hp  → ~0.9s
 *   Tier 2 grunt 52hp  → ~0.7s      Tier 4 grunt 88hp  → ~1.1s
 * Boss HP is hand-tuned per boss spec (not auto-scaled) because boss fights are
 * authored set-pieces, not grunt spam.
 */
export class DifficultyDirector {
  static readonly TIER_MULTIPLIERS: Record<DifficultyTier, { hp: number; dmg: number; spd: number }> = {
    1: { hp: 1.0, dmg: 1.0, spd: 1.0 },
    2: { hp: 1.3, dmg: 1.3, spd: 1.1 },
    3: { hp: 1.7, dmg: 1.6, spd: 1.15 },
    4: { hp: 2.2, dmg: 1.9, spd: 1.2 },
  };

  static tierForZone(zoneId: number): DifficultyTier {
    if (zoneId <= 6) return 1;
    if (zoneId <= 12) return 2;
    if (zoneId <= 18) return 3;
    return 4;
  }

  static multipliersForZone(zoneId: number): { hp: number; dmg: number; spd: number } {
    return this.TIER_MULTIPLIERS[this.tierForZone(zoneId)];
  }

  /**
   * Apply tier scaling to a tier-1 enemy config.
   * Health/damage/speed are scaled; detect/attack ranges and cooldowns are left
   * to the data file (range tuning is per-geometry, not per-difficulty).
   */
  static scaleConfig(config: EnemyConfig, zoneId: number): EnemyConfig {
    const m = this.multipliersForZone(zoneId);
    const out: EnemyConfig = { ...config };
    if (out.health != null) out.health = Math.round(out.health * m.hp);
    if (out.damage != null) out.damage = Math.round(out.damage * m.dmg);
    if (out.speed != null) out.speed = Math.round(out.speed * m.spd);
    return out;
  }
}
