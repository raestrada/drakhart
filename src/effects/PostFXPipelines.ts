import Phaser from 'phaser';

export class CustomPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  public aberration = 0.0;
  public scanlines = 0.5;
  public contrast = 1.0;
  public saturation = 1.0;
  public brightness = 0.0;
  public filmGrain = 0.0;

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
      break;
    case 'refinery':
      pipeline.contrast = 1.2;
      pipeline.saturation = 1.05;
      pipeline.brightness = -0.03;
      pipeline.filmGrain = 0.25;
      break;
    case 'gorge':
      pipeline.contrast = 1.15;
      pipeline.saturation = 0.7;
      pipeline.brightness = -0.04;
      pipeline.filmGrain = 0.3;
      break;
    default:
      pipeline.contrast = 1.0;
      pipeline.saturation = 1.0;
      pipeline.brightness = 0.0;
      pipeline.filmGrain = 0.05;
  }
}
