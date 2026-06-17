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

    // Parchment background with border
    const bg = this.add.rectangle(cx, cy, width, height, 0xc8b896);
    const border = this.add.rectangle(cx, cy, width - 30, height - 30)
      .setStrokeStyle(3, 0x3a2a1a).setDepth(1);

    // Page content
    this.pageContainer = this.add.container(0, 0);
    this.drawCurrentPage(width, height, scale);

    // Page number
    const pageText = this.add.text(width * 0.92, height * 0.06, '', {
      fontSize: `${Math.round(12 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a4a3a',
    }).setOrigin(1, 0.5).setDepth(2);

    // Navigation arrows
    const arrowStyle = {
      fontSize: `${Math.round(24 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#3a2a1a',
    };

    const leftArrow = this.add.text(width * 0.06, cy, '◄', arrowStyle)
      .setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });
    const rightArrow = this.add.text(width * 0.94, cy, '►', arrowStyle)
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

    // Close button
    const closeBtn = this.add.text(width * 0.94, height * 0.06, '✕', {
      fontSize: `${Math.round(18 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a3a2a',
    }).setOrigin(1, 0.5).setDepth(2).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.scene.stop());

    const updatePage = () => {
      pageText.setText(`${this.currentPage + 1} / ${this.pages.length}`);
      leftArrow.setVisible(this.currentPage > 0);
      rightArrow.setVisible(this.currentPage < this.pages.length - 1);
    };
    updatePage();
  }

  private buildPages(): void {
    // Page 0: Cover
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        const t1 = s.addText(cx, cy - 60, 'D R A K H A R T', '28px', 'Georgia', '#6a1a1a', 'center');
        const t2 = s.addText(cx, cy - 10, 'I N S T R U C T I O N   M A N U A L', '14px', 'monospace', '#5a3a2a', 'center');
        const t3 = s.addText(cx, cy + 40, 'The Dragon Core Awaits', '13px', 'Georgia', '#8a5a3a', 'center', true);
        s.addText(cx, h - 80, '"In the old world, only ash remains."', '11px', 'Georgia', '#6a4a3a', 'center', true);
      },
    });

    // Page 1: Story
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 110, 'THE STORY', '18px', 'Georgia', '#5a2a1a', 'center');
        s.addText(cx - 110, cy - 70, 'THE OLD WORLD', '11px', 'monospace', '#3a2a1a', 'left');
        s.addParagraph(cx - 110, cy - 45, 220,
          'The old world is ash. The Empire\'s industrial war machines have consumed ' +
          'the land, burning ancient forests and crushing sacred temples beneath ' +
          'smelting refineries. Only forgotten dragon-based mecha technology ' +
          'can stand against the modern military onslaught.'
        );
        s.addText(cx - 110, cy + 55, 'THE DRAGON CORE', '11px', 'monospace', '#3a2a1a', 'left');
        s.addParagraph(cx - 110, cy + 80, 220,
          'Buried beneath the ruined altar lies the Dragon Core — a pulsating ' +
          'crimson crystal of biomechanical power. Bond with it and awaken the ' +
          'Draconel: an ancient mecha forged of dragon bone, steel, and core fire.'
        );
      },
    });

    // Page 2: Controls
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 110, 'CONTROLS', '18px', 'Georgia', '#5a2a1a', 'center');

        const controls = [
          ['ARROWS / WASD', 'Move'],
          ['UP / W', 'Jump (Hold to Hover in Mecha)'],
          ['X', 'Attack (Sword / Fire Breath)'],
          ['C', 'Cycle Form (Warrior ↔ Mecha ↔ Dragon)'],
          ['T', 'View Collected War Echoes'],
          ['ESC', 'Pause'],
          ['E (near Altar)', 'Pray / Save Progress'],
        ];

        let yPos = cy - 70;
        controls.forEach(([key, desc]) => {
          s.addText(cx - 120, yPos, key, '10px', 'monospace', '#8a4a2a', 'left');
          s.addText(cx + 20, yPos, desc, '10px', 'Georgia', '#3a2a1a', 'left');
          yPos += 26;
        });

        s.addText(cx, yPos + 10, 'TIP: Hold X in Dragon form for auto-fire!', '9px', 'monospace', '#6a3a2a', 'center', true);
        s.addText(cx, yPos + 30, 'Use D-pad / Left Stick on gamepad.', '9px', 'monospace', '#5a4a3a', 'center');
      },
    });

    // Page 3: The Warrior & Mecha
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 110, 'THE WARRIOR', '16px', 'Georgia', '#5a2a1a', 'center');
        s.addParagraph(cx - 110, cy - 75, 220,
          'Agile and swift. Master of the sword. Your human form excels at platforming, ' +
          'dodging, and striking with the blade. Find the Dragon Core to unlock transformation.'
        );

        s.addText(cx, cy - 5, 'THE DRACONEL MECHA', '16px', 'Georgia', '#8a3a2a', 'center');
        s.addParagraph(cx - 110, cy + 30, 220,
          'Heavy combat form. The Draconel wields a massive claymore that shatters barricades ' +
          'and devastates armored enemies. Its hover jets allow slow aerial control. ' +
          'Watch your heat gauge — overheat and the core shuts down.'
        );

        s.addText(cx, cy + 110, 'THE DRAGON', '16px', 'Georgia', '#3a5a8a', 'center');
        s.addParagraph(cx - 110, cy + 145, 200,
          'Biomechanical flight form. Soar freely through the skies, breathing fire upon ' +
          'your enemies. Requires the Flight Core found in the depths of the refinery. ' +
          'Energy drains while flying — collect crystals to stay airborne.'
        );
      },
    });

    // Page 4: Enemies Gallery
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 110, 'BESTIARY', '18px', 'Georgia', '#5a2a1a', 'center');

        const enemies = [
          ['SENTRY', 'Standard patrol unit. Attacks on sight.'],
          ['LEAPER', 'Agile hunter. Leaps toward prey.'],
          ['SPITTER', 'Ranged acid artillery. Stay mobile.'],
          ['SHIELD', 'Frontal shield. Strike from behind!'],
          ['MECHA', 'Heavy industrial guard. HUMAN attacks useless.'],
          ['ELITE MECHA', 'Boss-class. Watch the core crystal glow.'],
          ['FLYING SENTRY', 'Aerial threat. Purple energy bolts.'],
          ['DREADNOUGHT', 'Final boss. Destroy cannons first!'],
        ];

        let yPos = cy - 80;
        enemies.forEach(([name, desc]) => {
          s.addText(cx - 120, yPos, `● ${name}`, '9px', 'monospace', '#8a4a2a', 'left');
          s.addText(cx + 10, yPos, desc, '8px', 'Georgia', '#3a2a1a', 'left');
          yPos += 22;
        });
      },
    });

    // Page 5: Bosses & Strategy
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 110, 'BOSS STRATEGIES', '16px', 'Georgia', '#6a1a1a', 'center');

        s.addText(cx - 110, cy - 70, 'DRACONEL BASTION (Level 2)', '11px', 'monospace', '#8a4a2a', 'left');
        s.addParagraph(cx - 110, cy - 48, 220,
          'Immune to HUMAN form. Use Mecha claymore. The core crystal glows green → yellow → orange → red. ' +
          'When red (every 3 attacks), the core is EXPOSED and takes DOUBLE damage. Watch for the banner!'
        );

        s.addText(cx - 110, cy + 20, 'DREADNOUGHT (Level 3)', '11px', 'monospace', '#8a4a2a', 'left');
        s.addParagraph(cx - 110, cy + 42, 220,
          'Protected by two cannons (top & bottom). Destroy BOTH cannons first — the core becomes vulnerable ' +
          'and glows orange. Then attack the core relentlessly. The boss stays on screen — ' +
          'you can always see it.'
        );

        s.addText(cx - 110, cy + 105, 'PRO TIPS', '11px', 'monospace', '#8a4a2a', 'left');
        s.addParagraph(cx - 110, cy + 127, 220,
          '• Use cooling valves to reset Mecha heat.\n' +
          '• Steam vents boost Mecha jumps.\n' +
          '• Collect Energy Crystals to maintain Dragon flight.\n' +
          '• Pray at altars to save progress and restore HP.\n' +
          '• War Echoes (Tarot Cards) grant permanent upgrades.'
        );
      },
    });

    // Page 6: Credits
    this.pages.push({
      draw: (s, cx, cy, w, h, sc) => {
        s.drawPageBorder(cx, cy, w, h);
        s.addText(cx, cy - 80, 'DRAKHART', '22px', 'Georgia', '#6a1a1a', 'center');
        s.addText(cx, cy - 45, 'A Dark Fantasy Action-Platformer', '12px', 'monospace', '#5a3a2a', 'center');
        s.addText(cx, cy - 15, 'Built with Phaser 3 + TypeScript', '10px', 'monospace', '#5a4a3a', 'center');

        s.addText(cx, cy + 25, 'INSPIRED BY', '11px', 'monospace', '#3a2a1a', 'center');
        s.addText(cx, cy + 45, 'Draconus (Atari) × Escaflowne', '11px', 'Georgia', '#6a4a3a', 'center', true);

        s.addText(cx, cy + 80, 'SOUNDTRACK AVAILABLE', '11px', 'monospace', '#3a2a1a', 'center');
        s.addText(cx, cy + 100, 'In the Main Menu → Soundtrack', '10px', 'Georgia', '#5a4a3a', 'center');

        s.addText(cx, cy + 140, '"Only the Dragon Core remains."', '11px', 'Georgia', '#8a5a3a', 'center', true);
        s.addText(cx, h - 50, '© 2026 — Forged in Fire and Ash', '9px', 'monospace', '#5a4a3a', 'center');
      },
    });
  }

  private drawPageBorder(cx: number, cy: number, w: number, h: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(2, 0x3a2a1a, 0.4);
    g.strokeRect(cx - w / 2 + 30, cy - h / 2 + 30, w - 60, h - 60);
    g.lineStyle(1, 0x5a4a3a, 0.3);
    g.strokeRect(cx - w / 2 + 35, cy - h / 2 + 35, w - 70, h - 70);
  }

  private addText(x: number, y: number, text: string, fontSize: string, font: string, color: string, align: string = 'center', italic: boolean = false): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize, fontFamily: font, color, align, fontStyle: italic ? 'italic' : 'normal',
    };
    const t = this.add.text(x, y, text, style).setOrigin(align === 'center' ? 0.5 : 0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private addParagraph(x: number, y: number, maxWidth: number, text: string): void {
    this.addText(x, y, text, '10px', 'Georgia', '#4a3a2a', 'left');
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
