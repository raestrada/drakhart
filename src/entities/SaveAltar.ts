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
  private glowParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private halo: Phaser.GameObjects.Ellipse | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, sceneKey: string) {
    super(scene, x, y - 40, 'altar-save');
    this.sceneKey = sceneKey;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1);

    this.promptText = scene.add.text(x, y - 100, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // Subtle altar glow
    this.halo = scene.add.ellipse(x, y - 20, 80, 14, 0xffd700, 0.08);
    this.halo.setDepth(1);
    this.halo.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: this.halo, alpha: 0.15, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    scene.tweens.add({ targets: this, y: this.y - 3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  updatePrompt(player: Player): void {
    if (this.isPraying) {
      this.promptText.setAlpha(0);
      if (this.lightBeam && this.lightBeam.active) {
        this.lightBeam.x = player.x;
        this.lightBeam.clear();
        this.drawLightBeamShaft(this.lightBeam, player.x, player.y);
      }
      const kb = this.scene.input.keyboard!;
      if (kb.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ||
          kb.createCursorKeys().left.isDown || kb.createCursorKeys().right.isDown) {
        this.stopPraying(player);
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y + 20, player.x, player.y);
    if (dist < 80) {
      this.promptText.setText(`[E] ${t('ui.pray') || 'PRAY'}`);
      this.promptText.setAlpha(0.85);
      if (Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
        this.triggerSave(player);
      }
    } else {
      this.promptText.setAlpha(0);
    }
  }

  private triggerSave(player: Player) {
    if (this.isPraying) return;
    this.isPraying = true;

    saveGame({
      cardsCollected: player.tarotSystem?.collectedCards || [],
      mechaUnlocked: player.formMachine.isMechaUnlocked(),
      dragonUnlocked: player.formMachine.isDragonUnlocked(),
      playerX: this.x,
      playerY: player.y,
      currentScene: this.sceneKey
    });

    (this.scene as any).gameAudio?.playChoirSave?.();

    player.setInputEnabled(false);
    const isMecha = player.formMachine.isMecha();
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);

    // Position player at altar and set kneeling pose
    player.x = this.x;
    player.y = this.y - (isMecha ? 40 : 30);
    player.setTexture(isMecha ? 'm-kneeling' : 'h-kneeling');
    player.setAlpha(1);
    player.animState = 'kneeling';

    // Full heal
    player.health = 100;
    player.formMachine.energy.addEnergy(100);

    // ── Dramatic Light Beam ──
    this.lightBeam = this.scene.add.graphics();
    this.lightBeam.setDepth(player.depth - 1);
    this.lightBeam.setBlendMode(Phaser.BlendModes.ADD);
    this.drawLightBeamShaft(this.lightBeam, player.x, player.y);

    this.lightBeamTween = this.scene.tweens.add({
      targets: this.lightBeam, alpha: { from: 0.6, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // ── Holy particles rising ──
    if (this.scene.textures.exists('px-4')) {
      this.glowParticles = this.scene.add.particles(player.x, player.y + 10, 'px-4', {
        speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 },
        scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 },
        tint: [0xffd700, 0xfff0aa, 0xffcc44, 0xff8800],
        lifespan: { min: 600, max: 1500 }, frequency: 60,
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-16, -10, 32, 20) } as any,
      });
      this.glowParticles.setDepth(player.depth + 5);
    }

    // ── Camera FX ──
    this.scene.cameras.main.flash(600, 255, 220, 100);
    this.scene.cameras.main.shake(400, 0.004);

    // ── Banner ──
    const cam = this.scene.cameras.main;
    const banner = this.scene.add.text(cam.width / 2, cam.height / 2 - 40, t('ui.gameSaved') || 'PROGRESS SAVED', {
      fontSize: '22px', fontFamily: 'Georgia, serif', color: '#ffcc44', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0).setDepth(1000);
    this.scene.tweens.add({ targets: banner, alpha: 1, duration: 300, yoyo: true, hold: 1500, onComplete: () => banner.destroy() });
  }

  private drawLightBeamShaft(g: Phaser.GameObjects.Graphics, x: number, groundY: number): void {
    // Wide divine shaft — trapezoid from sky to ground
    const topW = 30;
    const bottomW = 90;
    const topY = -20;
    // Multiple layers for soft glow
    const layers = [
      { alpha: 0.05, topW: topW * 3, bottomW: bottomW * 3 },
      { alpha: 0.08, topW: topW * 2, bottomW: bottomW * 2 },
      { alpha: 0.12, topW: topW * 1.5, bottomW: bottomW * 1.5 },
      { alpha: 0.18, topW: topW, bottomW: bottomW },
    ];

    for (const l of layers) {
      g.fillStyle(0xfff8dc, l.alpha);
      g.beginPath();
      g.moveTo(x - l.topW / 2, topY);
      g.lineTo(x + l.topW / 2, topY);
      g.lineTo(x + l.bottomW / 2, groundY);
      g.lineTo(x - l.bottomW / 2, groundY);
      g.closePath(); g.fillPath();
    }

    // Core bright shaft
    g.fillStyle(0xffffff, 0.25);
    g.beginPath();
    g.moveTo(x - 6, topY);
    g.lineTo(x + 6, topY);
    g.lineTo(x + 22, groundY);
    g.lineTo(x - 22, groundY);
    g.closePath(); g.fillPath();

    // Sparkle dots in beam
    g.fillStyle(0xffffff, 0.4);
    for (let i = 0; i < 8; i++) {
      const dy = groundY * Math.random();
      const dw = (bottomW / 2) * (dy / groundY);
      g.fillCircle(x + Phaser.Math.Between(-dw, dw), topY + dy, Phaser.Math.Between(1, 2));
    }
  }

  private stopPraying(player: Player): void {
    if (!this.isPraying) return;
    this.isPraying = false;

    (this.scene as any).gameAudio?.stopChoirSave?.();
    const lvl = this.sceneKey === 'TransitionScene12' ? 1 : 2;
    (this.scene as any).gameAudio?.playBGM?.(lvl);

    if (this.lightBeam) {
      if (this.lightBeamTween) { this.lightBeamTween.stop(); this.lightBeamTween = null; }
      const beam = this.lightBeam; this.lightBeam = null;
      this.scene.tweens.add({ targets: beam, alpha: 0, duration: 500, onComplete: () => beam.destroy() });
    }
    if (this.glowParticles) {
      this.glowParticles.stop();
      this.scene.time.delayedCall(800, () => { if (this.glowParticles) this.glowParticles.destroy(); this.glowParticles = null; });
    }

    player.setInputEnabled(true);
    player.setTexture(player.formMachine.isMecha() ? 'm-idle-0' : 'h-idle-0');
    player.animState = 'idle';
    player.setAlpha(1);
  }

  destroy(fromScene?: boolean) {
    if (this.promptText?.active) this.promptText.destroy();
    if (this.lightBeam?.active) this.lightBeam.destroy();
    if (this.lightBeamTween) this.lightBeamTween.stop();
    if (this.glowParticles) this.glowParticles.destroy();
    if (this.halo?.active) this.halo.destroy();
    super.destroy(fromScene);
  }
}
