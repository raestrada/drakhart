import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { EliteMecha } from '../entities/enemies/EliteMecha';
import { Barricade } from '../entities/Barricade';
import { EnergyPickup } from '../entities/EnergyPickup';
import { TarotCard } from '../entities/TarotCard';
import { EchoFragment } from '../entities/EchoFragment';
import { EnemyRegistry } from '../zones/EnemyRegistry';
import type { EnemySpawnSpec } from '../zones/types';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { saveGame } from '../systems/SaveSystem';
import {
  spawnHitParticles,
  spawnDeathExplosion,
  spawnProjectileImpact,
  spawnTransformParticles,
} from '../effects/Particles';
import { applyBiomePostFX, setVignetteFromPlayer } from '../effects/CameraFilters';
import { BaseLevelScene } from './BaseLevelScene';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import {
  CAMERA_LERP,
  CAMERA_ZOOM_HUMAN,
  CAMERA_ZOOM_DRAGON,
} from '../utils/constants';
import { t } from '../i18n';

// Zone 6 — "The Reforging"
const Z6_WIDTH = 14000;
const Z6_HEIGHT = 800;
const FORGING_HALL_START = 3500;
const SKY_TRIAL_START = 7000;
const ARENA_START = 10500;
const FORWARD_TRIGGER_X = 13900;
const DEATH_Y = 820;
const WARDEN_X = 11800;

