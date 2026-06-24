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
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private keysBound = false;

  constructor(player: Player) {
    this.player = player;
  }

  get isActive(): boolean {
    return this.active;
  }

  private ensureKeys(): void {
    if (this.keysBound) return;
    const kb = this.player.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keysBound = true;
  }

  activate(): void {
    this.ensureKeys();
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
    this.ensureKeys();

    const dt = delta / 1000;
    const up = this.cursors.up.isDown || this.wKey.isDown;
    const down = this.cursors.down.isDown || this.sKey.isDown;
    const left = this.cursors.left.isDown || this.aKey.isDown;
    const right = this.cursors.right.isDown || this.dKey.isDown;

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
