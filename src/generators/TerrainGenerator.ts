import Phaser from 'phaser';

export class TerrainGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  generateGroundSegment(
    group: Phaser.Physics.Arcade.StaticGroup,
    startX: number,
    baseY: number,
    width: number,
    biome: 'forest' | 'refinery' | 'gorge' = 'forest',
    seed = 42
  ): void {
    const rng = new Phaser.Math.RandomDataGenerator(['terrain', seed.toString()]);
    const height = 64;
    const points: { x: number; y: number }[] = [];
    const step = 24;

    // Generate top surface with noise
    for (let sx = 0; sx <= width; sx += step) {
      const nx = sx / width;
      const noise = Math.sin(nx * Math.PI * 3 + seed) * 8 +
                    Math.sin(nx * Math.PI * 7 + seed * 1.7) * 4 +
                    rng.realInRange(-3, 3);
      points.push({ x: startX + sx, y: baseY + noise - 8 });
    }

    // Create Arcade static bodies — tall enough that the visual noise doesn't leave gaps
    const segWidth = 128;
    for (let tx = startX; tx < startX + width; tx += segWidth) {
      // Find the highest point in this segment
      let topY = baseY + height;
      for (const p of points) {
        if (p.x >= tx && p.x < tx + segWidth && p.y < topY) {
          topY = p.y;
        }
      }
      const bodyH = baseY + height - topY + 4;
      const bodyCY = topY + bodyH / 2;
      const body = group.create(tx + segWidth / 2, bodyCY, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      body.setDisplaySize(segWidth, bodyH);
      body.refreshBody();
      body.setDepth(3);
    }

    // Draw the organic terrain visuals
    const g = this.scene.add.graphics();
    g.setDepth(5);

    if (biome === 'forest') {
      // Dark earth base
      g.fillStyle(0x1a1510, 1);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      g.lineTo(startX + width, baseY + height);
      g.lineTo(startX, baseY + height);
      g.closePath();
      g.fillPath();

      // Surface earth highlight
      g.fillStyle(0x262018, 0.6);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y + 3);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y + 3);
      g.lineTo(startX + width, baseY + height);
      g.lineTo(startX, baseY + height);
      g.closePath();
      g.fillPath();

      // Moss/grass on surface
      g.fillStyle(0x1a2818, 0.35);
      for (const p of points) {
        g.fillRect(p.x - 2, p.y - 3, rng.between(3, 6), rng.between(3, 8));
      }

      // Dark bottom fade
      g.fillStyle(0x0d0905, 0.5);
      g.fillRect(startX, baseY + height - 16, width, 16);
    } else if (biome === 'refinery') {
      g.fillStyle(0x1e272e, 1);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      g.lineTo(startX + width, baseY + height);
      g.lineTo(startX, baseY + height);
      g.closePath();
      g.fillPath();

      // Metal plate highlights
      g.fillStyle(0x2a3540, 0.5);
      for (const p of points) {
        g.fillRect(p.x - 1, p.y - 2, 4, 4);
      }

      // Bottom metal shadow
      g.fillStyle(0x101418, 0.5);
      g.fillRect(startX, baseY + height - 12, width, 12);

      // Rivet marks along surface
      g.fillStyle(0x0a0d11, 0.4);
      for (let rx = startX + 30; rx < startX + width; rx += rng.between(60, 100)) {
        g.fillCircle(rx, points[Math.floor((rx-startX)/step)]?.y + 4 || baseY, 2);
      }
    } else {
      // Gorge — dark purple rock
      g.fillStyle(0x201820, 1);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      g.lineTo(startX + width, baseY + height);
      g.lineTo(startX, baseY + height);
      g.closePath();
      g.fillPath();

      // Surface rock highlight
      g.fillStyle(0x2a1f2a, 0.4);
      for (const p of points) {
        g.fillRect(p.x - 4, p.y - 1, 8, 3);
      }

      // Crystal shards embedded in rock
      g.fillStyle(0x663366, 0.3);
      for (let i = 0; i < 5; i++) {
        const cx = rng.between(startX + 20, startX + width - 20);
        g.fillTriangle(cx, baseY + rng.between(10, 40), cx - 4, baseY + height, cx + 4, baseY + height);
      }

      // Bottom dark fade
      g.fillStyle(0x0d080d, 0.5);
      g.fillRect(startX, baseY + height - 14, width, 14);
    }
  }

  generatePlatform(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    biome: 'forest' | 'refinery' | 'gorge' = 'forest'
  ): void {
    const h = 14;
    const points: { x: number; y: number }[] = [];

    // Irregular top
    for (let sx = 0; sx <= width; sx += 16) {
      points.push({ x: x + sx, y: y + Math.sin(sx * 0.3) * 2 });
    }

    // Arcade static body
    const body = group.create(x + width / 2, y + h / 2, 'tile-platform') as Phaser.Physics.Arcade.Sprite;
    body.setDisplaySize(width, h);
    body.refreshBody();
    body.setDepth(3);

    // Organic visual
    const g = this.scene.add.graphics();
    g.setDepth(5);

    const baseColor = biome === 'refinery' ? 0x2a3540 : 0x201c18;
    g.fillStyle(baseColor, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.lineTo(x + width, y + h);
    g.lineTo(x, y + h);
    g.closePath();
    g.fillPath();

    // Top highlight
    g.fillStyle(biome === 'refinery' ? 0x3a4550 : 0x2a241e, 0.4);
    g.fillRect(x + 4, y + 2, width - 8, h - 4);

    // Edge dots
    g.fillStyle(baseColor, 0.3);
    for (let ex = x + 8; ex < x + width; ex += 24) {
      g.fillCircle(ex, y + h - 2, 2);
    }
  }

  generateFloatingIsland(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    seed = 84
  ): void {
    const rng = new Phaser.Math.RandomDataGenerator(['island', seed.toString()]);
    const vertices: { x: number; y: number }[] = [];

    // Top — irregular
    for (let sx = 0; sx <= width; sx += 16) {
      const nx = sx / width;
      const noise = Math.sin(nx * Math.PI * 2 + seed) * 6 + rng.realInRange(-4, 4);
      vertices.push({ x: x + sx, y: y + noise });
    }

    // Arcade static body
    const body = group.create(x + width / 2, y + height / 2, 'tile-platform') as Phaser.Physics.Arcade.Sprite;
    body.setDisplaySize(width, height);
    body.refreshBody();
    body.setDepth(3);

    // Organic visual
    const g = this.scene.add.graphics();
    g.setDepth(5);
    g.fillStyle(0x201820, 1);
    g.beginPath();
    g.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) g.lineTo(vertices[i].x, vertices[i].y);
    g.lineTo(x + width, y + height + 8);
    g.lineTo(x, y + height + 8);
    g.closePath();
    g.fillPath();

    // Bottom stalactites
    g.fillStyle(0x151015, 0.6);
    for (let sx = x + 10; sx < x + width; sx += rng.between(30, 50)) {
      const sh = rng.between(8, 20);
      g.fillTriangle(sx - 4, y + height, sx + 4, y + height, sx, y + height + sh);
    }

    // Surface highlight
    g.fillStyle(0x302830, 0.5);
    for (let i = 0; i < vertices.length; i += 3) {
      g.fillRect(vertices[i].x - 3, vertices[i].y - 2, 6, 4);
    }
  }

  generateThornGap(
    group: Phaser.Physics.Arcade.StaticGroup,
    startX: number,
    baseY: number,
    width: number,
    seed = 77
  ): void {
    const rng = new Phaser.Math.RandomDataGenerator(['thorns', seed.toString()]);

    // Draw organic thorn thicket at the bottom
    const g = this.scene.add.graphics();
    g.setDepth(6);

    // Dark void below
    g.fillStyle(0x060208, 1);
    g.fillRect(startX, baseY - 4, width, 36);

    // Thorn bushes — clusters of sharp triangles
    for (let bush = 0; bush < Math.floor(width / 60); bush++) {
      const bx = startX + bush * 60 + rng.between(10, 40);
      const by = baseY + rng.between(-4, 8);

      // Main thorn body
      g.fillStyle(0x1a1018, 0.9);
      g.fillTriangle(bx - 6, by + 16, bx + 6, by + 16, bx, by - rng.between(4, 14));

      // Sharp tips
      for (let t = 0; t < rng.between(4, 8); t++) {
        const tx = bx + rng.between(-12, 12);
        const ty = by + rng.between(-6, 12);
        const th = rng.between(6, 20);

        // Color gradient: dark purple base, bright tip
        g.fillStyle(0x2a1533, 0.8);
        g.fillTriangle(tx - 1.5, ty, tx + 1.5, ty, tx, ty - th);

        // Blood-red tip highlight
        g.fillStyle(0x661133, 0.5);
        g.fillTriangle(tx - 0.8, ty - th + 4, tx + 0.8, ty - th + 4, tx, ty - th);
      }

      // Thorn berry/fire bud — the "estrella de fuego"
      if (rng.between(0, 3) > 0) {
        const fbX = bx + rng.between(-8, 8);
        const fbY = by + rng.between(2, 14);
        g.fillStyle(0xff3300, 0.7);
        g.fillCircle(fbX, fbY, rng.between(2, 4));
        g.fillStyle(0xff6600, 0.5);
        g.fillCircle(fbX, fbY, rng.between(1, 2));
        g.fillStyle(0xffcc00, 0.3);
        g.fillCircle(fbX - 0.5, fbY - 0.5, 0.8);
      }
    }

    // Ground-level roots
    g.fillStyle(0x1a0f1a, 0.6);
    for (let rx = startX + 10; rx < startX + width; rx += rng.between(30, 60)) {
      const rw = rng.between(6, 14);
      g.fillRect(rx, baseY + rng.between(0, 4), rw, rng.between(2, 4));
    }

    // Arcade collision body — wide flat hazard along the gap floor
    const segW = 128;
    for (let tx = startX; tx < startX + width; tx += segW) {
      const body = group.create(tx + segW / 2, baseY + 16, 'tile-thorns') as Phaser.Physics.Arcade.Sprite;
      body.setDisplaySize(segW, 28);
      body.setAlpha(0.01); // nearly invisible — the graphics handle visuals
      body.refreshBody();
    }
  }

  generateBurntTree(x: number, y: number, seed = 1): void {
    const rng = new Phaser.Math.RandomDataGenerator(['tree', seed.toString()]);
    const g = this.scene.add.graphics();
    g.setDepth(60);
    g.setScrollFactor(0.95);

    const trunkH = rng.between(90, 140);
    const trunkW = rng.between(6, 10);

    g.fillStyle(0x0d0a08, 0.7);
    g.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);
    g.fillStyle(0x151210, 0.5);
    g.fillRect(x - trunkW / 4, y - trunkH, trunkW / 2, trunkH);

    const branchCount = rng.between(3, 6);
    for (let b = 0; b < branchCount; b++) {
      const by = y - rng.between(20, trunkH - 20);
      const bx = x + (rng.between(0, 1) ? 1 : -1) * trunkW / 2;
      const bw = rng.between(4, 14);
      g.fillStyle(0x0d0a08, 0.6);
      g.fillRect(bx, by, rng.between(0, 1) ? bw : -bw, 2);
      if (rng.between(0, 2) > 0) {
        const tipX = bx + (bx > x ? bw : -bw);
        g.fillRect(tipX, by - rng.between(1, 4), 2, rng.between(3, 8));
      }
    }

    g.fillStyle(0xff4400, 0.15);
    for (let a = 0; a < 3; a++) {
      g.fillCircle(x + rng.between(-6, 6), y - rng.between(10, trunkH), rng.between(1, 2));
    }
  }

  generateRuinsColumn(x: number, y: number, seed = 1): void {
    const rng = new Phaser.Math.RandomDataGenerator(['column', seed.toString()]);
    const g = this.scene.add.graphics();
    g.setDepth(60);
    g.setScrollFactor(0.95);

    const colH = rng.between(60, 100);
    const colW = rng.between(12, 18);

    g.fillStyle(0x181c22, 0.6);
    g.fillRect(x - colW / 2, y - colH, colW, colH);
    g.fillStyle(0x202830, 0.4);
    g.fillRect(x - colW / 4, y - colH, colW * 0.6, colH);

    g.fillStyle(0x101418, 0.3);
    for (let f = 0; f < rng.between(1, 3); f++) {
      g.fillRect(x - colW / 4 + f * 4, y - colH + 8, 1, colH - 16);
    }

    const crackX = x + rng.between(-colW / 3, colW / 3);
    g.fillStyle(0x0c0e12, 0.5);
    g.fillRect(crackX, y - colH + rng.between(10, colH / 3), rng.between(1, 2), rng.between(8, 20));

    g.fillStyle(0x141820, 0.3);
    for (let j = 0; j < 3; j++) {
      const jx = x - colW / 2 + j * (colW / 3) + rng.between(-2, 2);
      g.fillRect(jx, y - colH, rng.between(3, 7), rng.between(2, 4));
    }

    g.fillStyle(0x1a2818, 0.25);
    for (let m = 0; m < rng.between(1, 3); m++) {
      g.fillRect(x + rng.between(-colW / 3, colW / 3), y - rng.between(15, colH), rng.between(4, 8), 2);
    }
  }

  generateHangingVine(x: number, y: number, seed = 1): void {
    const rng = new Phaser.Math.RandomDataGenerator(['vine', seed.toString()]);
    const g = this.scene.add.graphics();
    g.setDepth(60);
    g.setScrollFactor(0.95);

    const vineLen = rng.between(60, 140);

    g.fillStyle(0x1a2818, 0.4);
    g.fillRect(x - 1, y, 2, vineLen);

    g.fillStyle(0x1a2818, 0.3);
    for (let vy = y + 10; vy < y + vineLen; vy += rng.between(15, 25)) {
      g.fillRect(x - 2, vy, 4, 1);
    }

    for (let l = 0; l < rng.between(2, 5); l++) {
      const ly = y + rng.between(10, vineLen - 10);
      const lx = x + (rng.between(0, 1) ? 2 : -2);
      g.fillStyle(0x152212, 0.35);
      g.fillRect(lx, ly, rng.between(0, 1) ? 4 : -4, 1);
    }
  }
}
