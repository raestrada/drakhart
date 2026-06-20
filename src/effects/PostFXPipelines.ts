import Phaser from 'phaser';

// Define placeholder variables for dynamic classes resolved at runtime
let CustomPostFXControllerClass: any = null;

export function registerCustomPostFX(renderer: any): void {
  if (renderer.renderNodes.hasNode('CustomPostFXNode')) return;

  const BaseFilterShaderClass = (Phaser.Renderer.WebGL.RenderNodes as any).BaseFilterShader;

  const CustomPostFXNode = class extends BaseFilterShaderClass {
    constructor(manager: any) {
      super('CustomPostFXNode', manager, null, `
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
      `);
    }

    setupUniforms(controller: any, _drawingContext: any): void {
      if ((window as any)._customPostFXLogCount === undefined) (window as any)._customPostFXLogCount = 0;
      if ((window as any)._customPostFXLogCount++ % 200 === 0) {
        console.log("CustomPostFX controller fields:", {
          aberration: controller.aberration,
          scanlines: controller.scanlines,
          contrast: controller.contrast,
          saturation: controller.saturation,
          brightness: controller.brightness,
          filmGrain: controller.filmGrain,
          vignetteRadius: controller.vignetteRadius,
          vignetteIntensity: controller.vignetteIntensity,
          vignetteColor: controller.vignetteColor
        });
      }
      const programManager = this.programManager;
      programManager.setUniform('uAberration', controller.aberration);
      programManager.setUniform('uScanlines', controller.scanlines);
      programManager.setUniform('uContrast', controller.contrast);
      programManager.setUniform('uSaturation', controller.saturation);
      programManager.setUniform('uBrightness', controller.brightness);
      programManager.setUniform('uFilmGrain', controller.filmGrain);
      programManager.setUniform('uTime', performance.now());
      programManager.setUniform('uVignetteRadius', controller.vignetteRadius);
      programManager.setUniform('uVignetteIntensity', controller.vignetteIntensity);
      programManager.setUniform('uVignetteColor', controller.vignetteColor);
    }
  };

  renderer.renderNodes.addNodeConstructor('CustomPostFXNode', CustomPostFXNode);
}

export function getCustomPostFX(camera: Phaser.Cameras.Scene2D.Camera): any {
  if (!camera || !camera.filters || !camera.filters.internal) return null;
  return camera.filters.internal.list.find((f: any) => f.renderNode === 'CustomPostFXNode');
}

export function applyCustomPostFX(camera: Phaser.Cameras.Scene2D.Camera): any {
  if (!camera || !camera.filters || !camera.filters.internal) return null;
  let filter = getCustomPostFX(camera);
  if (!filter) {
    if (!CustomPostFXControllerClass) {
      const ControllerClass = (Phaser.Filters as any).Controller;
      CustomPostFXControllerClass = class extends ControllerClass {
        public aberration = 0.0;
        public scanlines = 0.5;
        public contrast = 1.0;
        public saturation = 1.0;
        public brightness = 0.0;
        public filmGrain = 0.0;
        public vignetteRadius = 1.5;
        public vignetteIntensity = 0.0;
        public vignetteColor: [number, number, number] = [0, 0, 0];

        constructor(cam: any) {
          super(cam, 'CustomPostFXNode');
        }
      };
    }
    filter = new CustomPostFXControllerClass(camera);
    camera.filters.internal.add(filter);
  }
  return filter;
}

export function applyBiomePostFX(scene: Phaser.Scene, biome: string): void {
  if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const controller = applyCustomPostFX(scene.cameras.main);
  if (!controller) return;

  switch (biome) {
    case 'forest':
      controller.contrast = 1.0;
      controller.saturation = 1.0;
      controller.brightness = 0.0;
      controller.filmGrain = 0.0;
      controller.vignetteRadius = 1.5;
      controller.vignetteIntensity = 0.0;
      controller.vignetteColor = [0.0, 0.0, 0.0];
      break;
    case 'refinery':
      controller.contrast = 1.0;
      controller.saturation = 1.05;
      controller.brightness = 0.0;
      controller.filmGrain = 0.25;
      controller.vignetteRadius = 1.15;
      controller.vignetteIntensity = 0.4;
      controller.vignetteColor = [0.08, 0.02, 0.02];
      break;
    case 'gorge':
      controller.contrast = 1.0;
      controller.saturation = 0.7;
      controller.brightness = 0.0;
      controller.filmGrain = 0.3;
      controller.vignetteRadius = 1.2;
      controller.vignetteIntensity = 0.45;
      controller.vignetteColor = [0.05, 0.02, 0.06];
      break;
    case 'foundry':
      controller.contrast = 1.0;
      controller.saturation = 0.9;
      controller.brightness = 0.0;
      controller.filmGrain = 0.2;
      controller.vignetteRadius = 1.15;
      controller.vignetteIntensity = 0.35;
      controller.vignetteColor = [0.05, 0.02, 0.02];
      break;
  }
}

export function setVignetteFromPlayer(controller: any, healthRatio: number, heatLevel: string): void {
  if (!controller) return;

  controller.vignetteRadius = 1.5;
  controller.vignetteIntensity = 0.0;
  controller.vignetteColor = [0, 0, 0];
}
