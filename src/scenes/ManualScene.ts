import Phaser from 'phaser';
import { t } from '../i18n';

interface Page {
  draw: (scene: ManualScene, cx: number, cy: number, w: number, h: number, scale: number) => void;
}

export class ManualScene extends Phaser.Scene {
  private currentPage = 0;
  private pageContainer!: Phaser.GameObjects.Container;
  private pages: Page[] = [];

  constructor() {
    super({ key: 'ManualScene' });
    this.buildPages();
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor('#c8b896');
    this.add.rectangle(cx, cy, width - 16, height - 16, 0xc8b896).setStrokeStyle(2, 0x3a2a1a);

    this.pageContainer = this.add.container(0, 0);
    this.drawCurrentPage(width, height);

    const pageText = this.add.text(width * 0.95, height * 0.97, '', {
      fontSize: `${Math.round(13 * width / 800)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a4a3a',
    }).setOrigin(1, 0.5).setDepth(2);

    const arrows = [
      { x: width * 0.04, text: '◄', cb: () => this.prevPage() },
      { x: width * 0.96, text: '►', cb: () => this.nextPage() },
    ];
    arrows.forEach(a => {
      const btn = this.add.text(a.x, cy, a.text, {
        fontSize: `${Math.round(28 * width / 800)}px`,
        fontFamily: 'Georgia, serif',
        color: '#3a2a1a',
      }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#8a6a4a'));
      btn.on('pointerout', () => btn.setColor('#3a2a1a'));
      btn.on('pointerdown', a.cb);
    });

    this.input.keyboard!.on('keydown-LEFT', () => this.prevPage());
    this.input.keyboard!.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard!.on('keydown-ESC', () => this.scene.stop());
    this.input.keyboard!.on('keydown-ENTER', () => this.scene.stop());

    const closeBtn = this.add.text(width * 0.96, height * 0.04, '✕', {
      fontSize: `${Math.round(20 * width / 800)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a3a2a',
    }).setOrigin(1, 0.5).setDepth(2).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.stop());

    pageText.setText(`— ${this.currentPage + 1} / ${this.pages.length} —`);
  }

  // ── Helpers ──

  private fs(n: number): string {
    return `${Math.round(n * this.scale.width / 800)}px`;
  }

