import Phaser from 'phaser';
import { Player } from './Player';
import { FormState } from '../systems/FormStateMachine';

export class SteamVent extends Phaser.Physics.Arcade.Sprite {
  private lastDamageTime = 0;
  private particleTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'steam-vent');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }

  onPlayerOverlap(player: Player, delta: number): void {
    const state = player.formMachine.state;

    if (state === FormState.MECHA) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const jumpKeyActive = player.isJumpKeyDown();
      
      if (jumpKeyActive || !body.blocked.down) {
        body.setVelocityY(-650); // Vertical steam boost!
        player.formMachine.heat.addHeat(18 * (delta / 1000)); // Increase heat by +18/sec
        
        // Spawn small steam sparkles around the player
        this.spawnSteamSparkles(player.x, player.y);
      }
    } else if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
      const time = this.scene.time.now;
      if (time - this.lastDamageTime > 500) {
        this.lastDamageTime = time;
        player.takeDamage(10, player.x < this.x ? -1 : 1);
        (this.scene as any).gameAudio?.playDamage?.();
      }
    }
  }

  update(time: number, delta: number): void {
    super.update();
    
    // Periodically spawn white steam rising particles
    this.particleTimer += delta;
    if (this.particleTimer > 60) {
      this.particleTimer = 0;
      this.spawnRisingSteam();
    }
  }

  private spawnRisingSteam(): void {
    const sx = this.x + Phaser.Math.Between(-8, 8);
    const sy = this.y - 12;
    const steam = this.scene.add.image(sx, sy, 'particle-smoke');
    steam.setTint(0xeeeeee);
    steam.setAlpha(0.6);
    steam.setDepth(15);
    steam.setScale(0.5);

    this.scene.tweens.add({
      targets: steam,
      y: sy - Phaser.Math.Between(40, 100),
      x: sx + Phaser.Math.Between(-15, 15),
      scale: 1.5,
      alpha: 0,
      duration: Phaser.Math.Between(600, 1200),
      onComplete: () => steam.destroy()
    });
  }

  private spawnSteamSparkles(x: number, y: number): void {
    const sx = x + Phaser.Math.Between(-16, 16);
    const sy = y + Phaser.Math.Between(-20, 20);
    const spark = this.scene.add.image(sx, sy, 'particle-smoke');
    spark.setTint(0xddf0ff);
    spark.setAlpha(0.8);
    spark.setDepth(15);
    spark.setScale(0.3);

    this.scene.tweens.add({
      targets: spark,
      y: sy - 40,
      scale: 1.0,
      alpha: 0,
      duration: 400,
      onComplete: () => spark.destroy()
    });
  }
}
