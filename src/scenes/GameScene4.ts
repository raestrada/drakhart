import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { MechaEnemy } from '../entities/enemies/MechaEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { LeaperEnemy } from '../entities/enemies/LeaperEnemy';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { EliteMecha } from '../entities/enemies/EliteMecha';
import { Boss } from '../entities/enemies/Boss';
import { Barricade } from '../entities/Barricade';
import { TarotCard } from '../entities/TarotCard';
import { EnergyPickup } from '../entities/EnergyPickup';
import { CrumblingPlatform } from '../entities/CrumblingPlatform';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { saveGame } from '../systems/SaveSystem';
import { EchoFragment } from '../entities/EchoFragment';
import { spawnHitParticles, spawnDeathExplosion, spawnProjectileImpact } from '../effects/Particles';
import { BloomSystem } from '../effects/BloomSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { BaseLevelScene } from './BaseLevelScene';
import { applyBiomePostFX, setVignetteFromPlayer } from '../effects/PostFXPipelines';
import { WeatherSystem } from '../systems/WeatherSystem';
import {
  LEVEL_HEIGHT, CAMERA_LERP, CAMERA_ZOOM_HUMAN,
  MECHA_SWORD_DAMAGE, FIRE_DAMAGE,
} from '../utils/constants';

// ── Flak Cannon — fixed anti-air turret (Dragon fire only) ──
class FlakCannon extends BaseEnemy {
  private fireTimer = 0;
  private fireCooldown = 2000;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'enemy-sentry', player, {
      health: 40, speed: 0, detectRange: 800, attackRange: 700, damage: 12, attackCooldown: 2000
    });
    this.setTint(0xff6644);
    this.setScale(1.3);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    if (time - this.fireTimer > this.fireCooldown) {
      this.fireTimer = time;
      const bullet = this.scene.physics.add.sprite(this.x, this.y, 'bullet-fire');
      bullet.setTint(0xff4400); bullet.setScale(0.8); bullet.setBlendMode(Phaser.BlendModes.ADD);
      (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
      bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
      this.scene.physics.add.overlap(this.player, bullet, () => {
        if (!bullet.active) return;
        bullet.destroy();
        this.player.takeDamage(this.attackDamage, -1);
      });
      this.scene.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
    }
  }

  takeDamage(amount: number): void {
    // Only fire damage can hurt the cannon (Dragon form)
    if (this.player.formMachine.state !== FormState.DRAGON) {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(60, () => { if (this.active) this.setTint(0xff6644); });
      return;
    }
    super.takeDamage(amount);
  }
}

// ── Imperial Knight — fast armored soldier ──
class ImperialKnight extends ShieldEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, patrolMin: number, patrolMax: number) {
    super(scene, x, y, player, {
      health: 80, damage: 18, speed: 75, attackRange: 50,
      patrolMinX: patrolMin, patrolMaxX: patrolMax,
    });
    this.setTint(0xccaa44, 0x886622, 0x664422, 0xaa8844);
  }
}

