import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { CAMERA_LERP } from '../utils/constants';
import { t } from '../i18n';

export class TransitionScene34 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;

  constructor() { super({ key: 'TransitionScene34' }); }

  init(data?: any): void {
    this.hasTransitioned = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
    }
  }

  create(): void {
    const W = 1920, H = 1080;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#0a080c');

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(2); // Calm ambient after the boss
    this.events.once('shutdown', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    
    // Backgrounds
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.05).setDepth(-30).setTint(0x331133);
    this.add.tileSprite(0, H * 0.45, W * 1.5, H * 0.5, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.1).setDepth(-20).setAlpha(0.4).setTint(0x332244);
    
    // Ground
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    for (let tx = 0; tx < W; tx += 128) {
      const b1 = this.platforms.create(tx + 64, groundY + 92, 'tile-lava-ground') as Phaser.Physics.Arcade.Sprite;
      b1.setDisplaySize(128, 200); b1.refreshBody(); b1.setDepth(3);
    }

    // Tarot
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null as any));

    // Player
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    this.player.formMachine.unlockTransform();
    this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // Altar
    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene34');
    
    this.physics.add.collider(this.player, this.platforms);

    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  update(time: number, delta: number): void {
    if (this.hasTransitioned) return;

    this.player.update(time, delta);
    this.saveAltar.update();
    
    if (this.playerShadow && this.player.active) {
      this.playerShadow.x = this.player.x;
      const groundY = 736;
      this.playerShadow.y = groundY - 8;
      this.playerShadow.setScale(this.player.scaleX);
      this.playerShadow.setAlpha(this.player.y < groundY - 50 ? 0.2 : 0.6);
    }

    // Trigger Demo Complete
    if (this.player.x >= 1700) {
      this.triggerDemoComplete();
    }
  }

  private triggerDemoComplete(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;

    this.cameras.main.fade(2000, 0, 0, 0);

    this.time.delayedCall(2000, () => {
      const cam = this.cameras.main;
      const cx = cam.width / 2;
      const cy = cam.height / 2;

      this.add.rectangle(0, 0, cam.width * 2, cam.height * 2, 0x000000)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(1000);

      const titleText = this.add.text(cx, cy, t('ui.prototypeComplete') + '\n\n' + t('story.demoEndPrompt'), {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#ff3388',
        align: 'center',
        lineSpacing: 16,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0);

      this.tweens.add({
        targets: titleText,
        alpha: 1,
        duration: 2500,
        ease: 'Power2',
      });
    });
  }
}
