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

    // 1: The Forms
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'THE FORMS OF DRAKHART', '#6a1a1a', 18);

        const y0 = cy - 90;
        s.sprite(cx - 140, y0, 'player-human', 1.8);
        s.title(cx - 80, y0 - 18, 'WARRIOR', '#5a2a1a', 14);
        s.body(cx - 80, y0 + 8, 'Agile sword fighter. Find the\nDragon Core to transform.', 10, 180);

        const y1 = y0 + 100;
        s.sprite(cx - 140, y1, 'player-mecha', 1.5);
        s.title(cx - 80, y1 - 18, 'DRACONEL MECHA', '#8a3a2a', 14);
        s.body(cx - 80, y1 + 8, 'Heavy combat. Claymore (75 dmg).\nHover jets. Watch HEAT gauge!', 10, 180);

        const y2 = y1 + 100;
        s.sprite(cx + 180, cy - 10, 'player-dragon', 1.2);
        s.title(cx + 100, cy - 40, 'DRAGON', '#3a5a8a', 14);
        s.body(cx + 100, cy - 14, 'Free flight. Fire Breath.\nEnergy drains while airborne.', 10, 150);
      },
    });

    // 2: Controls
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'CONTROLS', '#6a1a1a', 18);

        const keys = [
          'ARROWS / WASD         Move',
          'UP / W                       Jump (Hold = Hover)',
          'X                               Attack (Sword / Fire)',
          'C                               Cycle Form',
          'T                               War Echoes (Tarot)',
          'ESC                          Pause Menu',
          'E (near Altar)           Pray / Save',
        ];
        let y = cy - 100;
        keys.forEach(k => { s.label(cx - 120, y, k, '#3a2a1a', 11); y += 28; });

        s.divider(cx, cy + 60, 320);

        s.title(cx, cy + 80, 'PRO TIPS', '#6a1a1a', 15);
        const tips = 'Hold X in Dragon form = auto-fire (12.5/sec).  Use Steam Vents to boost Mecha jumps.  Cooling Valves reset Mecha heat.  Pray at Altars to save + restore HP/Energy.  War Echoes (Tarot Cards) = permanent upgrades.';
        s.body(cx - 150, cy + 110, tips, 10, 300);
      },
    });

    // 3: Story
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'THE STORY SO FAR', '#6a1a1a', 18);

        s.title(cx - 150, cy - 100, 'THE OLD WORLD', '#5a2a1a', 14);
        s.body(cx - 150, cy - 72, 'The Empire\'s industrial war machines have consumed the land, burning ancient forests and crushing sacred temples beneath smelting refineries. Their modern military technology — brutalist steel plating, diesel generators, physical railguns — dominates all.', 10, 360);

        s.title(cx - 150, cy + 0, 'THE DRAGON CORE', '#5a2a1a', 14);
        s.body(cx - 150, cy + 28, 'Beneath the ruined altar lies a pulsating crimson crystal of biomechanical power. Bond with it and awaken the Draconel: an ancient mecha forged of dragon bone, steel, and core fire. Only this forgotten technology can challenge the Empire.', 10, 360);

        s.sprite(cx + 200, cy + 50, 'dragon-core', 2.5);
      },
    });

    // 4: Bestiary
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'BESTIARY', '#6a1a1a', 18);

        const enemies: [string, number, string, string][] = [
          ['enemy-sentry', 1.6, 'SENTRY', 'Patrols.\nAttacks on sight.'],
          ['enemy-leaper', 1.4, 'LEAPER', 'Agile.\nLeaps at prey.'],
          ['enemy-spitter', 1.4, 'SPITTER', 'Ranged acid.\nStay mobile.'],
          ['enemy-shield', 1.4, 'SHIELD', 'Frontal shield.\nStrike from behind.'],
          ['enemy-mecha', 1.2, 'MECHA', 'Heavy guard.\nHUMAN immune.'],
          ['enemy-sentry', 1.2, 'FLY SENTRY', 'Aerial.\nPurple bolts.'],
        ];
        enemies.forEach(([key, scl, name, desc], i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = cx - 180 + col * 185;
          const y = cy - 100 + row * 160;
          s.sprite(x, y, key, scl);
          s.label(x, y + 32, name, '#5a2a1a', 9);
          s.body(x - 40, y + 46, desc, 8, 90);
        });
      },
    });

    // 5: Bosses
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'BOSSES', '#6a1a1a', 18);

        s.sprite(cx - 140, cy - 50, 'elite-mecha', 1.4);
        s.title(cx - 70, cy - 80, 'DRACONEL BASTION', '#8a3a2a', 14);
        s.body(cx - 70, cy - 52, 'Level 2 mini-boss. 1200 HP.\nImmune to HUMAN. Use MECHA.\nCore crystal cycles green→red.\nEvery 3 attacks: CORE EXPOSED.\nDouble damage during window!', 10, 200);

        s.sprite(cx + 160, cy - 40, 'boss', 2.0);
        s.title(cx + 160, cy + 55, 'DREADNOUGHT', '#6a1a1a', 14);
        s.body(cx + 100, cy + 80, 'Level 3 final boss. 800 HP.\nProtected by 2 cannons.\nDestroy BOTH → core vulnerable.\nThen attack relentlessly!', 10, 180);
      },
    });

    // 6: Items
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'ITEMS & COLLECTIBLES', '#6a1a1a', 18);

        const items: [string, number, string, string][] = [
          ['dragon-core', 2.0, 'Dragon Core', 'Unlocks\nDraconel Mecha'],
          ['sky-core', 2.0, 'Flight Core', 'Unlocks\nDragon flight'],
          ['energy-pickup', 1.8, 'Energy Crystal', 'Restores\nflight/mecha'],
          ['destiny-echo', 1.3, 'War Echo', 'Permanent\ncharacter upgrades'],
          ['altar-save', 0.6, 'Save Altar', 'Pray to save\n+ restore HP'],
          ['cool-valve', 1.8, 'Cool Valve', 'Resets\nMecha heat'],
        ];
        items.forEach(([key, scl, name, desc], i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = cx - 190 + col * 190;
          const y = cy - 100 + row * 160;
          s.sprite(x, y, key, scl);
          s.label(x, y + 34, name, '#5a2a1a', 9);
          s.body(x - 40, y + 48, desc, 8, 90);
        });
      },
    });

    // 7: World Map
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 150, 'THE WORLD', '#6a1a1a', 18);

        const y0 = cy - 105;
        s.title(cx - 150, y0, 'ZONE 1 — ASHEN WOODS', '#5a2a1a', 14);
        s.body(cx - 150, y0 + 22, 'Dark gothic forest. Platform across thorn gaps and crumbling pillars. Find the Dragon Core in the Altar at the end. Leapers lurk on rooftops.', 10, 330);

        const y1 = y0 + 85;
        s.title(cx - 150, y1, 'ZONE 2 — SMELTING REFINERY', '#5a2a1a', 14);
        s.body(cx - 150, y1 + 22, 'Industrial hell. Lava pits, steam vents, heavy Mecha guards. Break barricades with Draconel claymore. Defeat the Bastion for the Flight Core.', 10, 330);

        const y2 = y1 + 85;
        s.title(cx - 150, y2, 'ZONE 3 — ASHEN GORGE', '#5a2a1a', 14);
        s.body(cx - 150, y2 + 22, 'Auto-scrolling flight zone. Soar in Dragon form, blast waves of enemies. The Defense Zone escalates until the Dreadnought. HOLD X for auto-fire!', 10, 330);
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
