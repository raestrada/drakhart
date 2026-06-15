export interface MusicLayer {
  name: string;
  gainNode: GainNode;
  currentVolume: number;
  targetVolume: number;
  active: boolean;
}

export class DynamicMusicSystem {
  private ctx: AudioContext | null = null;
  private layers: Map<string, MusicLayer> = new Map();
  private masterGain: GainNode | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(ctx.destination);
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  registerLayer(name: string): { gain: GainNode } {
    if (!this.ctx) throw new Error('AudioContext not available');
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain!);

    this.layers.set(name, {
      name,
      gainNode: gain,
      currentVolume: 0,
      targetVolume: 0,
      active: false,
    });

    return { gain };
  }

  getLayerGain(name: string): GainNode | null {
    const layer = this.layers.get(name);
    return layer ? layer.gainNode : null;
  }

  setLayerVolume(name: string, volume: number, rampTime = 1.0): void {
    const layer = this.layers.get(name);
    if (!layer || !this.ctx) return;

    const t = this.ctx.currentTime;
    layer.targetVolume = volume;

    if (volume > 0 && !layer.active) {
      layer.active = true;
      layer.gainNode.gain.setValueAtTime(layer.currentVolume, t);
      layer.gainNode.gain.linearRampToValueAtTime(volume, t + rampTime);
    } else if (volume <= 0 && layer.active) {
      layer.active = false;
      layer.gainNode.gain.setValueAtTime(layer.currentVolume, t);
      layer.gainNode.gain.linearRampToValueAtTime(0, t + rampTime);
    } else {
      layer.gainNode.gain.setValueAtTime(layer.currentVolume, t);
      layer.gainNode.gain.linearRampToValueAtTime(volume, t + rampTime);
    }

    layer.currentVolume = volume;
  }

  fadeAll(time = 2.0, except?: string[]): void {
    this.layers.forEach((_, name) => {
      if (except && except.includes(name)) return;
      this.setLayerVolume(name, 0, time);
    });
  }

  updateFromGameState(state: {
    isCombat: boolean;
    isBoss: boolean;
    isDragon: boolean;
    isMecha: boolean;
    isSacred: boolean;
  }): void {
    this.setLayerVolume('ambient', state.isCombat ? 0.15 : 0.35, 0.5);

    this.setLayerVolume('percussion', state.isCombat ? 0.3 : 0, 0.3);

    this.setLayerVolume('strings', state.isBoss ? 0.4 : 0, 1.0);

    this.setLayerVolume('choir', state.isDragon || state.isSacred ? 0.3 : 0, 0.8);

    this.setLayerVolume('synth', state.isMecha ? 0.25 : 0, 0.5);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  destroy(): void {
    this.layers.clear();
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }
}
