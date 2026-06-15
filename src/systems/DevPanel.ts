import { clearSave } from './SaveSystem';

export class DevPanel {
  private static instance: DevPanel | null = null;
  private containerEl: HTMLDivElement | null = null;
  private visible = false;

  // Cheats state
  private godModeActive = false;
  private infiniteEnergyActive = false;
  private oneHitKillsActive = false;

  // Button references
  private godModeBtn: HTMLButtonElement | null = null;
  private infiniteEnergyBtn: HTMLButtonElement | null = null;
  private oneHitKillsBtn: HTMLButtonElement | null = null;

  private constructor() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + Shift + D
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.toggle();
      }
    });

    const game = (window as any).game;
    if (game && game.events) {
      game.events.on('poststep', () => this.onPostStep());
    }
  }

  public static init(): void {
    if (!DevPanel.instance) {
      DevPanel.instance = new DevPanel();
    }
  }

  private toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  private hide(): void {
    if (this.containerEl) {
      this.containerEl.style.display = 'none';
    }
  }

  private getGameScene(): any {
    const game = (window as any).game;
    if (game && game.scene && game.scene.keys) {
      const scene1 = game.scene.keys.GameScene;
      if (scene1 && scene1.sys && scene1.sys.isActive()) {
        return scene1;
      }
      const scene2 = game.scene.keys.GameScene2;
      if (scene2 && scene2.sys && scene2.sys.isActive()) {
        return scene2;
      }
    }
    return null;
  }

  private show(): void {
    if (!this.containerEl) {
      this.createPanel();
    }
    if (this.containerEl) {
      this.containerEl.style.display = 'block';
      this.updateStatus();
    }
  }

  private createPanel(): void {
    this.containerEl = document.createElement('div');
    this.containerEl.id = 'drakhart-dev-panel';
    
    // Style with dark fantasy glassmorphism
    Object.assign(this.containerEl.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '320px',
      maxHeight: '90vh',
      overflowY: 'auto',
      backgroundColor: 'rgba(10, 7, 16, 0.9)',
      border: '1px solid rgba(224, 30, 55, 0.4)',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
      color: '#e0d8c3',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: '999999',
      backdropFilter: 'blur(8px)',
      userSelect: 'none'
    });

    const titleEl = document.createElement('h3');
    titleEl.textContent = '⚡ DRAKHART DEV MODE';
    Object.assign(titleEl.style, {
      margin: '0 0 12px 0',
      color: '#ff3355',
      fontSize: '14px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      paddingBottom: '8px'
    });
    this.containerEl.appendChild(titleEl);

    // Section 1: Teleportation
    this.addSectionHeader('📍 Teleport Zones');
    
    this.addButton('L1: Start Cavern', () => this.teleportToScene('GameScene', 100, 650));
    this.addButton('L1: Ruins Ledge', () => this.teleportToScene('GameScene', 2050, 650));
    this.addButton('L1: Core Altar', () => this.teleportToScene('GameScene', 6900, 500));
    this.addButton('L2: Start Gates', () => this.teleportToScene('GameScene2', 100, 550));
    this.addButton('L2: Smelting Vats (Lava)', () => this.teleportToScene('GameScene2', 2500, 400));
    this.addButton('L2: Overcharge Chamber', () => this.teleportToScene('GameScene2', 4800, 450));
    this.addButton('L2: Dragon Shrine (X: 7478)', () => this.teleportToScene('GameScene2', 7400, 400));

    // Section 2: Form & Progression
    this.addSectionHeader('🔄 Form Unlock & Control');
    
    this.addButton('Unlock Mecha Form', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.formMachine.unlockTransform();
        this.logMessage('Mecha unlocked!');
      } else {
        this.logMessage('Error: Load GameScene first');
      }
    });

    this.addButton('Unlock Dragon Form', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.formMachine.unlockDragon();
        this.logMessage('Dragon unlocked!');
      } else {
        this.logMessage('Error: Load GameScene first');
      }
    });

    this.addButton('Set Form: Human', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.formMachine.unlockTransform();
        if (s.player.formMachine.state !== 'HUMAN') {
          s.player.formMachine.startRevert?.();
        }
        this.logMessage('Form set: HUMAN');
      }
    });

    this.addButton('Set Form: Mecha', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.formMachine.unlockTransform();
        if (s.player.formMachine.state !== 'MECHA') {
          s.player.formMachine.beginTransformToMecha?.();
        }
        this.logMessage('Form set: MECHA');
      }
    });

    this.addButton('Set Form: Dragon', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.formMachine.unlockDragon();
        if (s.player.formMachine.state !== 'DRAGON') {
          (s.player.formMachine as any).beginTransformToDragon?.();
        }
        this.logMessage('Form set: DRAGON');
      }
    });

    // Section 3: Cheats & Buffs
    this.addSectionHeader('🛡️ Stats & God Mode');
    
    this.godModeBtn = this.addButton('Toggle God Mode (OFF)', () => {
      this.godModeActive = !this.godModeActive;
      this.updateStatus();
      this.logMessage(`God Mode: ${this.godModeActive ? 'Enabled' : 'Disabled'}`);
    });

    this.infiniteEnergyBtn = this.addButton('Toggle Infinite Energy (OFF)', () => {
      this.infiniteEnergyActive = !this.infiniteEnergyActive;
      this.updateStatus();
      this.logMessage(`Infinite Energy: ${this.infiniteEnergyActive ? 'Enabled' : 'Disabled'}`);
    });

    this.oneHitKillsBtn = this.addButton('Toggle One-Hit Kills (OFF)', () => {
      this.oneHitKillsActive = !this.oneHitKillsActive;
      this.updateStatus();
      this.logMessage(`One-Hit Kills: ${this.oneHitKillsActive ? 'Enabled' : 'Disabled'}`);
    });

    this.addButton('Refill Health & Energy', () => {
      const s = this.getGameScene();
      if (s && s.player) {
        s.player.health = s.player.maxHealth;
        if (s.player.formMachine && s.player.formMachine.energy) {
          (s.player.formMachine.energy as any).current = 100;
        }
        this.logMessage('Healed and refilled energy!');
      }
    });

    // Section 4: LocalStorage
    this.addSectionHeader('💾 Database (Saves)');
    
    this.addButton('Reset Save Game (Clear DB)', () => {
      clearSave();
      this.logMessage('Save cleared! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }, '#ff3355');

    // Section 5: Log window
    this.addSectionHeader('💬 Dev Console Log');
    const logBox = document.createElement('div');
    logBox.id = 'dev-log-box';
    Object.assign(logBox.style, {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      height: '60px',
      overflowY: 'auto',
      padding: '4px 8px',
      fontSize: '10px',
      color: '#8cddff',
      whiteSpace: 'pre-wrap'
    });
    logBox.textContent = 'Press Shift+Ctrl+D to close this panel.\nInitialized.';
    this.containerEl.appendChild(logBox);

    document.body.appendChild(this.containerEl);
  }

  private addSectionHeader(text: string): void {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      color: '#aa8855',
      fontWeight: 'bold',
      margin: '12px 0 6px 0',
      borderBottom: '1px solid rgba(170, 136, 85, 0.2)',
      paddingBottom: '2px'
    });
    this.containerEl!.appendChild(el);
  }

  private addButton(text: string, onClick: () => void, color?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      display: 'block',
      width: '100%',
      backgroundColor: color || 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '4px',
      color: '#e0d8c3',
      padding: '6px 8px',
      margin: '4px 0',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '11px',
      transition: 'background-color 0.2s, border-color 0.2s',
      fontFamily: 'monospace'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      btn.style.borderColor = '#ffcc66';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = color || 'rgba(255, 255, 255, 0.05)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });

    btn.addEventListener('click', onClick);
    this.containerEl!.appendChild(btn);
    return btn;
  }

  private teleport(x: number, y: number): void {
    const s = this.getGameScene();
    if (s) {
      this.teleportToScene(s.sys.settings.key, x, y);
    }
  }

  private teleportToScene(sceneKey: string, x: number, y: number): void {
    const game = (window as any).game;
    if (game && game.scene) {
      const activeScene = this.getGameScene();
      if (activeScene && activeScene.sys.settings.key !== sceneKey) {
        activeScene.scene.start(sceneKey, {
          startPos: { x, y },
          cardsCollected: activeScene.tarotSystem?.collectedCards || [],
          mechaUnlocked: true
        });
        this.logMessage(`Transitioning to ${sceneKey} at X:${x}, Y:${y}`);
      } else {
        const s = this.getGameScene();
        if (s && s.player) {
          s.player.setPosition(x, y);
          if (s.player.body) {
            s.player.body.setVelocity(0, 0);
          }
          this.logMessage(`Teleported in ${sceneKey} to X:${x}, Y:${y}`);
        } else {
          this.logMessage('Error: Active scene player not found');
        }
      }
    }
  }

  private logMessage(msg: string): void {
    const box = document.getElementById('dev-log-box');
    if (box) {
      box.textContent = (box.textContent || '') + `\n> ${msg}`;
      box.scrollTop = box.scrollHeight;
    }
    console.log(`[DevMode] ${msg}`);
  }

  private updateStatus(): void {
    if (this.godModeBtn) {
      this.godModeBtn.textContent = `Toggle God Mode (${this.godModeActive ? 'ON' : 'OFF'})`;
      this.godModeBtn.style.borderColor = this.godModeActive ? '#00ff88' : 'rgba(255, 255, 255, 0.2)';
      this.godModeBtn.style.backgroundColor = this.godModeActive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }
    if (this.infiniteEnergyBtn) {
      this.infiniteEnergyBtn.textContent = `Toggle Infinite Energy (${this.infiniteEnergyActive ? 'ON' : 'OFF'})`;
      this.infiniteEnergyBtn.style.borderColor = this.infiniteEnergyActive ? '#00ff88' : 'rgba(255, 255, 255, 0.2)';
      this.infiniteEnergyBtn.style.backgroundColor = this.infiniteEnergyActive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }
    if (this.oneHitKillsBtn) {
      this.oneHitKillsBtn.textContent = `Toggle One-Hit Kills (${this.oneHitKillsActive ? 'ON' : 'OFF'})`;
      this.oneHitKillsBtn.style.borderColor = this.oneHitKillsActive ? '#00ff88' : 'rgba(255, 255, 255, 0.2)';
      this.oneHitKillsBtn.style.backgroundColor = this.oneHitKillsActive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }
  }

  private godModeTakeDamage = (amount: number, knockbackDir: number) => {
    const s = this.getGameScene();
    if (s) {
      s.cameras.main.shake(80, 0.001);
      this.logMessage(`Blocked ${amount} dmg (God Mode)`);
    }
  };

  private godModeGetSwordDamage = () => {
    return 9999;
  };

  private godModeGetFireDamage = () => {
    return 9999;
  };

  private onPostStep(): void {
    const s = this.getGameScene();
    if (s && s.player) {
      // 1. God Mode
      if (this.godModeActive) {
        if (s.player.takeDamage !== this.godModeTakeDamage) {
          if (!s.player.originalTakeDamage) {
            s.player.originalTakeDamage = s.player.takeDamage;
          }
          s.player.takeDamage = this.godModeTakeDamage;
        }
      } else {
        if (s.player.originalTakeDamage) {
          s.player.takeDamage = s.player.originalTakeDamage;
          delete s.player.originalTakeDamage;
        }
      }

      // 2. One-Hit Kills
      if (this.oneHitKillsActive) {
        if (s.player.combatSystem) {
          if (s.player.combatSystem.getSwordDamage !== this.godModeGetSwordDamage) {
            if (!s.player.originalGetSwordDamage) {
              s.player.originalGetSwordDamage = s.player.combatSystem.getSwordDamage;
            }
            s.player.combatSystem.getSwordDamage = this.godModeGetSwordDamage;
          }
          if (s.player.combatSystem.getFireDamage !== this.godModeGetFireDamage) {
            if (!s.player.originalGetFireDamage) {
              s.player.originalGetFireDamage = s.player.combatSystem.getFireDamage;
            }
            s.player.combatSystem.getFireDamage = this.godModeGetFireDamage;
          }
        }
      } else {
        if (s.player.combatSystem) {
          if (s.player.originalGetSwordDamage) {
            s.player.combatSystem.getSwordDamage = s.player.originalGetSwordDamage;
            delete s.player.originalGetSwordDamage;
          }
          if (s.player.originalGetFireDamage) {
            s.player.combatSystem.getFireDamage = s.player.originalGetFireDamage;
            delete s.player.originalGetFireDamage;
          }
        }
      }

      // 3. Infinite Energy & Heat
      if (this.infiniteEnergyActive) {
        if (s.player.formMachine) {
          if (s.player.formMachine.energy) {
            (s.player.formMachine.energy as any).current = 100;
          }
          if (s.player.formMachine.heat) {
            (s.player.formMachine.heat as any).current = 0;
            (s.player.formMachine.heat as any).shutdownActive = false;
          }
        }
      }
    }
  }
}