// ── The Gatekeeper — 3-phase boss ──
class Gatekeeper extends Boss {
  private gatePhase: 'armor' | 'flight' | 'duel' = 'armor';
  private gateFireTimer = 0;
  private arenaX: number;
  private arenaY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, player);
    this.health = 900;
    this.maxHealth = 900;
    this.arenaX = x;
    this.arenaY = y;
    this.setScale(2.0);
    this.setTint(0x886644);
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.gatePhase === 'armor') {
      // Phase 1: Slow ground tank — vulnerable to MECHA
      body.setVelocityX(Math.sin(time * 0.001) * 40);
      if (time - this.gateFireTimer > 1800) {
        this.gateFireTimer = time;
        this.fireSpread(3, 180);
      }
    } else if (this.gatePhase === 'flight') {
      // Phase 2: Flying — vulnerable to DRAGON
      body.allowGravity = false;
      body.setVelocityY(Math.sin(time * 0.003) * 50);
      body.setVelocityX(Math.sin(time * 0.0015) * 60);
      if (time - this.gateFireTimer > 1200) {
        this.gateFireTimer = time;
        this.fireSpread(5, 250);
      }
    } else if (this.gatePhase === 'duel') {
      // Phase 3: Grounded weakened — vulnerable to WARRIOR sword
      body.allowGravity = true;
      body.setVelocityX(Math.sin(time * 0.002) * 30);
      if (time - this.gateFireTimer > 2200) {
        this.gateFireTimer = time;
        this.fireSpread(2, 140);
      }
    }
  }

  private fireSpread(count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.scene.time.now * 0.001;
      const bullet = this.scene.physics.add.sprite(this.x, this.y, 'bullet-fire');
      bullet.setTint(0xff5500); bullet.setScale(0.7); bullet.setBlendMode(Phaser.BlendModes.ADD);
      (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.scene.physics.add.overlap(this.player, bullet, () => {
        if (!bullet.active) return;
        bullet.destroy();
        this.player.takeDamage(this.attackDamage * 0.6, -1);
      });
      this.scene.time.delayedCall(2500, () => { if (bullet.active) bullet.destroy(); });
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;
    const playerState = this.player.formMachine.state;

    // Phase gating — wrong form = no damage
    if (this.gatePhase === 'armor' && playerState !== FormState.MECHA) return;
    if (this.gatePhase === 'flight' && playerState !== FormState.DRAGON) return;

    super.takeDamage(amount);

    // Phase transitions
    if (this.health <= 600 && this.gatePhase === 'armor') {
      this.gatePhase = 'flight';
      this.setTint(0x4488cc);
      this.scene.cameras.main.shake(600, 0.01);
      this.scene.cameras.main.flash(300, 100, 150, 255);
    } else if (this.health <= 300 && this.gatePhase === 'flight') {
      this.gatePhase = 'duel';
      this.setTint(0xcc4444);
      this.scene.cameras.main.shake(400, 0.015);
      this.scene.cameras.main.flash(300, 255, 100, 50);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = true;
      body.setVelocityY(-100);
    }
  }

  protected die(): void {
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.cameras.main.shake(1200, 0.02);
    this.scene.cameras.main.flash(800, 255, 200, 0);
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        spawnDeathExplosion(this.scene, this.x + Phaser.Math.Between(-60, 60), this.y + Phaser.Math.Between(-60, 60));
      });
    }
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 2, scaleY: 2, duration: 2000,
      onComplete: () => this.destroy(),
    });
  }
}

// ── GameScene4 ──

