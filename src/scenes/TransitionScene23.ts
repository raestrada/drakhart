import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { loadGame } from '../systems/SaveSystem';
import { FormState } from '../systems/FormStateMachine';

export class TransitionScene23 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;
  private refineryBackdrop!: Phaser.GameObjects.Graphics;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingMechaUnlock = true;
  private pendingDragonUnlock = true;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;

  constructor() {
    super({ key: 'TransitionScene23' });
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

    // BGM Setup (plays Level 2 theme in transition)
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(2);

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
      this.scene.launch('PauseScene', { gameScene: 'TransitionScene23' });
    });

    // 1. Sky Background (Level 3 volcanic gorge sky)
    this.add.tileSprite(0, 0, 800, 600, 'bg-sky').setOrigin(0, 0).setDepth(-30);

    // 2. SMOG/Mist
    const mist1 = this.add.tileSprite(0, 250, 800, 200, 'bg-mist').setOrigin(0, 0).setDepth(-20).setAlpha(0.25).setTint(0xff7733);
    this.tweens.add({
      targets: mist1,
      tilePositionX: 800,
      duration: 30000,
      loop: -1
    });

    // 3. Drawing factory pipes/boilers backdrop on the left edge
    this.refineryBackdrop = this.add.graphics();
    this.refineryBackdrop.setDepth(-10);
    // Factory furnace wall (x from 0 to 120, y from 450 to 736)
    this.refineryBackdrop.fillStyle(0x1e272e, 1);
    this.refineryBackdrop.fillRect(0, 450, 120, 286);
    // Grid seams
    this.refineryBackdrop.lineStyle(2, 0x0f141d, 1);
    this.refineryBackdrop.lineBetween(60, 450, 60, 736);
    this.refineryBackdrop.lineBetween(0, 540, 120, 540);
    this.refineryBackdrop.lineBetween(0, 630, 120, 630);

    // Arched frame / gate doorway on the left edge
    this.refineryBackdrop.fillStyle(0x2f3542, 1);
    this.refineryBackdrop.fillRect(0, 500, 90, 236);
    this.refineryBackdrop.lineStyle(4, 0xd2dae2, 1);
    this.refineryBackdrop.strokeRect(0, 500, 90, 236);

    // Hazard warning stripes next to doorway
    this.refineryBackdrop.fillStyle(0xeccc68, 1);
    this.refineryBackdrop.fillRect(90, 500, 15, 236);
    this.refineryBackdrop.fillStyle(0x2f3542, 1);
    for (let sy = 500; sy < 736; sy += 20) {
      this.refineryBackdrop.beginPath();
      this.refineryBackdrop.moveTo(90, sy);
      this.refineryBackdrop.lineTo(105, sy + 10);
      this.refineryBackdrop.lineTo(105, sy + 20);
      this.refineryBackdrop.lineTo(90, sy + 10);
      this.refineryBackdrop.closePath(); this.refineryBackdrop.fillPath();
    }

    // Heavy exhaust chimney stack venting heat
    this.refineryBackdrop.fillStyle(0x2f3542, 1);
    this.refineryBackdrop.fillRect(90, 390, 20, 60);
    this.refineryBackdrop.lineStyle(3, 0x111622, 1);
    this.refineryBackdrop.strokeRect(90, 390, 20, 60);

    // Glowing factory warning light
    this.refineryBackdrop.fillStyle(0xffa502, 1);
    this.refineryBackdrop.fillCircle(45, 480, 6);
    this.refineryBackdrop.lineStyle(2, 0xffffff, 1);
    this.refineryBackdrop.strokeCircle(45, 480, 6);

    // 4. Ground setup (Solid steel refinery floor from x=0 to x=600, drops off at x=600)
    this.platforms = this.physics.add.staticGroup();
    const tileW = 32;
    const tileH = 32;

    for (let tx = 0; tx < 600; tx += tileW) {
      const ty = 736;
      this.platforms.create(tx + tileW / 2, ty + tileH / 2, 'tile-refinery');
      this.platforms.create(tx + tileW / 2, ty + tileH + tileH / 2, 'tile-refinery');
    }
    // Cliff edge block at x=576
    this.platforms.create(576 + tileW / 2, 736 - tileH / 2, 'tile-refinery');

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
    this.saveAltar = new SaveAltar(this, 300, 736, 'TransitionScene23');

    // 8. Colliders
    this.physics.add.collider(this.player, this.platforms);

    // 9. Camera config: static viewport
    this.cameras.main.setBounds(0, 0, 800, 800);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 150;

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
      
      // Update shadow only when standing on platforms
      if (this.player.x < 600) {
        this.playerShadow.setAlpha(0.5);
        this.playerShadow.x = this.player.x;
        this.playerShadow.y = this.player.y + 24;
        this.playerShadow.setScale(this.player.scaleX);
      } else {
        this.playerShadow.setAlpha(0);
      }

      // Check if player falls off the cliff into the void
      if (this.player.y > 800 && this.player.alive) {
        this.player.takeDamage(100, 0); // lethal fall
      }
    }

    if (this.saveAltar && this.saveAltar.active) {
      this.saveAltar.updatePrompt(this.player);
    }

    // Bi-directional transitions
    if (this.player.active && this.player.alive && !this.hasTransitioned) {
      if (this.player.x <= 40) {
        this.transitionToLevel2();
      }
      // Can only cross to Level 3 if flying in Dragon form
      if (this.player.x >= 760 && this.player.formMachine.state === FormState.DRAGON) {
        this.transitionToLevel3();
      }
    }
  }

  private transitionToLevel2(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.showZoneTransition('SMELTING REFINERY', '#ff6622', () => {
      this.scene.start('GameScene2', {
        startPos: { x: 7800, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private transitionToLevel3(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }
    this.showZoneTransition('ASHEN GORGE', '#9933cc', () => {
      this.scene.start('GameScene3', {
        startPos: { x: 150, y: 400 },
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
      hold: 600,
    });

    const { width, height } = this.scale;
    const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    this.tweens.addCounter({
      from: 0,
      to: maxRadius,
      duration: 900,
      ease: 'Power3',
      onUpdate: (tween) => {
        const r = tween.getValue();
        if (r == null) return;
        const g = this.add.graphics();
        g.setDepth(500);
        g.setScrollFactor(0);
        g.fillStyle(0x000000, 1);
        g.fillCircle(width / 2, height / 2, r);
        this.time.delayedCall(50, () => g.destroy());
      },
    });

    this.time.delayedCall(900, onComplete);
  }
}
