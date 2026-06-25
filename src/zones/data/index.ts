import type { ZoneConfig } from '../types';
import { zone01 } from './zone01';
import { zone02 } from './zone02';
import { zone03 } from './zone03';
import { zone04 } from './zone04';
import { zone05 } from './zone05';
import { zone06 } from './zone06';

export const ZONES: Record<number, ZoneConfig> = {
  1: zone01,
  2: zone02,
  3: zone03,
  4: zone04,
  5: zone05,
  6: zone06,
};

export function getZoneConfig(id: number): ZoneConfig | undefined {
  return ZONES[id];
}
