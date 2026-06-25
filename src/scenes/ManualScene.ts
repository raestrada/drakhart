import Phaser from 'phaser';
import { t } from '../i18n';

interface Page {
  draw: (scene: ManualScene, cx: number, cy: number, w: number, h: number, scale: number) => void;
}

export class ManualScene extends Phaser.Scene {
  private currentPage = 0;
  private pageContainer!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;
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

    this.pageText = this.add.text(width * 0.95, height * 0.97, '', {
      fontSize: `${Math.round(13 * width / 800)}px`,
      fontFamily: 'Georgia, serif',
      color: '#5a4a3a',
    }).setOrigin(1, 0.5).setDepth(2);

    this.drawCurrentPage(width, height);

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
  }

  // ── Helpers & Virtual Scaling ──

  private getManualScale(): number {
    return Math.min(this.scale.width / 800, this.scale.height / 600);
  }

  private mapX(vx: number): number {
    const scale = this.getManualScale();
    const screen_cx = this.scale.width / 2;
    return screen_cx + (vx - 400) * scale;
  }

  private mapY(vy: number): number {
    const scale = this.getManualScale();
    const screen_cy = this.scale.height / 2;
    return screen_cy + (vy - 300) * scale;
  }

  private fs(n: number): string {
    return `${Math.round(n * this.getManualScale())}px`;
  }

  private border(cx: number, cy: number, w: number, h: number): void {
    const scale = this.getManualScale();
    const g = this.add.graphics();
    
    const rx1 = cx - w / 2 + 18;
    const ry1 = cy - h / 2 + 18;
    const rw1 = w - 36;
    const rh1 = h - 36;
    g.lineStyle(Math.max(1, Math.round(2 * scale)), 0x3a2a1a, 0.25);
    g.strokeRect(this.mapX(rx1), this.mapY(ry1), rw1 * scale, rh1 * scale);
    
    const rx2 = cx - w / 2 + 23;
    const ry2 = cy - h / 2 + 23;
    const rw2 = w - 46;
    const rh2 = h - 46;
    g.lineStyle(Math.max(1, Math.round(1 * scale)), 0x5a4a3a, 0.15);
    g.strokeRect(this.mapX(rx2), this.mapY(ry2), rw2 * scale, rh2 * scale);
    
    this.pageContainer.add(g);
  }

  private title(x: number, y: number, text: string, color: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(this.mapX(x), this.mapY(y), text, { 
      fontSize: this.fs(size), 
      fontFamily: 'Georgia, serif', 
      color 
    }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
    return t;
  }

  private heading(x: number, y: number, text: string, color: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(this.mapX(x), this.mapY(y), text, {
      fontSize: this.fs(size),
      fontFamily: 'Georgia, serif',
      color,
      fontStyle: 'bold'
    }).setOrigin(0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private label(x: number, y: number, text: string, color: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(this.mapX(x), this.mapY(y), text, { 
      fontSize: this.fs(size), 
      fontFamily: 'monospace', 
      color 
    }).setOrigin(0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private body(x: number, y: number, text: string, size: number, maxW: number): Phaser.GameObjects.Text {
    const scale = this.getManualScale();
    const t = this.add.text(this.mapX(x), this.mapY(y), text, {
      fontSize: this.fs(size), 
      fontFamily: 'Georgia, serif', 
      color: '#3a2a1a',
      wordWrap: { width: maxW * scale }, 
      lineSpacing: 5 * scale,
    }).setOrigin(0, 0);
    this.pageContainer.add(t);
    return t;
  }

  private italic(x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
    const t = this.add.text(this.mapX(x), this.mapY(y), text, {
      fontSize: this.fs(size), 
      fontFamily: 'Georgia, serif', 
      color: '#6a4a3a', 
      fontStyle: 'italic',
    }).setOrigin(0.5, 0);
    this.pageContainer.add(t);
    return t;
  }

  private divider(cx: number, y: number, width: number): void {
    const scale = this.getManualScale();
    const g = this.add.graphics();
    g.lineStyle(Math.max(1, Math.round(1 * scale)), 0x4a3a2a, 0.2);
    
    const x1 = this.mapX(cx - width / 2);
    const x2 = this.mapX(cx + width / 2);
    const sy = this.mapY(y);
    
    g.lineBetween(x1, sy, x2, sy);
    this.pageContainer.add(g);
  }

  private sprite(x: number, y: number, key: string, scale: number): void {
    try { 
      const sVal = this.getManualScale();
      this.pageContainer.add(
        this.add.image(this.mapX(x), this.mapY(y), key).setScale(scale * sVal)
      ); 
    } catch (_) {}
  }

  // ── Pages ──

  private buildPages(): void {
    // 0: Cover
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 140, t('manual.cover.title'), '#6a1a1a', 30);
        s.title(cx, cy - 78, t('manual.cover.subtitle'), '#5a3a2a', 15);
        s.divider(cx, cy - 46, 220);
        s.title(cx, cy - 20, t('manual.cover.genre'), '#8a5a3a', 14);
        s.italic(cx, cy + 12, t('manual.cover.tagline'), 13);
        s.divider(cx, cy + 50, 180);
        s.italic(cx, cy + 80, t('manual.cover.quote'), 12);
      },
    });

    // 1: The Forms (3 columns, evenly spaced horizontally)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.forms.title'), '#6a1a1a', 18);
        const top = cy - 100;
        const rowH = 180;

        // Warrior column
        s.sprite(cx - 240, top, 'player-human', 1.8);
        s.label(cx - 200, top + 40, t('manual.forms.warriorTitle'), '#5a2a1a', 13);
        s.body(cx - 200, top + 58, t('manual.forms.warriorDesc'), 10, 130);

        // Mecha column  
        s.sprite(cx - 15, top + 10, 'player-mecha', 1.5);
        s.label(cx + 25, top + 40, t('manual.forms.mechaTitle'), '#8a3a2a', 13);
        s.body(cx + 25, top + 58, t('manual.forms.mechaDesc'), 10, 130);

        // Dragon column
        s.sprite(cx + 200, top + 20, 'player-dragon', 1.3);
        s.label(cx + 225, top + 40, t('manual.forms.dragonTitle'), '#3a5a8a', 13);
        s.body(cx + 225, top + 58, t('manual.forms.dragonDesc'), 10, 130);

        // Form cycle diagram at bottom
        s.divider(cx, top + rowH + 10, 300);
        s.body(cx - 120, top + rowH + 28, t('manual.forms.cycleDesc'), 11, 240);
      },
    });

    // 2: Controls (Action on left, Keys on right to prevent overlap)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.controls.title'), '#6a1a1a', 18);
        const top = cy - 110;
        const rowH = 28;

        const keys: [string, string][] = [
          [t('manual.controls.move'), t('manual.controls.moveKey')],
          [t('manual.controls.jump'), t('manual.controls.jumpKey')],
          [t('manual.controls.attack'), t('manual.controls.attackKey')],
          [t('manual.controls.cycleForm'), t('manual.controls.cycleFormKey')],
          [t('manual.controls.warEchoes'), t('manual.controls.warEchoesKey')],
          [t('manual.controls.pause'), t('manual.controls.pauseKey')],
          [t('manual.controls.praySave'), t('manual.controls.praySaveKey')],
        ];
        let y = top;
        keys.forEach(([action, key]) => {
          s.label(cx - 180, y, action, '#3a2a1a', 10);
          s.label(cx - 20, y, key, '#8a4a2a', 10);
          y += rowH;
        });

        s.divider(cx, y + 10, 360);
        s.title(cx, y + 28, t('manual.controls.proTipsTitle'), '#6a1a1a', 15);
        s.body(cx - 150, y + 52, t('manual.controls.proTipsDesc'), 10, 300);
      },
    });

    // 3: Story (Heading helper and proper horizontal layout)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.story.title'), '#6a1a1a', 18);
        const top = cy - 110;

        s.heading(cx - 180, top, t('manual.story.oldWorldTitle'), '#5a2a1a', 14);
        s.body(cx - 180, top + 24, t('manual.story.oldWorldDesc'), 10, 360);

        s.heading(cx - 180, top + 130, t('manual.story.dragonCoreTitle'), '#5a2a1a', 14);
        s.body(cx - 180, top + 154, t('manual.story.dragonCoreDesc'), 10, 360);

        s.sprite(cx + 210, top + 90, 'dragon-core', 2.5);
      },
    });

    // 4: Bestiary (3x2 grid)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.bestiary.title'), '#6a1a1a', 18);
        const top = cy - 105;
        const rowH = 175;
        const colW = 185;

        const enemies: [string, number, string, string][] = [
          ['enemy-sentry', 1.6, t('manual.bestiary.sentryTitle'), t('manual.bestiary.sentryDesc')],
          ['enemy-leaper', 1.4, t('manual.bestiary.leaperTitle'), t('manual.bestiary.leaperDesc')],
          ['enemy-spitter', 1.4, t('manual.bestiary.spitterTitle'), t('manual.bestiary.spitterDesc')],
          ['enemy-shield', 1.4, t('manual.bestiary.shieldTitle'), t('manual.bestiary.shieldDesc')],
          ['enemy-mecha', 1.2, t('manual.bestiary.mechaTitle'), t('manual.bestiary.mechaDesc')],
          ['enemy-sentry', 1.2, t('manual.bestiary.flySentryTitle'), t('manual.bestiary.flySentryDesc')],
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

    // 5: Bosses (Clean symmetrical 3-column layout including Level 4 Gatekeeper!)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.bosses.title'), '#6a1a1a', 18);
        const top = cy - 100;

        // Bastion Column
        s.sprite(cx - 240, top + 35, 'elite-mecha', 1.3);
        s.title(cx - 240, top + 90, t('manual.bosses.bastionTitle'), '#8a3a2a', 12);
        s.italic(cx - 240, top + 107, t('manual.bosses.bastionSubtitle'), 10);
        s.body(cx - 330, top + 125, t('manual.bosses.bastionDesc'), 9, 180);

        // Dreadnought Column
        s.sprite(cx, top + 30, 'boss', 1.8);
        s.title(cx, top + 90, t('manual.bosses.dreadnoughtTitle'), '#6a1a1a', 12);
        s.italic(cx, top + 107, t('manual.bosses.dreadnoughtSubtitle'), 10);
        s.body(cx - 90, top + 125, t('manual.bosses.dreadnoughtDesc'), 9, 180);

        // Gatekeeper Column
        s.sprite(cx + 240, top + 30, 'boss', 2.3);
        s.title(cx + 240, top + 90, t('manual.bosses.gatekeeperTitle'), '#5a4a3a', 12);
        s.italic(cx + 240, top + 107, t('manual.bosses.gatekeeperSubtitle'), 10);
        s.body(cx + 150, top + 125, t('manual.bosses.gatekeeperDesc'), 9, 180);
      },
    });

    // 6: Items (3x2 grid)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.items.title'), '#6a1a1a', 18);
        const top = cy - 105;
        const rowH = 175;
        const colW = 190;

        const items: [string, number, string, string][] = [
          ['dragon-core', 2.0, t('manual.items.item1Title'), t('manual.items.item1Desc')],
          ['sky-core', 2.0, t('manual.items.item2Title'), t('manual.items.item2Desc')],
          ['energy-pickup', 1.8, t('manual.items.item3Title'), t('manual.items.item3Desc')],
          ['destiny-echo', 1.3, t('manual.items.item4Title'), t('manual.items.item4Desc')],
          ['altar-save', 0.6, t('manual.items.item5Title'), t('manual.items.item5Desc')],
          ['cool-valve', 1.8, t('manual.items.item6Title'), t('manual.items.item6Desc')],
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

    // 7: World Map (Describing all 4 campaign zones using left alignment)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 155, t('manual.world.title'), '#6a1a1a', 18);
        const top = cy - 125;
        const rowH = 82;

        s.heading(cx - 180, top + 0, t('manual.world.zone1Title'), '#5a2a1a', 13);
        s.body(cx - 180, top + 18, t('manual.world.zone1Desc'), 9.5, 400);

        s.heading(cx - 180, top + rowH, t('manual.world.zone2Title'), '#5a2a1a', 13);
        s.body(cx - 180, top + rowH + 18, t('manual.world.zone2Desc'), 9.5, 400);

        s.heading(cx - 180, top + rowH * 2, t('manual.world.zone3Title'), '#5a2a1a', 13);
        s.body(cx - 180, top + rowH * 2 + 18, t('manual.world.zone3Desc'), 9.5, 400);

        s.heading(cx - 180, top + rowH * 3, t('manual.world.zone4Title'), '#5a2a1a', 13);
        s.body(cx - 180, top + rowH * 3 + 18, t('manual.world.zone4Desc'), 9.5, 400);
      },
    });

    // 8: Credits (Clean, centered credits with working title translation)
    this.pages.push({
      draw: (s, cx, cy, w, h) => {
        s.border(cx, cy, w, h);
        s.title(cx, cy - 130, t('manual.credits.title'), '#6a1a1a', 26);
        s.title(cx, cy - 88, t('manual.credits.subTitle'), '#5a3a2a', 14);
        s.divider(cx, cy - 54, 320);
        s.title(cx, cy - 28, t('manual.credits.builtWith'), '#5a2a1a', 13);
        s.title(cx, cy - 6, t('manual.credits.techStack'), '#3a2a1a', 12);
        s.title(cx, cy + 30, t('manual.credits.inspiredBy'), '#5a2a1a', 13);
        s.italic(cx, cy + 50, t('manual.credits.inspirations'), 12);
        s.divider(cx, cy + 78, 220);
        s.title(cx, cy + 100, t('manual.credits.soundtrackTitle'), '#5a2a1a', 13);
        s.title(cx, cy + 122, t('manual.credits.soundtrackDesc'), '#3a2a1a', 11);
        s.italic(cx, cy + 155, t('manual.credits.quote'), 12);
        s.title(cx, h - 60, t('manual.credits.copyright'), '#5a4a3a', 9);
      },
    });
  }

  private drawCurrentPage(w: number, h: number): void {
    this.pageContainer.removeAll(true);
    
    // Always draw in the 800x600 virtual page coordinates
    this.pages[this.currentPage]?.draw(this, 400, 300, 800, 600, 1);
    
    if (this.pageText) {
      const pageNumStr = t('manual.pageOf')
        .replace('{0}', String(this.currentPage + 1))
        .replace('{1}', String(this.pages.length));
      this.pageText.setText(pageNumStr);
    }
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