export class GameScene6 extends BaseLevelScene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private tarotSystem!: TarotSystem;
  private terrainGen!: TerrainGenerator;
  private playerShadow!: Phaser.GameObjects.Image;

  private warden!: EliteMecha | null;
  private emperorCardSpawned = false;
  private emperorCard: TarotCard | null = null;
  private hasTransitioned = false;
  public isCutsceneActive = false;

  private bulletLights: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Light> = new Map();

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingCardsToCollect: string[] = [];
  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;

  constructor() {
    super({ key: 'GameScene6' });
  }

  init(data?: {
    startPos?: { x: number; y: number };
    cardsCollected?: string[];
    mechaUnlocked?: boolean;
    dragonUnlocked?: boolean;
  }): void {
    this.warden = null;
    this.emperorCardSpawned = false;
    this.emperorCard = null;
    this.hasTransitioned = false;
    this.isCutsceneActive = false;
    if (data) {
      if (data.startPos) {
        this.pendingSpawnX = data.startPos.x;
        this.pendingSpawnY = data.startPos.y;
      }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.mechaUnlocked !== undefined) this.pendingMechaUnlock = data.mechaUnlocked;
      if (data.dragonUnlocked !== undefined) this.pendingDragonUnlock = data.dragonUnlocked;
    }
  }

  create(): void {
    super.create();
    this.bulletLights.clear();

    this.physics.world.setBounds(0, 0, Z6_WIDTH, Z6_HEIGHT);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x2a3a30); // dim verdigris gloom
    }

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(7); // Zone 6 — "The Reforging" ruins track
    this.gameAudio.playAmbientZone?.(6);

    this.events.once('shutdown', () => {
      this.gameAudio?.stopBGM();
      this.gameAudio?.stopAmbient();
    });
    this.events.once('destroy', () => {
      this.gameAudio?.stopBGM();
      this.gameAudio?.stopAmbient();
    });

    this.terrainGen = new TerrainGenerator(this);
    this.currentBiome = 'amazon';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.enemies = this.physics.add.group();
    this.barricades = this.physics.add.staticGroup();
    this.energyPickups = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    this.createParallax();
    applyBiomePostFX(this, 'amazon');
    this.createLevel();
    this.createBarricades();
    this.createEnergyPickups();

    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect && this.pendingCardsToCollect.length > 0) {
      this.pendingCardsToCollect.forEach((cardId) => this.tarotSystem.collect(cardId, null));
    }

    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();

    this.createEchoFragment();
    this.createEnemies();
    this.setupCamera();
    this.setupCollisions();
    this.showIntroText();
    this.setupLighting();

    this.scene.launch('UIScene', {
      player: this.player,
      tarotSystem: this.tarotSystem,
    });
  }

  // ── Parallax: amazon canopy + ancient ruins haze ──
  private createParallax(): void {
    this.cameras.main.setBackgroundColor('#0a140c');

    this.add.tileSprite(0, 0, Z6_WIDTH, 1200, 'bg-amazon-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.04, 0)
      .setDepth(-30)
      .setTint(0x224433, 0x1a3322, 0x0d1a11, 0x122220);

    // Custom crimson solar eclipse
    this.add.image(450, 190, 'bg-ruins-eclipse')
      .setOrigin(0.5)
      .setScrollFactor(0.01, 0)
      .setDepth(-28);

    // Custom colossal sword-shaped ancient ruins temple landmark
    this.add.image(1400, 310, 'bg-ruins-landmark')
      .setOrigin(0.5)
      .setScrollFactor(0.07, 0)
      .setDepth(-21)
      .setTint(0x2a1e22);

    const canopy = this.add.tileSprite(0, 120, Z6_WIDTH, 800, 'bg-amazon-canopy')
      .setOrigin(0, 0)
      .setScrollFactor(0.1, 0)
      .setDepth(-22)
      .setAlpha(0.85)
      .setTint(0x224a32, 0x1a3a22, 0x0a2414, 0x122e1a);
    this.tweens.add({ targets: canopy, tilePositionX: 120, duration: 28000, loop: -1 });

    const mist = this.add.tileSprite(0, 260, Z6_WIDTH, 300, 'bg-amazon-mist')
      .setOrigin(0, 0)
      .setScrollFactor(0.18, 0)
      .setDepth(-18)
      .setAlpha(0.45)
      .setTint(0x33ffcc);
    this.tweens.add({ targets: mist, tilePositionX: 180, duration: 22000, loop: -1 });

    // Bioluminescent motes drifting through the ruins.
    this.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        const mote = this.add.rectangle(Phaser.Math.Between(0, Z6_WIDTH), -8, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4), 0x33ffcc, 0.5);
        mote.setBlendMode(Phaser.BlendModes.ADD).setDepth(40).setScrollFactor(1);
        this.tweens.add({ targets: mote, x: mote.x + Phaser.Math.Between(-60, 60), y: Z6_HEIGHT + 20, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(4000, 7000), onComplete: () => mote.destroy() });
      },
    });
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();

    // Pilgrim Tunnels — amazon ground.
    this.terrainGen.generateGroundSegment(this.platforms, 0, 768, 3500, 'amazon', 61);
    // Forging Hall — amazon floor (barricades placed on top).
    this.terrainGen.generateGroundSegment(this.platforms, 3500, 768, 3500, 'amazon', 62);
    // Sky Trial — no ground (lava-floor chasm); only the dragon can cross.
    // Warden Arena — amazon stone plaza.
    this.terrainGen.generateGroundSegment(this.platforms, ARENA_START, 768, 3500, 'amazon', 64);

    // Pilgrim Tunnels canopy ledges.
    const tunnelPlats: { x: number; y: number; w: number }[] = [
      { x: 350, y: 520, w: 128 }, { x: 800, y: 440, w: 160 },
      { x: 1300, y: 520, w: 128 }, { x: 1850, y: 460, w: 160 },
      { x: 2400, y: 520, w: 128 }, { x: 2850, y: 440, w: 160 },
      { x: 3200, y: 520, w: 128 },
    ];
    tunnelPlats.forEach(p => this.terrainGen.generatePlatform(this.platforms, p.x, p.y, p.w, 'amazon'));

    // Forging Hall elevated forge platforms.
    this.terrainGen.generatePlatform(this.platforms, 4250, 580, 128, 'amazon');
    this.terrainGen.generatePlatform(this.platforms, 5750, 580, 128, 'amazon');
    this.terrainGen.generatePlatform(this.platforms, 6850, 580, 128, 'amazon');

    // Warden Arena pillars (cover).
    this.terrainGen.generatePlatform(this.platforms, 11200, 520, 96, 'amazon');
    this.terrainGen.generatePlatform(this.platforms, 11800, 460, 96, 'amazon');
    this.terrainGen.generatePlatform(this.platforms, 12600, 520, 96, 'amazon');
    this.terrainGen.generatePlatform(this.platforms, 13200, 460, 96, 'amazon');

    // Sky Trial lava-floor chasm (instakill forces DRAGON flight across 7000-10500).
    this.terrainGen.generateThornPatch(this.hazards, 1500, 768, 96, 71);
    this.terrainGen.generateThornPatch(this.hazards, 2750, 768, 96, 72);

    this.drawRuinsProps();
  }

  private drawRuinsProps(): void {
    // Ancient stone columns layered over the amazon ground (reuses 'fg-column').
    [900, 1700, 2600, 4500, 6000, 11400, 12800, 13800].forEach(fx => {
      this.add.image(fx, 768, 'fg-column').setOrigin(0.5, 1).setDepth(60).setAlpha(0.55).setScrollFactor(0.95).setTint(0x88aa99);
    });
    // Hanging bone vines from "ceilings" / canopy (reuses 'fg-vine').
    [1400, 2200, 3000, 5200, 6700, 11600, 13000].forEach(fx => {
      this.add.image(fx, 420, 'fg-vine').setOrigin(0.5, 0).setDepth(60).setAlpha(0.5).setScrollFactor(0.95).setTint(0xaaccaa);
    });
  }

  private createBarricades(): void {
    const b1 = new Barricade(this, 4000, 768);
    const b2 = new Barricade(this, 5300, 768);
    const b3 = new Barricade(this, 6300, 768);
    this.barricades.addMultiple([b1, b2, b3]);
  }

  private createEnergyPickups(): void {
    // Sky Trial band keeps the dragon airborne across the chasm.
    let cx = 7200;
    while (cx < 10400) {
      const y = Phaser.Math.Between(260, 440);
      this.energyPickups.add(new EnergyPickup(this, cx, y));
      cx += Phaser.Math.Between(500, 700);
    }
  }

  private createEchoFragment(): void {
    const echo = new EchoFragment(this, 12200, 400, 5);
    this.physics.add.overlap(this.player, echo, () => {
      if (echo.active) echo.collect();
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow')
      .setDepth(-5)
      .setAlpha(0.5);
  }

  private spawnEnemy(spec: EnemySpawnSpec): BaseEnemy {
    const enemy = EnemyRegistry.spawn(this, spec, this.player, 6);
    this.enemies.add(enemy);
    return enemy;
  }

  private createEnemies(): void {
    // A — Pilgrim Tunnels (HUMAN-only low clearance).
    this.spawnEnemy({ type: 'spitter', x: 600, y: 600, config: { health: 45, damage: 12, patrolMinX: 540, patrolMaxX: 660 } });
    this.spawnEnemy({ type: 'leaper', x: 1100, y: 608, config: { health: 50, damage: 14, speed: 80, patrolMinX: 980, patrolMaxX: 1220 } });
    this.spawnEnemy({ type: 'sentry', x: 1600, y: 608, config: { health: 45, damage: 12, speed: 65, patrolMinX: 1500, patrolMaxX: 1700 } });
    this.spawnEnemy({ type: 'spitter', x: 2100, y: 520, config: { health: 50, damage: 14, patrolMinX: 2050, patrolMaxX: 2200 } });
    this.spawnEnemy({ type: 'leaper', x: 2600, y: 608, config: { health: 55, damage: 16, speed: 85, patrolMinX: 2480, patrolMaxX: 2720 } });
    this.spawnEnemy({ type: 'sentry', x: 3100, y: 608, config: { health: 50, damage: 14, speed: 70, patrolMinX: 3000, patrolMaxX: 3200 } });

    // B — Forging Hall (MECHA-forced by barricades + tanky mecha + shields).
    this.spawnEnemy({ type: 'mecha', x: 4100, y: 768, config: { health: 380, speed: 65, damage: 32, patrolMinX: 4000, patrolMaxX: 4300 } });
    this.spawnEnemy({ type: 'shield', x: 4800, y: 768, config: { health: 80, damage: 18, speed: 50, patrolMinX: 4700, patrolMaxX: 4900 } });
    this.spawnEnemy({ type: 'mecha', x: 5400, y: 768, config: { health: 400, speed: 70, damage: 32, patrolMinX: 5300, patrolMaxX: 5600 } });
    this.spawnEnemy({ type: 'shield', x: 6100, y: 768, config: { health: 85, damage: 20, speed: 55, patrolMinX: 6000, patrolMaxX: 6250 } });
    this.spawnEnemy({ type: 'mecha', x: 6600, y: 768, config: { health: 420, speed: 70, damage: 34, patrolMinX: 6500, patrolMaxX: 6800 } });

    // C — Sky Trial (DRAGON flight over chasm).
    const fliers: { x: number; y: number }[] = [
      { x: 7400, y: 320 }, { x: 7800, y: 360 }, { x: 8200, y: 300 },
      { x: 8600, y: 340 }, { x: 9100, y: 320 }, { x: 9600, y: 360 },
    ];
    fliers.forEach(f => this.spawnEnemy({ type: 'flying', x: f.x, y: f.y }));

    // Arena — Ancient Corrupted Warden (mini-boss): EliteMecha recolored.
    this.warden = this.spawnEnemy({ type: 'elite-mecha', x: WARDEN_X, y: 768 }) as EliteMecha;
    if (this.warden) {
      this.warden.setTint(0x6a8870);
      this.warden.setScale(2.0);
    }
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.barricades);
    this.physics.add.collider(this.enemies, this.barricades);

    this.physics.add.collider(this.player, this.enemies, (_player, _enemy) => {
      const player = _player as Player;
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0) return;
      const knockDir = player.x < enemy.x ? -1 : 1;
      player.takeDamage(enemy.attackDamage, knockDir);
    });

    this.physics.add.overlap(this.player, this.energyPickups, (_player, _pickup) => {
      const pickup = _pickup as EnergyPickup;
      pickup.collect(this.player, () => {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body) body.velocity.x += 40;
      });
    });

    this.physics.add.overlap(this.player, this.hazards, (_player, _hazard) => {
      const knockDir = this.player.x < (_hazard as Phaser.GameObjects.Sprite).x ? -1 : 1;
      this.player.takeDamage(15, knockDir);
    });

    this.physics.add.collider(this.player.combatSystem.bullets, this.platforms, (_bullet) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
      b.disableBody(true, true);
    });

    this.physics.add.overlap(this.player.combatSystem.bullets, this.enemies, (_bullet, _enemy) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      b.disableBody(true, true);
      const enemy = _enemy as BaseEnemy;
      const kbDir = b.x < enemy.x ? -1 : 1;
      enemy.takeDamage(this.player.combatSystem.getFireDamageForBullet(b), 'fire', kbDir);
      const hit = this.player.combatSystem.getDragonShotHitstop();
      this.player.combatSystem.hitstop.freeze(hit.duration, hit.intensity);
      spawnHitParticles(this, enemy.x, enemy.y);
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setFollowOffset(0, -80);
    this.cameras.main.setDeadzone(80, 60);
    this.cameras.main.setZoom(CAMERA_ZOOM_HUMAN);
    this.cameras.main.setBounds(0, 0, Z6_WIDTH, Z6_HEIGHT);
  }

  private showIntroText(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 - 40;
    const scale = this.cameras.main.width / 800;
    const banner = this.add.text(cx, cy, t('story.reforgingIntro'), {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#66ccaa',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 10 * scale,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: { from: 0, to: 0.95 }, duration: 600, yoyo: true, hold: 1800, ease: 'Power2', onComplete: () => banner.destroy() });

    const alert = this.add.text(cx, cy + 70 * scale, t('story.reforgingAlert'), {
      fontSize: `${Math.round(7 * scale)}px`, fontFamily: 'monospace', color: '#ffaa44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
    this.tweens.add({ targets: alert, alpha: { from: 0, to: 0.9 }, duration: 500, delay: 400, yoyo: true, hold: 1400, onComplete: () => alert.destroy() });
  }

  private setupLighting(): void {
    if (!this.lights || !this.lights.active) return;
    this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.hazards.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.barricades.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.enemies.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    if (this.player && this.player.active) this.player.setLighting(true);

    // Ambient verdigris gloom spots.
    [2000, 5500, 9000, 12000].forEach(x => {
      const l = this.lights!.addLight(x, 300, 700, 0x338866, 0.45);
      l.z = 200;
    });
  }

  private requestSave(): void {
    saveGame({
      cardsCollected: this.tarotSystem.collectedCards,
      mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
      dragonUnlocked: this.player.formMachine.isDragonUnlocked(),
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  update(time: number, delta: number): void {
    if (this.isCutsceneActive) return;

    if (this.player && this.player.active) {
      this.gameAudio?.update(this.player.x);
      this.gameAudio?.setCombatActive?.(this.enemies.getChildren().some(e => {
        const en = e as Phaser.Physics.Arcade.Sprite;
        return en.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, en.x, en.y) < 500;
      }));
      this.gameAudio?.setDragonActive?.(this.player.formMachine.state === FormState.DRAGON);
    }

    this.updateShadows();
    this.updateSwordVsEnemiesAndBarricades();
    this.updateBulletCleanup();
    this.updateVignettePulse();
    this.updateBulletLights();

    if (this.player.active) {
      if (this.player.y > DEATH_Y) this.player.takeDamage(100, 0);

      // Scale camera zoom with the active form (dragon shrinks, human/mecha zooms in).
      const cam = this.cameras.main;
      if (this.player.formMachine.state === FormState.DRAGON) {
        if (cam.zoom < CAMERA_ZOOM_DRAGON - 0.05) cam.zoomTo(CAMERA_ZOOM_DRAGON, 400);
      } else {
        if (cam.zoom > CAMERA_ZOOM_HUMAN + 0.05) cam.zoomTo(CAMERA_ZOOM_HUMAN, 400);
      }

      // Warden death → spawn the Emperor tarot + reforging cinematic.
      if (
        !this.emperorCardSpawned &&
        this.warden &&
        (!this.warden.active || this.warden.health <= 0)
      ) {
        this.spawnEmperorCard();
        this.triggerReforgingCinematic();
      }

      if (!this.hasTransitioned && this.player.x >= FORWARD_TRIGGER_X) {
        this.transitionToZone7();
      }
      if (!this.hasTransitioned && this.player.x <= 40) {
        this.transitionToHub();
      }
    }
  }

  private spawnEmperorCard(): void {
    this.emperorCardSpawned = true;
    this.emperorCard = new TarotCard(this, 13600, 690, 'emperor');
    this.emperorCard.setDepth(1);
    this.physics.add.overlap(this.player, this.emperorCard, () => {
      this.emperorCard?.collect(this.player);
      this.tarotSystem.collect('emperor', this.player);
      this.gameAudio?.playCardCollect();
      this.requestSave();
      this.emperorCard = null;
    });
  }

  private triggerReforgingCinematic(): void {
    this.isCutsceneActive = true;
    const cam = this.cameras.main;
    cam.flash(500, 120, 220, 160);
    cam.shake(600, 0.008);

    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;
    const banner = this.add.text(cx, cy, t('story.cinematicReforging3'), {
      fontSize: `${Math.round(11 * scale)}px`, fontFamily: 'Georgia, serif', color: '#88ffcc', stroke: '#000000', strokeThickness: 5, align: 'center', wordWrap: { width: cam.width - 120 * scale }, lineSpacing: 8 * scale,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: { from: 0, to: 0.95 }, duration: 700, yoyo: true, hold: 2000, onComplete: () => { banner.destroy(); this.isCutsceneActive = false; } });

    spawnTransformParticles(this, this.player.x, this.player.y);
  }

  private updateShadows(): void {
    const onGround = this.player.body ? (this.player.body.blocked.down || this.player.body.touching.down) : false;
    const shadowYOffset = (this.player.height * this.player.scaleY) / 2 - 2 * this.player.scaleY;
    this.playerShadow.setPosition(this.player.x, this.player.y + shadowYOffset);
    if (onGround) {
      this.playerShadow.setAlpha(0.5).setScale(this.player.scaleX);
    } else {
      this.playerShadow.setAlpha(0.2).setScale(this.player.scaleX * 0.6);
    }
  }

  private updateSwordVsEnemiesAndBarricades(): void {
    if (!this.player.combatSystem.isSwordActive()) return;
    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;
    this.enemies.getChildren().forEach(enemy => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        const isMecha = this.player.formMachine.state === FormState.MECHA;
        const kbDir = this.player.facingRight ? 1 : -1;
        e.takeDamage(this.player.combatSystem.getSwordDamage(), isMecha ? 'mecha' : 'physical', kbDir);
        spawnHitParticles(this, e.x, e.y);
      }
    });
    this.barricades.getChildren().forEach(barricade => {
      const b = barricade as Barricade;
      if (!b.active || !b.alive) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, b.getBounds())) {
        b.takeDamage(this.player.combatSystem.getSwordDamage());
      }
    });
  }

  private updateBulletCleanup(): void {
    const cam = this.cameras.main;
    this.player.combatSystem.bullets.getChildren().forEach(bul => {
      const b = bul as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      if (b.x < cam.scrollX - 100 || b.x > cam.scrollX + cam.width + 100 || b.y < cam.scrollY - 100 || b.y > cam.scrollY + cam.height + 100) {
        b.setActive(false);
        b.setVisible(false);
      }
    });
  }

  private updateVignettePulse(): void {
    if (!(this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
    const vignette = this.cameras.main.filters.internal.list.find(
      (f: Phaser.Filters.Controller) => f.renderNode === 'FilterVignette'
    ) as Phaser.Filters.Vignette | undefined;
    if (!vignette) return;
    const hpRatio = this.player.health / this.player.maxHealth;
    const heatLevel = this.player.formMachine.heat.level;
    setVignetteFromPlayer(vignette, hpRatio, heatLevel, this.time.now);
  }

  private updateBulletLights(): void {
    this.player.combatSystem.bullets.getChildren().forEach(bul => {
      const bullet = bul as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        bullet.setLighting(true);
        if (this.lights && this.lights.active) {
          let light = this.bulletLights.get(bullet);
          if (!light) {
            light = this.lights.addLight(bullet.x, bullet.y, 100, 0xff5500, 1.4);
            light.z = 25;
            this.bulletLights.set(bullet, light);
          } else {
            light.x = bullet.x;
            light.y = bullet.y;
            light.setIntensity(1.4);
          }
        }
      } else {
        const light = this.bulletLights.get(bullet);
        if (light) {
          if (this.lights) this.lights.removeLight(light);
          this.bulletLights.delete(bullet);
        }
      }
    });
  }

  private transitionToZone7(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(900, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.scene.start('TransitionScene67', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked(),
      });
    });
  }

  private transitionToHub(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(800, 0, 0, 0);
    this.time.delayedCall(800, () => {
      this.scene.start('TransitionScene56', {
        startPos: { x: 720, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked(),
      });
    });
  }

  resumeNormalCamera(): void {
    this.cameras.main.stopFollow();
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setDeadzone(50, 50);
    this.cameras.main.zoomTo(CAMERA_ZOOM_HUMAN, 500);
  }

  triggerDramaticDeath(player: Player): void {
    this.gameAudio?.stopBGM();
    this.gameAudio?.playDeathTheme?.();
    this.gameAudio?.playCoreShatter?.();
    spawnDeathExplosion(this, player.x, player.y - 12);
    this.cameras.main.shake(600, 0.015);
    this.cameras.main.flash(400, 120, 220, 160);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fade(800, 6, 4, 12);
      this.time.delayedCall(800, () => {
        this.scene.restart({
          startPos: { x: this.pendingSpawnX, y: this.pendingSpawnY },
          cardsCollected: this.tarotSystem.collectedCards,
          mechaUnlocked: true,
          dragonUnlocked: true,
        });
      });
    });
  }
}