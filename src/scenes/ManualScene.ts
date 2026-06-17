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
    const scale = width / 800;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor('#c8b896');

    // Full parchment overlay
    this.add.rectangle(cx, cy, width - 16, height - 16, 0xc8b896).setStrokeStyle(2, 0x3a2a1a);

    // Page content
    this.pageContainer = this.add.container(0, 0);
    this.drawCurrentPage(width, height, scale);

    // Page number
    const pageText = this.add.text(width * 0.95, height * 0.97, '', {
      fontSize: `${Math.round(13 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a4a3a',
    }).setOrigin(1, 0.5).setDepth(2);

    // Navigation arrows
    const arrowStyle = {
      fontSize: `${Math.round(28 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#3a2a1a',
    };

    const leftArrow = this.add.text(width * 0.04, cy, '◄', arrowStyle)
      .setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(width * 0.96, cy, '►', arrowStyle)
      .setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    leftArrow.on('pointerover', () => leftArrow.setColor('#8a6a4a'));
    leftArrow.on('pointerout', () => leftArrow.setColor('#3a2a1a'));
    leftArrow.on('pointerdown', () => this.prevPage());

    rightArrow.on('pointerover', () => rightArrow.setColor('#8a6a4a'));
    rightArrow.on('pointerout', () => rightArrow.setColor('#3a2a1a'));
    rightArrow.on('pointerdown', () => this.nextPage());

    this.input.keyboard!.on('keydown-LEFT', () => this.prevPage());
    this.input.keyboard!.on('keydown-RIGHT', () => this.nextPage());
    this.input.keyboard!.on('keydown-ESC', () => this.scene.stop());
    this.input.keyboard!.on('keydown-ENTER', () => this.scene.stop());

    const closeBtn = this.add.text(width * 0.96, height * 0.04, '✕', {
      fontSize: `${Math.round(20 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a3a2a',
    }).setOrigin(1, 0.5).setDepth(2).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.stop());

    const updatePage = () => {
      pageText.setText(`— ${this.currentPage + 1} / ${this.pages.length} —`);
      leftArrow.setVisible(this.currentPage > 0);
      rightArrow.setVisible(this.currentPage < this.pages.length - 1);
    };
    updatePage();
  }

  private buildPages(): void {
    // Page 0: Cover
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 120, 'D R A K H A R T', '#6a1a1a', 30);
        s.addTitle(cx, cy - 60, 'INSTRUCTION MANUAL', '#5a3a2a', 14);
        s.addDivider(cx, cy - 30, 200);
        s.addText(cx, cy + 10, 'A Dark Fantasy Action-Platformer', 'Georgia', '#8a5a3a', 13, true);
        s.addText(cx, cy + 40, 'For the Dragon Core Awaits', 'Georgia', '#6a4a3a', 12, true);
        s.addDivider(cx, cy + 80, 150);
        s.addText(cx, h - 80, '"In the old world, only ash remains."', 'Georgia', '#5a3a2a', 11, true);
      },
    });

    // Page 1: The Warrior (forms)
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'THE FORMS OF DRAKHART', '#6a1a1a', 18);

        // Warrior
        s.addSprite(cx - 130, cy - 60, 'player-human', 2.0);
        s.addTitle(cx - 20, cy - 80, 'THE WARRIOR', '#5a2a1a', 13);
        s.addParagraph(cx - 20, cy - 55, 230,
          'Agile and swift. Master of the blade. Excels at' +
          ' platforming and sword combat. Find the Dragon Core' +
          ' to unlock transformation.'
        );

        // Mecha
        s.addSprite(cx - 130, cy + 40, 'player-mecha', 1.6);
        s.addTitle(cx - 20, cy + 20, 'THE DRACONEL', '#8a3a2a', 13);
        s.addParagraph(cx - 20, cy + 45, 230,
          'Heavy mecha form. Wields the Claymore (75 dmg).' +
          ' Shatters barricades. Hover jets for slow flight.' +
          ' Watch your HEAT gauge — overheat shuts you down.'
        );

        // Dragon
        s.addSprite(cx + 230, cy - 10, 'player-dragon', 1.3);
        s.addTitle(cx + 230, cy + 80, 'THE DRAGON', '#3a5a8a', 12);
        s.addParagraph(cx + 170, cy + 105, 130,
          'Flight form. Fire Breath. Free movement. ' +
          'Requires Flight Core. Energy drains while airborne.'
        );
      },
    });

    // Page 2: Controls Layout
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'CONTROLS', '#6a1a1a', 18);

        const leftCol = cx - 160;

        const controls = [
          ['ARROWS / WASD', 'Move'],
          ['UP / W', 'Jump (Hold = Hover in Mecha)'],
          ['X', 'Attack (Sword / Fire Breath)'],
          ['C', 'Cycle Form'],
          ['T', 'View War Echoes (Tarot)'],
          ['ESC', 'Pause Menu'],
          ['E (near Altar)', 'Pray / Save Progress'],
        ];

        let yPos = cy - 100;
        s.addTitle(leftCol, yPos, 'KEYBOARD', '#5a2a1a', 11);
        yPos += 14;
        controls.forEach(([key, desc]) => {
          s.addText(leftCol, yPos, key, 'monospace', '#8a4a2a', 9);
          s.addText(leftCol + 130, yPos, desc, 'Georgia', '#3a2a1a', 9);
          yPos += 22;
        });

        s.addDivider(cx, cy + 70, 300);

        // Tips box
        s.addTitle(cx, cy + 85, 'PRO TIPS', '#6a1a1a', 13);
        s.addParagraph(cx - 120, cy + 110, 240,
          '• Hold X in Dragon form for continuous auto-fire (12.5 shots/sec).\n' +
          '• Use Steam Vents (refinery) to boost Mecha jumps.\n' +
          '• Cooling Valves reset Mecha heat instantly.\n' +
          '• Pray at Altars to save progress + restore HP/Energy.\n' +
          '• War Echoes (Tarot Cards) grant permanent upgrades.\n' +
          '• Gamepad: D-pad / Left Stick to move. X = Attack. C = Transform.'
        );
      },
    });

    // Page 3: Story
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'THE STORY SO FAR', '#6a1a1a', 18);

        s.addTitle(cx - 140, cy - 100, 'THE OLD WORLD', '#5a2a1a', 13);
        s.addParagraph(cx - 140, cy - 75, 280,
          'The old world is ash. The Empire\'s industrial war machines have consumed ' +
          'the land, burning ancient forests and crushing sacred temples beneath ' +
          'smelting refineries. Their modern military technology — brutalist steel ' +
          'plating, diesel generators, physical railguns — dominates all.'
        );

        s.addTitle(cx - 140, cy - 20, 'THE DRAGON CORE', '#5a2a1a', 13);
        s.addParagraph(cx - 140, cy + 5, 280,
          'But beneath the ruined altar lies the Dragon Core — a pulsating crimson ' +
          'crystal of biomechanical power. Bond with it and awaken the Draconel: an ' +
          'ancient mecha forged of dragon bone, steel, and core fire. Only this ' +
          'forgotten technology can challenge the Empire\'s industrial onslaught.'
        );

        s.addSprite(cx + 230, cy - 30, 'dragon-core', 3.0);
        s.addText(cx + 230, cy + 55, 'Dragon Core', 'Georgia', '#8a3a2a', 9);
      },
    });

    // Page 4: Bestiary (enemies with sprites)
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'BESTIARY', '#6a1a1a', 18);

        const enemies = [
          { txt: 'enemy-sentry', scale: 1.8, name: 'SENTRY', desc: 'Standard patrol. Attacks on sight.' },
          { txt: 'enemy-leaper', scale: 1.6, name: 'LEAPER', desc: 'Agile hunter. Leaps at prey.' },
          { txt: 'enemy-spitter', scale: 1.6, name: 'SPITTER', desc: 'Ranged acid. Stay mobile.' },
          { txt: 'enemy-shield', scale: 1.6, name: 'SHIELD', desc: 'Frontal shield. Strike from behind!' },
          { txt: 'enemy-mecha', scale: 1.4, name: 'MECHA', desc: 'Heavy guard. HUMAN immune.' },
          { txt: 'enemy-sentry', scale: 1.4, name: 'FLYING SENTRY', desc: 'Aerial threat. Purple bolts.' },
        ];

        let row = 0; let col = 0;
        enemies.forEach((e) => {
          const sx = cx - 170 + col * 180;
          const sy = cy - 100 + row * 140;
          s.addSprite(sx, sy, e.txt, e.scale);
          s.addText(sx, sy + 30, e.name, 'monospace', '#5a2a1a', 8);
          s.addParagraph(sx - 55, sy + 45, 110, e.desc);
          col++;
          if (col >= 3) { col = 0; row++; }
        });
      },
    });

    // Page 5: Bosses
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'BOSSES', '#6a1a1a', 18);

        // Left: Elite Mecha
        s.addSprite(cx - 130, cy - 40, 'elite-mecha', 1.4);
        s.addTitle(cx - 20, cy - 70, 'DRACONEL BASTION', '#8a3a2a', 12);
        s.addParagraph(cx - 20, cy - 48, 200,
          'Level 2 mini-boss. 1200 HP. Immune to HUMAN form. ' +
          'Use Mecha claymore. The core crystal cycles green→yellow→orange→red.' +
          ' When RED (every 3 attacks): CORE EXPOSED — double damage!'
        );

        // Right: Dreadnought
        s.addSprite(cx + 150, cy - 30, 'boss', 2.0);
        s.addTitle(cx + 150, cy + 70, 'DREADNOUGHT', '#6a1a1a', 12);
        s.addParagraph(cx + 90, cy + 95, 140,
          'Level 3 final boss. 800 HP. Protected by 2 cannons. ' +
          'Destroy BOTH cannons → core becomes vulnerable. ' +
          'Then attack relentlessly!'
        );
      },
    });

    // Page 6: Items & Collectibles
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'ITEMS & COLLECTIBLES', '#6a1a1a', 18);

        const items = [
          { txt: 'dragon-core', scale: 2.2, name: 'Dragon Core', desc: 'Unlocks Draconel Mecha form' },
          { txt: 'sky-core', scale: 2.2, name: 'Flight Core', desc: 'Unlocks Dragon flight form' },
          { txt: 'energy-pickup', scale: 2.0, name: 'Energy Crystal', desc: 'Restores Energy for flight/mecha' },
          { txt: 'destiny-echo', scale: 1.4, name: 'War Echo (Tarot)', desc: 'Permanent character upgrades' },
          { txt: 'altar-save', scale: 0.6, name: 'Save Altar', desc: 'Pray to save & restore HP' },
          { txt: 'cool-valve', scale: 2.0, name: 'Cooling Valve', desc: 'Instantly resets Mecha heat' },
        ];

        let col = 0; let row = 0;
        items.forEach((item) => {
          const ix = cx - 200 + col * 140;
          const iy = cy - 90 + row * 110;
          s.addSprite(ix, iy, item.txt, item.scale);
          s.addText(ix, iy + 30, item.name, 'monospace', '#5a2a1a', 7);
          s.addParagraph(ix - 50, iy + 42, 100, item.desc);
          col++;
          if (col >= 3) { col = 0; row++; }
        });
      },
    });

    // Page 7: The World Map
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 140, 'THE WORLD', '#6a1a1a', 18);

        s.addTitle(cx - 140, cy - 100, 'ZONE 1 — ASHEN WOODS', '#5a2a1a', 13);
        s.addParagraph(cx - 140, cy - 78, 280,
          'Dark gothic forest. Ruins of an ancient civilization. Classic platforming ' +
          'across thorn gaps and crumbling pillars. Find the Dragon Core in the Altar ' +
          'of the Core at the end. Watch for Leapers on rooftops.'
        );

        s.addTitle(cx - 140, cy - 10, 'ZONE 2 — SMELTING REFINERY', '#5a2a1a', 13);
        s.addParagraph(cx - 140, cy + 12, 280,
          'The Empire\'s industrial heart. Lava pits, steam vents, and heavy Mecha ' +
          'guards. Break barricades with the Draconel claymore. Defeat the Draconel ' +
          'Bastion to claim the Flight Core. Use cooling valves to manage heat.'
        );

        s.addTitle(cx - 140, cy + 80, 'ZONE 3 — ASHEN GORGE', '#5a2a1a', 13);
        s.addParagraph(cx - 140, cy + 102, 280,
          'Frenetic auto-scrolling flight zone. Soar through the canyon in Dragon ' +
          'form, blasting through waves of aerial enemies. The Industrial Defense ' +
          'Zone escalates until the Dreadnought appears. Hold X for auto-fire!'
        );
      },
    });

    // Page 8: Credits
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawOrnamentalBorder(cx, cy, w, h);
        s.addTitle(cx, cy - 130, 'DRAKHART', '#6a1a1a', 24);
        s.addTitle(cx, cy - 90, 'A Dark Fantasy Action-Platformer', '#5a3a2a', 13);
        s.addDivider(cx, cy - 50, 300);

        s.addTitle(cx, cy - 25, 'BUILT WITH', '#5a2a1a', 12);
        s.addText(cx, cy, 'Phaser 3 + TypeScript + Vite', 'Georgia', '#3a2a1a', 11);

        s.addTitle(cx, cy + 35, 'INSPIRED BY', '#5a2a1a', 12);
        s.addText(cx, cy + 55, 'Draconus (Atari, 1988) × Escaflowne (Anime, 1996)', 'Georgia', '#6a4a3a', 10, true);

        s.addTitle(cx, cy + 85, 'SOUNDTRACK', '#5a2a1a', 12);
        s.addText(cx, cy + 105, 'Available in Main Menu → Soundtrack', 'Georgia', '#3a2a1a', 10);

        s.addDivider(cx, cy + 130, 200);
        s.addText(cx, cy + 155, '"Only the Dragon Core remains."', 'Georgia', '#8a5a3a', 11, true);
        s.addText(cx, h - 50, '© 2026 — Forged in Fire and Ash', 'monospace', '#5a4a3a', 9);
      },
    });
  }

  private drawOrnamentalBorder(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    const m = 20;
    // Double border
    g.lineStyle(2, 0x3a2a1a, 0.3);
    g.strokeRect(cx - w / 2 + m, cy - h / 2 + m, w - m * 2, h - m * 2);
    g.lineStyle(1, 0x5a4a3a, 0.2);
    g.strokeRect(cx - w / 2 + m + 5, cy - h / 2 + m + 5, w - (m + 5) * 2, h - (m + 5) * 2);
    this.pageContainer.add(g);
  }

  private addDivider(cx: number, y: number, width: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x5a3a2a, 0.3);
    g.lineBetween(cx - width / 2, y, cx + width / 2, y);
    g.lineStyle(1, 0x5a3a2a, 0.15);
    g.lineBetween(cx - width / 2, y + 2, cx + width / 2, y + 2);
    this.pageContainer.add(g);
  }

  private addSprite(x: number, y: number, key: string, scale: number): void {
    try {
      const spr = this.add.image(x, y, key).setScale(scale);
      this.pageContainer.add(spr);
    } catch (_) {}
  }

  private addTitle(x: number, y: number, text: string, color: string, size: number): void {
    const t = this.add.text(x, y, text, {
      fontSize: `${Math.round(size * (this.scale.width / 800))}px`,
      fontFamily: 'Georgia, serif',
      color,
    }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
  }

  private addText(x: number, y: number, text: string, font: string, color: string, size: number, italic: boolean = false): void {
    const t = this.add.text(x, y, text, {
      fontSize: `${Math.round(size * (this.scale.width / 800))}px`,
      fontFamily: font,
      color,
      fontStyle: italic ? 'italic' : 'normal',
    }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
  }

  private addParagraph(x: number, y: number, maxWidth: number, text: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: `${Math.round(9.5 * (this.scale.width / 800))}px`,
      fontFamily: 'Georgia',
      color: '#3a2a1a',
      wordWrap: { width: maxWidth },
      lineSpacing: 4,
    }).setOrigin(0, 0);
    this.pageContainer.add(t);
  }

  private drawCurrentPage(w: number, h: number, sc: number): void {
    this.pageContainer.removeAll(true);
    const cx = w / 2;
    const cy = h / 2;
    this.pages[this.currentPage]?.draw(this, cx, cy, w, h, sc);
  }

  private nextPage(): void {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
      this.drawCurrentPage(this.scale.width, this.scale.height, this.scale.width / 800);
    }
  }

  private prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.drawCurrentPage(this.scale.width, this.scale.height, this.scale.width / 800);
    }
  }
}