  private border(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0x3a2a1a, 0.25);
    g.strokeRect(cx - w / 2 + 18, cy - h / 2 + 18, w - 36, h - 36);
    g.lineStyle(1, 0x5a4a3a, 0.15);
    g.strokeRect(cx - w / 2 + 23, cy - h / 2 + 23, w - 46, h - 46);
    this.pageContainer.add(g);
  }

  private title(x: number, y: number, text: string, color: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, { fontSize: this.fs(size), fontFamily: 'Georgia, serif', color }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
    return t;
  }

  private label(x: number, y: number, text: string, color: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, { fontSize: this.fs(size), fontFamily: 'monospace', color }).setOrigin(0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private body(x: number, y: number, text: string, size: number, maxW: number): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontSize: this.fs(size), fontFamily: 'Georgia, serif', color: '#3a2a1a',
      wordWrap: { width: maxW }, lineSpacing: 5,
    }).setOrigin(0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private italic(x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontSize: this.fs(size), fontFamily: 'Georgia, serif', color: '#6a4a3a', fontStyle: 'italic',
    }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
    return t;
  }

  private divider(cx: number, y: number, width: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x4a3a2a, 0.2);
    g.lineBetween(cx - width / 2, y, cx + width / 2, y);
    this.pageContainer.add(g);
  }

  private sprite(x: number, y: number, key: string, scale: number): void {
    try { this.pageContainer.add(this.add.image(x, y, key).setScale(scale)); } catch (_) {}
  }

  // ── Pages ──

  private buildPages(): void {
    const S = (this.scale?.width || 1920) / 800;

    // 0: Cover
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 140, 'D R A K H A R T', '#6a1a1a', 30);
        s.title(cx, cy - 78, 'INSTRUCTION MANUAL', '#5a3a2a', 15);
        s.divider(cx, cy - 46, 220);
        s.title(cx, cy - 20, 'A Dark Fantasy Action-Platformer', '#8a5a3a', 14);
        s.italic(cx, cy + 12, 'For the Dragon Core Awaits', 13);
        s.divider(cx, cy + 50, 180);
        s.italic(cx, cy + 80, '"In the old world, only ash remains."', 12);
      },
    });

    // 1: The Forms (3 columns, evenly spaced)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'THE FORMS OF DRAKHART', '#6a1a1a', 18);
        const top = cy - 100;
        const rowH = 180;

        // Warrior column
        s.sprite(cx - 150, top, 'player-human', 1.8);
        s.label(cx - 110, top + 40, 'WARRIOR', '#5a2a1a', 13);
        s.body(cx - 110, top + 58, 'Agile. Sword combat.\nFind Dragon Core\nto transform.', 10, 130);

        // Mecha column  
        s.sprite(cx - 10, top + 10, 'player-mecha', 1.5);
        s.label(cx + 30, top + 40, 'DRACONEL MECHA', '#8a3a2a', 13);
        s.body(cx + 30, top + 58, 'Heavy form. Claymore.\nHover jets. Watch\nHEAT gauge!', 10, 130);

        // Dragon column
        s.sprite(cx + 140, top + 20, 'player-dragon', 1.3);
        s.label(cx + 160, top + 40, 'DRAGON', '#3a5a8a', 13);
        s.body(cx + 160, top + 58, 'Free flight. Fire\nBreath. Energy\ndrains in air.', 10, 130);

        // Form cycle diagram at bottom
        s.divider(cx, top + rowH + 10, 300);
        s.body(cx - 120, top + rowH + 28, 'C key cycles:  Warrior  →  Draconel  →  Dragon  →  Warrior', 11, 240);
      },
    });

    // 2: Controls
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'CONTROLS', '#6a1a1a', 18);
        const top = cy - 110;
        const rowH = 28;

        const keys: [string, string][] = [
          ['MOVE', 'ARROWS / WASD'],
          ['JUMP', 'UP / W  (Hold = Hover in Mecha)'],
          ['ATTACK', 'X  (Hold in Dragon = auto-fire)'],
          ['CYCLE FORM', 'C'],
          ['WAR ECHOES', 'T'],
          ['PAUSE', 'ESC'],
          ['PRAY / SAVE', 'E (near Altar)'],
        ];
        let y = top;
        keys.forEach(([action, key]) => {
          s.label(cx - 160, y, key, '#8a4a2a', 10);
          s.label(cx + 10, y, action, '#3a2a1a', 10);
          y += rowH;
        });

        s.divider(cx, y + 10, 360);
        s.title(cx, y + 28, 'PRO TIPS', '#6a1a1a', 15);
        s.body(cx - 150, y + 52,
          'Use Steam Vents to boost Mecha jumps.  Cooling Valves reset Mecha heat.\n' +
          'Pray at Altars to save + restore HP/Energy.\n' +
          'War Echoes (Tarot Cards) = permanent upgrades.  Gamepad supported!', 10, 300);
      },
    });

    // 3: Story
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'THE STORY SO FAR', '#6a1a1a', 18);
        const top = cy - 110;

        s.title(cx - 150, top, 'THE OLD WORLD', '#5a2a1a', 14);
        s.body(cx - 150, top + 24,
          'The Empire\'s war machines consumed the land — burning forests,\n' +
          'crushing temples beneath smelting refineries. Modern military\n' +
          'technology dominates: brutalist steel, diesel, railguns.', 10, 360);

        s.title(cx - 150, top + 100, 'THE DRAGON CORE', '#5a2a1a', 14);
        s.body(cx - 150, top + 124,
          'Beneath the ruined altar: a crimson crystal of biomechanical power.\n' +
          'Bond with it. Awaken the Draconel — ancient mecha of dragon bone,\n' +
          'steel, and core fire. The only force that can challenge the Empire.', 10, 360);

        s.sprite(cx + 200, top + 70, 'dragon-core', 2.5);
      },
    });

    // 4: Bestiary (3x2 grid)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'BESTIARY', '#6a1a1a', 18);
        const top = cy - 105;
        const rowH = 175;
        const colW = 185;

        const enemies: [string, number, string, string][] = [
          ['enemy-sentry', 1.6, 'SENTRY', 'Patrols.\nAttacks on sight.'],
          ['enemy-leaper', 1.4, 'LEAPER', 'Agile hunter.\nLeaps at prey.'],
          ['enemy-spitter', 1.4, 'SPITTER', 'Ranged acid.\nStay mobile.'],
          ['enemy-shield', 1.4, 'SHIELD', 'Frontal shield.\nStrike from behind.'],
          ['enemy-mecha', 1.2, 'MECHA', 'Heavy guard.\nImmune to HUMAN.'],
          ['enemy-sentry', 1.2, 'FLY SENTRY', 'Aerial threat.\nPurple energy bolts.'],
        ];
        enemies.forEach(([key, scl, name, desc], i) => {
          const x = cx - 180 + (i % 3) * colW;
          const y = top + Math.floor(i / 3) * rowH;
          s.sprite(x, y - 10, key, scl);
          s.label(x - 30, y + 36, name, '#5a2a1a', 9);
          s.body(x - 30, y + 50, desc, 8, 80);
        });
      },
    });

    // 5: Bosses
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'BOSSES', '#6a1a1a', 18);
        const top = cy - 95;

        s.sprite(cx - 140, top + 20, 'elite-mecha', 1.4);
        s.title(cx - 70, top + 0, 'DRACONEL BASTION  (Level 2)', '#8a3a2a', 14);
        s.body(cx - 70, top + 24,
          '1200 HP. Immune to HUMAN.\n' +
          'Use MECHA claymore (75 dmg).\n' +
          'Core cycles: green→yellow→\n' +
          'orange→RED (exposed!).\n' +
          'Every 3 attacks = vulnerable.\n' +
          'During exposure: DOUBLE damage!', 10, 200);

        const y2 = top + 160;
        s.sprite(cx + 160, y2 + 10, 'boss', 2.0);
        s.title(cx + 160, y2 + 0, 'DREADNOUGHT  (Level 3)', '#6a1a1a', 14);
        s.body(cx + 100, y2 + 24,
          '800 HP. 2 protective cannons.\n' +
          'Destroy BOTH cannons first!\n' +
          'Then core turns orange and\n' +
          'becomes vulnerable.\n' +
          'Attack relentlessly to win.', 10, 180);
      },
    });

    // 6: Items (3x2 grid)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'ITEMS & COLLECTIBLES', '#6a1a1a', 18);
        const top = cy - 105;
        const rowH = 175;
        const colW = 190;

        const items: [string, number, string, string][] = [
          ['dragon-core', 2.0, 'Dragon Core', 'Unlocks Mecha\nDraconel form'],
          ['sky-core', 2.0, 'Flight Core', 'Unlocks Dragon\nflight form'],
          ['energy-pickup', 1.8, 'Energy Crystal', 'Restores flight\n& mecha energy'],
          ['destiny-echo', 1.3, 'War Echo', 'Permanent\nstat upgrades'],
          ['altar-save', 0.6, 'Save Altar', 'Pray to save\n& restore HP'],
          ['cool-valve', 1.8, 'Cool Valve', 'Resets Mecha\nheat instantly'],
        ];
        items.forEach(([key, scl, name, desc], i) => {
          const x = cx - 190 + (i % 3) * colW;
          const y = top + Math.floor(i / 3) * rowH;
          s.sprite(x, y - 10, key, scl);
          s.label(x - 30, y + 36, name, '#5a2a1a', 9);
          s.body(x - 30, y + 50, desc, 8, 85);
        });
      },
    });

    // 7: World Map
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, 'THE WORLD', '#6a1a1a', 18);
        const top = cy - 110;
        const rowH = 120;

        s.title(cx - 150, top + 0, 'ZONE 1 — ASHEN WOODS', '#5a2a1a', 14);
        s.body(cx - 150, top + 22,
          'Dark forest. Platform across thorn gaps. Dragon Core at the end.', 10, 340);

        s.title(cx - 150, top + rowH + 5, 'ZONE 2 — SMELTING REFINERY', '#5a2a1a', 14);
        s.body(cx - 150, top + rowH + 27,
          'Lava pits. Steam vents. Break barricades with Draconel claymore.\n' +
          'Defeat the Bastion for the Flight Core.', 10, 340);

        s.title(cx - 150, top + rowH * 2 + 10, 'ZONE 3 — ASHEN GORGE', '#5a2a1a', 14);
        s.body(cx - 150, top + rowH * 2 + 32,
          'Auto-scroll flight. Blast waves of enemies in Dragon form.\n' +
          'HOLD X for auto-fire! Dreadnought boss at the end.', 10, 340);
      },
    });

    // 8: Credits
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 130, 'DRAKHART', '#6a1a1a', 26);
        s.title(cx, cy - 88, 'A Dark Fantasy Action-Platformer', '#5a3a2a', 14);
        s.divider(cx, cy - 54, 320);
        s.title(cx, cy - 28, 'BUILT WITH', '#5a2a1a', 13);
        s.title(cx, cy - 6, 'Phaser 3 + TypeScript + Vite', '#3a2a1a', 12);
        s.title(cx, cy + 30, 'INSPIRED BY', '#5a2a1a', 13);
        s.italic(cx, cy + 50, 'Draconus (Atari, 1988)  ×  Escaflowne (Anime, 1996)', 12);
        s.divider(cx, cy + 78, 220);
        s.title(cx, cy + 100, 'SOUNDTRACK', '#5a2a1a', 13);
        s.title(cx, cy + 122, 'Available in Main Menu → Soundtrack', '#3a2a1a', 11);
        s.italic(cx, cy + 155, '"Only the Dragon Core remains."', 12);
        s.label(cx, h - 60, '© 2026 — Forged in Fire and Ash', '#5a4a3a', 9);
      },
    });
  }

  private drawCurrentPage(w: number, h: number): void {
    this.pageContainer.removeAll(true);
    const cx = w / 2;
    const cy = h / 2;
    this.pages[this.currentPage]?.draw(this, cx, cy, w, h, (w / 800));
  }

  private nextPage(): void {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
      this.drawCurrentPage(this.scale.width, this.scale.height);
    }
  }

  private prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.drawCurrentPage(this.scale.width, this.scale.height);
    }
  }
}
