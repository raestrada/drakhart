import Phaser from 'phaser';
import { t, setLanguage, getLanguage } from '../i18n';
import { TitleAudio } from '../systems/TitleAudio';
import { clearSave } from '../systems/SaveSystem';

export class BootScene extends Phaser.Scene {
  private titleAudio!: TitleAudio;

  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    // Force reload assets using a query string timestamp to bypass browser cache
    const v = 'v=' + Date.now();
    this.load.image('bg-moon-raw', `assets/bg-moon-raw.png?${v}`);
    this.load.image('bg-castle-raw', `assets/bg-castle-raw.png?${v}`);
    this.load.image('bg-refinery-sun-raw', `assets/bg_refinery_sun.png?${v}`);
    this.load.image('bg-furnace-raw', `assets/bg_furnace.png?${v}`);
    this.load.image('bg-furnace-pipes-raw', `assets/bg_furnace_pipes.png?${v}`);
    this.load.image('bg-gorge-sky-raw', `assets/bg_gorge_sky.png?${v}`);
    this.load.image('bg-gorge-walls-raw', `assets/bg_gorge_walls.png?${v}`);
    this.load.image('bg-gorge-structures-raw', `assets/bg_gorge_structures.png?${v}`);
    this.load.image('bg-gorge-reactor-raw', `assets/bg_gorge_reactor.png?${v}`);
    this.load.image('title-splash', `marketing/drakhart_splash.png`);
    this.load.image('cinematic-gem-1', `assets/cinematic_gem_1.png`);
    this.load.image('cinematic-gem-2', `assets/cinematic_gem_2.png`);
    this.load.image('cinematic-gem-3', `assets/cinematic_gem_3.png`);
    this.load.image('cinematic-dragon-1', `assets/cinematic_dragon_1.png`);
    this.load.image('cinematic-dragon-2', `assets/cinematic_dragon_2.png`);
    this.load.image('cinematic-dragon-3', `assets/cinematic_dragon_3.png`);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#050308');

    // 1. Splash image background cover
    const splash = this.add.image(width / 2, height / 2, 'title-splash');
    splash.setDisplaySize(width, height);
    splash.setAlpha(0.25);

    // Initialize Title Audio system
    this.titleAudio = new TitleAudio();

    // Generate all procedural game textures
    this.generateTextures();

    // Spawn background atmospheric embers
    this.startEmberRain(width, height);

    const scale = width / 800;