export class GameScene4 extends BaseLevelScene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private tarotSystem!: TarotSystem;
  private bloom!: BloomSystem;
  private weatherSystem!: WeatherSystem;
  private terrainGen!: TerrainGenerator;
  private crumblingPlatforms: CrumblingPlatform[] = [];
  private boss: Gatekeeper | null = null;
  private bossActive = false;
  private playerShadow!: Phaser.GameObjects.Image;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingCardsToCollect: string[] = [];
  private pendingMechaUnlock = true;
  private pendingDragonUnlock = true;
  private demoEnded = false;

  private readonly WORLD_W = 15000;
  private readonly WORLD_H = 1000;

  constructor() { super('GameScene4'); }

  init(data?: any): void {
    this.demoEnded = false;
    this.bossActive = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.mechaUnlocked !== undefined) this.pendingMechaUnlock = data.mechaUnlocked;
      if (data.dragonUnlocked !== undefined) this.pendingDragonUnlock = data.dragonUnlocked;
    }
  }

  create(): void {
    super.create();
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.cameras.main.setBackgroundColor('#08040c');

    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.lights.enable();
      this.lights.setAmbientColor(0x554433);
    }

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(5);
    this.events.once('shutdown', () => { this.gameAudio.stopBGM(); this.bloom?.destroy(); });
    this.events.once('destroy', () => { this.gameAudio.stopBGM(); this.bloom?.destroy(); });

    this.bloom = new BloomSystem(this);
    this.terrainGen = new TerrainGenerator(this);
    this.currentBiome = 'foundry';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.createParallax();
    this.weatherSystem = new WeatherSystem(this, 'refinery', this.WORLD_W);
    applyBiomePostFX(this, 'foundry');
    this.createLevel();
    this.createDecorations();
    this.createEchoFragments();
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null as any));
    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.6);
    this.createEnemies();
    this.createTarotCards();
    this.setupCamera();
    this.setupCollisions();
    this.setupLightingAndPipelines();

    this.scene.launch('UIScene', { player: this.player, tarotSystem: this.tarotSystem });
  }

  // ── Parallax ──
  private createParallax(): void {
    this.add.tileSprite(0, 0, this.WORLD_W, 1200, 'bg-refinery-sky').setOrigin(0, 0).setScrollFactor(0.02, 0).setDepth(-30).setTint(0x662222, 0x662222, 0x331111, 0x331111);
    this.add.tileSprite(0, 180, this.WORLD_W, 800, 'bg-refinery-furnaces').setOrigin(0, 0).setScrollFactor(0.06, 0).setDepth(-20).setTint(0x664444, 0x663344, 0x331122, 0x442233);
    this.add.tileSprite(0, 240, this.WORLD_W, 800, 'bg-refinery-structures').setOrigin(0, 0).setScrollFactor(0.14, 0).setDepth(-10).setTint(0x553333, 0x553344, 0x221111, 0x331122);
  }

  // ── Level Layout ──
  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.barricades = this.physics.add.staticGroup();
    this.energyPickups = this.physics.add.staticGroup();
    const groundY = 768;

    // Section A: Sky Gate (0-5000) — open flight zone with scattered ground
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, 800, 'forest', 1);
    this.terrainGen.generateGroundSegment(this.platforms, 1200, groundY, 600, 'forest', 2);
    this.terrainGen.generateGroundSegment(this.platforms, 2200, groundY, 400, 'forest', 3);
    this.terrainGen.generateGroundSegment(this.platforms, 3000, groundY, 800, 'forest', 4);
    this.terrainGen.generateGroundSegment(this.platforms, 4200, groundY, 800, 'forest', 5);

    // Floating platforms for dragon flight section A
    [600, 1000, 1500, 2000, 2600, 2800, 3500, 3800].forEach((x, i) => {
      const y = 500 + Math.sin(i * 1.5) * 80;
      this.terrainGen.generatePlatform(this.platforms, x, y, 64, 'forest');
    });

    // Barricade at end of Section A (5000) — requires Mecha
    const b1 = new Barricade(this, 4950, 704);
    this.barricades.add(b1);

    // Section B: Forge Floor (5000-10000) — mechanical interior
    this.terrainGen.generateGroundSegment(this.platforms, 5050, groundY, 1500, 'refinery', 6);
    this.terrainGen.generateGroundSegment(this.platforms, 6800, groundY, 1200, 'refinery', 7);
    this.terrainGen.generateGroundSegment(this.platforms, 8300, groundY, 1700, 'refinery', 8);
    // Ducts (narrow passages, only Warrior fits) — atajo con recompensa
    this.terrainGen.generatePlatform(this.platforms, 6200, 600, 48, 'refinery');

    // Ceiling platforms for Dragon in section B
    [5500, 6000, 7000, 7600, 8500, 9200].forEach((x, i) => {
      this.terrainGen.generatePlatform(this.platforms, x, 400 + Math.sin(i) * 60, 80, 'refinery');
    });

    // Barricade at end of Section B (9900)
    const b2 = new Barricade(this, 9900, 704);
    this.barricades.add(b2);

    // Section C: The Reliquary (10000-15000) — open arena
    this.terrainGen.generateGroundSegment(this.platforms, 10050, groundY, 2500, 'gorge', 9);
    this.terrainGen.generateGroundSegment(this.platforms, 12800, groundY, 2200, 'gorge', 10);

    // Arena pillars for boss fight
    [11000, 11500, 12000, 12500, 13000, 13500].forEach(x => {
      this.terrainGen.generatePlatform(this.platforms, x, 550, 48, 'gorge');
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.6);
  }

  // ── Enemies ──
  private createEnemies(): void {
    this.enemies = this.physics.add.group();

    // Section A — Sky Gate (0-5000)
    const fa1 = new FlakCannon(this, 800, 500, this.player);
    const fa2 = new FlakCannon(this, 1800, 480, this.player);
    const fa3 = new FlakCannon(this, 3400, 520, this.player);
    const fs1 = new FlyingEnemy(this, 1000, 350, this.player);
    const fs2 = new FlyingEnemy(this, 2200, 380, this.player);
    const fs3 = new FlyingEnemy(this, 3800, 360, this.player);
    const ls1 = new LeaperEnemy(this, 2800, 738, this.player, { health: 60, damage: 15, speed: 80, patrolMinX: 2700, patrolMaxX: 2950 });
    const ls2 = new LeaperEnemy(this, 4500, 738, this.player, { health: 65, damage: 16, speed: 85, patrolMinX: 4400, patrolMaxX: 4650 });

    // Section B — Forge Floor (5000-10000)
    const m1 = new MechaEnemy(this, 5500, 700, this.player, { health: 380, speed: 65, patrolMinX: 5100, patrolMaxX: 5800 });
    const m2 = new MechaEnemy(this, 6200, 700, this.player, { health: 400, speed: 70, patrolMinX: 6000, patrolMaxX: 6400 });
    const m3 = new MechaEnemy(this, 7300, 700, this.player, { health: 420, speed: 70, patrolMinX: 7000, patrolMaxX: 7500 });
    const ik1 = new ImperialKnight(this, 8000, 700, this.player, 7800, 8200);
    const ik2 = new ImperialKnight(this, 8800, 700, this.player, 8600, 9000);
    const sp1 = new SpitterEnemy(this, 6800, 650, this.player, { health: 50, damage: 14, patrolMinX: 6700, patrolMaxX: 6950 });

    // Section C — Reliquary (10000-15000)
    const fs4 = new FlyingEnemy(this, 10500, 350, this.player);
    const fs5 = new FlyingEnemy(this, 11000, 380, this.player);
    const b1 = new ShieldEnemy(this, 11500, 738, this.player, { health: 80, damage: 20, speed: 55, patrolMinX: 11300, patrolMaxX: 11700 });

    this.enemies.addMultiple([fa1, fa2, fa3, fs1, fs2, fs3, ls1, ls2, m1, m2, m3, ik1, ik2, sp1, fs4, fs5, b1]);
  }

  // ── Tarot ──
  private createTarotCards(): void {
    // Strength — before the forge section (needs mecha)
    const strengthCard = new TarotCard(this, 5200, 738, 'strength');
    strengthCard.setDepth(1);

    // Star — high platform in Section A (needs dragon to reach)
    const starCard = new TarotCard(this, 2600, 420, 'star');
    starCard.setDepth(1);

    this.physics.add.overlap(this.player, strengthCard, () => {
      strengthCard.collect(this.player);
      this.tarotSystem.collect('strength', this.player);
      this.gameAudio?.playCardCollect();
    });

    this.physics.add.overlap(this.player, starCard, () => {
      starCard.collect(this.player);
      this.tarotSystem.collect('star', this.player);
      this.gameAudio?.playCardCollect();
    });
  }

  // ── Decorations & Echoes ──
  private createDecorations(): void {}

  private createEchoFragments(): void {}

  // ── Camera ──
  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setFollowOffset(0, -60);
    this.cameras.main.setDeadzone(80, 60);
    this.cameras.main.setZoom(CAMERA_ZOOM_HUMAN);
  }

  // ── Collisions ──
  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.overlap(this.player, this.enemies, (_player, _enemy) => {
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0 || !enemy.body) return;
      const knockDir = this.player.x < enemy.x ? -1 : 1;
      this.player.takeDamage(enemy.attackDamage, knockDir);
    });

    this.physics.add.overlap(this.player.combatSystem.bullets, this.enemies, (_bullet, _enemy) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      const target = _enemy as any;
      if (!target.body) return;
      if (target.phase === 'shielded') return;
      let pierce = (b.getData('pierce') as number) ?? 2;
      pierce--;
      b.setData('pierce', pierce);
      if (pierce <= 0) b.disableBody(true, true);
      if (typeof target.takeDamage === 'function') target.takeDamage(this.player.combatSystem.getFireDamage());
      else target.destroy();
      spawnHitParticles(this, target.x, target.y);
    });

    this.physics.add.overlap(this.player.combatSystem.bullets, this.platforms, (_bullet) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active || !b.body) return;
      spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
      b.disableBody(true, true);
    });
  }

  private setupLightingAndPipelines(): void {
    if (!this.lights) return;
    this.platforms.getChildren().forEach((c: any) => c.setPipeline('Light2D'));
    this.enemies.getChildren().forEach((c: any) => c.setPipeline('Light2D'));
    this.barricades.getChildren().forEach((c: any) => c.setPipeline('Light2D'));
    this.player.setPipeline('Light2D');
  }

  // ── Update ──
  update(time: number, delta: number): void {
    if (!this.player?.active) return;

    this.player.update(time, delta);
    this.gameAudio?.update(this.player.x);
    if (this.playerShadow?.active) {
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }

    if (this.demoEnded) return;

    this.weatherSystem?.update(this.cameras.main.scrollX, time);
    this.updateSwordVsEnemies();
    this.bloom.add(this.player.x, this.player.y - 10, 10, this.player.formMachine.state === FormState.DRAGON ? 0xff0066 : 0xff5ea2, 0.3);
    this.bloom.update();

    this.updateVignettePulse();
    this.checkCrumblingPlatforms();
    this.checkBossTrigger();
    this.checkTransition();
  }

  private updateSwordVsEnemies(): void {
    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        e.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, e.x, e.y);
      }
    });
    this.barricades.getChildren().forEach((b) => {
      const barricade = b as Barricade;
      if (!barricade.active || !barricade.alive) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, barricade.getBounds())) {
        barricade.takeDamage(this.player.combatSystem.getSwordDamage());
      }
    });
  }

  private checkCrumblingPlatforms(): void {
    this.crumblingPlatforms.forEach(cp => {
      if (!cp || !cp.active) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body?.blocked.down && cp.body && Math.abs(this.player.x - cp.body.x) < 24) cp.trigger();
    });
  }

  private updateVignettePulse(): void {
    if (!(this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
    const pipeline = this.cameras.main.getPostPipeline('CustomPostFX') as any;
    if (!pipeline) return;
    setVignetteFromPlayer(pipeline, this.player.health / this.player.maxHealth, this.player.formMachine.heat.level);
  }

  // ── Boss ──
  private checkBossTrigger(): void {
    if (this.bossActive) return;
    if (this.player.x >= 11500) this.activateBoss();
  }

  private activateBoss(): void {
    this.bossActive = true;
    this.gameAudio?.playBossWarning();
    this.time.delayedCall(2400, () => this.gameAudio?.playBossBGM());
    this.cameras.main.flash(400, 200, 0, 0);

    const sw = this.scale.width, sh = this.scale.height;
    const warn = this.add.text(sw / 2, sh / 2 - 60, 'THE GATEKEEPER', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ff4400', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

    const sub = this.add.text(sw / 2, sh / 2 + 10, 'Prove your mastery of all three forms', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffaa44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

    this.tweens.add({ targets: warn, alpha: { from: 0, to: 1 }, scaleX: { from: 0.5, to: 1.1 }, scaleY: { from: 0.5, to: 1.1 }, duration: 250, yoyo: true, hold: 800, repeat: 1, onComplete: () => warn.destroy() });
    this.tweens.add({ targets: sub, alpha: { from: 0, to: 1 }, duration: 300, delay: 200, yoyo: true, hold: 1500, onComplete: () => sub.destroy() });

    this.boss = new Gatekeeper(this, 12500, 500, this.player);
    this.enemies.add(this.boss);
    this.cameras.main.zoomTo(1.3, 600, 'Cubic.easeInOut');
    this.cameras.main.shake(400, 0.005);

    const boss = this.boss;
    const origDie = (boss as any).die.bind(boss);
    (boss as any).die = () => { origDie(); this.time.delayedCall(500, () => this.triggerVictory()); };
  }

  private triggerVictory(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(2000, 0, 0, 0);
    this.time.delayedCall(2000, () => {
      this.scene.start('TransitionScene45', {
        startPos: { x: 1850, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: true,
        dragonUnlocked: true,
      });
    });
  }

  private checkTransition(): void {
    if (this.player.x <= 40) {
      this.demoEnded = true;
      this.scene.start('TransitionScene34', { startPos: { x: 150, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    }
  }
}
