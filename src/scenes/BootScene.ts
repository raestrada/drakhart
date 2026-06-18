import Phaser from 'phaser';
import { t, setLanguage, getLanguage } from '../i18n';
import { TitleAudio } from '../systems/TitleAudio';
import { clearSave, loadGame } from '../systems/SaveSystem';
import { createPlayerAnims, createEnemyAnims } from '../animations/PlayerAnims';
import { TexturesGenerator } from '../generators/TexturesGenerator';
import { CustomPostFX } from '../effects/PostFXPipelines';

export class BootScene extends Phaser.Scene {
  private titleAudio!: TitleAudio;
  private menuAudio: HTMLAudioElement | null = null;

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

    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.renderer.pipelines.addPostPipeline('CustomPostFX', CustomPostFX);
    }

    // 1. Splash image background cover
    const splash = this.add.image(width / 2, height / 2, 'title-splash');
    splash.setDisplaySize(width, height);
    splash.setAlpha(0.25);

    // Initialize Title Audio system
    this.titleAudio = new TitleAudio();

    // Generate all procedural game textures
    new TexturesGenerator(this).generate();

    // Register all Phaser animations
    createPlayerAnims(this);
    createEnemyAnims(this);

    // Spawn background atmospheric embers
    this.startEmberRain(width, height);

    // Parallax menu background: subtle starfield + mist
    this.createMenuBackground(width, height);

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
    const btnNewGame = this.add.text(width / 2, height * 0.45, t('ui.newGame'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const btnContinue = this.add.text(width / 2, height * 0.52, t('ui.continue'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: hasSave ? '#aa8855' : '#444444'
    }).setOrigin(0.5);

    if (hasSave) {
      btnContinue.setInteractive({ useHandCursor: true });
    }

    const btnSettings = this.add.text(width / 2, height * 0.59, t('ui.settings'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const btnSoundtrack = this.add.text(width / 2, height * 0.66, t('ui.soundtrack'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const btnManual = this.add.text(width / 2, height * 0.73, t('ui.manual'), {
      fontSize: `${Math.round(15 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuContainer.add([btnNewGame, btnContinue, btnSettings, btnSoundtrack, btnManual]);

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

    // Soundtrack container
    const soundtrackContainer = this.add.container(0, 0).setVisible(false);

    const tracks = [
      { name: 'Beneath the Weight', file: 'Beneath_the_Weight', desc: 'Level 1 — Ashen Woods' },
      { name: 'Iron Arteries', file: 'Iron_Arteries', desc: 'Level 2 — Smelting Refinery' },
      { name: 'Orbit Unbound', file: 'Orbit_Unbound', desc: 'Level 3 — Ashen Gorge' },
      { name: 'The Last Steeple', file: 'The_Last_Steeple', desc: 'Boss — Dreadnought' },
      { name: 'Silentium Draconis', file: 'Silentium_Draconis', desc: 'Sacred Altar — Dragon Core' },
      { name: 'Vigil of the Fallen King', file: 'Vigil_of_the_Fallen_King', desc: 'Title Theme — Main Menu' },
    ];

    let currentAudio: HTMLAudioElement | null = null;
    let nowPlayingText: Phaser.GameObjects.Text | null = null;

    const trackButtons: Phaser.GameObjects.Text[] = [];
    const trackDescs: Phaser.GameObjects.Text[] = [];

    tracks.forEach((track, i) => {
      const yPos = height * 0.32 + i * height * 0.07;
      const btn = this.add.text(width / 2, yPos, track.name, {
        fontSize: `${Math.round(14 * scale)}px`,
        fontFamily: 'monospace',
        color: '#ccaa66',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const desc = this.add.text(width / 2, yPos + 14 * scale, track.desc, {
        fontSize: `${Math.round(9 * scale)}px`,
        fontFamily: 'monospace',
        color: '#665544',
      }).setOrigin(0.5);

      btn.on('pointerover', () => { btn.setColor('#ffcc66'); btn.setScale(1.04); });
      btn.on('pointerout', () => { btn.setColor('#ccaa66'); btn.setScale(1.0); });

      btn.on('pointerdown', () => {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        const audio = new Audio(`./soundtrack/${track.file}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(() => {});
        currentAudio = audio;

        if (nowPlayingText) {
          nowPlayingText.setText(`${t('ui.nowPlaying')}: ${track.name}`);
          nowPlayingText.setVisible(true);
          nowPlayingText.setAlpha(1);
        }
      });

      trackButtons.push(btn);
      trackDescs.push(desc);
      soundtrackContainer.add([btn, desc]);
    });

    const btnStop = this.add.text(width / 2, height * 0.74, `■ ${t('ui.stop')}`, {
      fontSize: `${Math.round(13 * scale)}px`,
      fontFamily: 'monospace',
      color: '#886644',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnStop.on('pointerover', () => btnStop.setColor('#cc8866'));
    btnStop.on('pointerout', () => btnStop.setColor('#886644'));
    btnStop.on('pointerdown', () => {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if (nowPlayingText) nowPlayingText.setVisible(false);
    });

    nowPlayingText = this.add.text(width / 2, height * 0.82, '', {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ffaa44',
    }).setOrigin(0.5).setVisible(false);

    const btnSoundBack = this.add.text(width / 2, height * 0.90, t('ui.back'), {
      fontSize: `${Math.round(13 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnSoundBack.on('pointerover', () => { btnSoundBack.setColor('#ffcc66'); btnSoundBack.setScale(1.06); btnSoundBack.setText(`> ${t('ui.back')} <`); });
    btnSoundBack.on('pointerout', () => { btnSoundBack.setColor('#aa8855'); btnSoundBack.setScale(1.0); btnSoundBack.setText(t('ui.back')); });
    btnSoundBack.on('pointerdown', () => {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if (nowPlayingText) nowPlayingText.setVisible(false);
      soundtrackContainer.setVisible(false);
      menuContainer.setVisible(true);
      updateMenuLabels();
    });

    soundtrackContainer.add([btnStop, nowPlayingText, btnSoundBack]);

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
    makeButtonGlow(btnSoundtrack, 'ui.soundtrack');
    makeButtonGlow(btnManual, 'ui.manual');
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
      btnSoundtrack.setText(menuContainer.visible ? t('ui.soundtrack') : `> ${t('ui.soundtrack')} <`);
      btnManual.setText(menuContainer.visible ? t('ui.manual') : `> ${t('ui.manual')} <`);
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

    btnSoundtrack.on('pointerdown', () => {
      menuContainer.setVisible(false);
      soundtrackContainer.setVisible(true);
      updateMenuLabels();
    });

    btnManual.on('pointerdown', () => {
      this.scene.launch('ManualScene');
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
    const startCinematicTitle = (targetScene: string = 'GameScene', transitionData: any = undefined) => {
      // Stop menu music
      if (this.menuAudio) { this.menuAudio.pause(); this.menuAudio = null; }

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
          this.scene.start(targetScene, transitionData);
        });
      });
    };

    btnNewGame.on('pointerdown', () => {
      clearSave();
      startCinematicTitle('GameScene');
    });

    if (hasSave) {
      btnContinue.on('pointerdown', () => {
        const saveData = loadGame();
        const targetScene = saveData?.currentScene || 'GameScene';
        const transitionData = saveData ? {
          startPos: { x: saveData.playerX, y: saveData.playerY },
          cardsCollected: saveData.cardsCollected,
          mechaUnlocked: saveData.mechaUnlocked,
          dragonUnlocked: saveData.dragonUnlocked
        } : undefined;
        startCinematicTitle(targetScene, transitionData);
      });
    }

    const startMenuAudio = () => {
      this.menuAudio = new Audio('./soundtrack/Vigil_of_the_Fallen_King.mp3');
      this.menuAudio.volume = 0.45;
      this.menuAudio.addEventListener('ended', () => {
        if (this.menuAudio) {
          this.menuAudio.currentTime = 0;
          this.menuAudio.play().catch(() => {});
        }
      });
      this.menuAudio.play().then(() => {
        this.input.off('pointerdown', startMenuAudio);
      }).catch(() => {
        this.input.once('pointerdown', startMenuAudio);
      });
    };
    startMenuAudio();
  }

  private createMenuBackground(width: number, height: number): void {
    if (!this.textures.exists('bg-sky')) return;

    const sky = this.add.tileSprite(0, 0, width, height * 1.2, 'bg-sky')
      .setOrigin(0, 0)
      .setAlpha(0.3)
      .setDepth(-20);

    const mist = this.add.tileSprite(0, height * 0.55, width, height * 0.5, 'bg-mist')
      .setOrigin(0, 0)
      .setAlpha(0.25)
      .setDepth(-15);

    this.tweens.add({
      targets: sky,
      tilePositionY: -50,
      duration: 12000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: mist,
      tilePositionX: -80,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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

}

