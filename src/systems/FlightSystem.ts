import Phaser from 'phaser';
import { Player } from '../entities/Player';
import {
  PLAYER_DRAGON_SPEED,
  PLAYER_DRAGON_ACCELERATION,
  PLAYER_DRAGON_DAMPING,
} from '../utils/constants';

export class FlightSystem {
  private player: Player;
  private active = false;
  private vx = 0;
  private vy = 0;
  private flyingUp = false;

  constructor(player: Player) {
    this.player = player;
  }

  get isActive(): boolean {
    return this.active;
  }

  activate(): void {
    this.active = true;
    this.vx = 0;
    this.vy = 0;
  }

  deactivate(): void {
    this.active = false;
    this.vx = 0;
    this.vy = 0;
    this.flyingUp = false;
  }

  isFlyingUp(): boolean {
    return this.flyingUp;
  }

  update(delta: number): void {
    if (!this.active) return;

    const dt = delta / 1000;
    const kb = this.player.scene.input.keyboard!;
    const cursors = kb.createCursorKeys();
    const wKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const aKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const sKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const dKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    const up = cursors.up.isDown || wKey.isDown;
    const down = cursors.down.isDown || sKey.isDown;
    const left = cursors.left.isDown || aKey.isDown;
    const right = cursors.right.isDown || dKey.isDown;

    this.flyingUp = up;

    let targetVx = 0;
    if (left) targetVx = -PLAYER_DRAGON_SPEED;
    else if (right) targetVx = PLAYER_DRAGON_SPEED;

    let targetVy = 0;
    if (up) targetVy = -PLAYER_DRAGON_SPEED;
    else if (down) targetVy = PLAYER_DRAGON_SPEED;

    this.vx = this.moveToward(this.vx, targetVx, PLAYER_DRAGON_ACCELERATION * dt);
    this.vy = this.moveToward(this.vy, targetVy, PLAYER_DRAGON_ACCELERATION * dt);

    if (!left && !right) this.vx *= PLAYER_DRAGON_DAMPING;
    if (!up && !down) this.vy *= PLAYER_DRAGON_DAMPING;

    if (Math.abs(this.vx) < 1) this.vx = 0;
    if (Math.abs(this.vy) < 1) this.vy = 0;

    this.player.setVelocity(this.vx, this.vy);
  }

  private moveToward(
    current: number,
    target: number,
    maxDelta: number
  ): number {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }
}
