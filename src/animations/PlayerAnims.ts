import Phaser from 'phaser';

export function createPlayerAnims(scene: Phaser.Scene): void {
  scene.anims.create({
    key: 'h-idle',
    frames: [
      { key: 'h-idle-0' },
      { key: 'h-idle-1' },
      { key: 'h-idle-2' },
      { key: 'h-idle-3' },
      { key: 'h-idle-4' },
    ],
    frameRate: 5,
    repeat: -1,
  });

  scene.anims.create({
    key: 'h-walk',
    frames: [
      { key: 'h-walk-0' },
      { key: 'h-walk-1' },
      { key: 'h-walk-2' },
      { key: 'h-walk-3' },
      { key: 'h-walk-4' },
      { key: 'h-walk-5' },
    ],
    frameRate: 10,
    repeat: -1,
  });

  scene.anims.create({
    key: 'h-attack',
    frames: [
      { key: 'h-attack-0' },
      { key: 'h-attack-1' },
      { key: 'h-attack-2' },
    ],
    frameRate: 10,
    repeat: 0,
  });

  scene.anims.create({
    key: 'h-jump',
    frames: [{ key: 'h-jump' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'h-fall',
    frames: [{ key: 'h-fall' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'h-kneeling',
    frames: [{ key: 'h-kneeling' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'm-idle',
    frames: [
      { key: 'm-idle-0' },
      { key: 'm-idle-1' },
      { key: 'm-idle-2' },
      { key: 'm-idle-3' },
    ],
    frameRate: 4,
    repeat: -1,
  });

  scene.anims.create({
    key: 'm-walk',
    frames: [
      { key: 'm-walk-0' },
      { key: 'm-walk-1' },
      { key: 'm-walk-2' },
      { key: 'm-walk-3' },
      { key: 'm-walk-4' },
      { key: 'm-walk-5' },
    ],
    frameRate: 9,
    repeat: -1,
  });

  scene.anims.create({
    key: 'm-attack',
    frames: [
      { key: 'm-attack-0' },
      { key: 'm-attack-1' },
      { key: 'm-attack-2' },
    ],
    frameRate: 9,
    repeat: 0,
  });

  scene.anims.create({
    key: 'm-jump',
    frames: [{ key: 'm-jump' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'm-fall',
    frames: [{ key: 'm-fall' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'm-kneeling',
    frames: [{ key: 'm-kneeling' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'd-fly',
    frames: [
      { key: 'd-fly-0' },
      { key: 'd-fly-1' },
      { key: 'd-fly-2' },
      { key: 'd-fly-3' },
    ],
    frameRate: 8,
    repeat: -1,
  });
}

export function createEnemyAnims(scene: Phaser.Scene): void {
  scene.anims.create({
    key: 'em-idle',
    frames: [
      { key: 'em-idle-0' },
      { key: 'em-idle-1' },
      { key: 'em-idle-2' },
    ],
    frameRate: 3,
    repeat: -1,
  });

  scene.anims.create({
    key: 'em-walk',
    frames: [
      { key: 'em-walk-0' },
      { key: 'em-walk-1' },
      { key: 'em-walk-2' },
      { key: 'em-walk-3' },
    ],
    frameRate: 6,
    repeat: -1,
  });

  scene.anims.create({
    key: 'em-charge',
    frames: [{ key: 'em-charge' }],
    frameRate: 1,
    repeat: 0,
  });

  scene.anims.create({
    key: 'elm-idle',
    frames: [
      { key: 'elm-idle-0' },
      { key: 'elm-idle-1' },
      { key: 'elm-idle-2' },
    ],
    frameRate: 3,
    repeat: -1,
  });

  scene.anims.create({
    key: 'elm-walk',
    frames: [
      { key: 'elm-walk-0' },
      { key: 'elm-walk-1' },
      { key: 'elm-walk-2' },
      { key: 'elm-walk-3' },
    ],
    frameRate: 5,
    repeat: -1,
  });

  scene.anims.create({
    key: 'elm-attack',
    frames: [{ key: 'elm-attack' }],
    frameRate: 1,
    repeat: 0,
  });
}
