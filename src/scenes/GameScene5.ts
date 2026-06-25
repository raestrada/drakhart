import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { EnergyPickup } from '../entities/EnergyPickup';
import { TarotCard } from '../entities/TarotCard';
import { EchoFragment } from '../entities/EchoFragment';
import { EliteMecha } from '../entities/enemies/EliteMecha';
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

// Zone 5 — "The Hunt"
const ZONE5_WIDTH = 16000;
const ZONE5_HEIGHT = 800;
const JUNGLE_START_X = 11200;       // where amazon biome + human escape begin
const PURSUER_X = 10400;            // EliteMecha interceptor spawn
const LANDING_X = 11400;            // where the player lands as a human
const FORWARD_TRIGGER_X = 15900;
const DEATH_Y = 820;                // below the world → instakill (lava / abyss)

export class GameScene5 extends BaseLevelScene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private tarotSystem!: TarotSystem;
  private terrainGen!: TerrainGenerator;
  private playerShadow!: Phaser.GameObjects.Image;

  private pursuer!: EliteMecha | null;
  private landingTriggered = false;
  private hasTransitioned = false;
  public isCutsceneActive = false;
  private jungleBiomeApplied = false;

  private movingPlatforms: { sprite: Phaser.Physics.Arcade.Sprite; minX: number; maxX: number; speed: number }[] = [];
  private bulletLights: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Light> = new Map();

  private pendingSpawnX = 150;
  private pendingSpawnY = 400;
  private pendingCardsToCollect: string[] = [];
  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;

  constructor() {
    super({ key: 'GameScene5' });
  }

  init(data?: {
    startPos?: { x: number; y: number };
    cardsCollected?: string[];
    mechaUnlocked?: boolean;
    dragonUnlocked?: boolean;
  }): void {
    this.landingTriggered = false;
    this.hasTransitioned = false;
    this.isCutsceneActive = false;
    this.jungleBiomeApplied = false;
    this.pursuer = null;
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

    this.physics.world.setBounds(0, 0, ZONE5_WIDTH, ZONE5_HEIGHT);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x554455); // dim industrial dusk
    }

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(6); // Zone 5 — "The Hunt" pursuit→jungle track
    this.gameAudio.playAmbientZone?.(5);

    this.events.once('shutdown', () => {
      this.gameAudio?.stopBGM();
      this.gameAudio?.stopAmbient();
    });
    this.events.once('destroy', () => {
      this.gameAudio?.stopBGM();
      this.gameAudio?.stopAmbient();
    });

    this.terrainGen = new TerrainGenerator(this);
    this.currentBiome = 'foundry';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.enemies = this.physics.add.group();
    this.energyPickups = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    this.createParallax();
    applyBiomePostFX(this, 'foundry');
    this.createLevel();
    this.createEnergyPickups();

    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect && this.pendingCardsToCollect.length > 0) {
      this.pendingCardsToCollect.forEach((cardId) => this.tarotSystem.collect(cardId, null));
    }

    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);

    this.createEchoFragment();
    this.createTarotCard();
    this.createEnemies();
    this.setupCamera();
    this.setupCollisions();

    // Force DRAGON form AFTER collisions are wired (avoids pre-step body resize crash).
    this.forceDragonForm();

    this.showIntroText();
    this.setupLighting();

    this.scene.launch('UIScene', {
      player: this.player,
      tarotSystem: this.tarotSystem,
    });
  }

  // ── Parallax: industrial pursuit sky transitioning to emerald jungle ──
  private createParallax(): void {
    this.cameras.main.setBackgroundColor('#0c0810');

    // Dark industrial sky跨越 todo el ancho (ceniza humo del imperio en alerta).
    this.add.tileSprite(0, 0, ZONE5_WIDTH, 1200, 'bg-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.04, 0)
      .setDepth(-30)
      .setTint(0x331919, 0x2a1414, 0x140a0a, 0x180808);

    // Refinery furnaces lejanas (humo de la persecución imperial).
    const furnaces = this.add.tileSprite(0, 180, ZONE5_WIDTH, 800, 'bg-refinery-furnaces')
      .setOrigin(0, 0)
      .setScrollFactor(0.08, 0)
      .setDepth(-22)
      .setAlpha(0.5)
      .setTint(0x553322, 0x442211, 0x221100, 0x331110);
    this.tweens.add({ targets: furnaces, tilePositionX: 200, duration: 26000, loop: -1 });

    // Smog band moving across the pursuit corridor.
    const smog = this.add.tileSprite(0, 320, ZONE5_WIDTH, 220, 'bg-mist')
      .setOrigin(0, 0)
      .setScrollFactor(0.16, 0)
      .setDepth(-18)
      .setAlpha(0.35)
      .setTint(0xff3300);
    this.tweens.add({ targets: smog, tilePositionX: -400, duration: 16000, loop: -1 });

    // Emerald jungle canopy begins at JUNGLE_START_X (anchored, parallax via scrollFactor).
    this.add.tileSprite(JUNGLE_START_X - 400, -40, ZONE5_WIDTH - JUNGLE_START_X + 800, 1200, 'bg-amazon-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.05, 0)
      .setDepth(-29);

    // Custom emerald celestial moon
    this.add.image(JUNGLE_START_X + 450, 190, 'bg-jungle-moon')
      .setOrigin(0.5)
      .setScrollFactor(0.01, 0)
      .setDepth(-28);

    // Custom colossal mecha-dragon skeleton landmark (overgrown)
    this.add.image(JUNGLE_START_X + 1600, 310, 'bg-jungle-landmark')
      .setOrigin(0.5)
      .setScrollFactor(0.08, 0)
      .setDepth(-21)
      .setTint(0x0e2c14);

    this.add.tileSprite(JUNGLE_START_X - 400, 120, ZONE5_WIDTH - JUNGLE_START_X + 800, 800, 'bg-amazon-canopy')
      .setOrigin(0, 0)
      .setScrollFactor(0.12, 0)
      .setDepth(-20);

    const jungleMist = this.add.tileSprite(JUNGLE_START_X - 400, 260, ZONE5_WIDTH - JUNGLE_START_X + 800, 300, 'bg-amazon-mist')
      .setOrigin(0, 0)
      .setScrollFactor(0.22, 0)
      .setDepth(-14)
      .setAlpha(0.5);
    this.tweens.add({ targets: jungleMist, tilePositionX: 220, duration: 18000, loop: -1 });

    // Lava glow strip along the bottom of the pursuit corridor.
    const lavaGlow = this.add.rectangle(0, 760, 10000, 80, 0xff3300, 0.18)
      .setOrigin(0, 0)
      .setScrollFactor(1, 1)
      .setDepth(-2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: lavaGlow, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();

    // Thin AA ledges along the pursuit corridor (industrial).
    this.terrainGen.generateGroundSegment(this.platforms, 1100, 704, 300, 'refinery', 51);
    this.terrainGen.generateGroundSegment(this.platforms, 2100, 704, 300, 'refinery', 52);
    this.terrainGen.generateGroundSegment(this.platforms, 5000, 704, 300, 'refinery', 53);
    this.terrainGen.generateGroundSegment(this.platforms, 7500, 704, 300, 'refinery', 54);

    // Pursuer arena platform.
    this.terrainGen.generateGroundSegment(this.platforms, 10100, 704, 700, 'refinery', 55);

    // Emerald Jungle walkable ground (low-clearance canopy forces HUMAN).
    this.terrainGen.generateGroundSegment(this.platforms, 11200, 768, 2200, 'amazon', 56);
    this.terrainGen.generateGroundSegment(this.platforms, 13600, 768, 2400, 'amazon', 57);

    // Canopy ledges (amazon platforming).
    const platDefs: { x: number; y: number; w: number }[] = [
      { x: 11450, y: 520, w: 128 }, { x: 11850, y: 440, w: 160 },
      { x: 12300, y: 520, w: 128 }, { x: 12750, y: 460, w: 160 },
      { x: 13250, y: 520, w: 128 }, { x: 13700, y: 440, w: 160 },
      { x: 14150, y: 520, w: 128 }, { x: 14600, y: 460, w: 160 },
      { x: 15050, y: 520, w: 128 }, { x: 15500, y: 440, w: 160 },
    ];
    platDefs.forEach(p => this.terrainGen.generatePlatform(this.platforms, p.x, p.y, p.w, 'amazon'));

    // Liana-style moving platforms through the canopy.
    const movers = [
      { x: 12100, y: 420, minX: 11980, maxX: 12320, speed: 30 },
      { x: 13000, y: 400, minX: 12850, maxX: 13200, speed: -34 },
      { x: 14300, y: 420, minX: 14180, maxX: 14520, speed: 28 },
      { x: 15200, y: 400, minX: 15050, maxX: 15420, speed: -30 },
    ];
    movers.forEach(def => {
      const plat = this.platforms.create(def.x, def.y, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      plat.setDisplaySize(64, 12);
      const body = plat.body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.setSize(64, 12);
      plat.refreshBody();
      this.movingPlatforms.push({ sprite: plat, minX: def.minX, maxX: def.maxX, speed: def.speed });
    });

    // Jungle thorns (reuse forest hazard sets) over the amazon ground.
    this.terrainGen.generateThornPatch(this.hazards, 12850, 768, 96, 71);
    this.terrainGen.generateThornPatch(this.hazards, 13850, 768, 96, 72);
    this.terrainGen.generateThornGap(this.hazards, 14850, 784, 140, 73);
  }

  private updateMovingPlatforms(delta: number): void {
    const dt = delta / 1000;
    this.movingPlatforms.forEach(mp => {
      mp.sprite.x += mp.speed * dt;
      if (mp.sprite.x > mp.maxX || mp.sprite.x < mp.minX) {
        mp.speed *= -1;
        mp.sprite.x = Phaser.Math.Clamp(mp.sprite.x, mp.minX, mp.maxX);
      }
      const body = mp.sprite.body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.position.x = mp.sprite.x - body.halfWidth;
    });
  }

  private createEnergyPickups(): void {
    // Energy band across the pursuit corridor to keep the dragon airborne.
    let cx = 500;
    while (cx < 10500) {
      const y = Phaser.Math.Between(240, 460);
      this.energyPickups.add(new EnergyPickup(this, cx, y));
      cx += Phaser.Math.Between(400, 800);
    }
  }

  private createEchoFragment(): void {
    // EchoFragment — index 4 (zone 5 → campaign counter continues).
    const echo = new EchoFragment(this, 13400, 380, 4);
    this.physics.add.overlap(this.player, echo, () => {
      if (echo.active) echo.collect();
    });
  }

  private createTarotCard(): void {
    const card = new TarotCard(this, 15800, 690, 'high-priestess');
    card.setDepth(1);
    this.physics.add.overlap(this.player, card, () => {
      card.collect(this.player);
      this.tarotSystem.collect('high-priestess', this.player);
      this.gameAudio?.playCardCollect();
      this.requestSave();
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow')
      .setDepth(-5)
      .setAlpha(0.5);
  }

  private spawnEnemy(spec: EnemySpawnSpec): BaseEnemy {
    const enemy = EnemyRegistry.spawn(this, spec, this.player, 5);
    this.enemies.add(enemy);
    return enemy;
  }

  private createEnemies(): void {
    // Section A — Besieged Peaks (dragon free-flight warmup).
    this.spawnEnemy({ type: 'flying', x: 600, y: 320 });
    this.spawnEnemy({ type: 'flying', x: 1050, y: 380 });
    this.spawnEnemy({ type: 'flying', x: 1500, y: 280 });
    this.spawnEnemy({ type: 'flying', x: 1950, y: 360 });
    this.spawnEnemy({ type: 'mecha', x: 1200, y: 704, config: { health: 350, speed: 60, damage: 30, patrolMinX: 1100, patrolMaxX: 1300 } });
    this.spawnEnemy({ type: 'spitter', x: 1700, y: 580, config: { health: 45, damage: 14, patrolMinX: 1650, patrolMaxX: 1800 } });
    this.spawnEnemy({ type: 'mecha', x: 2200, y: 704, config: { health: 380, speed: 65, damage: 30, patrolMinX: 2100, patrolMaxX: 2350 } });

    // Section B — Pursuit Corridor (dense waves of flying pursuers + AA emplacements).
    const fliers: { x: number; y: number }[] = [
      { x: 2900, y: 300 }, { x: 3150, y: 260 }, { x: 3400, y: 340 },
      { x: 4200, y: 280 }, { x: 4450, y: 340 }, { x: 4700, y: 300 },
      { x: 5500, y: 320 }, { x: 5750, y: 260 }, { x: 6000, y: 360 },
      { x: 6700, y: 300 }, { x: 6950, y: 340 }, { x: 7200, y: 280 },
      { x: 8000, y: 320 }, { x: 8250, y: 260 }, { x: 8500, y: 360 },
      { x: 9100, y: 300 }, { x: 9350, y: 340 }, { x: 9600, y: 280 },
    ];
    fliers.forEach(f => this.spawnEnemy({ type: 'flying', x: f.x, y: f.y }));

    this.spawnEnemy({ type: 'spitter', x: 3800, y: 600, config: { health: 50, damage: 16, patrolMinX: 3750, patrolMaxX: 3900 } });
    this.spawnEnemy({ type: 'mecha', x: 5100, y: 704, config: { health: 380, speed: 65, damage: 30, patrolMinX: 5000, patrolMaxX: 5250 } });
    this.spawnEnemy({ type: 'spitter', x: 6300, y: 590, config: { health: 50, damage: 16, patrolMinX: 6250, patrolMaxX: 6400 } });
    this.spawnEnemy({ type: 'mecha', x: 7600, y: 704, config: { health: 400, speed: 70, damage: 32, patrolMinX: 7500, patrolMaxX: 7750 } });
    this.spawnEnemy({ type: 'spitter', x: 8800, y: 600, config: { health: 50, damage: 16, patrolMinX: 8750, patrolMaxX: 8900 } });

    // Section C — The Pursuer (mini-boss interceptor + flying escorts).
    this.pursuer = this.spawnEnemy({ type: 'elite-mecha', x: PURSUER_X, y: 704 }) as EliteMecha;
    this.spawnEnemy({ type: 'flying', x: 10100, y: 300 });
    this.spawnEnemy({ type: 'flying', x: 10700, y: 360 });

    // Section D — The Emerald Jungle (imperial trackers pursuit on foot).
    this.spawnEnemy({ type: 'spitter', x: 11600, y: 600, config: { health: 45, damage: 12, patrolMinX: 11550, patrolMaxX: 11700 } });
    this.spawnEnemy({ type: 'leaper', x: 12100, y: 608, config: { health: 50, damage: 14, speed: 80, patrolMinX: 11980, patrolMaxX: 12220 } });
    this.spawnEnemy({ type: 'sentry', x: 12600, y: 608, config: { health: 45, damage: 12, speed: 65, patrolMinX: 12500, patrolMaxX: 12700 } });
    this.spawnEnemy({ type: 'spitter', x: 13100, y: 520, config: { health: 50, damage: 14, patrolMinX: 13050, patrolMaxX: 13200 } });
    this.spawnEnemy({ type: 'leaper', x: 13600, y: 608, config: { health: 55, damage: 16, speed: 85, patrolMinX: 13480, patrolMaxX: 13720 } });
    this.spawnEnemy({ type: 'sentry', x: 14100, y: 608, config: { health: 50, damage: 14, speed: 70, patrolMinX: 14000, patrolMaxX: 14200 } });
    this.spawnEnemy({ type: 'leaper', x: 14600, y: 520, config: { health: 55, damage: 16, speed: 85, patrolMinX: 14480, patrolMaxX: 14720 } });
    this.spawnEnemy({ type: 'spitter', x: 15000, y: 600, config: { health: 50, damage: 14, patrolMinX: 14950, patrolMaxX: 15100 } });
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.collider(this.player, this.enemies, (_player, _enemy) => {
      const player = _player as Player;
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0) return;
      const knockDir = player.x < enemy.x ? -1 : 1;
      player.takeDamage(enemy.attackDamage, knockDir);
    });

    // Energy pickups.
    this.physics.add.overlap(this.player, this.energyPickups, (_player, _pickup) => {
      const pickup = _pickup as EnergyPickup;
      pickup.collect(this.player, () => {
        // small forward nudge (reuses the shmup-style boost callback)
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body) body.velocity.x += 40;
      });
    });

    // Hazards (jungle thorns).
    this.physics.add.overlap(this.player, this.hazards, (_player, _hazard) => {
      const knockDir = this.player.x < (_hazard as Phaser.GameObjects.Sprite).x ? -1 : 1;
      this.player.takeDamage(15, knockDir);
    });

    // Dragon fire vs platforms.
    this.physics.add.collider(this.player.combatSystem.bullets, this.platforms, (_bullet) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
      b.disableBody(true, true);
    });

    // Dragon fire vs enemies.
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
    this.cameras.main.setZoom(CAMERA_ZOOM_DRAGON);
    this.cameras.main.setBounds(0, 0, ZONE5_WIDTH, ZONE5_HEIGHT);
  }

  private showIntroText(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 - 40;
    const scale = this.cameras.main.width / 800;
    const banner = this.add.text(cx, cy, t('story.theHuntIntro'), {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#ff6644',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 10 * scale,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 0.95 },
      duration: 600,
      yoyo: true,
      hold: 1800,
      ease: 'Power2',
      onComplete: () => banner.destroy(),
    });

    const alert = this.add.text(cx, cy + 70 * scale, t('story.huntAlert'), {
      fontSize: `${Math.round(7 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ffaa44',
      stroke: '#000000',
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setAlpha(0);
    this.tweens.add({ targets: alert, alpha: { from: 0, to: 0.9 }, duration: 500, delay: 400, yoyo: true, hold: 1400, onComplete: () => alert.destroy() });
  }

  private setupLighting(): void {
    if (!this.lights || !this.lights.active) return;
    this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.hazards.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.enemies.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    if (this.player && this.player.active) this.player.setLighting(true);

    // Ambient dusk spots across the pursuit corridor.
    [1500, 4500, 7500, 9500].forEach(x => {
      const l = this.lights!.addLight(x, 300, 700, 0xaa3322, 0.5);
      l.z = 200;
    });
    // Resistance camp fire glow.
    const camp = this.lights.addLight(15600, 640, 260, 0xffaa44, 1.4);
    camp.z = 40;
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
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateMovingPlatforms(delta);
    this.updateVignettePulse();
    this.updateBulletLights();

    if (this.player.active) {
      // Lava / abyss below the world → instakill (pursuit corridor尤其).
      if (this.player.y > DEATH_Y) {
        this.player.takeDamage(100, 0);
      }

      // Biome postFX switch when entering the Emerald Jungle.
      if (!this.jungleBiomeApplied && this.player.x >= JUNGLE_START_X) {
        this.jungleBiomeApplied = true;
        this.currentBiome = 'amazon';
        applyBiomePostFX(this, 'amazon');
        this.cameras.main.zoomTo(CAMERA_ZOOM_HUMAN, 600);
      }

      // Mini-boss death → forced landing cinematic.
      if (
        !this.landingTriggered &&
        this.pursuer &&
        (!this.pursuer.active || this.pursuer.health <= 0)
      ) {
        this.triggerLandingCinematic();
      }

      // Forward transition to Zone 6 hub.
      if (!this.hasTransitioned && this.player.x >= FORWARD_TRIGGER_X) {
        this.transitionToZone6();
      }
      // Back transition to Zone 4 hub.
      if (!this.hasTransitioned && this.player.x <= 40) {
        this.transitionToZone4();
      }
    }
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

  private updateSwordVsEnemies(): void {
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
  }

  private updateBulletCleanup(): void {
    const cam = this.cameras.main;
    this.player.combatSystem.bullets.getChildren().forEach(bul => {
      const b = bul as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      if (
        b.x < cam.scrollX - 100 || b.x > cam.scrollX + cam.width + 100 ||
        b.y < cam.scrollY - 100 || b.y > cam.scrollY + cam.height + 100
      ) {
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

  // ── Force DRAGON form (Z3-style: state/texture/scale only; no body resize) ──
  private forceDragonForm(): void {
    (this.player.formMachine as any).currentState = FormState.DRAGON;
    this.player.setTexture('player-dragon');
    this.player.setScale(1.45);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    (this.player.formMachine as any).flightSystem?.activate();
    this.player.formMachine.energy.addEnergy(100);
  }

  // ── Forced landing cinematic: dragon spent, revert to WARRIOR + 30 dmg ──
  private triggerLandingCinematic(): void {
    this.landingTriggered = true;
    this.isCutsceneActive = true;
    this.player.setInputEnabled(false);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);

    this.gameAudio?.setDragonActive?.(false);

    const cam = this.cameras.main;
    cam.flash(400, 255, 120, 60);
    cam.shake(500, 0.01);

    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;
    const banner = this.add.text(cx, cy, t('story.huntLanding'), {
      fontSize: `${Math.round(12 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#ff8855',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: { from: 0, to: 0.95 }, duration: 400, yoyo: true, hold: 1200, onComplete: () => banner.destroy() });

    // Crash descent + revert to human after 1.4s.
    this.time.delayedCall(1400, () => {
      // Revert to HUMAN (mirrors FormStateMachine.startRevert body setup).
      const fm = this.player.formMachine as any;
      fm.currentState = FormState.HUMAN;
      this.player.setTexture('player-human');
      this.player.setScale(0.8);
      const b = this.player.body as Phaser.Physics.Arcade.Body;
      b.allowGravity = true;
      b.setSize(36, 60);
      b.setOffset(30, 36);
      b.updateFromGameObject();
      b.setVelocity(0, 0);
      if (fm.flightSystem) fm.flightSystem.deactivate();

      // Teleport to jungle entrance + apply the 30 dmg landing penalty.
      this.player.setPosition(LANDING_X, 500);
      spawnTransformParticles(this, this.player.x, this.player.y);
      this.player.takeDamage(30, 0);
      this.player.isInvincible = true;
      this.time.delayedCall(900, () => { this.player.isInvincible = false; });

      this.isCutsceneActive = false;
      this.player.setInputEnabled(true);
      this.cameras.main.zoomTo(CAMERA_ZOOM_HUMAN, 500);
    });
  }

  private transitionToZone6(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(900, 0, 0, 0);
    this.time.delayedCall(900, () => {
      const resist = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, t('story.resistanceCamp'), {
        fontSize: '22px', fontFamily: 'Georgia, serif', color: '#ffcc66', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
      this.tweens.add({ targets: resist, alpha: { from: 0, to: 0.9 }, duration: 500, yoyo: true, hold: 1000, onComplete: () => resist.destroy() });
    });
    this.time.delayedCall(1700, () => {
      this.scene.start('TransitionScene56', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked(),
        showResistanceCinematic: true,
      });
    });
  }

  private transitionToZone4(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(800, 0, 0, 0);
    this.time.delayedCall(800, () => {
      this.scene.start('TransitionScene45', {
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
    this.cameras.main.flash(400, 220, 60, 30);
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