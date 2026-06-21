import Phaser from 'phaser';
import { Player } from './Player';
import { saveGame } from '../systems/SaveSystem';
import { t } from '../i18n';
import { getSceneAudio } from '../scenes/BaseLevelScene';

export class SaveAltar extends Phaser.Physics.Arcade.Sprite {
  private promptText: Phaser.GameObjects.Text;
  private isPraying = false;
  private sceneKey: string;

  private lightBeam: Phaser.GameObjects.Graphics | null = null;
  private lightBeamTween: Phaser.Tweens.Tween | null = null;

  // Idle sparkle system
  private sparkleTimer: Phaser.Time.TimerEvent | null = null;
  private altarLight: Phaser.GameObjects.PointLight | null = null;
  private altarLightBaseRadius = 60;
  private altarLightBaseIntensity = 0.35;
  private altarLightColor = 0xff8844;

  constructor(scene: Phaser.Scene, x: number, y: number, sceneKey: string) {
    super(scene, x, y - 120, 'altar-save'); // offset since origin is center and height is 240
    this.sceneKey = sceneKey;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(-2); // Render behind player so mountain doesn't block player

    // Prompt text shown when player is nearby
    this.promptText = scene.add.text(x, y - 260, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // Glow floating tween
    scene.tweens.add({
      targets: this,
      y: this.y - 6,
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Sacred pointlight behind the altar (pulsing bonfire effect)
    this.altarLight = scene.add.pointlight(x, y - 180, this.altarLightColor, this.altarLightBaseRadius, this.altarLightBaseIntensity);
    this.altarLight.setDepth(-1);
    scene.tweens.add({
      targets: this.altarLight,
      radius: this.altarLightBaseRadius + 20,
      intensity: this.altarLightBaseIntensity + 0.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Idle sparkle vortex — soft sacred chispas floating up around the altar
    this.sparkleTimer = scene.time.addEvent({
      delay: 120,
      callback: () => this.emitIdleSparkle(),
      loop: true,
    });
  }

  private emitIdleSparkle(): void {
    if (!this.active || this.isPraying) return;

    const count = Phaser.Math.Between(1, 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(25, 55);
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + 40 - Math.random() * 30;

      const colors = [0x44ff44, 0x88cc44, 0xccaa44, 0xff8844, 0x44dd66];
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(1, 3);

      const spark = this.scene.add.rectangle(sx, sy, size, size, color, 0.7);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(50);

      this.scene.tweens.add({
        targets: spark,
        x: sx + Phaser.Math.Between(-20, 20),
        y: sy - Phaser.Math.Between(40, 90),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(1200, 2200),
        ease: 'Sine.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private expandAltarLight(): void {
    if (!this.altarLight) return;
    this.scene.tweens.killTweensOf(this.altarLight);
    this.scene.tweens.add({
      targets: this.altarLight,
      radius: 140,
      intensity: 0.8,
      duration: 600,
      ease: 'Sine.easeOut',
    });
  }

  private contractAltarLight(): void {
    if (!this.altarLight) return;
    this.scene.tweens.killTweensOf(this.altarLight);
    this.scene.tweens.add({
      targets: this.altarLight,
      radius: this.altarLightBaseRadius,
      intensity: this.altarLightBaseIntensity,
      duration: 800,
      ease: 'Sine.easeIn',
    });
    // Restart the idle pulse after contraction
    this.scene.tweens.add({
      targets: this.altarLight,
      radius: this.altarLightBaseRadius + 20,
      intensity: this.altarLightBaseIntensity + 0.15,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 800,
    });
  }

  updatePrompt(player: Player): void {
    if (this.isPraying) {
      this.promptText.setAlpha(0);

      // Check if player presses any move key to stand up/cancel prayer
      const kb = this.scene.input.keyboard!;
      const cursors = kb.createCursorKeys();
      const wKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      const aKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      const sKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      const dKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      const spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      const eKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);

      const isMoveKeyPressed = 
        cursors.left.isDown || cursors.right.isDown || cursors.up.isDown || cursors.down.isDown || cursors.space.isDown ||
        wKey.isDown || aKey.isDown || sKey.isDown || dKey.isDown || spaceKey.isDown;

      const isExitPressed = Phaser.Input.Keyboard.JustDown(eKey);

      if (isMoveKeyPressed || isExitPressed) {
        this.stopPraying(player);
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y + 40, player.x, player.y);
    if (dist < 80) {
      this.promptText.setText(`[E] ${t('ui.pray') || 'PRAY'}`);
      this.promptText.setAlpha(1);

      // Check key press E
      const kb = this.scene.input.keyboard!;
      const keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      if (Phaser.Input.Keyboard.JustDown(keyE)) {
        this.triggerSave(player);
      }
    } else {
      this.promptText.setAlpha(0);
    }
  }

  private triggerSave(player: Player) {
    if (this.isPraying) return;
    this.isPraying = true;

    // Expand the sacred light halo on interaction
    this.expandAltarLight();

    // Save Game state
    saveGame({
      cardsCollected: player.tarotSystem?.collectedCards || [],
      mechaUnlocked: player.formMachine.isMechaUnlocked(),
      dragonUnlocked: player.formMachine.isDragonUnlocked(),
      playerX: this.x,
      playerY: player.y,
      currentScene: this.sceneKey
    });

    // Play dramatic religious prayer BGM sweep — stop altar BGM first
    getSceneAudio(this.scene)?.stopSacredAltarBGM?.();
    getSceneAudio(this.scene)?.stopBGM?.();
    getSceneAudio(this.scene)?.playChoirSave?.();

    // Disable player controls & force kneeling pose at altar center
    player.setInputEnabled(false);
    player.setVelocity(0, 0);
    player.x = this.x;
    
    const isMecha = player.formMachine.isMecha();
    player.setTexture(isMecha ? 'm-kneeling' : 'h-kneeling');
    player.setScale(isMecha ? 1.0 : 0.75);
    player.animState = 'kneeling';

    // Restore full HP & Energy
    player.health = 100;
    player.formMachine.energy.addEnergy(100);

    // Create dramatic light beam from sky (trapezoid, multi-layer glow)
    this.scene.time.delayedCall(300, () => {
      if (!this.active || !this.isPraying) return;
      this.lightBeam = this.scene.add.graphics();
      this.lightBeam.setDepth(player.depth - 1);
      this.lightBeam.setBlendMode(Phaser.BlendModes.ADD);
      const cam = this.scene.cameras.main;
      const topY = cam.scrollY;
      const bottomY = player.y + 30;
      const topW = 20;
      const bottomW = 120;

      // Outer glow
      for (const l of [{ a: 0.04, tw: topW * 3, bw: bottomW * 2 }, { a: 0.08, tw: topW * 1.5, bw: bottomW * 1.4 }, { a: 0.12, tw: topW, bw: bottomW }]) {
        this.lightBeam.fillStyle(0xfff8dc, l.a);
        this.lightBeam.beginPath();
        this.lightBeam.moveTo(player.x - l.tw / 2, topY);
        this.lightBeam.lineTo(player.x + l.tw / 2, topY);
        this.lightBeam.lineTo(player.x + l.bw / 2, bottomY);
        this.lightBeam.lineTo(player.x - l.bw / 2, bottomY);
        this.lightBeam.closePath(); this.lightBeam.fillPath();
      }
      // Core
      this.lightBeam.fillStyle(0xffffff, 0.18);
      this.lightBeam.beginPath();
      this.lightBeam.moveTo(player.x - 6, topY);
      this.lightBeam.lineTo(player.x + 6, topY);
      this.lightBeam.lineTo(player.x + 32, bottomY);
      this.lightBeam.lineTo(player.x - 32, bottomY);
      this.lightBeam.closePath(); this.lightBeam.fillPath();
      // Ground hit glow
      this.lightBeam.fillStyle(0xfff8dc, 0.25);
      this.lightBeam.fillEllipse(player.x, bottomY, bottomW, 12);

      this.lightBeam.setAlpha(0);
      this.scene.tweens.add({ targets: this.lightBeam, alpha: 1, duration: 500 });

      this.lightBeamTween = this.scene.tweens.add({
        targets: this.lightBeam, alpha: 0.7, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 500
      });
    });

    // Spawn visual particles rising from altar
    for (let i = 0; i < 20; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        if (!this.active) return;
        const spark = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-25, 25),
          this.y + 40,
          Phaser.Math.Between(2, 5),
          Phaser.Math.Between(2, 5),
          0xff0055
        );
        spark.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.physics.add.existing(spark);
        const sBody = spark.body as Phaser.Physics.Arcade.Body;
        if (sBody) {
          sBody.allowGravity = false;
          sBody.setVelocityY(Phaser.Math.Between(-140, -60));
        }
        this.scene.tweens.add({
          targets: spark,
          alpha: 0,
          scale: 0.1,
          duration: 900,
          onComplete: () => spark.destroy()
        });
      });
    }

    // Camera flash and shake
    this.scene.cameras.main.flash(450, 255, 245, 180);
    this.scene.cameras.main.shake(300, 0.003);

    // Display banner: "PROGRESS SAVED / PROGRESO GUARDADO"
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const banner = this.scene.add.text(cx, cy, t('ui.gameSaved') || 'PROGRESS SAVED', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ff0055',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0).setDepth(1000);

    this.scene.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1200,
      onComplete: () => {
        banner.destroy();
      }
    });
  }

  private stopPraying(player: Player): void {
    if (!this.isPraying) return;

    // Contract the sacred light halo
    this.contractAltarLight();

    // Stop choir audio and resume sacred altar BGM
    getSceneAudio(this.scene)?.stopChoirSave?.();
    getSceneAudio(this.scene)?.playSacredAltarBGM?.();

    // Fade out light beam
    if (this.lightBeam) {
      if (this.lightBeamTween) {
        this.lightBeamTween.stop();
        this.lightBeamTween = null;
      }
      const beam = this.lightBeam;
      this.lightBeam = null;
      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 300,
        onComplete: () => beam.destroy()
      });
    }

    // Re-enable player controls — restore standing pose
    player.setInputEnabled(true);
    const isMecha = player.formMachine.isMecha();
    player.setTexture(isMecha ? 'player-mecha' : 'player-human');
    player.setScale(isMecha ? 1.4 : 0.8);
    player.animState = 'idle';
    // Position standing in front of altar
    player.x = this.x;
    player.y = this.y;
    
    // Tiny delay before we allow praying again
    this.scene.time.delayedCall(250, () => {
      this.isPraying = false;
    });
  }

  destroy(fromScene?: boolean) {
    if (this.sparkleTimer) { this.sparkleTimer.destroy(); this.sparkleTimer = null; }
    if (this.altarLight && this.altarLight.active) this.altarLight.destroy();
    if (this.promptText && this.promptText.active) this.promptText.destroy();
    if (this.lightBeam && this.lightBeam.active) this.lightBeam.destroy();
    if (this.lightBeamTween) this.lightBeamTween.stop();
    super.destroy(fromScene);
  }
}
