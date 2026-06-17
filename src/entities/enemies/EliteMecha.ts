import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { FormState } from '../../systems/FormStateMachine';
import { spawnHitParticles, spawnDeathExplosion } from '../../effects/Particles';
import { t } from '../../i18n';

export class EliteMecha extends BaseEnemy {
  private stompCooldown = false;
  private isAttacking = false;
  private attackDuration = 0;

  // Floating UI elements
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'elite-mecha', player, {
      health: 1200,
      speed: 40,
      detectRange: 480,
      attackRange: 180,
      damage: 40,
      attackCooldown: 1600,
    });

    this.setScale(1.8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(60, 72);
    body.setOffset(34, 50);

    this.setDepth(15);

    this.createFloatingUI();
    this.createCoreIndicator();
  }

  // Core stagger mechanic
  private attacksSinceLastStagger = 0;
  private isStaggered = false;
  private staggerVulnerable = false;
  private coreGlow: Phaser.GameObjects.Rectangle | null = null;

  private createCoreIndicator(): void {
    this.coreGlow = this.scene.add.rectangle(this.x, this.y - 20, 10, 6, 0x00ff00, 0.5)
      .setDepth(this.depth + 12)
      .setScrollFactor(1.0);
  }

  private updateCoreGlow(): void {
    if (!this.coreGlow || !this.coreGlow.active) return;

    const stage = this.attacksSinceLastStagger;
    let color = 0x00ff00; // green: safe
    if (stage === 1) color = 0xffff00; // yellow
    else if (stage === 2) color = 0xff8800; // orange
    else if (stage >= 3 && this.staggerVulnerable) color = 0xff0000; // red exposed

    this.coreGlow.setPosition(this.x, this.y - 24);
    this.coreGlow.fillColor = color;

    if (this.staggerVulnerable) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
      this.coreGlow.setAlpha(pulse);
      this.coreGlow.setScale(2.0 + pulse * 1.5, 1.5 + pulse);
    } else {
      this.coreGlow.setAlpha(0.5);
      this.coreGlow.setScale(1.0, 1.0);
    }
  }

  private createFloatingUI(): void {
    // Background bar (black)
    this.healthBarBg = this.scene.add.rectangle(this.x, this.y - 88, 90, 8, 0x000000)
      .setDepth(this.depth + 10)
      .setScrollFactor(1.0);

    // Health fill (red-orange)
    this.healthBarFill = this.scene.add.rectangle(this.x - 45, this.y - 88, 90, 8, 0xe15f41)
      .setOrigin(0, 0.5)
      .setDepth(this.depth + 11)
      .setScrollFactor(1.0);

    // Mini-boss name text
    this.nameText = this.scene.add.text(this.x, this.y - 104, t('boss.eliteName') || 'DRACONEL BASTION', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffc048',
      stroke: '#000000',
      strokeThickness: 2,
    })
      .setOrigin(0.5)
      .setDepth(this.depth + 10)
      .setScrollFactor(1.0);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active || !this.isActive || this.health <= 0) {
      this.hideUI();
      return;
    }

    // Update floating UI positions
    const uiX = this.x;
    const uiY = this.y - 88;
    if (this.healthBarBg && this.healthBarBg.active) {
      this.healthBarBg.setPosition(uiX, uiY);
    }
    if (this.healthBarFill && this.healthBarFill.active) {
      this.healthBarFill.setPosition(uiX - 45, uiY);
      this.healthBarFill.width = 90 * Math.max(0, this.health / this.maxHealth);
    }
    if (this.nameText && this.nameText.active) {
      this.nameText.setPosition(uiX, uiY - 14);
    }

    this.updateCoreGlow();

    if (this.isAttacking) {
      this.play('elm-attack', true);
      this.attackDuration -= delta;
      if (this.attackDuration <= 0) {
        this.isAttacking = false;
      }
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const isMoving = Math.abs(body.velocity.x) > 10;

      if (isMoving) {
        this.play('elm-walk', true);
      } else {
        this.play('elm-idle', true);
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    if (amount >= 9000) {
      console.log("%c[CHEAT DETECTED] EliteMecha: One-Hit Kills is active! Damage:", "color: #ff3838; font-weight: bold;", amount);
    }

    const playerState = this.player.formMachine.state;
    if (playerState === FormState.HUMAN || playerState === FormState.EXHAUSTED) {
      // Immune to human attacks
      (this.scene as any).gameAudio?.playShieldBlock?.();

      for (let i = 0; i < 8; i++) {
        const spark = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-24, 24),
          this.y + Phaser.Math.Between(-35, 35),
          3, 3, 0x00d2d3
        );
        this.scene.tweens.add({
          targets: spark,
          y: spark.y - 32,
          alpha: 0,
          duration: 350,
          onComplete: () => spark.destroy()
        });
      }

      const immuneText = this.scene.add.text(this.x, this.y - 60, 'IMMUNE', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#00d2d3',
        stroke: '#000000',
        strokeThickness: 2.5
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: immuneText,
        y: immuneText.y - 24,
        alpha: 0,
        duration: 700,
        onComplete: () => immuneText.destroy()
      });
      return;
    }

    const damage = this.staggerVulnerable ? amount * 2 : amount;
    super.takeDamage(damage);
  }

  protected doAttack(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    this.attacksSinceLastStagger++;

    if (this.attacksSinceLastStagger >= 3) {
      this.triggerStagger();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

    if (dist < 150 && Math.random() > 0.5) {
      this.executeStompAttack();
    } else {
      this.executePlasmaCannon();
    }
  }

  private triggerStagger(): void {
    this.staggerVulnerable = true;
    this.isAttacking = false;

    this.setTint(0xff6644);
    (this.scene as any).gameAudio?.playShieldBlock?.();

    this.scene.time.delayedCall(2000, () => {
      this.staggerVulnerable = false;
      this.attacksSinceLastStagger = 0;
      if (this.active) this.clearTint();
    });

    // Tutorial banner on first stagger
    if (!this._bannerShown) {
      this._bannerShown = true;
      const cam = this.scene.cameras.main;
      const bx = cam.width / 2;
      const by = cam.height * 0.25;
      const banner = this.scene.add.text(bx, by, 'CORE EXPOSED — ATTACK!', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

      this.scene.tweens.add({
        targets: banner,
        alpha: { from: 0, to: 1 },
        y: by - 10,
        duration: 200,
        yoyo: true,
        hold: 1500,
        onComplete: () => banner.destroy(),
      });
    }
  }

  private _bannerShown = false;

  private executePlasmaCannon(): void {
    this.isAttacking = true;
    this.attackDuration = 800;
    this.play('elm-attack', true);

    (this.scene as any).gameAudio?.playFireball?.();

    const shootDir = this.player.x < this.x ? -1 : 1;
    this.setFlipX(shootDir < 0);

    // Fire 3 fireballs in a small spread towards the player
    for (let i = -1; i <= 1; i++) {
      this.scene.time.delayedCall((i + 1) * 120, () => {
        if (!this.active || this.health <= 0) return;

        const spawnX = this.x + shootDir * 50;
        const spawnY = this.y - 12;

        if (this.scene.lights) {
          const flash = this.scene.lights.addLight(spawnX, spawnY, 70, 0xff5500, 0.7);
          this.scene.time.delayedCall(100, () => this.scene.lights.removeLight(flash));
        }

        const bullet = this.scene.physics.add.sprite(spawnX, spawnY, 'bullet-fire');
        bullet.setTint(0xff5500); // Hot magma plasma spit
        bullet.setScale(1.4);

        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.allowGravity = false;

        // Calculate direction towards player
        const dx = this.player.x - spawnX;
        const dy = (this.player.y - 12) - spawnY;
        let angle = Math.atan2(dy, dx);
        
        // Add angular offset for spread
        angle += i * 0.12;

        const bulletSpeed = 320;
        bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

        this.scene.physics.add.overlap(this.player, bullet, () => {
          if (!bullet.active) return;
          bullet.destroy();
          const knockDir = this.player.x < this.x ? -1 : 1;
          this.player.takeDamage(this.attackDamage * 0.6, knockDir);
        });

        this.scene.time.delayedCall(3000, () => {
          if (bullet.active) bullet.destroy();
        });
      });
    }
  }

  private executeStompAttack(): void {
    if (this.stompCooldown) {
      this.executePlasmaCannon();
      return;
    }

    this.stompCooldown = true;
    this.isAttacking = true;
    this.attackDuration = 900;
    this.play('elm-attack', true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Jump slightly in the air
    body.setVelocityY(-220);

    // Stomp impact when falling back
    this.scene.time.delayedCall(450, () => {
      if (!this.active || this.health <= 0) return;

      // Heavy stomp impact sound/shake
      (this.scene as any).gameAudio?.playLand?.();
      this.scene.cameras.main.shake(320, 0.009);

      // Create ground shockwaves expanding left and right
      const shockL = this.scene.add.rectangle(this.x - 20, this.y + 40, 20, 8, 0xff7700);
      const shockR = this.scene.add.rectangle(this.x + 20, this.y + 40, 20, 8, 0xff7700);
      shockL.setDepth(this.depth - 1);
      shockR.setDepth(this.depth - 1);

      this.scene.physics.add.existing(shockL, true);
      this.scene.physics.add.existing(shockR, true);

      // Expand left shockwave
      this.scene.tweens.add({
        targets: shockL,
        x: this.x - 200,
        scaleX: 8,
        alpha: 0,
        duration: 450,
        onUpdate: () => {
          if (!shockL.active || !this.player.active) return;
          if (Phaser.Geom.Intersects.RectangleToRectangle(shockL.getBounds(), this.player.getBounds())) {
            this.player.takeDamage(this.attackDamage * 0.8, -1);
            shockL.destroy();
          }
        },
        onComplete: () => {
          if (shockL.active) shockL.destroy();
        }
      });

      // Expand right shockwave
      this.scene.tweens.add({
        targets: shockR,
        x: this.x + 200,
        scaleX: 8,
        alpha: 0,
        duration: 450,
        onUpdate: () => {
          if (!shockR.active || !this.player.active) return;
          if (Phaser.Geom.Intersects.RectangleToRectangle(shockR.getBounds(), this.player.getBounds())) {
            this.player.takeDamage(this.attackDamage * 0.8, 1);
            shockR.destroy();
          }
        },
        onComplete: () => {
          if (shockR.active) shockR.destroy();
        }
      });
    });

    // Stomp cooldown
    this.scene.time.delayedCall(3000, () => {
      this.stompCooldown = false;
    });
  }

  private hideUI(): void {
    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.healthBarFill) this.healthBarFill.destroy();
    if (this.nameText) this.nameText.destroy();
    if (this.coreGlow) { this.coreGlow.destroy(); this.coreGlow = null; }
  }

  protected die(): void {
    this.hideUI();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x333333);

    // Death explosion cascade
    this.scene.cameras.main.shake(1200, 0.015);
    (this.scene as any).gameAudio?.playEnemyDeath?.();

    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.scene) return;
        const ox = this.x + Phaser.Math.Between(-30, 30);
        const oy = this.y + Phaser.Math.Between(-45, 45);
        spawnDeathExplosion(this.scene, ox, oy);
        
        // Custom giant orange sparks
        for (let j = 0; j < 5; j++) {
          const spark = this.scene.add.rectangle(ox, oy, 6, 6, 0xffaa00);
          spark.setDepth(this.depth + 1);
          this.scene.tweens.add({
            targets: spark,
            x: ox + Phaser.Math.Between(-60, 60),
            y: oy + Phaser.Math.Between(-60, 60),
            alpha: 0,
            duration: 600,
            onComplete: () => spark.destroy()
          });
        }
      });
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 1200,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    this.hideUI();
    super.destroy(fromScene);
  }
}
