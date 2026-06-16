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
}
