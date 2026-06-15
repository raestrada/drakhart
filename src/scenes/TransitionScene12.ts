import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { loadGame } from '../systems/SaveSystem';

export class TransitionScene12 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;
  private factoryGateBG!: Phaser.GameObjects.Graphics;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;

  constructor() {
    super({ key: 'TransitionScene12' });
  }

  init(data?: { startPos?: { x: number; y: number }; cardsCollected?: string[]; mechaUnlocked?: boolean; dragonUnlocked?: boolean }): void {
    this.hasTransitioned = false;
    if (data) {
      if (data.startPos) {
        this.pendingSpawnX = data.startPos.x;
        this.pendingSpawnY = data.startPos.y;
      }
      if (data.cardsCollected) {
        this.pendingCardsToCollect = data.cardsCollected;
      }
      if (data.mechaUnlocked !== undefined) {
        this.pendingMechaUnlock = data.mechaUnlocked;
      }
      if (data.dragonUnlocked !== undefined) {
        this.pendingDragonUnlock = data.dragonUnlocked;
      }
    }
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.physics.world.setBounds(0, 0, 800, 800);

    // BGM Setup (plays Level 1 theme in transition)
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(1);

    this.events.once('shutdown', () => {
      this.gameAudio.stopBGM();
      this.gameAudio.stopChoirSave();
    });
    this.events.once('destroy', () => {
      this.gameAudio.stopBGM();
      this.gameAudio.stopChoirSave();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: 'TransitionScene12' });
    });

    // 1. Sky Background
    this.add.tileSprite(0, 0, 800, 600, 'bg-sky').setOrigin(0, 0).setDepth(-30);

    // 2. Parallax Mist
    const mist1 = this.add.tileSprite(0, 250, 800, 200, 'bg-mist').setOrigin(0, 0).setDepth(-20).setAlpha(0.2);
    this.tweens.add({
      targets: mist1,
      tilePositionX: 800,
      duration: 35000,
      loop: -1
    });

    // 3. Drawing factory wall entrance backdrop on the right edge
    this.factoryGateBG = this.add.graphics();
    this.factoryGateBG.setDepth(-10);
    // Factory steel wall (x from 680 to 800, y from 450 to 736)
    this.factoryGateBG.fillStyle(0x1e272e, 1);
    this.factoryGateBG.fillRect(680, 450, 120, 286);
    // Steel plating grid lines
    this.factoryGateBG.lineStyle(2, 0x0f141d, 1);
    this.factoryGateBG.lineBetween(740, 450, 740, 736);
    this.factoryGateBG.lineBetween(680, 540, 800, 540);
    this.factoryGateBG.lineBetween(680, 630, 800, 630);

    // Arched frame / gate doorway on the right transition edge
    this.factoryGateBG.fillStyle(0x2f3542, 1);
    this.factoryGateBG.fillRect(710, 500, 90, 236);
    this.factoryGateBG.lineStyle(4, 0xd2dae2, 1);
    this.factoryGateBG.strokeRect(710, 500, 90, 236);

    // Hazard warning stripes next to doorway
    this.factoryGateBG.fillStyle(0xeccc68, 1);
    this.factoryGateBG.fillRect(695, 500, 15, 236);
    this.factoryGateBG.fillStyle(0x2f3542, 1);
    for (let sy = 500; sy < 736; sy += 20) {
      this.factoryGateBG.beginPath();
      this.factoryGateBG.moveTo(695, sy);
      this.factoryGateBG.lineTo(710, sy + 10);
      this.factoryGateBG.lineTo(710, sy + 20);
      this.factoryGateBG.lineTo(695, sy + 10);
      this.factoryGateBG.closePath(); this.factoryGateBG.fillPath();
    }

    // Glowing factory warning light
    this.factoryGateBG.fillStyle(0xff3355, 1);
    this.factoryGateBG.fillCircle(755, 480, 6);
    this.factoryGateBG.lineStyle(2, 0xffffff, 1);
    this.factoryGateBG.strokeCircle(755, 480, 6);

    // 4. Ground setup (forest ground on left up to 680, metal floor from 680 to 800)
    this.platforms = this.physics.add.staticGroup();
    const tileW = 32;
    const tileH = 32;

    for (let tx = 0; tx < 800; tx += tileW) {
      const isRefinery = tx >= 680;
      const textureKey = isRefinery ? 'tile-refinery' : 'tile-ground';
      const ty = 736;
      // Floor
      this.platforms.create(tx + tileW / 2, ty + tileH / 2, textureKey);
      this.platforms.create(tx + tileW / 2, ty + tileH + tileH / 2, textureKey);
      
      // Grass outline for the forest ground
      if (!isRefinery) {
        this.platforms.create(tx + tileW / 2, ty - 8, 'tile-grass');
      }
    }

    // 5. Tarot System
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect && this.pendingCardsToCollect.length > 0) {
      this.pendingCardsToCollect.forEach((cardId) => {
        this.tarotSystem.collect(cardId, null as any);
      });
    }

    // 6. Create Player
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();

    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // 7. Large Save Altar
    this.saveAltar = new SaveAltar(this, 400, 736, 'TransitionScene12');

    // 8. Colliders
    this.physics.add.collider(this.player, this.platforms);

    // 9. Camera config: center viewport staticly on this 800x600 screen
    this.cameras.main.setBounds(0, 0, 800, 800);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 150; // align center vertically

    // 10. Screen Vignette
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.4);
    vignette.fillRect(0, 0, 800, 800);
    vignette.setDepth(100);
    vignette.setScrollFactor(0);
  }

  update(time: number, delta: number): void {
    if (this.player && this.player.active) {
      this.gameAudio?.update(this.player.x);
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }

    if (this.saveAltar && this.saveAltar.active) {
      this.saveAltar.updatePrompt(this.player);
    }

    // Bi-directional transitions
    if (this.player.active && !this.hasTransitioned) {
      if (this.player.x <= 40) {
        this.transitionToLevel1();
      }
      if (this.player.x >= 760) {
        this.transitionToLevel2();
      }
    }
  }

  private transitionToLevel1(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.showZoneTransition('ASHEN WOODS', '#886644', () => {
      this.scene.start('GameScene', {
        startPos: { x: 7800, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private transitionToLevel2(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.showZoneTransition('SMELTING REFINERY', '#ff6622', () => {
      this.scene.start('GameScene2', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private showZoneTransition(zoneName: string, color: string, onComplete: () => void): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const text = this.add.text(cx, cy, zoneName, {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(300).setScrollFactor(0);

    this.tweens.add({
      targets: text,
      alpha: { from: 0, to: 0.9 },
      duration: 300,
      yoyo: true,
      hold: 400,
    });

    this.cameras.main.fade(900, 0, 0, 0);
    this.time.delayedCall(900, onComplete);
  }
}
