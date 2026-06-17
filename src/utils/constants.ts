export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const RESOLUTION_SCALE = GAME_HEIGHT / 480; // 2.25

export const PLAYER_HUMAN_SPEED = 230;
export const PLAYER_HUMAN_ACCEL = 1600;
export const PLAYER_HUMAN_DRAG = 0.80;
export const PLAYER_HUMAN_JUMP = -600;
export const PLAYER_HUMAN_MAX_FALL = 650;

export const PLAYER_MECHA_SPEED = 110;
export const PLAYER_MECHA_ACCEL = 450;
export const PLAYER_MECHA_DRAG = 0.94;
export const PLAYER_MECHA_JUMP = -420;
export const PLAYER_MECHA_HOVER_MAX_TIME = 1500; // ms

export const PLAYER_DRAGON_SPEED = 390;
export const PLAYER_DRAGON_ACCELERATION = 1100;
export const PLAYER_DRAGON_DAMPING = 0.92;

export const ENERGY_MAX = 100;
export const ENERGY_DRAIN_FLYING = 12;
export const ENERGY_DRAIN_MECHA = 4;
export const ENERGY_DRAIN_SHOOT = 0.3;
export const ENERGY_DRAIN_DAMAGED = 12;
export const ENERGY_REGEN_HUMAN = 7;
export const ENERGY_REGEN_GROUNDED = 14;

export const SWORD_DAMAGE = 25;
export const SWORD_RANGE = 80;
export const SWORD_DURATION = 200;
export const SWORD_COOLDOWN = 320;

export const MECHA_SWORD_DAMAGE = 75;
export const MECHA_SWORD_RANGE = 125;
export const MECHA_SWORD_DURATION = 350;
export const MECHA_SWORD_COOLDOWN = 650;

export const FIRE_DAMAGE = 12;
export const FIRE_SPEED = 700;
export const FIRE_LIFETIME = 1200;
export const FIRE_COOLDOWN = 80;

export const PLAYER_MAX_HEALTH = 100;
export const INVINCIBILITY_DURATION = 600;
export const KNOCKBACK_FORCE = 180;

export const SENTRY_HEALTH = 40;
export const SENTRY_SPEED = 70;
export const SENTRY_DETECT_RANGE = 220;
export const SENTRY_ATTACK_RANGE = 50;
export const SENTRY_DAMAGE = 10;
export const SENTRY_ATTACK_COOLDOWN = 900;

export const BOSS_HEALTH_PHASE1 = 180;
export const BOSS_HEALTH_PHASE2 = 120;
export const BOSS_SPEED_HORIZONTAL = 90;
export const BOSS_SPEED_VERTICAL = 50;
export const BOSS_DAMAGE = 20;
export const BOSS_ATTACK_COOLDOWN = 1500;
export const BOSS_FIRE_COOLDOWN = 2800;

export const LEVEL_WIDTH = 8000;
export const LEVEL_HEIGHT = 800;

export const CAMERA_LERP = 0.1;
export const CAMERA_ZOOM_HUMAN = 2.0;
export const CAMERA_ZOOM_MECHA = 1.7;
export const CAMERA_ZOOM_DRAGON = 1.4;
export const CAMERA_ZOOM_DURATION = 600;

export const TRANSFORM_DURATION = 800;
export const TRANSFORM_COOLDOWN_DURATION = 2500;

export const SHAKE = {
  LIGHT_HIT:     { intensity: 0.003, duration: 80 },
  HEAVY_HIT:     { intensity: 0.007, duration: 120 },
  PLAYER_DAMAGE: { intensity: 0.005, duration: 100 },
  LAND:          { intensity: 0.002, duration: 60 },
  LAND_HEAVY:    { intensity: 0.004, duration: 80 },
  SWORD:         { intensity: 0.004, duration: 60 },
  MECHA_SWORD:   { intensity: 0.008, duration: 140 },
  ELITE_STOMP:   { intensity: 0.015, duration: 200 },
  TRANSFORM:     { intensity: 0.012, duration: 400 },
  BOSS_HIT:      { intensity: 0.010, duration: 150 },
  EXPLOSION:     { intensity: 0.018, duration: 300 },
  DEATH:         { intensity: 0.025, duration: 500 },
} as const;

export const HITSTOP = {
  SWORD_LIGHT:    { duration: 40,  intensity: 0.002 },
  SWORD_HEAVY:    { duration: 60,  intensity: 0.005 },
  MECHA_CLAYMORE: { duration: 80,  intensity: 0.008 },
  ELITE_STOMP:    { duration: 120, intensity: 0.012 },
  BOSS_HIT:       { duration: 100, intensity: 0.010 },
  EXPLOSION:      { duration: 100, intensity: 0.015 },
  DEATH:          { duration: 200, intensity: 0.020 },
} as const;

export const DAMAGE_NUMBER = {
  DURATION: 900,
  FLOAT_Y: 60,
  FONT_SIZE: 18,
  COLOR: '#ff4444',
  HEAVY_COLOR: '#ff8800',
} as const;