    // Title text: Hollow Knight style fade-in scaled dynamically
    const title = this.add.text(width / 2, height * 0.22, 'D R A K H A R T', {
      fontSize: `${Math.round(48 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#a31515',
      shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: Math.round(12 * scale), fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const subtitle = this.add.text(width / 2, height * 0.30, t('story.coreFound').toUpperCase(), {
      fontSize: `${Math.round(11 * scale)}px`,
      fontFamily: 'monospace',
      color: '#8c7864',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setAlpha(0);

    // Fade in title & subtitle sequentially
    this.tweens.add({
      targets: title,
      alpha: 0.9,
      duration: 1200,
      ease: 'Power2'
    });
    this.tweens.add({
      targets: subtitle,
      alpha: 0.6,
      duration: 1200,
      delay: 300,
      ease: 'Power2'
    });

    // 2. Menu containers
    const menuContainer = this.add.container(0, 0);
    const settingsContainer = this.add.container(0, 0).setVisible(false);

    // Check if save exists
    const hasSave = typeof localStorage !== 'undefined' && localStorage.getItem('drakhart_save') !== null;

    // Main menu buttons
    const btnNewGame = this.add.text(width / 2, height * 0.52, t('ui.newGame'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const btnContinue = this.add.text(width / 2, height * 0.60, t('ui.continue'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: hasSave ? '#aa8855' : '#444444'
    }).setOrigin(0.5);

    if (hasSave) {
      btnContinue.setInteractive({ useHandCursor: true });
    }

    const btnSettings = this.add.text(width / 2, height * 0.68, t('ui.settings'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuContainer.add([btnNewGame, btnContinue, btnSettings]);

    // Volume variables loading
    let bgmVol = 1.0;
    let sfxVol = 1.0;
    if (typeof localStorage !== 'undefined') {
      const savedBgm = localStorage.getItem('drakhart_bgm');
      if (savedBgm !== null) bgmVol = parseFloat(savedBgm);
      const savedSfx = localStorage.getItem('drakhart_sfx');
      if (savedSfx !== null) sfxVol = parseFloat(savedSfx);
    }

    // Settings menu buttons/labels
    const langLabel = this.add.text(width / 2, height * 0.48, `${t('ui.language')}: ${getLanguage().toUpperCase()}`, {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const bgmLabel = this.add.text(width / 2, height * 0.56, `${t('ui.bgmVolume')}: ${Math.round(bgmVol * 100)}%`, {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const sfxLabel = this.add.text(width / 2, height * 0.64, `${t('ui.sfxVolume')}: ${Math.round(sfxVol * 100)}%`, {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const btnBack = this.add.text(width / 2, height * 0.74, t('ui.back'), {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    settingsContainer.add([langLabel, bgmLabel, sfxLabel, btnBack]);

    // Binds interactive behaviors to buttons
    const makeButtonGlow = (btn: Phaser.GameObjects.Text, originalTextKey: string) => {
      btn.on('pointerover', () => {
        btn.setColor('#ffcc66');
        btn.setScale(1.06);
        btn.setText(`> ${t(originalTextKey)} <`);
      });
      btn.on('pointerout', () => {
        btn.setColor('#aa8855');
        btn.setScale(1.0);
        btn.setText(t(originalTextKey));
      });
    };

    makeButtonGlow(btnNewGame, 'ui.newGame');
    if (hasSave) makeButtonGlow(btnContinue, 'ui.continue');
    makeButtonGlow(btnSettings, 'ui.settings');
    makeButtonGlow(btnBack, 'ui.back');

    // Language and volume hover behaviors
    const setupHoverColorOnly = (btn: Phaser.GameObjects.Text) => {
      btn.on('pointerover', () => {
        btn.setColor('#ffcc66');
        btn.setScale(1.04);
      });
      btn.on('pointerout', () => {
        btn.setColor('#aa8855');
        btn.setScale(1.0);
      });
    };
    setupHoverColorOnly(langLabel);
    setupHoverColorOnly(bgmLabel);
    setupHoverColorOnly(sfxLabel);

    // Update text labels helper
    const updateMenuLabels = () => {
      subtitle.setText(t('story.coreFound').toUpperCase());
      btnNewGame.setText(menuContainer.visible ? t('ui.newGame') : `> ${t('ui.newGame')} <`);
      btnContinue.setText(t('ui.continue'));
      btnSettings.setText(menuContainer.visible ? t('ui.settings') : `> ${t('ui.settings')} <`);
      btnBack.setText(t('ui.back'));
      langLabel.setText(`${t('ui.language')}: ${getLanguage().toUpperCase()}`);
      bgmLabel.setText(`${t('ui.bgmVolume')}: ${Math.round(bgmVol * 100)}%`);
      sfxLabel.setText(`${t('ui.sfxVolume')}: ${Math.round(sfxVol * 100)}%`);
      prompt.setText(`[ ${t('ui.pressStart')} ]`);
    };

    // Click behaviors
    btnSettings.on('pointerdown', () => {
      menuContainer.setVisible(false);
      settingsContainer.setVisible(true);
      updateMenuLabels();
    });

    btnBack.on('pointerdown', () => {
      settingsContainer.setVisible(false);
      menuContainer.setVisible(true);
      updateMenuLabels();
    });

    // Toggle language
    langLabel.on('pointerdown', () => {
      const nextLang = getLanguage() === 'en' ? 'es' : 'en';
      setLanguage(nextLang);
      updateMenuLabels();
    });

    // Cycle BGM Volume
    bgmLabel.on('pointerdown', () => {
      bgmVol = bgmVol + 0.25 > 1.05 ? 0 : bgmVol + 0.25;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('drakhart_bgm', bgmVol.toString());
      }
      this.titleAudio.setVolume(bgmVol);
      updateMenuLabels();
    });

    // Cycle SFX Volume
    sfxLabel.on('pointerdown', () => {
      sfxVol = sfxVol + 0.25 > 1.05 ? 0 : sfxVol + 0.25;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('drakhart_sfx', sfxVol.toString());
      }
      updateMenuLabels();
    });

    // Cinematic widescreen letterbox bars (rendered on top)
    const letterboxTop = this.add.rectangle(0, -80, width, 80, 0x000000).setOrigin(0, 0).setDepth(200);
    const letterboxBottom = this.add.rectangle(0, height, width, 80, 0x000000).setOrigin(0, 0).setDepth(200);

    // Blinking prompt for enter to start
    const prompt = this.add.text(width / 2, height / 2 + 80 * scale, `[ ${t('ui.pressStart')} ]`, {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setAlpha(0);

    let transitioning = false;

    // Start Cinematic Title Screen sequence
    const startCinematicTitle = () => {
      // 1. Hide main menu UI
      menuContainer.setVisible(false);

      // Fade out the splash art completely to pitch black
      this.tweens.add({
        targets: splash,
        alpha: 0,
        duration: 600,
        ease: 'Power2'
      });

      // Reset camera background to deep black
      this.cameras.main.setBackgroundColor('#06040c');

      // 2. Initialize and play BGM (Unlocks AudioContext on user click gesture!)
      this.titleAudio.init();
      this.titleAudio.play();

      // 3. Fade in blinking enter prompt
      this.tweens.add({
        targets: prompt,
        alpha: 0.75,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: prompt,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });

      // 4. Enable ENTER key listener
      const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      enterKey.once('down', () => {
        if (transitioning) return;
        transitioning = true;

        // Cinematic filter sweep and bass drop
        this.titleAudio.triggerFilterSweep();

        // Slide bars
        this.tweens.add({
          targets: letterboxTop,
          y: 0,
          duration: 1000,
          ease: 'Cubic.easeOut'
        });
        this.tweens.add({
          targets: letterboxBottom,
          y: height - 80,
          duration: 1000,
          ease: 'Cubic.easeOut'
        });

        // Widescreen zoom & rumble
        this.cameras.main.shake(1200, 0.008);
        this.cameras.main.zoomTo(1.35, 1200, 'Cubic.easeInOut');

        // Fade out texts
        this.tweens.add({
          targets: [title, subtitle, prompt],
          alpha: 0,
          duration: 600,
          ease: 'Power2'
        });

        // Fade out to black and start game
        this.time.delayedCall(900, () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
        });

        this.time.delayedCall(1200, () => {
          this.titleAudio.stop();
          this.scene.start('GameScene');
        });
      });
    };

    btnNewGame.on('pointerdown', () => {
      clearSave();
      startCinematicTitle();
    });

    if (hasSave) {
      btnContinue.on('pointerdown', () => {
        startCinematicTitle();
      });
    }
  }

  private startEmberRain(width: number, height: number): void {
    // Continuously spawn background embers floating upwards and drifting left
    this.time.addEvent({
      delay: 65, // Doubled density (half the delay)
      callback: () => {
        const x = Phaser.Math.Between(50, width + 150); // Start slightly to the right to account for leftward drift
        const y = height + 10;
        const size = Phaser.Math.Between(3, 8); // Increased size
        const colors = [0xff0055, 0xcc3300, 0xffaa00, 0xff5500]; // Added crimson-pink tone
        const color = Phaser.Utils.Array.GetRandom(colors);

        const ember = this.add.rectangle(x, y, size, size, color, 0.75); // Increased opacity
        ember.setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: ember,
          x: x - Phaser.Math.Between(150, 300), // Leftward drift wind effect
          y: -10,
          alpha: 0,
          scale: 0.1,
          duration: Phaser.Math.Between(4500, 8000),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy()
        });
      },
      loop: true
    });
  }

  // ── helpers ──
  private tex(g: Phaser.GameObjects.Graphics, key: string, w: number, h: number): void {
    g.generateTexture(key, w, h); g.clear();
  }
  private circ(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, col: number): void {
    g.fillStyle(col); g.fillCircle(x, y, r);
  }
  private rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, col: number): void {
    g.fillStyle(col); g.fillRoundedRect(x, y, w, h, r);
  }
  private tri(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: number): void {
    g.fillStyle(col); g.fillTriangle(x1, y1, x2, y2, x3, y3);
  }

  // ═══ Palette ═══
  private P = {
    // Dragon-scale armor plates (Draconus reptilian tribute)
    wSc1: 0x0e2a10, wSc2: 0x1a4420, wSc3: 0x267032, wSc4: 0x349844,
    // Scale highlight / belly lighter scales
    wScH: 0x44aa55, wScB: 0x1e3a1a,
    // Dark steel under-structure (joints, frame, boots)
    wSt1: 0x0d0f14, wSt2: 0x1a1d26, wSt3: 0x282d3a, wSt4: 0x3a4050,
    // Blood-red accents & visor glow
    wBr1: 0x6b0a0a, wBr2: 0x8b1a1a, wBr3: 0xcc2222, wVisor: 0xff3322, wVisor2: 0xff6644,
    // Dark gold trim (subtle heraldic)
    wGo: 0x6b5a20, wGo2: 0x8a7530,
    // Horns (bone fading to dark)
    wH1: 0xc8b89a, wH2: 0x9e8b70, wH3: 0x4a3a2a,
    // Cape (tattered dark green-black)
    wCa1: 0x060a05, wCa2: 0x0e180c, wCa3: 0x182a14,
    // Dark leather / chainmail at joints
    wLe1: 0x1a1510, wLe2: 0x282018,
    // Sword blade (dark steel with blood runes)
    wBl1: 0x3a4050, wBl2: 0x505868, wBl3: 0x686e7a,

    // Escaflowne Dragon-Mech/Humanoid-Mecha colors (White / Gold / Crimson)
    mPl1: 0xd2d7e0, mPl2: 0xfafaff, mPl3: 0x9fa5b5, // White/silver/grey armor plates
    mRd1: 0x7c0a0a, mRd2: 0xc21818, mRd3: 0xff4d4d, // Deep crimson accent panels & cape
    mGo:  0xe5b810, mGo2: 0xa37e06,                 // Gold filigree / clockwork joints
    mJo:  0x282c35, mJo2: 0x48505e,                 // Graphite/grey mechanical joints/frame
    mCo1: 0xcc0033, mCo2: 0xff3366, mCo3: 0xffffff, // Pulsing Energist core (ruby red/magenta)
    mEy:  0x00ff88,                                 // Emerald green visor/eyes

    // Original dragon/boss colors retained/refined
    dB: 0x111122, dM: 0x181830, dA: 0x2a2a45, dSt: 0x445566, dGo: 0xcc9944,
    dCo: 0xff4400, dCo2: 0xff8800, dCo3: 0xffcc00, dCo4: 0xffffff, dEy: 0xff6600,
    dWi: 0x1a1a35, dTe: 0x778899, dJo: 0x554433, dJo2: 0x776655,
  };

  private generateTextures(): void {
    this.genWarriorFrames();
    this.genMechaFrames();
    this.genDragonFrames();
    this.drawShadowWraith();
    this.drawShieldEnemy();
    this.drawSpitterEnemy();
    this.drawLeaperEnemy();
    this.drawBoss();
    this.drawTerrainTextures();

    // Level 2 Refinery Tiles
    this.drawRefineryTile();
    this.drawLavaGround();
    this.drawRefineryLavaTile();
    this.drawSteamVent();
    this.drawCoolValve();
    this.drawMechaEnemy();

    // Bush small (procedural only)
    this.drawBush();

    // Bush large (procedural only)
    this.drawLargeBush();

    // Rock destructible (procedural only)
    this.drawDestructibleRock();

    // Rock large (procedural only)
    this.drawLargeRockProcedural();

    // Red moon
    if (this.textures.exists('bg-moon-raw')) {
      this.keyOutBlackAndScale('bg-moon-raw', 'bg-moon', 160, 160);
    } else {
      this.drawRedMoon();
    }

    // Castle silhouette
    if (this.textures.exists('bg-castle-raw')) {
      this.keyOutBlackAndScale('bg-castle-raw', 'bg-castle', 384, 384);
    } else {
      this.drawCastleSilhouette();
    }

    // Refinery backgrounds
    if (this.textures.exists('bg-refinery-sun-raw')) {
      this.keyOutBlackAndScale('bg-refinery-sun-raw', 'bg-refinery-sun', 240, 240);
    } else {
      this.drawRedMoon();
    }

    if (this.textures.exists('bg-furnace-raw')) {
      this.keyOutBlackAndScale('bg-furnace-raw', 'bg-furnace', 384, 384);
    } else {
      this.drawCastleSilhouette();
    }

    if (this.textures.exists('bg-furnace-pipes-raw')) {
      this.keyOutBlackAndScale('bg-furnace-pipes-raw', 'bg-furnace-pipes', 384, 384);
    } else {
      this.drawBackgrounds();
    }

    // Level 3 Gorge background layers (rendered procedurally)
    this.drawGorgeWalls();
    this.drawGorgeStructures();

    // Level 3 single reactor core backdrop support image
    if (this.textures.exists('bg-gorge-reactor-raw')) {
      this.keyOutBlackAndScale('bg-gorge-reactor-raw', 'bg-gorge-reactor', 384, 384);
    }

    this.drawDragonCore();
    this.drawEnergyPickup();
    this.drawSkyCore();
    this.drawBarricade();
    this.drawFireBullet();
    this.drawSwordSlash();
    this.drawSwordSlashHeavy();
    this.drawDestinyCard();
    this.drawShadow();
    this.drawTwinkleStar();
    this.drawMoonGlow();
    this.drawForegroundElements();
    this.drawBackgrounds();
    this.drawParticles();
  }

  // ═══════════════════════════════════════
  //  WARRIOR FRAMES — 48×72 (Draconus Dark Knight)
  // ═══════════════════════════════════════

  private genWarriorFrames(): void {
    this.drawWarrior('h-idle-0', 0, 0, 0, 0, 'none');
    this.drawWarrior('h-idle-1', 0, -1, 1, 0, 'none');
    this.drawWarrior('h-idle-2', 0, -2, 2, 0, 'none');
    this.drawWarrior('h-idle-3', 0, -1, 1, 0, 'none');

    this.drawWarrior('h-walk-0', 4, 0, -2, 0, 'none');
    this.drawWarrior('h-walk-1', 1, -1, -1, 0, 'none');
    this.drawWarrior('h-walk-2', -4, 0, 2, 0, 'none');
    this.drawWarrior('h-walk-3', -1, -1, 1, 0, 'none');

    this.drawWarrior('h-jump', 0, -2, 0, 0, 'jump');
    this.drawWarrior('h-fall', 0, 2, 3, 0, 'fall');

    this.drawWarrior('h-attack-0', 1, 0, 0, 1, 'none');
    this.drawWarrior('h-attack-1', 3, 1, 0, 2, 'none');
    this.drawWarrior('h-attack-2', 0, 0, 0, 3, 'none');

    this.drawWarrior('player-human', 0, 0, 0, 0, 'none');
    this.drawWarriorKneeling('h-kneeling');
  }

  private drawWarriorKneeling(key: string): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const dx = 24;
    const dy = 24 + 10;

    g.fillStyle(P.wCa1);
    g.beginPath();
    g.moveTo(10 + dx, 22 + dy);
    g.lineTo(2 + dx, 60 + dy);
    g.lineTo(0 + dx, 66 + dy);
    g.lineTo(16 + dx, 60 + dy);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wCa2);
    g.beginPath();
    g.moveTo(11 + dx, 24 + dy);
    g.lineTo(4 + dx, 58 + dy);
    g.lineTo(2 + dx, 63 + dy);
    g.lineTo(16 + dx, 57 + dy);
    g.closePath(); g.fillPath();

    g.lineStyle(5, P.wSt1);
    g.beginPath(); g.moveTo(14 + dx, 38 + dy); g.lineTo(16 + dx, 48 + dy); g.lineTo(6 + dx, 56 + dy); g.strokePath();
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(6 + dx, 56 + dy); g.lineTo(0 + dx, 56 + dy); g.strokePath();

    g.lineStyle(5, P.wSt2);
    g.beginPath(); g.moveTo(18 + dx, 38 + dy); g.lineTo(22 + dx, 48 + dy); g.lineTo(10 + dx, 56 + dy); g.strokePath();
    g.lineStyle(4, P.wSt3);
    g.beginPath(); g.moveTo(10 + dx, 56 + dy); g.lineTo(4 + dx, 56 + dy); g.strokePath();

    const torsoX = 12 + dx;
    const torsoY = 22 + dy;
    const torsoW = 16;
    const torsoH = 18;

    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY + 4);
    g.lineTo(torsoX + torsoW + 1, torsoY + 9);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 5);
    g.lineTo(torsoX + torsoW, torsoY + 9);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 6, torsoY + 6);
    g.lineTo(torsoX + torsoW - 4, torsoY + 9);
    g.lineTo(torsoX + torsoW - 6, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 3);
    g.closePath(); g.fillPath();

    const headX = 24 + dx;
    const headY = 16 + dy;

    g.fillStyle(P.wH3);
    g.beginPath(); g.moveTo(headX - 6, headY - 4); g.lineTo(headX - 14, headY - 8); g.lineTo(headX - 8, headY - 2); g.closePath(); g.fillPath();
    g.fillStyle(P.wH1);
    g.beginPath(); g.moveTo(headX - 5, headY - 5); g.lineTo(headX - 11, headY - 8); g.lineTo(headX - 7, headY - 3); g.closePath(); g.fillPath();

    this.circ(g, headX, headY, 6, P.wSt1);
    this.circ(g, headX, headY, 5, P.wSt2);

    g.fillStyle(P.wBr2);
    g.beginPath(); g.moveTo(headX + 2, headY); g.lineTo(headX + 5, headY + 2); g.lineTo(headX + 3, headY + 4); g.closePath(); g.fillPath();

    g.lineStyle(4, P.wSt1);
    g.beginPath(); g.moveTo(18 + dx, 24 + dy); g.lineTo(24 + dx, 36 + dy); g.lineTo(22 + dx, 48 + dy); g.strokePath();
    g.lineStyle(3, P.wSt3);
    g.beginPath(); g.moveTo(18 + dx, 24 + dy); g.lineTo(24 + dx, 36 + dy); g.lineTo(22 + dx, 46 + dy); g.strokePath();

    this.tex(g, key, 96, 96);
  }

  private drawWarrior(
    key: string,
    legShift: number,
    bodyBob: number,
    capeShift: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const isAttacking = attackFrame > 0;
    const b = bodyBob;
    const isWalk = key.indexOf('walk') !== -1;

    // Subtle hunched walk tilt (slight forward lean, not extreme)
    const walkTiltX = isWalk ? 4.0 : 1.0;
    const walkTiltY = isWalk ? 2.0 : 0.5;

    // Shift offset: dx = 24, dy = 24
    const dx = 24;
    const dy = 24;

    // ── 1. Background Leg (Z-shaped, dark shadow steel — moves OPPOSITE to foreground) ──
    const blHipX = 14 + dx + (isWalk ? -1.5 : 0);
    const blHipY = 35 + dy + b;
    const blKneeX = 18 + dx + legShift * 0.6;
    const blKneeY = 47 + dy + b - Math.abs(legShift) * 0.4;
    const blAnkleX = 13 + dx + legShift * 0.4;
    const blAnkleY = 57 + dy + b - Math.abs(legShift) * 0.3;
    const blFootX = 17 + dx + legShift * 0.9;
    const blFootY = 66 + dy + b - Math.abs(legShift) * 0.2;

    g.lineStyle(5, P.wSt1);
    g.beginPath(); g.moveTo(blHipX, blHipY); g.lineTo(blKneeX, blKneeY); g.strokePath();
    g.lineStyle(4, P.wSt1);
    g.beginPath(); g.moveTo(blKneeX, blKneeY); g.lineTo(blAnkleX, blAnkleY); g.strokePath();
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(blAnkleX, blAnkleY); g.lineTo(blFootX, blFootY); g.strokePath();
    this.tri(g, blFootX, blFootY, blFootX + 3, blFootY + 1, blFootX - 1, blFootY + 1, P.wSt2);

    // ── 2. Cape (narrow, dark, behind body — does NOT obscure legs) ──
    const capeDrift = capeShift * 0.8;
    const capeY = jumpState === 'fall' ? -3 : jumpState === 'jump' ? 2 : 0;
    g.fillStyle(P.wCa1);
    g.beginPath();
    g.moveTo(12 + dx, 18 + dy + b + walkTiltY);
    g.lineTo(8 + dx - capeDrift, 55 + dy + b + capeY);
    g.lineTo(5 + dx - capeDrift, 62 + dy + b + capeY);
    g.lineTo(15 + dx, 55 + dy + b + capeY);
    g.closePath(); g.fillPath();
    g.fillStyle(P.wCa2);
    g.beginPath();
    g.moveTo(13 + dx, 20 + dy + b + walkTiltY);
    g.lineTo(10 + dx - capeDrift * 0.6, 53 + dy + b + capeY);
    g.lineTo(7 + dx - capeDrift, 59 + dy + b + capeY);
    g.lineTo(15 + dx, 52 + dy + b + capeY);
    g.closePath(); g.fillPath();
    // Ragged bottom edges
    this.tri(g, 5 + dx - capeDrift, 60 + dy + b + capeY, 8 + dx - capeDrift, 65 + dy + b + capeY, 3 + dx - capeDrift, 64 + dy + b + capeY, P.wCa3);

    // ── 2.1 Small armored tail stub ──
    const tailSway = capeShift * 1.5;
    const tailBaseX = 12 + dx + (isWalk ? -1 : 0);
    const tailBaseY = 36 + dy + b;
    this.circ(g, tailBaseX, tailBaseY, 2.5, P.wSt2);
    this.circ(g, tailBaseX - 3 - tailSway * 0.3, tailBaseY + 3, 2.0, P.wSt3);
    this.circ(g, tailBaseX - 6 - tailSway * 0.5, tailBaseY + 6, 1.5, P.wSc1);
    this.tri(g, tailBaseX - 6 - tailSway * 0.5, tailBaseY + 4, tailBaseX - 9 - tailSway * 0.5, tailBaseY + 6, tailBaseX - 7 - tailSway * 0.5, tailBaseY + 4, P.wSc2);

    // ── 3. Torso ──
    const torsoX = 14 + dx + (isWalk ? 0.5 : 0);
    const torsoY = 16 + dy + b;
    const torsoW = 16;
    const torsoH = 18;

    // Dark frame
    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 5);
    g.lineTo(torsoX + torsoW - 1, torsoY + 13);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH + 1);
    g.closePath(); g.fillPath();

    // Steel breastplate
    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 5);
    g.lineTo(torsoX + torsoW - 2, torsoY + 13);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH);
    g.closePath(); g.fillPath();

    // Highlight panel
    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 5, torsoY + 3);
    g.lineTo(torsoX + torsoW - 3, torsoY + 6);
    g.lineTo(torsoX + torsoW - 4, torsoY + 12);
    g.lineTo(torsoX + torsoW - 6, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 2);
    g.closePath(); g.fillPath();

    // Dragon scale row across chest
    this.circ(g, torsoX + 5, torsoY + 7, 2.5, P.wSc1);
    this.circ(g, torsoX + 9, torsoY + 8, 2.5, P.wSc1);
    this.circ(g, torsoX + 7, torsoY + 10, 2.0, P.wSc2);
    // Scale highlight dots
    this.circ(g, torsoX + 5, torsoY + 7, 1.2, P.wSc3);
    this.circ(g, torsoX + 9, torsoY + 8, 1.2, P.wSc3);

    // Rivets
    g.fillStyle(0x0c0d12);
    g.fillRect(torsoX + 4, torsoY + 5, 1.5, 1.5);
    g.fillRect(torsoX + 12, torsoY + 6, 1.5, 1.5);
    g.fillRect(torsoX + 6, torsoY + 13, 1.5, 1.5);

    // Spine spikes
    this.tri(g, torsoX - 1, torsoY + 3, torsoX - 5, torsoY + 5, torsoX - 1, torsoY + 8, P.wSc1);
    this.tri(g, torsoX - 1, torsoY + 8, torsoX - 6, torsoY + 10, torsoX - 1, torsoY + 13, P.wSc2);
    this.tri(g, torsoX - 1, torsoY + 13, torsoX - 5, torsoY + 15, torsoX - 1, torsoY + 18, P.wSc1);

    // Front edge contour highlight
    g.fillStyle(P.wSt4, 0.5);
    g.fillRect(torsoX + torsoW - 3, torsoY + 5, 2, 10);

    // Gold top collar trim
    this.rect(g, torsoX, torsoY + 1, torsoW - 2, 2, 0.5, P.wGo);
    // Dragon-scale belt trim
    this.rect(g, torsoX + 2, torsoY + torsoH - 2, torsoW - 6, 2, 1, P.wSc1);
    this.rect(g, torsoX + 3, torsoY + torsoH - 1, torsoW - 8, 1, 0.5, P.wSc3);
    // Belt buckle
    this.rect(g, torsoX, torsoY + torsoH, torsoW - 2, 2, 0.5, P.wSt1);
    this.rect(g, torsoX + 6, torsoY + torsoH, 4, 2, 0.5, P.wGo);

    // ── 4. Foreground Leg ──
    const flHipX = 20 + dx + (isWalk ? 1.5 : 0);
    const flHipY = 35 + dy + b;
    const flKneeX = 27 + dx - legShift * 0.8;
    const flKneeY = 47 + dy + b - Math.abs(legShift) * 0.5;
    const flAnkleX = 20 + dx - legShift * 0.5;
    const flAnkleY = 58 + dy + b - Math.abs(legShift) * 0.3;
    const flFootX = 27 + dx - legShift * 1.2;
    const flFootY = 68 + dy + b - Math.abs(legShift) * 0.2;

    // Thigh plate
    g.lineStyle(6, P.wSt2);
    g.beginPath(); g.moveTo(flHipX, flHipY); g.lineTo(flKneeX, flKneeY); g.strokePath();
    g.lineStyle(2, P.wSt3);
    g.beginPath(); g.moveTo(flHipX + 1, flHipY + 1); g.lineTo(flKneeX + 1, flKneeY - 1); g.strokePath();
    // Green dragon-scale kneepad
    this.circ(g, flKneeX, flKneeY, 3.0, P.wSc1);
    this.circ(g, flKneeX, flKneeY, 2.0, P.wSc2);
    // Greave
    g.lineStyle(5, P.wSt3);
    g.beginPath(); g.moveTo(flKneeX, flKneeY); g.lineTo(flAnkleX, flAnkleY); g.strokePath();
    g.lineStyle(1.5, P.wSc2);
    g.beginPath(); g.moveTo(flKneeX - 1, flKneeY + 2); g.lineTo(flAnkleX - 1, flAnkleY - 2); g.strokePath();
    // Sabaton
    g.lineStyle(4, P.wSt4);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY); g.lineTo(flFootX, flFootY); g.strokePath();
    this.tri(g, flFootX, flFootY, flFootX + 4, flFootY + 1, flFootX - 1, flFootY + 1, P.wGo);

    // ── 5. Pauldron ──
    const pauldronX = 15 + dx + walkTiltX;
    const pauldronY = 14 + dy + b + walkTiltY;
    this.rect(g, pauldronX, pauldronY, 12, 8, 2, P.wSt2);
    this.rect(g, pauldronX + 1, pauldronY + 1, 10, 6, 1, P.wSt3);
    this.rect(g, pauldronX + 3, pauldronY + 3, 6, 3, 0.5, P.wSc1);
    this.rect(g, pauldronX + 4, pauldronY + 4, 4, 1, 0.3, P.wSc3);
    this.tri(g, pauldronX + 2, pauldronY, pauldronX + 6, pauldronY - 5, pauldronX + 10, pauldronY, P.wGo);

    // ── 6. Neck ──
    const neckX = 17 + dx + walkTiltX;
    const neckY = 12 + dy + b + walkTiltY;
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(torsoX + 8, torsoY + 2); g.lineTo(neckX + 3, neckY + 3); g.strokePath();
    this.circ(g, neckX + 2, neckY + 3, 1.5, P.wSc1);

    // ── 7. Helmet ──
    const headX = 14 + dx + walkTiltX;
    const headY = 2 + dy + b + walkTiltY;
    
    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(headX - 1, headY + 12);
    g.lineTo(headX - 1, headY + 1);
    g.lineTo(headX + 9, headY - 1);
    g.lineTo(headX + 16, headY + 3);
    g.lineTo(headX + 16, headY + 7);
    g.lineTo(headX + 10, headY + 9);
    g.lineTo(headX + 11, headY + 11);
    g.lineTo(headX - 1, headY + 12);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(headX, headY + 11);
    g.lineTo(headX, headY + 2);
    g.lineTo(headX + 8, headY);
    g.lineTo(headX + 15, headY + 4);
    g.lineTo(headX + 15, headY + 7);
    g.lineTo(headX + 9, headY + 8);
    g.lineTo(headX + 10, headY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(headX + 2, headY + 9);
    g.lineTo(headX + 2, headY + 3);
    g.lineTo(headX + 7, headY + 1);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 10, headY + 7);
    g.closePath(); g.fillPath();

    g.fillStyle(0x0a0502); g.fillRect(headX + 5, headY + 3.5, 7, 2.5);
    g.fillStyle(P.wVisor); g.fillRect(headX + 6, headY + 4, 5, 1.5);
    g.fillStyle(P.wVisor2, 0.3); g.fillRect(headX + 5, headY + 3, 8, 3.5);

    g.lineStyle(1.5, P.wSt4);
    g.beginPath(); g.moveTo(headX + 10, headY + 10); g.lineTo(headX + 9, headY + 13); g.strokePath();
    g.beginPath(); g.moveTo(headX + 12, headY + 9); g.lineTo(headX + 12, headY + 12); g.strokePath();

    // swept back horn
    g.fillStyle(P.wH1);
    g.beginPath();
    g.moveTo(headX + 2, headY + 1);
    g.lineTo(headX - 6, headY - 4);
    g.lineTo(headX - 8, headY - 2);
    g.lineTo(headX + 1, headY + 4);
    g.closePath(); g.fillPath();
    g.fillStyle(P.wH2);
    g.beginPath();
    g.moveTo(headX + 1, headY + 2);
    g.lineTo(headX - 4, headY - 2);
    g.lineTo(headX - 5, headY - 1);
    g.lineTo(headX + 1, headY + 3);
    g.closePath(); g.fillPath();

    // ── 9. Sword Arm ──
    let armX = 20 + dx + walkTiltX;
    let armY = 22 + dy + b + walkTiltY;
    let swPhase = 0;

    if (isAttacking) {
      if (attackFrame === 1) { armX = 14 + dx + walkTiltX; armY = 18 + dy + b + walkTiltY; swPhase = 1; }
      else if (attackFrame === 2) { armX = 30 + dx + walkTiltX; armY = 22 + dy + b + walkTiltY; swPhase = 2; }
      else if (attackFrame === 3) { armX = 28 + dx + walkTiltX; armY = 28 + dy + b + walkTiltY; swPhase = 3; }
    }

    this.rect(g, armX, armY, 7, 10, 2, P.wSt2);
    this.rect(g, armX + 1, armY + 1, 5, 8, 1, P.wSt3);
    this.rect(g, armX + 1, armY + 3, 5, 3, 0.5, P.wSc1);
    this.rect(g, armX + 2, armY + 4, 3, 1, 0.3, P.wSc3);
    this.rect(g, armX + 2, armY + 7, 3, 2, 0.5, P.wGo);

    // ── 10. Greatsword ──
    if (swPhase === 1) {
      // Overhead windup (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX - 2, armY - 4, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 7, armY - 1, 14, 3);          // guard
      g.fillStyle(P.wBl1); g.fillRect(armX - 2, armY - 37, 6, 36);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX - 1, armY - 35, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 0.25, armY - 31, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX - 2, armY - 37); g.lineTo(armX + 1, armY - 42); g.lineTo(armX + 4, armY - 37); g.closePath(); g.fillPath(); // blade tip
    } else if (swPhase === 2) {
      // Heavy forward slash (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 3, armY, 6, 4, 1);    // hilt
      g.fillStyle(P.wGo); g.fillRect(armX + 9, armY - 5, 3, 14);          // guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 12, armY - 1, 36, 6);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX + 14, armY, 34, 4);            // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 18, armY + 1.25, 26, 1.5); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 48, armY - 1); g.lineTo(armX + 53, armY + 2); g.lineTo(armX + 48, armY + 5); g.closePath(); g.fillPath(); // blade tip
    } else if (swPhase === 3) {
      // Recovery blade down (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 3, armY + 4, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 2, armY + 10, 14, 3);         // guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 2, armY + 13, 6, 36);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX + 3, armY + 15, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 4.25, armY + 19, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 2, armY + 49); g.lineTo(armX + 5, armY + 54); g.lineTo(armX + 8, armY + 49); g.closePath(); g.fillPath(); // blade tip
    } else {
      // Idle / Default stance (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 2, armY - 2, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 3, armY - 5, 14, 3);          // wide guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 2, armY - 41, 6, 36);         // blade base (width 6, height 36)
      g.fillStyle(P.wBl2); g.fillRect(armX + 3, armY - 39, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 4.25, armY - 35, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 2, armY - 41); g.lineTo(armX + 5, armY - 46); g.lineTo(armX + 8, armY - 41); g.closePath(); g.fillPath(); // blade tip
    }

    this.tex(g, key, 96, 96);
  }

  // ═══════════════════════════════════════
  //  MECHA FRAMES — 64×80 (Draconel Gothic Knight)
  // ═══════════════════════════════════════

  private genMechaFrames(): void {
    this.drawMecha('m-idle-0', 0, 0, 0, 'none');
    this.drawMecha('m-idle-1', 0, -1, 0, 'none');
    this.drawMecha('m-idle-2', 0, -2, 0, 'none');

    this.drawMecha('m-walk-0', 4, 0, 0, 'none');
    this.drawMecha('m-walk-1', 0, -1, 0, 'none');
    this.drawMecha('m-walk-2', -4, 0, 0, 'none');
    this.drawMecha('m-walk-3', 0, -1, 0, 'none');

    this.drawMecha('m-jump', 0, -3, 0, 'jump');
    this.drawMecha('m-fall', 0, 3, 0, 'fall');

    this.drawMecha('m-attack-0', 1, 0, 1, 'none');
    this.drawMecha('m-attack-1', 4, 2, 2, 'none');
    this.drawMecha('m-attack-2', 2, 1, 3, 'none');

    this.drawMecha('player-mecha', 0, 0, 0, 'none');
    this.drawMechaKneeling('m-kneeling');
  }

  private drawMechaKneeling(key: string): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const dx = 24;
    const dy = 24 + 12;

    g.fillStyle(P.mRd1);
    g.beginPath();
    g.moveTo(10 + dx, 20 + dy);
    g.lineTo(0 + dx, 62 + dy);
    g.lineTo(16 + dx, 58 + dy);
    g.closePath(); g.fillPath();

    g.lineStyle(6, P.mJo);
    g.beginPath(); g.moveTo(14 + dx, 38 + dy); g.lineTo(16 + dx, 48 + dy); g.lineTo(6 + dx, 54 + dy); g.strokePath();
    g.lineStyle(5, P.mPl3);
    g.beginPath(); g.moveTo(6 + dx, 54 + dy); g.lineTo(0 + dx, 54 + dy); g.strokePath();

    g.lineStyle(6, P.mJo2);
    g.beginPath(); g.moveTo(18 + dx, 38 + dy); g.lineTo(22 + dx, 48 + dy); g.lineTo(10 + dx, 54 + dy); g.strokePath();
    g.lineStyle(5, P.mPl1);
    g.beginPath(); g.moveTo(10 + dx, 54 + dy); g.lineTo(4 + dx, 54 + dy); g.strokePath();

    const torsoX = 10 + dx;
    const torsoY = 20 + dy;
    const torsoW = 20;
    const torsoH = 20;

    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 4);
    g.lineTo(torsoX + torsoW - 1, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 5);
    g.lineTo(torsoX + torsoW - 2, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 3, torsoY + 6);
    g.lineTo(torsoX + torsoW - 5, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 3);
    g.closePath(); g.fillPath();

    this.circ(g, torsoX + 10, torsoY + 10, 4.5, P.mRd1);
    g.lineStyle(1.5, 0x111111);
    g.beginPath(); g.moveTo(torsoX + 7, torsoY + 10); g.lineTo(torsoX + 13, torsoY + 11); g.strokePath();

    const headX = 22 + dx;
    const headY = 14 + dy;

    this.circ(g, headX, headY, 7, P.mJo);
    this.circ(g, headX, headY, 6, P.mPl1);

    g.fillStyle(0x0e4428);
    g.beginPath(); g.moveTo(headX + 2, headY - 1); g.lineTo(headX + 6, headY + 1); g.lineTo(headX + 3, headY + 3); g.closePath(); g.fillPath();

    g.lineStyle(5, P.mJo);
    g.beginPath(); g.moveTo(16 + dx, 22 + dy); g.lineTo(24 + dx, 36 + dy); g.lineTo(20 + dx, 48 + dy); g.strokePath();
    g.lineStyle(4, P.mPl1);
    g.beginPath(); g.moveTo(16 + dx, 22 + dy); g.lineTo(24 + dx, 36 + dy); g.lineTo(20 + dx, 46 + dy); g.strokePath();

    this.tex(g, key, 96, 96);
  }

  private drawMecha(
    key: string,
    legShift: number,
    bodyBob: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const isAttacking = attackFrame > 0;
    const b = bodyBob;
    const isWalk = key.indexOf('walk') !== -1;

    // Subtle forward lean when walking
    const tiltX = isWalk ? 3.0 : 0.5;
    const tiltY = isWalk ? 1.5 : 0.0;

    // Shift offset: dx = 32, dy = 48 (canvas is 128x128)
    const dx = 32;
    const dy = 48;

    // ── 1. Background Leg (slender graphite, shadowed Z-shape) ──
    const blHipX = 22 + dx + (isWalk ? -1 : 0);
    const blHipY = 46 + dy + b;
    const blKneeX = 26 + dx + legShift * 0.5;
    const blKneeY = 57 + dy + b - Math.abs(legShift) * 0.3;
    const blAnkleX = 20 + dx + legShift * 0.3;
    const blAnkleY = 67 + dy + b - Math.abs(legShift) * 0.2;
    const blFootX = 25 + dx + legShift * 0.7;
    const blFootY = 75 + dy + b - Math.abs(legShift) * 0.15;

    g.lineStyle(5, P.mJo);
    g.beginPath(); g.moveTo(blHipX, blHipY); g.lineTo(blKneeX, blKneeY); g.strokePath();
    g.lineStyle(4, P.mJo2);
    g.beginPath(); g.moveTo(blKneeX, blKneeY); g.lineTo(blAnkleX, blAnkleY); g.strokePath();
    g.lineStyle(4, P.mJo2);
    g.beginPath(); g.moveTo(blAnkleX, blAnkleY); g.lineTo(blFootX, blFootY); g.strokePath();
    this.tri(g, blFootX, blFootY, blFootX + 3, blFootY + 1.5, blFootX - 1, blFootY + 1.5, P.mGo2);

    // ── 2. Flowing Crimson Cape (narrow, tattered, behind body) ──
    const capeBob = b + (jumpState === 'fall' ? -3 : jumpState === 'jump' ? 2 : 0);
    const capeDrift = isWalk ? legShift * 0.4 : 0;
    g.fillStyle(P.mRd1);
    g.beginPath();
    g.moveTo(18 + dx, 22 + dy + capeBob + tiltY);
    g.lineTo(10 + dx - capeDrift, 58 + dy + capeBob);
    g.lineTo(5 + dx - capeDrift, 70 + dy + capeBob);
    g.lineTo(22 + dx, 55 + dy + capeBob);
    g.closePath(); g.fillPath();
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(20 + dx, 24 + dy + capeBob + tiltY);
    g.lineTo(13 + dx - capeDrift * 0.6, 56 + dy + capeBob);
    g.lineTo(8 + dx - capeDrift, 65 + dy + capeBob);
    g.lineTo(22 + dx, 52 + dy + capeBob);
    g.closePath(); g.fillPath();
    this.tri(g, 5 + dx - capeDrift, 68 + dy + capeBob, 8 + dx - capeDrift, 74 + dy + capeBob, 3 + dx - capeDrift, 73 + dy + capeBob, P.mRd1);

    // ── 3. Torso — V-shaped white breastplate (Escaflowne design) ──
    const torsoX = 20 + dx + (isWalk ? 0.5 : 0);
    const torsoY = 18 + dy + b;
    const torsoW = 18;
    const torsoH = 24;

    // Gold back wings/vents (Escaflowne signature back clockwork)
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY + 2);
    g.lineTo(torsoX - 9, torsoY - 2);
    g.lineTo(torsoX - 12, torsoY + 4);
    g.lineTo(torsoX - 2, torsoY + 10);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mGo2);
    g.beginPath();
    g.moveTo(torsoX - 2, torsoY + 10);
    g.lineTo(torsoX - 10, torsoY + 7);
    g.lineTo(torsoX - 12, torsoY + 12);
    g.lineTo(torsoX - 2, torsoY + 16);
    g.closePath(); g.fillPath();

    // Dark structural backing
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 6);
    g.lineTo(torsoX + torsoW - 1, torsoY + 16);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH + 1);
    g.closePath(); g.fillPath();

    // Main white breastplate
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 6);
    g.lineTo(torsoX + torsoW - 2, torsoY + 16);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH);
    g.closePath(); g.fillPath();

    // Pure white highlight chest plate
    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 6, torsoY + 3);
    g.lineTo(torsoX + torsoW - 2, torsoY + 7);
    g.lineTo(torsoX + torsoW - 3, torsoY + 15);
    g.lineTo(torsoX + torsoW - 5, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 2);
    g.closePath(); g.fillPath();

    // Crimson neck/chest chevron
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 7, torsoY + 3);
    g.lineTo(torsoX + torsoW - 5, torsoY + 7);
    g.lineTo(torsoX + 3, torsoY + 7);
    g.closePath(); g.fillPath();

    // Large red Energist gem in the center (signature Escaflowne detail)
    const coreX = torsoX + 8;
    const coreY = torsoY + 11;
    this.circ(g, coreX, coreY, 4.5, P.mGo); // gold outer bezel
    this.circ(g, coreX, coreY, 3.2, P.mCo1); // ruby core
    this.circ(g, coreX, coreY, 2.0, P.mCo2); // bright center
    this.circ(g, coreX + 1, coreY - 1, 0.8, P.mCo3); // shine dot

    // Spine spikes (white/gold back fins)
    this.tri(g, torsoX - 1, torsoY + 4, torsoX - 5, torsoY + 6, torsoX - 1, torsoY + 9, P.mPl3);
    this.tri(g, torsoX - 1, torsoY + 9, torsoX - 6, torsoY + 11, torsoX - 1, torsoY + 14, P.mPl3);
    this.tri(g, torsoX - 1, torsoY + 14, torsoX - 5, torsoY + 16, torsoX - 1, torsoY + 19, P.mPl3);

    // Gold belt trim
    this.rect(g, torsoX, torsoY + torsoH - 2, torsoW - 2, 2, 0.5, P.mGo);
    // Slim waist block
    this.rect(g, torsoX + 3, torsoY + torsoH, torsoW - 8, 4, 0.5, P.mJo);

    // ── 4. Foreground Leg (Z-shaped white armor with gold knees) ──
    const flHipX = 26 + dx + (isWalk ? 1.5 : 0);
    const flHipY = 46 + dy + b;
    const flKneeX = 33 + dx - legShift * 0.7;
    const flKneeY = 57 + dy + b - Math.abs(legShift) * 0.4;
    const flAnkleX = 25 + dx - legShift * 0.4;
    const flAnkleY = 67 + dy + b - Math.abs(legShift) * 0.25;
    const flFootX = 32 + dx - legShift * 1.0;
    const flFootY = 75 + dy + b - Math.abs(legShift) * 0.15;

    // Thigh plate: thick white stroke with a darker grey outline
    g.lineStyle(7, P.mPl3);
    g.beginPath(); g.moveTo(flHipX, flHipY); g.lineTo(flKneeX, flKneeY); g.strokePath();
    g.lineStyle(4, P.mPl2);
    g.beginPath(); g.moveTo(flHipX, flHipY + 1); g.lineTo(flKneeX, flKneeY - 1); g.strokePath();

    // Gold knee joint cap
    this.circ(g, flKneeX, flKneeY, 3.5, P.mGo);
    this.circ(g, flKneeX, flKneeY, 2.0, P.mGo2);
    
    // Crimson knee spike
    this.tri(g, flKneeX + 1.5, flKneeY - 2, flKneeX + 6, flKneeY, flKneeX + 1.5, flKneeY + 2.5, P.mRd2);

    // Shin plate (Greave): white with red striping
    g.lineStyle(6, P.mPl3);
    g.beginPath(); g.moveTo(flKneeX, flKneeY); g.lineTo(flAnkleX, flAnkleY); g.strokePath();
    g.lineStyle(3, P.mPl2);
    g.beginPath(); g.moveTo(flKneeX, flKneeY + 1); g.lineTo(flAnkleX, flAnkleY - 1); g.strokePath();
    
    // Crimson stripe on greave
    g.lineStyle(1.5, P.mRd2);
    g.beginPath(); g.moveTo(flKneeX - 1, flKneeY + 2); g.lineTo(flAnkleX - 1, flAnkleY - 2); g.strokePath();

    // Ankle joint (Gold)
    this.circ(g, flAnkleX, flAnkleY, 2.5, P.mGo);

    // Sabaton (Foot): white armor
    g.lineStyle(4, P.mPl3);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY); g.lineTo(flFootX, flFootY); g.strokePath();
    g.lineStyle(2, P.mPl2);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY + 0.5); g.lineTo(flFootX, flFootY); g.strokePath();
    
    // Gold claws
    this.tri(g, flFootX, flFootY, flFootX + 4, flFootY + 2, flFootX - 1, flFootY + 2, P.mGo);
    this.tri(g, flFootX - 2, flFootY - 1, flFootX - 4, flFootY + 2, flFootX - 1, flFootY + 2, P.mGo2);

    // ── 5. Gothic Pauldron (large white shoulder shield) ──
    const pauldronX = 20 + dx + tiltX;
    const pauldronY = 15 + dy + b + tiltY;

    // Large white shield-pauldron
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(pauldronX, pauldronY + 9);
    g.lineTo(pauldronX, pauldronY);
    g.lineTo(pauldronX + 13, pauldronY - 1);
    g.lineTo(pauldronX + 15, pauldronY + 3);
    g.lineTo(pauldronX + 11, pauldronY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(pauldronX + 1, pauldronY + 8);
    g.lineTo(pauldronX + 1, pauldronY + 1);
    g.lineTo(pauldronX + 12, pauldronY);
    g.lineTo(pauldronX + 14, pauldronY + 3);
    g.lineTo(pauldronX + 10, pauldronY + 9);
    g.closePath(); g.fillPath();

    // Crimson inlay design
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(pauldronX + 3, pauldronY + 3);
    g.lineTo(pauldronX + 10, pauldronY + 1);
    g.lineTo(pauldronX + 9, pauldronY + 6);
    g.lineTo(pauldronX + 3, pauldronY + 6);
    g.closePath(); g.fillPath();

    // Gold spikes
    this.tri(g, pauldronX + 11, pauldronY - 1, pauldronX + 16, pauldronY - 4, pauldronX + 13, pauldronY + 2, P.mGo);
    this.tri(g, pauldronX, pauldronY, pauldronX - 3, pauldronY - 2, pauldronX + 3, pauldronY, P.mGo);

    // ── 6. Neck ──
    const neckX = 23 + dx + tiltX;
    const neckY = 14 + dy + b + tiltY;
    g.lineStyle(3, P.mJo);
    g.beginPath(); g.moveTo(torsoX + 7, torsoY + 2); g.lineTo(neckX + 3, neckY + 3); g.strokePath();
    this.circ(g, neckX + 2, neckY + 3, 1.2, P.mGo);

    // ── 7. Draconel Helmet (White yelmo, swept-back gold crest, green visor) ──
    const headX = 20 + dx + tiltX;
    const headY = 4 + dy + b + tiltY;

    // Outer helmet shape
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(headX - 1, headY + 12);
    g.lineTo(headX - 1, headY + 1);
    g.lineTo(headX + 9, headY - 1);
    g.lineTo(headX + 16, headY + 3);
    g.lineTo(headX + 16, headY + 7);
    g.lineTo(headX + 10, headY + 9);
    g.lineTo(headX + 11, headY + 11);
    g.lineTo(headX - 1, headY + 12);
    g.closePath(); g.fillPath();

    // Helmet main plate (white)
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(headX, headY + 11);
    g.lineTo(headX, headY + 2);
    g.lineTo(headX + 8, headY);
    g.lineTo(headX + 15, headY + 4);
    g.lineTo(headX + 15, headY + 7);
    g.lineTo(headX + 9, headY + 8);
    g.lineTo(headX + 10, headY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(headX + 1, headY + 10);
    g.lineTo(headX + 1, headY + 3);
    g.lineTo(headX + 7, headY + 1);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 10, headY + 7);
    g.closePath(); g.fillPath();

    // Crimson cheek plate
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(headX + 8, headY + 7);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 14, headY + 7);
    g.lineTo(headX + 9, headY + 9);
    g.closePath(); g.fillPath();

    // Visor: green horizontal slit
    g.fillStyle(P.mJo); g.fillRect(headX + 5, headY + 3.5, 7, 2.5);
    g.fillStyle(P.mEy); g.fillRect(headX + 6, headY + 4, 5, 1.5);
    g.fillStyle(P.mEy, 0.25); g.fillRect(headX + 4, headY + 3, 9, 3.5);

    // Swept-back crest horn (White/Gold, fits cleanly within Y >= 0)
    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(headX + 3, headY + 1);
    g.lineTo(headX - 12, headY - 8); // much longer swept-back horn!
    g.lineTo(headX - 14, headY - 5);
    g.lineTo(headX + 1, headY + 3);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(headX + 1, headY + 2);
    g.lineTo(headX - 8, headY - 4);
    g.lineTo(headX - 9, headY - 2);
    g.lineTo(headX + 1, headY + 2.5);
    g.closePath(); g.fillPath();

    // ── 8. Sword Arm (white gauntlet) ──
    let armX = 30 + dx + tiltX;
    let armY = 25 + dy + b + tiltY;
    let swPhase = 0;

    if (isAttacking) {
      if (attackFrame === 1) { armX = 18 + dx + tiltX; armY = 16 + dy + b + tiltY; swPhase = 1; }
      else if (attackFrame === 2) { armX = 40 + dx + tiltX; armY = 28 + dy + b + tiltY; swPhase = 2; }
      else if (attackFrame === 3) { armX = 36 + dx + tiltX; armY = 32 + dy + b + tiltY; swPhase = 3; }
    }

    // Forearm (white stroke)
    g.lineStyle(5, P.mPl3);
    g.beginPath(); g.moveTo(armX, armY); g.lineTo(armX + 8, armY + 8); g.strokePath();
    g.lineStyle(3, P.mPl2);
    g.beginPath(); g.moveTo(armX, armY); g.lineTo(armX + 7, armY + 7); g.strokePath();

    // Elbow joint (Gold)
    this.circ(g, armX, armY, 2.5, P.mGo);
    this.circ(g, armX, armY, 1.2, P.mGo2);

    // Hand (Gold)
    this.circ(g, armX + 8, armY + 8, 2.0, P.mGo);

    // ── 9. Claymore ──
    if (swPhase === 1) {
      // Overhead windup
      g.fillStyle(P.mJo); g.fillRect(armX + 3, armY - 10, 4, 10); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 5, armY - 12, 20, 3); // Guard
      // Blade
      g.fillStyle(P.mPl1);
      g.beginPath();
      g.moveTo(armX + 1, armY - 12); g.lineTo(armX + 8, armY - 12);
      g.lineTo(armX + 8, armY - 68); g.lineTo(armX + 5, armY - 74);
      g.lineTo(armX + 2, armY - 68);
      g.closePath(); g.fillPath();
      g.fillStyle(P.mPl2); g.fillRect(armX + 4, armY - 66, 2, 54);
      this.circ(g, armX + 5, armY - 12, 2.5, P.mCo2);
    } else if (swPhase === 2) {
      // Heavy forward slash
      g.fillStyle(P.mJo); g.fillRect(armX + 8, armY + 6, 12, 4); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX + 6, armY, 3, 20); // Guard
      // Blade
      g.fillStyle(P.mPl1);
      g.beginPath();
      g.moveTo(armX + 11, armY + 1); g.lineTo(armX + 11, armY + 9);
      g.lineTo(armX + 70, armY + 9); g.lineTo(armX + 76, armY + 5);
      g.lineTo(armX + 70, armY + 1);
      g.closePath(); g.fillPath();
      g.fillStyle(P.mPl2); g.fillRect(armX + 12, armY + 3, 56, 3);
      this.circ(g, armX + 9, armY + 5, 2.5, P.mCo2);
    } else if (swPhase === 3) {
      // Recovery blade down
      g.fillStyle(P.mJo); g.fillRect(armX + 2, armY + 8, 4, 8); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 5, armY + 6, 18, 3); // Guard
      g.fillStyle(P.mPl1); g.fillRect(armX + 2, armY + 9, 6, 44);
      g.fillStyle(P.mPl2); g.fillRect(armX + 4, armY + 11, 2, 40);
    } else {
      // Idle: claymore resting on shoulder, blade pointing up-back
      g.fillStyle(P.mJo); g.fillRect(armX - 2, armY - 6, 4, 8); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 8, armY - 8, 18, 3); // Wide guard!
      // White Blade (longer: 56px long)
      g.fillStyle(P.mPl3);
      g.beginPath();
      g.moveTo(armX - 4, armY - 8); g.lineTo(armX + 4, armY - 8);
      g.lineTo(armX + 4, armY - 60); g.lineTo(armX, armY - 66);
      g.lineTo(armX - 4, armY - 60);
      g.closePath(); g.fillPath();
      
      g.fillStyle(P.mPl2);
      g.beginPath();
      g.moveTo(armX - 2.5, armY - 8); g.lineTo(armX + 2.5, armY - 8);
      g.lineTo(armX + 2.5, armY - 58); g.lineTo(armX, armY - 63);
      g.lineTo(armX - 2.5, armY - 58);
      g.closePath(); g.fillPath();

      // Central glowing ruby channel
      g.fillStyle(P.mJo); g.fillRect(armX - 0.5, armY - 50, 1, 40);
      g.fillStyle(P.mRd3); g.fillRect(armX - 0.5, armY - 35, 1, 15); // glowing ruby core line
      this.circ(g, armX, armY - 8, 2.5, P.mCo2);
    }

    this.tex(g, key, 128, 128);
  }

  // ═══════════════════════════════════════
  //  DRAGON FRAMES — 96×72, HEAD ON RIGHT
  // ═══════════════════════════════════════

  private genDragonFrames(): void {
    // 4 wing flapping frames, using flapPhase (0 to 2*PI) to animate chest core pulse
    this.drawDragonFrame('d-fly-0', -6, 0);
    this.drawDragonFrame('d-fly-1', -1, Math.PI / 4);
    this.drawDragonFrame('d-fly-2', 4, Math.PI / 2);
    this.drawDragonFrame('d-fly-3', -1, 3 * Math.PI / 4);

    // Default
    this.drawDragonFrame('player-dragon', 0, 0);
  }

  private drawDragonFrame(key: string, wingY: number, flapPhase: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;

    // Dragon size is 96x72. Head on the right side (default facing).

    // ── 1. Serpentine Tail & Spikes (Whip-like, left side) ──
    const tailBob = Math.sin(flapPhase) * 2.5;
    g.fillStyle(P.mJo); // Segment 1 (Base)
    g.beginPath(); g.moveTo(24, 38); g.lineTo(24, 44); g.lineTo(18, 42 + tailBob * 0.3); g.lineTo(18, 38); g.closePath(); g.fillPath();
    this.circ(g, 18, 40 + tailBob * 0.3, 3, P.mGo); // joint
    // Spine spike on tail segment 1
    this.tri(g, 21, 38 + tailBob * 0.15, 18, 29 + tailBob * 0.15, 23, 37 + tailBob * 0.15, P.mRd2);

    g.fillStyle(P.mPl3); // Segment 2 (Mid)
    g.beginPath(); g.moveTo(18, 40 + tailBob * 0.3); g.lineTo(12, 42 + tailBob * 0.6); g.lineTo(12, 39 + tailBob * 0.6); g.lineTo(18, 37 + tailBob * 0.3); g.closePath(); g.fillPath();
    this.circ(g, 12, 41 + tailBob * 0.6, 2.5, P.mGo); // joint
    // Spine spike on tail segment 2
    this.tri(g, 15, 38 + tailBob * 0.45, 12, 31 + tailBob * 0.45, 17, 37 + tailBob * 0.45, P.mGo);

    g.fillStyle(P.mPl1); // Segment 3 (Tip)
    g.beginPath(); g.moveTo(12, 41 + tailBob * 0.6); g.lineTo(6, 43 + tailBob); g.lineTo(6, 40 + tailBob); g.lineTo(12, 38 + tailBob * 0.6); g.closePath(); g.fillPath();
    this.circ(g, 6, 42 + tailBob, 2.0, P.mGo);
    // Spine spike on tail segment 3
    this.tri(g, 9, 39 + tailBob * 0.8, 6, 33 + tailBob * 0.8, 11, 38 + tailBob * 0.8, P.mRd2);

    // Whip blade tip: Large mechanical crescent scythe blade
    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(6, 42 + tailBob);
    g.lineTo(-6, 46 + tailBob + Math.sin(flapPhase * 1.5) * 2);
    g.lineTo(-12, 35 + tailBob); // blade point
    g.lineTo(-2, 38 + tailBob);
    g.closePath(); g.fillPath();
    this.tri(g, -2, 38 + tailBob, -12, 35 + tailBob, -4, 33 + tailBob, P.mGo);

    // ── 2. Back Leg & Hanging Claw (Skeletal mecha talon) ──
    // Thigh
    g.fillStyle(P.mPl3);
    g.beginPath(); g.moveTo(32, 44); g.lineTo(26, 52); g.lineTo(22, 52); g.lineTo(28, 44); g.closePath(); g.fillPath();
    // Knee joint
    this.circ(g, 24, 52, 2.5, P.mGo);
    // Shin
    g.fillStyle(P.mJo);
    g.beginPath(); g.moveTo(24, 52); g.lineTo(20, 60); g.lineTo(16, 58); g.lineTo(22, 52); g.closePath(); g.fillPath();
    // Claw talons
    this.tri(g, 20, 60, 24, 66, 22, 59, P.mGo);
    this.tri(g, 17, 59, 14, 65, 19, 58, P.mPl3);
    this.tri(g, 16, 58, 18, 63, 17, 58, P.mGo2);

    // ── 3. Torso & Dorsal Spine Spikes ──
    g.fillStyle(P.mJo); // inner frame
    g.beginPath();
    g.moveTo(24, 38); g.lineTo(26, 32); g.lineTo(44, 30); g.lineTo(58, 32); g.lineTo(62, 36); g.lineTo(60, 44); g.lineTo(44, 46); g.lineTo(24, 44);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl1); // outer white plates
    g.beginPath();
    g.moveTo(26, 34); g.lineTo(44, 32); g.lineTo(56, 34); g.lineTo(58, 42); g.lineTo(44, 44); g.lineTo(26, 42);
    g.closePath(); g.fillPath();

    // Dorsal spine spikes pointing up-back
    this.tri(g, 30, 32, 25, 23, 34, 31, P.mGo);
    this.tri(g, 40, 30, 35, 21, 44, 30, P.mRd2);
    this.tri(g, 50, 31, 45, 22, 54, 31, P.mGo);

    // Crimson accent panels inside body
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(32, 35); g.lineTo(48, 34); g.lineTo(52, 40); g.lineTo(34, 41);
    g.closePath(); g.fillPath();

    // Red/Pink Energist Chest Core (pulsing glow)
    const pulseFactor = Math.abs(Math.sin(flapPhase * 2));
    const pulseCol = pulseFactor > 0.6 ? P.mCo2 : P.mCo1;
    g.fillStyle(P.mJo, 0.6); g.fillCircle(44, 38, 9);
    this.circ(g, 44, 38, 6.5, pulseCol);
    this.circ(g, 44, 38, 4.0, 0xff77aa);
    this.circ(g, 44, 38, 1.5, 0xffffff);

    // ── 4. Front Leg & Hanging Claw (Skeletal mecha talon) ──
    // Thigh
    g.fillStyle(P.mPl1);
    g.beginPath(); g.moveTo(46, 44); g.lineTo(54, 52); g.lineTo(50, 52); g.lineTo(42, 44); g.closePath(); g.fillPath();
    // Knee joint
    this.circ(g, 52, 52, 2.5, P.mGo);
    // Shin
    g.fillStyle(P.mJo);
    g.beginPath(); g.moveTo(51, 52); g.lineTo(47, 60); g.lineTo(43, 58); g.lineTo(49, 52); g.closePath(); g.fillPath();
    // Claw talons
    this.tri(g, 47, 60, 52, 66, 49, 59, P.mGo);
    this.tri(g, 44, 59, 41, 65, 46, 58, P.mPl1);
    this.tri(g, 43, 58, 46, 63, 45, 58, P.mGo2);

    // ── 5. Arched Serpentine Neck & Neck Spikes ──
    g.fillStyle(P.mJo); // structure
    g.beginPath(); g.moveTo(56, 38); g.lineTo(66, 24); g.lineTo(76, 27); g.lineTo(74, 34); g.lineTo(60, 44); g.closePath(); g.fillPath();
    g.fillStyle(P.mPl1); // plates
    g.beginPath(); g.moveTo(58, 37); g.lineTo(65, 26); g.lineTo(74, 28); g.lineTo(73, 33); g.lineTo(60, 41); g.closePath(); g.fillPath();
    g.fillStyle(P.mRd2); // crimson neck stripe
    g.beginPath(); g.moveTo(60, 35); g.lineTo(67, 27); g.lineTo(68, 29); g.lineTo(61, 36); g.closePath(); g.fillPath();
    // Gold hydraulic tube
    g.lineStyle(1.5, P.mGo); g.beginPath(); g.moveTo(58, 39); g.lineTo(65, 30); g.lineTo(74, 31); g.strokePath();
    // Neck Spikes (dorsal)
    this.tri(g, 62, 27, 64, 18, 67, 25, P.mGo);
    this.tri(g, 68, 25, 71, 16, 74, 23, P.mGo);

    // ── 6. Dragon Head (Open jaws, fangs, swept horns, cyan visor) ──
    // Top skull snout
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(76, 28); g.lineTo(74, 18); g.lineTo(84, 18); g.lineTo(94, 25); g.lineTo(84, 29); g.lineTo(76, 32);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mPl1); // white outer plating
    g.beginPath();
    g.moveTo(77, 27); g.lineTo(75, 19); g.lineTo(83, 19); g.lineTo(92, 25); g.lineTo(83, 28); g.lineTo(77, 31);
    g.closePath(); g.fillPath();

    // Crimson nose plate
    this.tri(g, 84, 19, 90, 24, 83, 27, P.mRd2);

    // Sharp glowing green/cyan visor slitting back
    g.fillStyle(P.mJo); g.fillRect(78, 21, 7, 2);
    g.fillStyle(P.mEy); g.fillRect(79, 21.5, 5, 1.0);

    // Fangs on upper snout
    this.tri(g, 86, 28, 88, 33, 90, 27, P.mGo);
    this.tri(g, 91, 25, 92, 29, 93, 25, P.mGo);

    // Lower open jaw
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(78, 33); g.lineTo(84, 31); g.lineTo(90, 31); g.lineTo(84, 36); g.lineTo(78, 35);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(79, 34); g.lineTo(84, 32); g.lineTo(88, 32); g.lineTo(84, 35);
    g.closePath(); g.fillPath();
    // Fangs on lower jaw
    this.tri(g, 85, 32, 86, 29, 87, 32, P.mGo);

    // Massive Swept-back Golden Crest Horns
    // Horn 1 (Large upper - curves back-left)
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(74, 18); g.lineTo(54, 8); g.lineTo(52, 11); g.lineTo(72, 22);
    g.closePath(); g.fillPath();
    // Horn 2 (Small lower - curves back-left)
    g.fillStyle(P.mGo2);
    g.beginPath();
    g.moveTo(75, 21); g.lineTo(58, 14); g.lineTo(57, 16); g.lineTo(74, 24);
    g.closePath(); g.fillPath();

    // ── 7. Biomechanical Wings ──
    g.fillStyle(P.mRd1, 0.5); // outer soft energy red shadow
    g.beginPath();
    g.moveTo(42, 30 + wingY); g.lineTo(2, 6 + wingY); g.lineTo(-6, 16 + wingY); g.lineTo(32, 40 + wingY);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mRd2, 0.85); // glowing red membrane
    g.beginPath();
    g.moveTo(42, 30 + wingY); g.lineTo(4, 8 + wingY); g.lineTo(-2, 16 + wingY); g.lineTo(34, 38 + wingY);
    g.closePath(); g.fillPath();

    // White mecha wing struts (structural bone-metal)
    g.lineStyle(2.5, P.mPl1);
    g.beginPath(); g.moveTo(42, 31 + wingY); g.lineTo(6, 10 + wingY); g.strokePath();
    g.beginPath(); g.moveTo(42, 35 + wingY); g.lineTo(16, 20 + wingY); g.strokePath();
    g.lineStyle(1.5, P.mGo); // gold mechanical accents on wings
    g.beginPath(); g.moveTo(40, 38 + wingY); g.lineTo(24, 26 + wingY); g.strokePath();

    // Gold bolt accents on torso plates
    this.circ(g, 30, 36, 1.2, P.mGo);
    this.circ(g, 54, 36, 1.2, P.mGo);

    this.tex(g, key, 96, 72);
  }

  // ═══ SENTINEL 32×32 ═══
  private drawShadowWraith(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Dark amorphous body — wraith form
    g.fillStyle(0x0a0a12, 0.9);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(28, 8);
    g.lineTo(30, 16);
    g.lineTo(28, 24);
    g.lineTo(22, 30);
    g.lineTo(16, 32);
    g.lineTo(10, 30);
    g.lineTo(4, 24);
    g.lineTo(2, 16);
    g.lineTo(4, 8);
    g.closePath();
    g.fillPath();

    // Inner dark glow
    g.fillStyle(0x15152a, 0.7);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(24, 10);
    g.lineTo(26, 16);
    g.lineTo(24, 22);
    g.lineTo(19, 28);
    g.lineTo(16, 29);
    g.lineTo(13, 28);
    g.lineTo(8, 22);
    g.lineTo(6, 16);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    // Twin glowing red eyes — Draconus style
    g.fillStyle(0x000000);
    g.fillCircle(11, 16, 3);
    g.fillCircle(21, 16, 3);
    g.fillStyle(0xff2200);
    g.fillCircle(11, 16, 2);
    g.fillCircle(21, 16, 2);
    g.fillStyle(0xff6600);
    g.fillCircle(11, 16, 1);
    g.fillCircle(21, 16, 1);
    g.fillStyle(0xffffff);
    g.fillCircle(12, 15, 0.4);
    g.fillCircle(22, 15, 0.4);

    // Wispy tendrils at bottom
    g.fillStyle(0x0a0a12, 0.5);
    g.fillRect(8, 30, 3, 6);
    g.fillRect(14, 31, 4, 5);
    g.fillRect(21, 30, 3, 6);

    this.tex(g, 'enemy-sentry', 32, 32);
  }

  private drawShieldEnemy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Dark amorphous body (dark steel plate color for heavy sentry)
    g.fillStyle(0x121220, 0.95);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(28, 8);
    g.lineTo(30, 16);
    g.lineTo(28, 24);
    g.lineTo(22, 30);
    g.lineTo(16, 32);
    g.lineTo(10, 30);
    g.lineTo(4, 24);
    g.lineTo(2, 16);
    g.lineTo(4, 8);
    g.closePath();
    g.fillPath();

    // Inner glow - steel blue
    g.fillStyle(0x223355, 0.7);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(24, 10);
    g.lineTo(26, 16);
    g.lineTo(24, 22);
    g.lineTo(19, 28);
    g.lineTo(16, 29);
    g.lineTo(13, 28);
    g.lineTo(8, 22);
    g.lineTo(6, 16);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    // Twin glowing steel blue/white eyes
    g.fillStyle(0x000000);
    g.fillCircle(11, 16, 3);
    g.fillCircle(21, 16, 3);
    g.fillStyle(0x33aaff);
    g.fillCircle(11, 16, 2);
    g.fillCircle(21, 16, 2);
    g.fillStyle(0xffffff);
    g.fillCircle(11, 16, 1);
    g.fillCircle(21, 16, 1);

    // Wispy tendrils at bottom
    g.fillStyle(0x121220, 0.5);
    g.fillRect(8, 30, 3, 6);
    g.fillRect(14, 31, 4, 5);
    g.fillRect(21, 30, 3, 6);

    // DRAW THE HEAVY METAL SHIELD ON THE FRONT (assuming facing right, i.e. x-coords 23 to 30)
    g.fillStyle(0x556677); // Metallic dark steel
    g.beginPath();
    g.moveTo(24, 4);
    g.lineTo(30, 6);
    g.lineTo(31, 16);
    g.lineTo(30, 26);
    g.lineTo(24, 28);
    g.lineTo(26, 16);
    g.closePath();
    g.fillPath();

    // Shield edge highlight
    g.lineStyle(1.5, 0x8899aa);
    g.beginPath();
    g.moveTo(24, 4);
    g.lineTo(30, 6);
    g.lineTo(31, 16);
    g.lineTo(30, 26);
    g.lineTo(24, 28);
    g.lineTo(26, 16);
    g.closePath();
    g.strokePath();

    // Glowing energy core/rune on the shield
    g.fillStyle(0x33aaff);
    g.fillRect(27, 12, 3, 8);
    g.fillStyle(0xffffff);
    g.fillRect(28, 14, 1, 4);

    this.tex(g, 'enemy-shield', 32, 32);
  }

  private drawSpitterEnemy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Deep purple body
    g.fillStyle(0x1a0a24, 0.95);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(28, 8);
    g.lineTo(30, 16);
    g.lineTo(28, 24);
    g.lineTo(22, 30);
    g.lineTo(16, 32);
    g.lineTo(10, 30);
    g.lineTo(4, 24);
    g.lineTo(2, 16);
    g.lineTo(4, 8);
    g.closePath();
    g.fillPath();

    // Inner glow - toxic violet
    g.fillStyle(0x380b4d, 0.7);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(24, 10);
    g.lineTo(26, 16);
    g.lineTo(24, 22);
    g.lineTo(19, 28);
    g.lineTo(16, 29);
    g.lineTo(13, 28);
    g.lineTo(8, 22);
    g.lineTo(6, 16);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    // Acidic green glowing eyes
    g.fillStyle(0x000000);
    g.fillCircle(11, 14, 3);
    g.fillCircle(21, 14, 3);
    g.fillStyle(0x00ff88);
    g.fillCircle(11, 14, 2);
    g.fillCircle(21, 14, 2);
    g.fillStyle(0xffffff);
    g.fillCircle(11, 14, 0.8);
    g.fillCircle(21, 14, 0.8);

    // Glowing toxic throat/mouth opening (front-center of the body)
    g.fillStyle(0x00ff66);
    g.fillCircle(16, 22, 4);
    g.fillStyle(0x000000);
    g.fillCircle(16, 22, 2.5);
    g.fillStyle(0xaaffd4);
    g.fillCircle(16, 22, 1.2);

    // Wispy purple tendrils
    g.fillStyle(0x1a0a24, 0.5);
    g.fillRect(8, 30, 3, 6);
    g.fillRect(14, 31, 4, 5);
    g.fillRect(21, 30, 3, 6);

    this.tex(g, 'enemy-spitter', 32, 32);
  }

  private drawLeaperEnemy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Crimson/dark orange body
    g.fillStyle(0x2d0a05, 0.95);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(28, 8);
    g.lineTo(30, 16);
    g.lineTo(28, 24);
    g.lineTo(22, 30);
    g.lineTo(16, 32);
    g.lineTo(10, 30);
    g.lineTo(4, 24);
    g.lineTo(2, 16);
    g.lineTo(4, 8);
    g.closePath();
    g.fillPath();

    // Inner glow - fire orange
    g.fillStyle(0x5a1805, 0.7);
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(24, 10);
    g.lineTo(26, 16);
    g.lineTo(24, 22);
    g.lineTo(19, 28);
    g.lineTo(16, 29);
    g.lineTo(13, 28);
    g.lineTo(8, 22);
    g.lineTo(6, 16);
    g.lineTo(8, 10);
    g.closePath();
    g.fillPath();

    // Fiery orange/yellow glowing eyes
    g.fillStyle(0x000000);
    g.fillCircle(11, 15, 3);
    g.fillCircle(21, 15, 3);
    g.fillStyle(0xff8800);
    g.fillCircle(11, 15, 2);
    g.fillCircle(21, 15, 2);
    g.fillStyle(0xffff00);
    g.fillCircle(11, 15, 1);
    g.fillCircle(21, 15, 1);

    // Spiky/spring-like coils at the bottom
    g.lineStyle(1.5, 0xff5500);
    g.beginPath();
    g.moveTo(10, 26);
    g.lineTo(8, 32);
    g.lineTo(12, 30);
    g.moveTo(16, 26);
    g.lineTo(16, 33);
    g.lineTo(18, 30);
    g.moveTo(22, 26);
    g.lineTo(24, 32);
    g.lineTo(20, 30);
    g.strokePath();

    this.tex(g, 'enemy-leaper', 32, 32);
  }

  // ═══ BOSS 128×128 ═══
  private drawBoss(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // tail (left)
    this.rect(g, 0, 70, 30, 10, 3, 0x110a14);
    this.tri(g, 4, 54, 0, 46, 8, 64, 0x442244);
    this.tri(g, 8, 52, 2, 44, 10, 62, 0x442244);
    // back leg
    this.rect(g, 40, 78, 14, 28, 3, 0x1a0a20);
    this.rect(g, 42, 82, 10, 22, 2, 0x2a1133);
    g.fillStyle(0x663355); g.fillCircle(46, 104, 5);
    // body
    this.rect(g, 28, 52, 66, 42, 5, 0x110a14);
    this.rect(g, 32, 56, 58, 34, 4, 0x1a0f22);
    this.rect(g, 36, 60, 50, 5, 2, 0x2a1533);
    this.rect(g, 38, 68, 46, 5, 2, 0x331840);
    // core
    g.fillStyle(0x000000); g.fillCircle(60, 74, 12);
    g.fillStyle(0xff1166, 0.2); g.fillCircle(60, 74, 10);
    g.fillStyle(0xff2266); g.fillCircle(60, 74, 7);
    g.fillStyle(0xff4488); g.fillCircle(60, 74, 4);
    g.fillStyle(0xffaacc); g.fillCircle(60, 74, 2);
    g.fillStyle(0xffffff); g.fillCircle(60, 73, 0.8);
    // front leg
    this.rect(g, 74, 78, 14, 28, 3, 0x1a0f22);
    this.rect(g, 76, 82, 10, 22, 2, 0x221133);
    g.fillStyle(0x663355); g.fillCircle(80, 104, 5);
    // neck
    this.rect(g, 78, 38, 24, 22, 4, 0x110a14);
    this.rect(g, 80, 42, 20, 16, 3, 0x1a0f22);
    // head (right side)
    this.rect(g, 92, 14, 36, 32, 6, 0x110a14);
    this.rect(g, 96, 18, 28, 26, 4, 0x1a0f22);
    this.rect(g, 114, 24, 14, 12, 3, 0x2a1533);
    this.rect(g, 115, 26, 12, 8, 2, 0x1a0f22);
    // crown
    for (let i = 0; i < 8; i++) {
      const sx = 98 + i * 4;
      g.fillStyle(0x331133); g.fillTriangle(sx, 0, sx + 2, 12, sx + 5, 2);
    }
    // eyes
    g.fillStyle(0x000000); g.fillCircle(102, 22, 4);
    g.fillStyle(0xff2288); g.fillCircle(102, 22, 3);
    g.fillStyle(0xffffff); g.fillCircle(103, 22, 0.8);
    g.fillStyle(0x000000); g.fillCircle(114, 22, 4);
    g.fillStyle(0xff2288); g.fillCircle(114, 22, 3);
    g.fillStyle(0xffffff); g.fillCircle(115, 22, 0.8);
    // arms
    this.rect(g, 14, 66, 12, 32, 3, 0x1a0a20);
    this.rect(g, 16, 70, 8, 26, 2, 0x2a1133);
    g.fillStyle(0x551144); g.fillTriangle(10, 96, 16, 98, 13, 108);
    g.fillStyle(0x551144); g.fillTriangle(20, 96, 26, 98, 23, 108);
    this.tex(g, 'boss', 128, 128);
  }

  // ═══ TERRAIN TEXTURES ═══
  private drawTerrainTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Ground — dark earth with roots
    g.fillStyle(0x14100c);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x1a1510);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x0d0a08);
    g.fillRect(0, 28, 32, 4);
    // Surface detail: small rocks
    g.fillStyle(0x1c1612);
    g.fillCircle(6, 6, 2);
    g.fillCircle(18, 7, 1.5);
    g.fillCircle(28, 5, 1.8);
    // Root
    g.fillStyle(0x1a120c, 0.7);
    g.fillRect(14, 2, 2, 4);
    g.fillRect(16, 2, 1, 3);
    // Crack
    g.fillStyle(0x0a0705, 0.6);
    g.fillRect(22, 10, 2, 4);
    this.tex(g, 'tile-ground', 32, 32);

    // Rock platform — natural stone
    g.fillStyle(0x1c1814);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x26201a);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x120e0a);
    g.fillRect(0, 14, 32, 2);
    // Rock texture spots
    g.fillStyle(0x201a15, 0.5);
    g.fillCircle(8, 7, 2);
    g.fillCircle(22, 6, 2.5);
    g.fillStyle(0x16120e, 0.4);
    g.fillCircle(14, 9, 1.5);
    // Moss
    g.fillStyle(0x1a2818, 0.3);
    g.fillCircle(28, 4, 2);
    g.fillCircle(30, 5, 1);
    this.tex(g, 'tile-platform', 32, 16);

    // Grass-topped earth platform
    g.fillStyle(0x181a14);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x1a2014);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x0e100a);
    g.fillRect(0, 14, 32, 2);
    // Grass blades
    g.fillStyle(0x1a3018, 0.5);
    g.fillRect(4, 1, 1, 3);
    g.fillRect(10, 0, 1, 2);
    g.fillRect(16, 1, 1, 4);
    g.fillRect(22, 0, 1, 2);
    g.fillRect(28, 1, 1, 3);
    // Earth spots
    g.fillStyle(0x141610, 0.4);
    g.fillCircle(8, 8, 2);
    this.tex(g, 'tile-grass', 32, 16);

    // Stone ruins block — ancient carved stone
    g.fillStyle(0x201c18);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x2a241e);
    g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x15120e);
    g.fillRect(0, 14, 32, 2);
    // Carved line
    g.fillStyle(0x252018, 0.3);
    g.fillRect(4, 5, 24, 1);
    // Weathering
    g.fillStyle(0x1a1612, 0.5);
    g.fillCircle(10, 8, 1.5);
    g.fillCircle(26, 7, 1);
    this.tex(g, 'tile-ruins', 32, 16);

    // Tree stump platform
    g.fillStyle(0x1a120c);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x221810);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x0e0a06);
    g.fillRect(0, 14, 32, 2);
    // Rings
    g.fillStyle(0x1c140e, 0.4);
    g.fillEllipse(16, 6, 20, 8);
    g.fillStyle(0x1a120c, 0.3);
    g.fillEllipse(16, 5, 14, 5);
    g.fillStyle(0x181008, 0.3);
    g.fillEllipse(16, 4, 8, 3);
    this.tex(g, 'tile-stump', 32, 16);

    this.drawCrumblingTile();
    this.drawMossyTile();
    this.drawAltarTile();
    this.drawCaveGround();
    this.drawThornsTile();
  }

  // ═══ THORNS TILE 32×32 ═══
  private drawThornsTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0a050d); g.fillRect(0, 0, 32, 32);
    g.lineStyle(2, 0x1f0d2b);
    g.beginPath();
    g.moveTo(0, 32); g.lineTo(32, 0);
    g.moveTo(32, 32); g.lineTo(0, 0);
    g.moveTo(16, 32); g.lineTo(16, 0);
    g.moveTo(0, 16); g.lineTo(32, 16);
    g.strokePath();

    g.fillStyle(0xcc2222);
    g.fillTriangle(4, 16, 12, 12, 12, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(6, 16, 11, 14, 11, 18);

    g.fillStyle(0xcc2222);
    g.fillTriangle(28, 16, 20, 12, 20, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(26, 16, 21, 14, 21, 18);

    g.fillStyle(0xcc2222);
    g.fillTriangle(16, 4, 12, 12, 20, 12);
    g.fillStyle(0xff5533);
    g.fillTriangle(16, 6, 14, 11, 18, 11);

    g.fillStyle(0xcc2222);
    g.fillTriangle(16, 28, 12, 20, 20, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(16, 26, 14, 21, 18, 21);

    this.tex(g, 'tile-thorns', 32, 32);
  }

  // ═══ CRUMBLING TILE 32×16 ═══
  private drawCrumblingTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1510); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x221c16); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x0c0806); g.fillRect(0, 14, 32, 2);
    // Cracks
    g.fillStyle(0x0a0604); g.fillRect(6, 4, 2, 8);
    g.fillStyle(0x0a0604); g.fillRect(18, 3, 3, 4);
    g.fillStyle(0x0a0604); g.fillRect(25, 6, 2, 6);
    this.tex(g, 'tile-crumbling', 32, 16);
  }

  // ═══ MOSSY TILE 32×16 ═══
  private drawMossyTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x181a14); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x22281a); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x0e1008); g.fillRect(0, 14, 32, 2);
    g.fillStyle(0x1a3018, 0.5); g.fillRect(10, 4, 6, 3);
    g.fillStyle(0x1a3018, 0.4); g.fillRect(20, 6, 4, 2);
    this.tex(g, 'tile-mossy', 32, 16);
  }

  // ═══ ALTAR TILE 32×16 ═══
  private drawAltarTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x221c18); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x332a22); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x15100c); g.fillRect(0, 14, 32, 2);
    g.fillStyle(0x887744, 0.3); g.fillRect(12, 4, 8, 2);
    this.tex(g, 'tile-altar', 32, 16);
  }

  // ═══ CAVE GROUND 32×32 ═══
  private drawCaveGround(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x121420); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x181c28); g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x0a0c14); g.fillRect(0, 28, 32, 4);
    g.fillStyle(0x0c0e18, 0.6); g.fillRect(10, 8, 3, 2);
    this.tex(g, 'ground-cave', 32, 32);
  }

  // ═══ DESTRUCTIBLE BUSH 24×20 ═══
  private drawBush(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Shadow base
    g.fillStyle(0x080c06, 0.85);
    g.fillEllipse(12, 12, 22, 16);

    // Deep foliage layers (dark stylized green-brown forest colors)
    g.fillStyle(0x1b2812);
    g.fillCircle(6, 12, 6);
    g.fillCircle(18, 12, 6);
    g.fillCircle(12, 8, 8);

    // Midground foliage (olive/emerald green)
    g.fillStyle(0x283e1b);
    g.fillCircle(8, 11, 4);
    g.fillCircle(16, 11, 4);
    g.fillCircle(12, 9, 6);

    // Glowing magma/ash berries (glowing embers on leaves)
    g.fillStyle(0xff4400);
    g.fillCircle(7, 8, 1.5);
    g.fillCircle(17, 10, 1.5);
    g.fillCircle(12, 5, 1.5);

    // Stems (dark charcoal brown)
    g.fillStyle(0x181008);
    g.fillRect(10, 13, 1.5, 7);
    g.fillRect(13, 13, 1.5, 7);

    this.tex(g, 'bush', 24, 20);
  }

  // ═══ DESTRUCTIBLE LARGE BUSH 32×28 ═══
  private drawLargeBush(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Shadow base
    g.fillStyle(0x080c06, 0.85);
    g.fillEllipse(16, 17, 30, 22);

    // Deep foliage layers
    g.fillStyle(0x16240f);
    g.fillCircle(8, 18, 8);
    g.fillCircle(24, 18, 8);
    g.fillCircle(16, 12, 11);

    // Midground foliage
    g.fillStyle(0x233b17);
    g.fillCircle(10, 16, 6);
    g.fillCircle(22, 16, 6);
    g.fillCircle(16, 13, 8);

    // Leaf highlights (lighter moss green)
    g.fillStyle(0x385c25);
    g.fillCircle(12, 12, 4);
    g.fillCircle(20, 12, 4);
    g.fillCircle(16, 9, 5);

    // Glowing magma berries
    g.fillStyle(0xff3300);
    g.fillCircle(9, 11, 1.8);
    g.fillCircle(23, 13, 1.8);
    g.fillCircle(16, 6, 1.8);
    g.fillStyle(0xffaa00);
    g.fillCircle(14, 12, 1.2);
    g.fillCircle(20, 9, 1.2);

    // Stems
    g.fillStyle(0x181008);
    g.fillRect(13, 18, 2, 10);
    g.fillRect(17, 18, 2, 10);

    this.tex(g, 'bush-large', 32, 28);
  }

  // ═══ DESTRUCTIBLE ROCK 24×24 ═══
  private drawDestructibleRock(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Rock base shadow (black bevel)
    g.fillStyle(0x0a0c10);
    g.fillRoundedRect(0, 0, 24, 24, 3);
    
    // Main volcanic slate body (dark gray-blue)
    g.fillStyle(0x20242e);
    g.beginPath();
    g.moveTo(2, 22);
    g.lineTo(22, 22);
    g.lineTo(22, 6);
    g.lineTo(16, 2);
    g.lineTo(6, 2);
    g.closePath();
    g.fillPath();

    // 3D beveled highlights (top and right light metallic edges)
    g.lineStyle(1.5, 0x4e5768);
    g.beginPath();
    g.moveTo(6, 2); g.lineTo(16, 2); g.lineTo(22, 6); g.lineTo(22, 22);
    g.strokePath();

    // Glowing magma veins (glowing red-orange cracks)
    g.lineStyle(1.5, 0xff3300);
    g.beginPath();
    g.moveTo(6, 18); g.lineTo(12, 10); g.lineTo(18, 12);
    g.moveTo(12, 10); g.lineTo(14, 3);
    g.strokePath();

    // Core bright hot point
    g.fillStyle(0xffaa00);
    g.fillCircle(12, 10, 1.5);
    
    this.tex(g, 'rock-destructible', 24, 24);
  }

  // ═══ RED MOON 128×128 ═══
  private drawRedMoon(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const mx = 64, my = 64;
    g.fillStyle(0x441111, 0.2);
    g.fillCircle(mx, my, 60);
    g.fillStyle(0x331111, 0.4);
    g.fillCircle(mx, my, 52);
    g.fillStyle(0xaa1818, 0.8);
    g.fillCircle(mx, my, 40);
    g.fillStyle(0xff3333, 0.9);
    g.fillCircle(mx, my, 37);
    g.fillStyle(0xff8866, 0.95);
    g.fillCircle(mx, my, 34);
    g.fillStyle(0x080610); // Matches sky background color
    g.fillCircle(mx + 10, my + 3, 36);
    this.tex(g, 'bg-moon', 128, 128);
  }

  // ═══ CASTLE SILHOUETTE 256×256 ═══
  private drawCastleSilhouette(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x060812, 0.95);
    g.fillRect(40, 160, 176, 96);
    g.fillRect(40, 80, 32, 80);
    g.fillTriangle(40, 80, 56, 40, 72, 80);
    g.fillRect(184, 80, 32, 80);
    g.fillTriangle(184, 80, 200, 40, 216, 80);
    g.fillRect(96, 60, 64, 100);
    g.fillTriangle(96, 60, 128, 0, 160, 60);
    g.fillRect(72, 140, 24, 20);
    g.fillRect(160, 140, 24, 20);
    g.fillTriangle(72, 160, 72, 100, 96, 160);
    g.fillTriangle(184, 160, 184, 100, 160, 160);
    g.fillStyle(0x0e111f, 0.85);
    g.fillCircle(128, 110, 24);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const tx = 128 + Math.cos(angle) * 28;
      const ty = 110 + Math.sin(angle) * 28;
      g.fillRect(tx - 4, ty - 4, 8, 8);
    }
    g.fillStyle(0x060812);
    g.fillCircle(128, 110, 16);
    this.tex(g, 'bg-castle', 256, 256);
  }

  // ═══ FOREGROUND ELEMENTS ═══
  private drawForegroundElements(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Burnt tree 32×140 (foreground)
    g.fillStyle(0x0d0a08, 0.7);
    g.fillRect(12, 0, 8, 140);
    g.fillStyle(0x151210, 0.5);
    g.fillRect(14, 0, 4, 140);
    // Branches
    g.fillRect(4, 30, 12, 3);
    g.fillRect(18, 60, 10, 2);
    g.fillRect(2, 90, 14, 2);
    g.fillRect(20, 110, 8, 2);
    this.tex(g, 'fg-tree', 32, 140);

    // Broken column 24×100 (foreground)
    g.fillStyle(0x181c22, 0.6);
    g.fillRect(4, 0, 16, 100);
    g.fillStyle(0x202830, 0.4);
    g.fillRect(6, 0, 12, 100);
    // Crack
    g.fillStyle(0x0c0e12, 0.5);
    g.fillRect(8, 40, 2, 15);
    // Top break
    g.fillStyle(0x141820, 0.3);
    g.fillRect(2, 0, 20, 3);
    this.tex(g, 'fg-column', 24, 100);

    // Vine 8×120 (foreground, cave)
    g.fillStyle(0x1a2818, 0.4);
    g.fillRect(3, 0, 2, 120);
    g.fillStyle(0x1a2818, 0.3);
    for (let y = 10; y < 120; y += 20) {
      g.fillRect(2, y, 4, 1);
    }
    this.tex(g, 'fg-vine', 8, 120);
  }

  // ═══ DRAGON CORE 16×16 ═══
  private drawDragonCore(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 3, 0, 10, 14, 2, 0x3a4a5a);
    this.rect(g, 4, 1, 8, 12, 2, 0x4a5a6a);
    this.rect(g, 5, 2, 6, 10, 1, 0x0a0505);
    this.circ(g, 8, 6, 2.5, 0xff4400);
    this.circ(g, 8, 6, 1.5, 0xff8800);
    this.circ(g, 8, 6, 0.6, 0xffcc00);
    this.tri(g, 6, 0, 10, 0, 8, -2, 0x5a6a7a);
    this.tex(g, 'dragon-core', 16, 16);
  }

  // ═══ SKY CORE 16×16 ═══
  private drawSkyCore(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 3, 0, 10, 14, 2, 0x334455);
    this.rect(g, 4, 1, 8, 12, 2, 0x446688);
    this.rect(g, 5, 2, 6, 10, 1, 0x050a15);
    this.circ(g, 8, 6, 2.5, 0x4488ff);
    this.circ(g, 8, 6, 1.5, 0x88ccff);
    this.circ(g, 8, 6, 0.6, 0xffffff);
    this.tri(g, 6, 0, 10, 0, 8, -2, 0x557799);
    this.tex(g, 'sky-core', 16, 16);
  }

  // ═══ BARRICADE 32×64 ═══
  private drawBarricade(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Main stone block
    this.rect(g, 0, 0, 32, 64, 4, 0x222226);
    this.rect(g, 2, 2, 28, 60, 2, 0x33333a);
    // Gold brackets
    this.rect(g, 0, 10, 32, 6, 1, 0x6b5a20);
    this.rect(g, 0, 48, 32, 6, 1, 0x6b5a20);
    // Rivets
    g.fillStyle(0x000000);
    g.fillCircle(6, 13, 1.5);
    g.fillCircle(26, 13, 1.5);
    g.fillCircle(6, 51, 1.5);
    g.fillCircle(26, 51, 1.5);
    // Cracks
    g.lineStyle(1.2, 0x111115, 0.8);
    g.beginPath();
    g.moveTo(6, 20); g.lineTo(14, 28); g.lineTo(10, 36); g.lineTo(18, 44);
    g.moveTo(26, 25); g.lineTo(20, 32); g.lineTo(24, 40);
    g.strokePath();
    this.tex(g, 'barricade', 32, 64);
  }

  // ═══ FIRE BULLET 16×8 ═══
  private drawFireBullet(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 0, 0, 16, 8, 2, 0xcc3300);
    this.rect(g, 2, 1, 14, 6, 1, 0xff5500);
    this.rect(g, 5, 1, 10, 5, 1, 0xff8800);
    this.rect(g, 8, 2, 7, 3, 0.5, 0xffcc00);
    g.fillStyle(0xffffff); g.fillCircle(15, 4, 1);
    this.tex(g, 'bullet-fire', 16, 8);
  }

  // ═══ SWORD SLASH 80×28 ═══
  private drawSwordSlash(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const W = 80, H = 28;
    const layers = [
      { a: 0.20, c: 0x440a0a, mul: 13 }, // outer faint crimson glow
      { a: 0.50, c: 0xaa2222, mul: 11 }, // mid-layer red
      { a: 0.75, c: 0xff4422, mul: 8 },  // bright orange-red
      { a: 0.95, c: 0xffcc44, mul: 4 },  // hot gold/yellow core
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, H / 2);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    // Inner white hot streak line for extreme energy feel
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(6, H / 2);
    for (let x = 6; x < W - 6; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * 1.5);
    g.strokePath();

    g.fillStyle(0xffcc44); g.fillCircle(3, H / 2, 2.0); g.fillCircle(W - 4, H / 2, 2.0);
    this.tex(g, 'sword-slash', W, H);
  }

  // ═══ HEAVY SWORD SLASH 128×48 ═══
  private drawSwordSlashHeavy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const W = 128, H = 48;
    const layers = [
      { a: 0.20, c: 0x660022, mul: 23 }, // dark violet/red heavy trail
      { a: 0.50, c: 0xd61a1a, mul: 18 },
      { a: 0.75, c: 0xff0066, mul: 13 }, // mecha pink-red glow
      { a: 0.95, c: 0xffaa44, mul: 7 },  // gold core
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, H / 2);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    // White-hot inner core
    g.lineStyle(3.5, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(8, H / 2);
    for (let x = 8; x < W - 8; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * 2.5);
    g.strokePath();

    g.fillStyle(0xffffff); g.fillCircle(3, H / 2, 3.0); g.fillCircle(W - 4, H / 2, 3.0);
    this.tex(g, 'sword-slash-heavy', W, H);
  }

  // ═══ DESTINY CARD 20×28 ═══
  private drawDestinyCard(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 0, 0, 20, 28, 2, 0x1a1008);
    this.rect(g, 1, 1, 18, 26, 2, 0x2a1a0d);
    this.rect(g, 2, 2, 16, 24, 1, 0x110804);
    g.fillStyle(0x887744); g.fillCircle(10, 8, 2);
    g.fillStyle(0xccaa66); g.fillTriangle(8, 8, 12, 8, 10, 5);
    g.fillStyle(0xffcc00); g.fillCircle(10, 16, 1.5);
    this.tex(g, 'destiny-echo', 20, 28);
  }

  // ═══ SHADOW 36×12 ═══
  private drawShadow(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(18, 6, 36, 12);
    this.tex(g, 'shadow', 36, 12);
  }

  // ═══ TWINKLING STAR 5×5 ═══
  private drawTwinkleStar(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1.0);
    g.fillRect(2, 2, 1, 1); // center
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(1, 2, 3, 1); // horizontal
    g.fillRect(2, 1, 1, 3); // vertical
    this.tex(g, 'star-twinkle', 5, 5);
  }

  // ═══ MOON GLOW 512×512 ═══
  private drawMoonGlow(): void {
    const canvasGlow = document.createElement('canvas');
    canvasGlow.width = 512;
    canvasGlow.height = 512;
    const ctxGlow = canvasGlow.getContext('2d');
    if (ctxGlow) {
      const grad = ctxGlow.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, 'rgba(230, 40, 50, 0.22)'); // softened crimson center glow
      grad.addColorStop(0.2, 'rgba(210, 30, 40, 0.10)');
      grad.addColorStop(0.5, 'rgba(160, 20, 30, 0.03)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctxGlow.fillStyle = grad;
      ctxGlow.fillRect(0, 0, 512, 512);
    }
    if (this.textures.exists('moon-glow')) {
      this.textures.remove('moon-glow');
    }
    this.textures.addCanvas('moon-glow', canvasGlow);
  }

  private drawBackgrounds(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Sky gradient
    for (let y = 0; y < 1200; y++) {
      const t = y / 1200;
      const r = Math.floor(4 * (1 - t) + 8 * t);
      const gr = Math.floor(3 * (1 - t) + 5 * t);
      const bl = Math.floor(10 * (1 - t) + 16 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, y, 960, 1);
    }

    // Draw Nebula / Milky Way core dust cloud (low alpha overlay circles)
    const drawNebulaCloud = (cx: number, cy: number, radius: number, color: number, alpha: number) => {
      g.fillStyle(color, alpha);
      g.fillCircle(cx, cy, radius);
    };

    for (let j = 0; j < 60; j++) {
      const t = j / 60;
      // Diagonal lane from top-left-ish to bottom-right-ish
      const lx = 150 + t * 600 + Phaser.Math.Between(-80, 80);
      const ly = t * 1200 + Phaser.Math.Between(-100, 100);
      
      drawNebulaCloud(lx, ly, Phaser.Math.Between(100, 180), 0x5a186b, 0.03); // purple
      if (Math.random() > 0.4) {
        drawNebulaCloud(lx + Phaser.Math.Between(-30, 30), ly + Phaser.Math.Between(-30, 30), Phaser.Math.Between(80, 140), 0x821c4b, 0.025); // magenta
      }
      if (Math.random() > 0.4) {
        drawNebulaCloud(lx + Phaser.Math.Between(-40, 40), ly + Phaser.Math.Between(-40, 40), Phaser.Math.Between(120, 200), 0x1d478a, 0.02); // cosmic blue
      }
    }

    // Standard background stars
    for (let i = 0; i < 350; i++) {
      const sx = Phaser.Math.Between(0, 959), sy = Phaser.Math.Between(0, 1100);
      const b = Math.random();
      g.fillStyle(b > 0.85 ? 0x8899bb : b > 0.6 ? 0x556677 : b > 0.3 ? 0x445566 : 0x334455);
      g.fillCircle(sx, sy, b > 0.6 ? 0.7 : 0.4);
    }

    // Nebula dense star clusters
    for (let i = 0; i < 200; i++) {
      const t = Math.random();
      const lx = 150 + t * 600 + Phaser.Math.Between(-100, 100);
      const ly = t * 1200 + Phaser.Math.Between(-120, 120);
      if (lx >= 0 && lx < 960 && ly >= 0 && ly < 1200) {
        const b = Math.random();
        g.fillStyle(b > 0.7 ? 0xccddee : 0x8899aa);
        g.fillCircle(lx, ly, b > 0.8 ? 0.8 : 0.5);
      }
    }

    // Bright flare stars
    for (let i = 0; i < 25; i++) {
      const sx = Phaser.Math.Between(50, 910), sy = Phaser.Math.Between(30, 800);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(sx, sy, 1.2);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(sx - 4, sy, 9, 1);
      g.fillRect(sx, sy - 4, 1, 9);
    }

    this.tex(g, 'bg-sky', 960, 1200);

    // Mountains (960x800, transparent above peaks, gradient body below peaks, glowing red ridge highlight)
    g.fillStyle(0x0d1220);
    for (let x = 0; x < 960; x++) {
      const h = 15 + Math.sin(x * 0.006 + 0.5) * 30 
                 + Math.cos(x * 0.015 + 1.2) * 18 
                 + Math.abs(Math.sin(x * 0.04 + 0.3)) * 10 
                 + Math.abs(Math.cos(x * 0.09 + 2.1)) * 5;
      const peakY = 140 - Math.floor(h);

      // 1. Draw glowing crimson ridge peak (2 pixels)
      g.fillStyle(0x3e1820); // warm dark red/crimson moonlight edge
      g.fillRect(x, peakY, 1, 2);

      // 2. Draw mountain body with vertical gradient (dark indigo fading to near black)
      const startY = peakY + 2;
      const totalH = 800 - startY;
      const bands = Math.ceil(totalH / 12);
      for (let b = 0; b < bands; b++) {
        const bandY = startY + b * 12;
        const bandH = Math.min(12, 800 - bandY);
        const t = b / bands;
        const r = Math.floor(25 * (1 - t) + 12 * t);
        const gr = Math.floor(32 * (1 - t) + 16 * t);
        const bl = Math.floor(52 * (1 - t) + 26 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, bandY, 1, bandH);
      }
    }
    this.tex(g, 'bg-mountains', 960, 800);

    // Forest (960x800, transparent above horizon/trees, gradient body below horizon)
    const groundStartY = 100;
    const groundTotalH = 700;
    const groundBands = 50;
    for (let b = 0; b < groundBands; b++) {
      const bandY = groundStartY + Math.floor(b * (groundTotalH / groundBands));
      const bandH = Math.ceil(groundTotalH / groundBands);
      const t = b / groundBands;
      const r = Math.floor(24 * (1 - t) + 10 * t);
      const gr = Math.floor(36 * (1 - t) + 15 * t);
      const bl = Math.floor(54 * (1 - t) + 24 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, bandY, 960, bandH);
    }

    const drawPineTree = (tx: number, th: number, tw: number) => {
      const layers = 3;
      const layerH = th / layers;
      for (let l = 0; l < layers; l++) {
        const scale = 1 - (l * 0.25);
        const bottomY = 100 - (l * layerH * 0.8);
        const topY = bottomY - layerH * 1.4;
        const w = tw * scale;

        // Deep shadow on left side
        g.fillStyle(0x060c12);
        g.beginPath();
        g.moveTo(tx - w / 2, bottomY);
        g.lineTo(tx, topY);
        g.lineTo(tx, bottomY);
        g.closePath();
        g.fillPath();

        // Warm red moonlight highlight on right side
        g.fillStyle(0x28191d);
        g.beginPath();
        g.moveTo(tx, bottomY);
        g.lineTo(tx, topY);
        g.lineTo(tx + w / 2, bottomY);
        g.closePath();
        g.fillPath();

        // Outer highlight edge
        g.fillStyle(0x402528);
        g.beginPath();
        g.moveTo(tx, topY);
        g.lineTo(tx + w / 2, bottomY);
        g.lineTo(tx + w / 2 - 1, bottomY);
        g.lineTo(tx, topY);
        g.closePath();
        g.fillPath();
      }
      // Trunk
      g.fillStyle(0x040608);
      g.fillRect(tx - 2, 100, 4, 8);
    };
    [30, 110, 190, 280, 360, 440, 530, 610, 700, 770, 850, 920].forEach(tx => {
      const th = Phaser.Math.Between(30, 65), tw = Phaser.Math.Between(8, 16);
      drawPineTree(tx, th, tw);
    });
    this.tex(g, 'bg-forest', 960, 800);

    // Ruins (960x800, transparent above horizon/pillars, gradient body below horizon)
    // 1. Draw ruins ground with 2D checkerboard dithering at boundaries
    for (let y = 80; y < 800; y++) {
      let color = 0x2b384a;
      let nextColor = 0x2b384a;
      let mid = 0;

      if (y < 160) {
        color = 0x2b384a;
        nextColor = 0x1f2838;
        mid = 160;
      } else if (y < 280) {
        color = 0x1f2838;
        nextColor = 0x141b26;
        mid = 280;
      } else if (y < 440) {
        color = 0x141b26;
        nextColor = 0x0a0d14;
        mid = 440;
      } else {
        color = 0x0a0d14;
        nextColor = 0x0a0d14;
        mid = 800;
      }

      const dist = y - (mid - 6);
      if (mid < 800 && dist >= 0 && dist <= 12) {
        const t = dist / 12;
        for (let x = 0; x < 960; x++) {
          let drawNext = false;
          if (t < 0.25) {
            drawNext = ((x + y) % 4 === 0);
          } else if (t < 0.5) {
            drawNext = ((x + y) % 2 === 0);
          } else if (t < 0.75) {
            drawNext = ((x + y) % 4 !== 0);
          } else {
            drawNext = true;
          }
          g.fillStyle(drawNext ? nextColor : color);
          g.fillRect(x, y, 1, 1);
        }
      } else {
        g.fillStyle(color);
        g.fillRect(0, y, 960, 1);
      }
    }

    // 2. Draw subterranean dungeon archways (cellars under the ruins)
    const drawSubArch = (ax: number, ay: number, aw: number, ah: number) => {
      // Dark chamber cavity
      g.fillStyle(0x06090e);
      g.fillRect(ax + 4, ay + 6, aw - 8, ah - 6);
      g.fillRect(ax + 8, ay, aw - 16, 6);
      g.fillRect(ax + 6, ay + 3, aw - 12, 3);
      g.fillRect(ax + 4, ay + 6, aw - 8, 3);

      // Inner wall highlights (moonlight catching inner left/top)
      g.fillStyle(0x4a5d80);
      g.fillRect(ax + 4, ay + 6, 1, ah - 6);
      g.fillRect(ax + 8, ay, aw - 16, 1);
      g.fillRect(ax + 6, ay + 3, 2, 1);
      g.fillRect(ax + 4, ay + 6, 2, 1);

      // Outer stone frame
      g.fillStyle(0x1a2133);
      g.fillRect(ax, ay, 4, ah);
      g.fillRect(ax + aw - 4, ay, 4, ah);
      g.fillRect(ax, ay - 4, aw, 4);
      // Frame highlights
      g.fillStyle(0x8c5064);
      g.fillRect(ax + aw - 1, ay - 4, 1, ah + 4);
      g.fillRect(ax, ay - 4, aw, 1);
    };

    drawSubArch(120, 110, 50, 70);
    drawSubArch(450, 115, 60, 80);
    drawSubArch(720, 110, 55, 75);

    // 3. Draw weathered horizontal brick masonry rows
    g.fillStyle(0x182030);
    for (let gy = 120; gy < 600; gy += 24) {
      for (let x = 0; x < 960; x += 32) {
        if (Math.random() > 0.35) {
          g.fillRect(x, gy, 20, 1);
        }
      }
    }

    // 4. Draw stone block debris / rubble piles at the horizon
    g.fillStyle(0x162030);
    [80, 130, 230, 310, 350, 430, 510, 570, 670, 760, 830, 870].forEach(rx => {
      const w = Phaser.Math.Between(6, 12);
      const h = Phaser.Math.Between(4, 10);
      g.fillRect(rx, 80 - h, w, h);
      // Highlight on right edge of rubble
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, 80 - h, 1, h);
      g.fillRect(rx, 80 - h, w, 1);
      g.fillStyle(0x162030);
    });

    const drawGothicWindowWall = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      
      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, 12, h);
      g.fillRect(rx + w - 12, topY, 12, h);
      g.fillRect(rx + 12, 80 - 20, w - 24, 6);
      g.fillRect(rx + 12, topY, w - 24, 12);
      g.fillRect(rx + 12, topY + 12, 4, 6);
      g.fillRect(rx + w - 16, topY + 12, 4, 6);
      g.fillRect(rx + 16, topY + 12, w - 32, 3);
      g.fillRect(rx + Math.floor(w / 2) - 2, topY + 12, 4, h - 32);
      g.fillRect(rx - 2, topY + 10, 2, h - 10);
      g.fillRect(rx + w, topY + 10, 2, h - 10);
      g.fillRect(rx - 1, topY - 8, 3, 8);
      g.fillRect(rx + w - 2, topY - 8, 3, 8);
      g.fillRect(rx, topY - 12, 1, 4);
      g.fillRect(rx + w - 1, topY - 12, 1, 4);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + 12, topY + 12, 1, h - 32);
      g.fillRect(rx + Math.floor(w / 2) - 2, topY + 12, 1, h - 32);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(rx + w - 12 - 1, topY + 12, 1, h - 32);
      g.fillRect(rx + Math.floor(w / 2) + 1, topY + 12, 1, h - 32);
      g.fillRect(rx, topY, w, 1);
      g.fillRect(rx + 12, 80 - 20, w - 24, 1);

      // Brick joints
      g.fillStyle(0x090c14);
      for (let y = topY + 14; y < 80; y += 14) {
        g.fillRect(rx, y, 12, 1);
        g.fillRect(rx + w - 12, y, 12, 1);
      }
    };

    const drawGothicArch = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const pillarW = 8;
      
      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, pillarW, h);
      g.fillRect(rx + w - pillarW, topY, pillarW, h);
      g.fillRect(rx - 2, topY, pillarW + 4, 3);
      g.fillRect(rx + w - pillarW - 2, topY, pillarW + 4, 3);
      g.fillRect(rx, topY - 6, w, 6);
      g.fillRect(rx + pillarW, topY, 4, 4);
      g.fillRect(rx + w - pillarW - 4, topY, 4, 4);
      g.fillRect(rx + pillarW + 4, topY - 3, w - (pillarW + 4) * 2, 3);
      g.fillRect(rx + Math.floor(w / 2) - 3, topY - 12, 6, 6);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 2, 6);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + w - pillarW, topY, 1, h);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + pillarW - 1, topY, 1, h);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(rx, topY - 6, w, 1);
      g.fillRect(rx - 2, topY, pillarW + 4, 1);
      g.fillRect(rx + w - pillarW - 2, topY, pillarW + 4, 1);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 1, 6);
    };

    const drawTowerPillar = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const slitW = 4;
      const slitX = rx + Math.floor(w / 2) - Math.floor(slitW / 2);

      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, slitX - rx, h);
      g.fillRect(slitX + slitW, topY, rx + w - (slitX + slitW), h);
      g.fillRect(slitX, topY, slitW, 20);
      g.fillRect(slitX, 80 - 20, slitW, 20);
      g.fillRect(rx - 3, topY, w + 6, 4);
      g.fillRect(rx - 1, topY - 4, w + 2, 4);
      g.fillRect(rx + 4, topY - 10, w - 8, 6);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 2, 8);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(slitX + slitW, topY + 20, 1, h - 40);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(slitX - 1, topY + 20, 1, h - 40);
      g.fillRect(rx - 3, topY, w + 6, 1);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 1, 8);
    };

    const drawBrokenColumn = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const partW = Math.floor(w / 2);

      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, partW, h);
      g.fillRect(rx + partW, topY + 12, w - partW, h - 12);
      g.fillRect(rx - 2, topY, partW + 2, 3);
      g.fillRect(rx - 6, 80 - 4, 4, 4);
      g.fillRect(rx + w + 2, 80 - 3, 3, 3);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + partW, topY + 12, 1, h - 12);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + partW - 1, topY, 1, h);
      g.fillRect(rx + w - 1, topY + 12, 1, h - 12);
      g.fillRect(rx - 2, topY, partW + 2, 1);
      g.fillRect(rx + partW, topY + 12, w - partW, 1);
    };

    drawGothicArch(40, 80, 70);
    drawTowerPillar(160, 20, 110);
    drawGothicWindowWall(240, 60, 85);
    drawBrokenColumn(360, 16, 50);
    drawGothicArch(440, 90, 65);
    drawGothicWindowWall(580, 70, 95);
    drawTowerPillar(700, 24, 120);
    drawGothicArch(780, 70, 75);
    drawBrokenColumn(890, 16, 60);

    this.tex(g, 'bg-ruins', 960, 800);

    // Procedural Mist Texture (512x128, soft horizontal transparency waves)
    const canvasMist = document.createElement('canvas');
    canvasMist.width = 512;
    canvasMist.height = 128;
    const ctxMist = canvasMist.getContext('2d');
    if (ctxMist) {
      for (let x = 0; x < 512; x++) {
        for (let y = 0; y < 128; y++) {
          const density = (Math.sin(x * 0.02) * Math.cos(y * 0.05) + Math.sin(x * 0.05 + y * 0.1) * 0.5 + 1.5) / 3;
          const edgeFade = Math.sin((y / 128) * Math.PI); 
          const alpha = Math.floor(density * edgeFade * 40); 
          ctxMist.fillStyle = `rgba(130, 45, 55, ${alpha / 255})`; 
          ctxMist.fillRect(x, y, 1, 1);
        }
      }
    }
    if (this.textures.exists('bg-mist')) {
      this.textures.remove('bg-mist');
    }
    this.textures.addCanvas('bg-mist', canvasMist);
  }

  // ═══ PARTICLES ═══
  private drawParticles(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.circ(g, 4, 4, 3.5, 0xff4400); this.circ(g, 4, 3, 2.5, 0xff6600); this.circ(g, 4, 3, 1.5, 0xffaa00);
    this.tex(g, 'particle-fire', 8, 8);
    this.circ(g, 4, 4, 3.5, 0x443333); this.circ(g, 4, 3, 2.5, 0x554444);
    this.tex(g, 'particle-smoke', 8, 8);
    this.circ(g, 2, 2, 2, 0xffcc00); this.circ(g, 1.5, 1.5, 0.8, 0xffffff);
    this.tex(g, 'particle-spark', 4, 4);
    this.circ(g, 2, 2, 2, 0xff5500); this.circ(g, 1.5, 1.5, 1, 0xff8800);
    this.tex(g, 'particle-ember', 4, 4);
  }

  private keyOutBlackAndScale(rawKey: string, targetKey: string, targetW: number, targetH: number): void {
    const textureObj = this.textures.get(rawKey);
    if (!textureObj) {
      console.warn(`Texture ${rawKey} not found!`);
      return;
    }
    const source = textureObj.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(source, 0, 0, targetW, targetH);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    // Detect background color from top-left corner pixel (0, 0)
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Distance to detected background color
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      // Absolute black or absolute white check as safety fallbacks
      const isBlack = r < 18 && g < 18 && b < 18;
      const isWhite = r > 238 && g > 238 && b > 238;

      if (dist < 45 || isBlack || isWhite) {
        data[i + 3] = 0; // Make transparent
      } else if (targetKey === 'bg-castle') {
        // Brighten the castle pixels to allow bright multiplicative tints in Phaser.
        // We map the dark silhouette colors to a bright light-gray/silver-white scale,
        // preserving details like the clock hands and outline shading.
        const brightness = (r + g + b) / 3;
        const newVal = Math.round(160 + (brightness / 255) * 95);
        data[i] = newVal;
        data[i + 1] = newVal;
        data[i + 2] = newVal;
      }
    }

    // Smoothly fade out the bottom of the castle silhouette to avoid a cut-off look
    if (targetKey === 'bg-castle') {
      // Find the actual bottom row of the castle (the last row with any visible pixels)
      let actualBottomY = 0;
      for (let y = targetH - 1; y >= 0; y--) {
        let rowHasPixels = false;
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          if (data[idx + 3] > 0) {
            rowHasPixels = true;
            break;
          }
        }
        if (rowHasPixels) {
          actualBottomY = y;
          break;
        }
      }

      // Apply the fade-out to the bottom of the actual castle height (e.g. 70 pixels fade length)
      const fadeLength = 70; 
      const fadeStart = Math.max(0, actualBottomY - fadeLength);

      for (let y = fadeStart; y <= actualBottomY; y++) {
        const factor = 1 - (y - fadeStart) / (actualBottomY - fadeStart);
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          data[idx + 3] = Math.round(data[idx + 3] * factor);
        }
      }

      // Clear any pixels below actualBottomY just in case
      for (let y = actualBottomY + 1; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (this.textures.exists(targetKey)) {
      this.textures.remove(targetKey);
    }
    this.textures.addCanvas(targetKey, canvas);
  }

  private drawLargeRockProcedural(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Rock base shadow
    g.fillStyle(0x0a0c10);
    g.fillRoundedRect(0, 0, 32, 32, 4);

    // Main craggy dark slate body
    g.fillStyle(0x20242e);
    g.beginPath();
    g.moveTo(3, 29);
    g.lineTo(29, 29);
    g.lineTo(29, 8);
    g.lineTo(22, 3);
    g.lineTo(10, 3);
    g.closePath();
    g.fillPath();

    // Left shadow facet (darker overlay)
    g.fillStyle(0x131720, 0.4);
    g.beginPath();
    g.moveTo(3, 29);
    g.lineTo(14, 29);
    g.lineTo(10, 3);
    g.closePath();
    g.fillPath();

    // Beveled highlight lines (top and right edges)
    g.lineStyle(1.5, 0x5a667c);
    g.beginPath();
    g.moveTo(10, 3); g.lineTo(22, 3); g.lineTo(29, 8); g.lineTo(29, 29);
    g.strokePath();

    // Magma veins (heavy hot cracks)
    g.lineStyle(2.0, 0xff2200);
    g.beginPath();
    g.moveTo(8, 24); g.lineTo(16, 14); g.lineTo(24, 18);
    g.moveTo(16, 14); g.lineTo(18, 4);
    g.strokePath();

    // Secondary vein branch
    g.lineStyle(1.0, 0xff6600);
    g.beginPath();
    g.moveTo(24, 18); g.lineTo(27, 10);
    g.strokePath();

    // Glowing core dots
    g.fillStyle(0xffaa00);
    g.fillCircle(16, 14, 2);
    g.fillCircle(24, 18, 1);

    this.tex(g, 'rock-large', 32, 32);
  }

  private drawRefineryTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2d3436); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x636e72); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x1e272e); g.fillRect(0, 14, 32, 2);
    
    // Grid lines
    g.fillStyle(0x3d4446);
    g.fillRect(8, 2, 2, 12);
    g.fillRect(16, 2, 2, 12);
    g.fillRect(24, 2, 2, 12);
    g.fillRect(2, 8, 28, 2);
    this.tex(g, 'tile-refinery', 32, 16);
  }

  private drawLavaGround(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2d3033); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x3d4043); g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x1a1c1e); g.fillRect(0, 28, 32, 4);
    
    // Magma veins
    g.fillStyle(0xd63031);
    g.fillRect(4, 8, 6, 4);
    g.fillRect(10, 10, 8, 4);
    g.fillRect(18, 12, 10, 4);
    g.fillRect(12, 18, 6, 8);
    
    g.fillStyle(0xe17055);
    g.fillRect(6, 9, 3, 2);
    g.fillRect(12, 11, 4, 2);
    g.fillRect(20, 13, 6, 2);
    g.fillRect(13, 20, 4, 4);
    
    g.fillStyle(0xfdcb6e);
    g.fillCircle(14, 12, 1.5);
    g.fillCircle(22, 14, 1.5);
    g.fillCircle(15, 22, 1.2);
    
    this.tex(g, 'tile-lava-ground', 32, 32);
  }

  private drawRefineryLavaTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Base bright orange-red
    g.fillStyle(0xe17055); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xfdcb6e); g.fillRect(0, 0, 32, 6); // Top hot layer
    
    // Bubbles
    g.fillStyle(0xd63031);
    g.fillCircle(8, 12, 3);
    g.fillCircle(24, 18, 4);
    g.fillCircle(14, 26, 3.5);
    
    g.fillStyle(0xffaa44);
    g.fillCircle(9, 11, 1.5);
    g.fillCircle(25, 17, 2);
    g.fillCircle(15, 25, 1.8);
    
    this.tex(g, 'tile-refinery-lava', 32, 32);
  }

  private drawSteamVent(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Metallic pipe base
    g.fillStyle(0x34495e); g.fillRect(4, 16, 24, 16);
    g.fillStyle(0x2c3e50); g.fillRect(4, 16, 12, 16);
    
    // Flange/rim
    g.fillStyle(0x506275); g.fillRect(2, 8, 28, 8);
    g.fillStyle(0x3d4e61); g.fillRect(2, 8, 14, 8);
    
    // Glowing hot steam output rim
    g.fillStyle(0xe67e22); g.fillRect(6, 4, 20, 4);
    g.fillStyle(0xf1c40f); g.fillRect(10, 4, 12, 4);
    
    this.tex(g, 'steam-vent', 32, 32);
  }

  private drawCoolValve(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Vertical pipe
    g.fillStyle(0x4b6584); g.fillRect(12, 0, 8, 32);
    g.fillStyle(0x2b3b4e); g.fillRect(12, 0, 4, 32);
    
    // Valve hub
    g.fillStyle(0x57606f); g.fillCircle(16, 16, 8);
    g.fillStyle(0x2f3542); g.fillCircle(16, 16, 4);
    
    // Circular wheel valve handle
    g.lineStyle(2.5, 0x3498db);
    g.strokeCircle(16, 16, 11);
    
    // glowing indicator in center
    g.fillStyle(0x00d2d3); g.fillCircle(16, 16, 2.5);
    g.fillStyle(0xffffff); g.fillCircle(16, 16, 1);
    
    this.tex(g, 'cool-valve', 32, 32);
  }

  private drawMechaEnemy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Giant iron armored bulk head
    g.fillStyle(0x2c3e50);
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(30, 8);
    g.lineTo(32, 22);
    g.lineTo(26, 30);
    g.lineTo(6, 30);
    g.lineTo(0, 22);
    g.lineTo(2, 8);
    g.closePath();
    g.fillPath();
    
    // Inner shadow plates
    g.fillStyle(0x1a252f);
    g.beginPath();
    g.moveTo(16, 5);
    g.lineTo(28, 10);
    g.lineTo(29, 20);
    g.lineTo(24, 27);
    g.lineTo(8, 27);
    g.lineTo(3, 20);
    g.lineTo(4, 10);
    g.closePath();
    g.fillPath();

    // Bronze/Gold accents
    g.fillStyle(0xd35400); // Darker mechanical bronze
    g.fillRect(8, 6, 4, 4);
    g.fillRect(20, 6, 4, 4);
    
    // Glowing visor red/orange eye line
    g.fillStyle(0xc0392b); g.fillRect(6, 12, 20, 4);
    g.fillStyle(0xe74c3c); g.fillRect(10, 13, 12, 2);
    g.fillStyle(0xffffff); g.fillRect(15, 13, 2, 2);
    
    // Heavy circular core in chest
    g.fillStyle(0x2c3e50); g.fillCircle(16, 21, 6);
    g.fillStyle(0xe67e22); g.fillCircle(16, 21, 4.5);
    g.fillStyle(0xf1c40f); g.fillCircle(16, 21, 2);
    g.fillStyle(0xffffff); g.fillCircle(16, 21, 1);
    
    // Leg braces
    g.fillStyle(0x2c3e50);
    g.fillRect(4, 28, 6, 4);
    g.fillRect(22, 28, 6, 4);
    g.fillStyle(0x1a252f);
    g.fillRect(5, 29, 4, 3);
    g.fillRect(23, 29, 4, 3);

    this.tex(g, 'enemy-mecha', 32, 32);
  }

  private drawEnergyPickup(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // metallic bracket/base
    this.rect(g, 2, 6, 12, 4, 1, 0x3a4a5a);
    this.rect(g, 4, 4, 8, 8, 1, 0x4a5a6a);
    // glowing blue capsule
    this.circ(g, 8, 8, 3.5, 0x00d2d3);
    this.circ(g, 8, 8, 2.0, 0x00ffff);
    this.circ(g, 8, 8, 0.8, 0xffffff);
    // rings / side wings
    this.rect(g, 0, 7, 2, 2, 0, 0x00d2d3);
    this.rect(g, 14, 7, 2, 2, 0, 0x00d2d3);
    this.tex(g, 'energy-pickup', 16, 16);
  }

  private drawGorgeWalls(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const w = 960;
    const h = 800;

    // Dual-silhouette: ceiling (top) and floor (bottom)
    // Seamlessly tileable over x = 960 using integer period sine waves
    for (let x = 0; x < w; x++) {
      const angle = x * (2 * Math.PI / w);
      
      // 1. Ceiling rocks (y = 0 down to hTop)
      const hTop = 130 + Math.sin(angle) * 35 
                       + Math.cos(angle * 2) * 20 
                       + Math.sin(angle * 5) * 8 
                       + Math.cos(angle * 12) * 4;
      const topPeak = Math.floor(hTop);

      // Gradient body for ceiling (from very dark purple-gray to dark navy)
      for (let y = 0; y < topPeak - 2; y++) {
        const t = y / topPeak;
        const r = Math.floor(8 * (1 - t) + 20 * t);
        const gr = Math.floor(6 * (1 - t) + 14 * t);
        const bl = Math.floor(14 * (1 - t) + 30 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, y, 1, 1);
      }
      
      // Magma glow edge at the bottom of the ceiling rock
      g.fillStyle(0xd35400); // orange-red magma
      g.fillRect(x, topPeak - 2, 1, 1);
      g.fillStyle(0xff8833); // brighter yellow-orange edge
      g.fillRect(x, topPeak - 1, 1, 1);

      // 2. Floor rocks (y = 800 - hBot up to 800)
      const hBot = 150 + Math.cos(angle) * 45 
                       + Math.sin(angle * 2) * 25 
                       + Math.cos(angle * 4) * 12 
                       + Math.sin(angle * 14) * 5;
      const botPeak = Math.floor(hBot);
      const startY = h - botPeak;

      // Magma glow edge at the top of the floor rock
      g.fillStyle(0xff8833); // brighter yellow-orange edge
      g.fillRect(x, startY, 1, 1);
      g.fillStyle(0xd35400); // orange-red magma
      g.fillRect(x, startY + 1, 1, 1);

      // Gradient body for floor (from dark navy to very dark purple-gray)
      for (let y = startY + 2; y < h; y++) {
        const t = (y - startY) / botPeak;
        const r = Math.floor(20 * (1 - t) + 8 * t);
        const gr = Math.floor(14 * (1 - t) + 6 * t);
        const bl = Math.floor(30 * (1 - t) + 14 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, y, 1, 1);
      }
    }

    this.tex(g, 'bg-gorge-walls', w, h);
  }

  private drawGorgeStructures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const tw = 480;
    const th = 480;

    // Draw industrial girders and pipes that tile seamlessly
    // 1. Horizontal heavy pipe at y = 140 (height 28)
    const pipeY = 140;
    const pipeH = 28;
    for (let py = 0; py < pipeH; py++) {
      const t = py / pipeH;
      let col = 0x111622; // dark steel
      if (t < 0.2) col = 0x556270; // highlight top
      else if (t < 0.5) col = 0x222d3d; // medium
      else if (t > 0.8) col = 0x0a0f16; // shadow bottom
      g.fillStyle(col);
      g.fillRect(0, pipeY + py, tw, 1);
    }
    
    // Pipe rivets/joints every 120 pixels
    for (let rx = 0; rx < tw; rx += 120) {
      g.fillStyle(0x0a0f16);
      g.fillRect(rx, pipeY - 2, 6, pipeH + 4);
      g.fillStyle(0x7f8c8d);
      g.fillRect(rx + 2, pipeY, 2, 4);
      g.fillRect(rx + 2, pipeY + pipeH - 4, 2, 4);
    }

    // 2. Vertical girders (posts) of width 20 at x = 90 and x = 370
    const girderWidth = 20;
    const girderXLocations = [90, 370];
    
    girderXLocations.forEach((gx) => {
      // Draw vertical beam
      g.fillStyle(0x0a0e14); // deep slate/black girder body
      g.fillRect(gx, 0, girderWidth, th);

      g.fillStyle(0x1b2330); // vertical highlight strip
      g.fillRect(gx + 4, 0, 4, th);

      g.fillStyle(0x05070a); // shadow side
      g.fillRect(gx + 12, 0, 8, th);

      // Truss patterns: Draw diagonal crossbars at 60px height intervals
      for (let ty = 0; ty < th; ty += 120) {
        g.lineStyle(2, 0x1b2330);
        // diagonal truss line
        g.beginPath();
        g.moveTo(gx + girderWidth, ty);
        g.lineTo(gx - 40, ty + 60);
        g.moveTo(gx - 40, ty);
        g.lineTo(gx + girderWidth, ty + 60);
        g.strokePath();

        // horizontal truss line
        g.beginPath();
        g.moveTo(gx, ty + 60);
        g.lineTo(gx - 40, ty + 60);
        g.strokePath();
      }
    });

    // 3. Glowing biomechanical power cables weaving through the structures
    g.lineStyle(2, 0xa30045, 0.7); // purple-pink glow
    g.beginPath();
    for (let cx = 0; cx < tw; cx++) {
      const cy = 240 + Math.sin(cx * (2 * Math.PI / tw) * 2) * 50;
      if (cx === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    }
    g.strokePath();

    g.lineStyle(1.2, 0xff88ee, 0.9); // inner cable light core
    g.beginPath();
    for (let cx = 0; cx < tw; cx++) {
      const cy = 240 + Math.sin(cx * (2 * Math.PI / tw) * 2) * 50;
      if (cx === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    }
    g.strokePath();

    this.tex(g, 'bg-gorge-structures', tw, th);
  }
}
