import Phaser from 'phaser';
import { Player } from './Player';
import { saveGame } from '../systems/SaveSystem';
import { t } from '../i18n';

export class SaveAltar extends Phaser.Physics.Arcade.Sprite {
  private promptText: Phaser.GameObjects.Text;
  private isPraying = false;
  private sceneKey: string;

  private lightBeam: Phaser.GameObjects.Graphics | null = null;
  private lightBeamTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, sceneKey: string) {
    super(scene, x, y - 40, 'altar-save'); // offset since origin is center and height is 80
    this.sceneKey = sceneKey;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    // Prompt text shown when player is nearby
    this.promptText = scene.add.text(x, y - 90, '', {
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

    // Save Game state
    saveGame({
      cardsCollected: player.tarotSystem?.collectedCards || [],
      mechaUnlocked: player.formMachine.isMechaUnlocked(),
      dragonUnlocked: player.formMachine.isDragonUnlocked(),
      playerX: this.x,
      playerY: player.y,
      currentScene: this.sceneKey
    });

    // Play dramatic religious prayer BGM sweep
    (this.scene as any).gameAudio?.playChoirSave?.();

    // Disable player controls & force kneeling pose
    player.setInputEnabled(false);
    
    // Check form
    const isMecha = player.formMachine.isMecha();
    player.setTexture(isMecha ? 'm-kneeling' : 'h-kneeling');
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }

    // Restore full HP & Energy
    player.health = 100;
    player.formMachine.energy.addEnergy(100);

    // Create the holy light beam falling from the sky (depth behind player)
    this.lightBeam = this.scene.add.graphics();
    this.lightBeam.fillStyle(0xfffae0, 0.22); // golden-white translucent
    this.lightBeam.fillRect(player.x - 24, 0, 48, player.y + 24);
    this.lightBeam.setBlendMode(Phaser.BlendModes.ADD);
    this.lightBeam.setDepth(player.depth - 1);
    
    this.lightBeamTween = this.scene.tweens.add({
      targets: this.lightBeam,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
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

    // Stop choir audio and play level BGM back
    (this.scene as any).gameAudio?.stopChoirSave?.();
    const lvl = this.sceneKey === 'TransitionScene12' ? 1 : 2;
    (this.scene as any).gameAudio?.playBGM?.(lvl);

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

    // Re-enable player controls
    player.setInputEnabled(true);
    const isMecha = player.formMachine.isMecha();
    player.setTexture(isMecha ? 'm-idle-0' : 'h-idle-0');
    
    // Tiny delay before we allow praying again
    this.scene.time.delayedCall(250, () => {
      this.isPraying = false;
    });
  }

  destroy(fromScene?: boolean) {
    if (this.promptText && this.promptText.active) this.promptText.destroy();
    if (this.lightBeam && this.lightBeam.active) this.lightBeam.destroy();
    if (this.lightBeamTween) this.lightBeamTween.stop();
    super.destroy(fromScene);
  }
}
