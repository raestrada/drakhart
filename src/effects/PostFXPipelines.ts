import Phaser from 'phaser';

export class CustomPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  public aberration = 0.0;
  public scanlines = 0.5;
  public contrast = 1.0;
  public saturation = 1.0;
  public brightness = 0.0;
  public filmGrain = 0.0;
  public vignetteRadius = 1.5;
  public vignetteIntensity = 0.0;
  public vignetteColor: [number, number, number] = [0, 0, 0];

  constructor(game: Phaser.Game) {
    super({
      game: game,
      name: 'CustomPostFX',
      fragShader: `
        #define SHADER_NAME CUSTOM_POST_FX
        precision mediump float;
        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;
        uniform float uAberration;
        uniform float uScanlines;
        uniform float uContrast;
        uniform float uSaturation;
        uniform float uBrightness;
        uniform float uFilmGrain;
        uniform float uTime;
        uniform float uVignetteRadius;
        uniform float uVignetteIntensity;
        uniform vec3 uVignetteColor;

        vec3 adjustContrast(vec3 color, float contrast) {
          return (color - 0.5) * contrast + 0.5;
        }

        vec3 adjustSaturation(vec3 color, float saturation) {
          float gray = dot(color, vec3(0.299, 0.587, 0.114));
          return mix(vec3(gray), color, saturation);
        }

        float random(vec2 uv) {
          return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = outTexCoord;
          vec4 col;

          if (uAberration > 0.0) {
            float dist = uAberration * 0.007;
            col.r = texture2D(uMainSampler, vec2(uv.x - dist, uv.y)).r;
            col.g = texture2D(uMainSampler, uv).g;
            col.b = texture2D(uMainSampler, vec2(uv.x + dist, uv.y)).b;
            col.a = texture2D(uMainSampler, uv).a;
          } else {
            col = texture2D(uMainSampler, uv);
          }

          col.rgb = adjustContrast(col.rgb, uContrast);
          col.rgb = adjustSaturation(col.rgb, uSaturation);
          col.rgb += uBrightness;

          if (uScanlines > 0.0) {
            float scanline = sin(uv.y * 900.0) * 0.035 * uScanlines;
            col.rgb -= scanline;
          }

          if (uFilmGrain > 0.0) {
            float grain = random(uv + fract(uTime * 0.001)) * 2.0 - 1.0;
            col.rgb += grain * uFilmGrain * 0.06;
          }

          if (uVignetteIntensity > 0.0) {
            float dist = length(uv - 0.5) * 1.8;
            float vignette = smoothstep(uVignetteRadius - 0.6, uVignetteRadius, dist);
            col.rgb = mix(col.rgb, uVignetteColor, vignette * uVignetteIntensity);
          }

          gl_FragColor = col;
        }
      `
    });
  }

  onPreRender(): void {
    this.set1f('uAberration', this.aberration);
    this.set1f('uScanlines', this.scanlines);
    this.set1f('uContrast', this.contrast);
    this.set1f('uSaturation', this.saturation);
    this.set1f('uBrightness', this.brightness);
    this.set1f('uFilmGrain', this.filmGrain);
    this.set1f('uTime', this.game.loop.now);
    this.set1f('uVignetteRadius', this.vignetteRadius);
    this.set1f('uVignetteIntensity', this.vignetteIntensity);
    this.set3f('uVignetteColor', this.vignetteColor[0], this.vignetteColor[1], this.vignetteColor[2]);
  }
}

export function applyBiomePostFX(scene: Phaser.Scene, biome: string): void {
  if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const pipeline = scene.cameras.main.getPostPipeline('CustomPostFX') as any;
  if (!pipeline) return;

  switch (biome) {
    case 'forest':
      pipeline.contrast = 1.1;
      pipeline.saturation = 0.85;
      pipeline.brightness = -0.02;
      pipeline.filmGrain = 0.15;
      pipeline.vignetteRadius = 1.2;
      pipeline.vignetteIntensity = 0.35;
      pipeline.vignetteColor = [0.03, 0.01, 0.05];
      break;
    case 'refinery':
      pipeline.contrast = 1.2;
      pipeline.saturation = 1.05;
      pipeline.brightness = -0.03;
      pipeline.filmGrain = 0.25;
      pipeline.vignetteRadius = 1.15;
      pipeline.vignetteIntensity = 0.4;
      pipeline.vignetteColor = [0.08, 0.02, 0.02];
      break;
    case 'gorge':
      pipeline.contrast = 1.15;
      pipeline.saturation = 0.7;
      pipeline.brightness = -0.04;
      pipeline.filmGrain = 0.3;
      pipeline.vignetteRadius = 1.2;
      pipeline.vignetteIntensity = 0.45;
      pipeline.vignetteColor = [0.05, 0.02, 0.06];
      break;
    case 'foundry':
      pipeline.contrast = 1.25;
      pipeline.saturation = 0.9;
      pipeline.brightness = -0.02;
      pipeline.filmGrain = 0.2;
      pipeline.vignetteRadius = 1.15;
      pipeline.vignetteIntensity = 0.35;
      pipeline.vignetteColor = [0.05, 0.02, 0.02];
      break;
      pipeline.contrast = 1.0;
      pipeline.saturation = 1.0;
      pipeline.brightness = 0.0;
      pipeline.filmGrain = 0.05;
      pipeline.vignetteRadius = 1.4;
      pipeline.vignetteIntensity = 0.15;
      pipeline.vignetteColor = [0, 0, 0];
  }
}

export function setVignetteFromPlayer(pipeline: any, healthRatio: number, heatLevel: string): void {
  if (!pipeline) return;

  let intensity = 0.15;
  let radius = 1.3;
  const color: [number, number, number] = [0, 0, 0];

  if (healthRatio < 0.3) {
    intensity = 0.5 + 0.15 * Math.sin(Date.now() * 0.005);
    radius = 0.8;
    color[0] = 0.35;
    color[1] = 0.02;
    color[2] = 0.02;
  } else if (healthRatio < 0.5) {
    intensity = 0.3;
    radius = 1.0;
    color[0] = 0.08;
    color[1] = 0.01;
    color[2] = 0.02;
  }

  if (heatLevel === 'danger') {
    intensity = Math.max(intensity, 0.45 + 0.15 * Math.sin(Date.now() * 0.015));
    radius = Math.min(radius, 0.9);
    color[0] = Math.max(color[0], 0.5);
    color[1] = Math.max(color[1], 0.1);
    color[2] = Math.max(color[2], 0.05);
  } else if (heatLevel === 'warning') {
    intensity = Math.max(intensity, 0.25 + 0.1 * Math.sin(Date.now() * 0.008));
    radius = Math.min(radius, 1.1);
    color[0] = Math.max(color[0], 0.3);
    color[1] = Math.max(color[1], 0.05);
  }

  pipeline.vignetteRadius = radius;
  pipeline.vignetteIntensity = intensity;
  pipeline.vignetteColor = color;
}
