import type { FormState } from '../systems/FormStateMachine';

export type Biome = 'forest' | 'refinery' | 'gorge' | 'foundry';

export type DifficultyTier = 1 | 2 | 3 | 4;

export type EnemyType =
  | 'sentry'
  | 'leaper'
  | 'spitter'
  | 'shield'
  | 'flying'
  | 'mecha'
  | 'elite-mecha'
  | 'sky-hunter'
  | 'seeker-drone'
  | 'mine-dropper'
  | 'gunship'
  | 'bone-serpent';

export interface EnemyConfig {
  health?: number;
  speed?: number;
  detectRange?: number;
  attackRange?: number;
  damage?: number;
  attackCooldown?: number;
  patrolMinX?: number;
  patrolMaxX?: number;
}

export interface EnemySpawnSpec {
  type: EnemyType;
  x: number;
  y: number;
  config?: EnemyConfig;
  scale?: number;
}

export interface GroundSegmentSpec {
  x: number;
  y: number;
  width: number;
  biome: Biome;
  id: string | number;
}

export interface PlatformSpec {
  x: number;
  y: number;
  width: number;
}

export interface MovingPlatformSpec {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  speed: number;
}

export interface CrumblingPlatformSpec {
  x: number;
  y: number;
}

export interface HazardSpec {
  kind: 'thorn-gap' | 'thorn-patch' | 'lava-pit' | 'steam-pipe' | 'piston' | 'laser-gate';
  x: number;
  y: number;
  width?: number;
  id?: string | number;
  extra?: Record<string, unknown>;
}

export interface PickupSpec {
  kind: 'energy' | 'dragon-core' | 'sky-core' | 'echo-fragment';
  x: number;
  y: number;
  echoIndex?: number;
  extra?: Record<string, unknown>;
}

export interface TarotSpec {
  card: 'magician' | 'chariot' | 'strength' | 'star' | 'tower';
  x: number;
  y: number;
}

export interface BossSpec {
  type: 'gatekeeper' | 'elite-mecha' | 'dreadnought' | 'base';
  x: number;
  y: number;
  nameKey: string;
}

export interface BarricadeSpec {
  x: number;
  y: number;
}

export interface SectionSpec {
  name: string;
  xStart: number;
  xEnd: number;
  enemies: EnemySpawnSpec[];
  notes?: string;
}

export interface TransitionSpec {
  forward: string;
  back: string;
  forwardTriggerX?: number;
  backTriggerX?: number;
  startPosForward: { x: number; y: number };
  startPosBack: { x: number; y: number };
}

export interface AmbientSpec {
  musicTrack: number;
  biome: Biome;
  emberRain: boolean;
  weather?: 'none' | 'ash' | 'ember' | 'storm';
}

export interface ZoneConfig {
  id: number;
  key: string;
  displayNameI18n: string;
  biome: Biome;
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  difficultyTier: DifficultyTier;
  primaryForm: FormState;
  allowedForms: FormState[];
  forcedForm?: FormState;
  sections: SectionSpec[];
  ground: GroundSegmentSpec[];
  platforms?: PlatformSpec[];
  movingPlatforms?: MovingPlatformSpec[];
  crumblingPlatforms?: CrumblingPlatformSpec[];
  hazards?: HazardSpec[];
  pickups?: PickupSpec[];
  tarot?: TarotSpec[];
  barricades?: BarricadeSpec[];
  boss?: BossSpec;
  transitions: TransitionSpec;
  ambient: AmbientSpec;
  notes?: string;
}
