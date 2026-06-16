import Phaser from 'phaser';

export class CustomPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  public aberration = 0.0;
  public scanlines = 0.5; // subtle scanlines on by default

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

          if (uScanlines > 0.0) {
            float scanline = sin(uv.y * 900.0) * 0.035 * uScanlines;
            col.rgb -= scanline;
          }

          gl_FragColor = col;
        }
      `
    });
  }

  onPreRender(): void {
    this.set1f('uAberration', this.aberration);
    this.set1f('uScanlines', this.scanlines);
  }
}
