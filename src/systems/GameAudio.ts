export class GameAudio {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private bgmGainNode!: GainNode;
  private sfxGainNode!: GainNode;
  private bgmVolScale = 1.0;
  private sfxVolScale = 1.0;
  private combatIntensity = 0;
  private targetIntensity = 0;
  private bgmFilterNode!: BiquadFilterNode;
  private dragonActive = false;
  private combatPercOsc: OscillatorNode | null = null;
  private combatPercGain: GainNode | null = null;
  
  // Reverb/Delay echo lines
  private echoNode!: DelayNode;
  private echoGain!: GainNode;

  // Active drone node references for cross-fading
  private currentDroneGains: { gainNode: GainNode; oscillators: OscillatorNode[] }[] = [];

  // Noise buffer for atmospheric and combat SFX
  private noiseBuffer: AudioBuffer | null = null;

  // BGM timer loop
  private bgmTimer: any = null;

  // Level 1: Gothic platformer chords (Dm -> Bb -> Gm -> A7)
  private chordsL1 = [
    { drone: 73.42, notes: [146.83, 174.61, 220.00, 293.66, 349.23, 440.00] },
    { drone: 58.27, notes: [116.54, 146.83, 174.61, 233.08, 293.66, 349.23] },
    { drone: 49.00, notes: [98.00, 116.54, 146.83, 196.00, 233.08, 293.66] },
    { drone: 55.00, notes: [110.00, 138.59, 164.81, 220.00, 277.18, 329.63] }
  ];

  // Level 2: Heavy Industrial refinery chords (Gm -> Eb -> Cm -> D7)
  private chordsL2 = [
    { drone: 49.00, notes: [98.00, 116.54, 146.83, 196.00, 233.08, 293.66] },
    { drone: 38.89, notes: [77.78, 98.00, 116.54, 155.56, 196.00, 233.08] },
    { drone: 65.41, notes: [130.81, 155.56, 196.00, 261.63, 311.13, 392.00] },
    { drone: 73.42, notes: [146.83, 185.00, 220.00, 293.66, 369.99, 440.00] }
  ];

  // Level 3: Fast energetic SHMUP chords (Em -> C -> D -> Bm)
  private chordsL3 = [
    { drone: 82.41, notes: [164.81, 196.00, 246.94, 329.63, 392.00, 493.88] },
    { drone: 65.41, notes: [130.81, 164.81, 196.00, 261.63, 329.63, 392.00] },
    { drone: 73.42, notes: [146.83, 185.00, 220.00, 293.66, 369.99, 440.00] },
    { drone: 61.74, notes: [123.47, 146.83, 185.00, 246.94, 293.66, 369.99] }
  ];

  // Level 4: Mini-boss energetic heavy theme chords (F#m -> D -> Bm -> C#7)
  private chordsBoss = [
    { drone: 92.50, notes: [185.00, 220.00, 277.18, 369.99, 440.00, 554.37] },
    { drone: 73.42, notes: [146.83, 185.00, 220.00, 293.66, 369.99, 440.00] },
    { drone: 61.74, notes: [123.47, 146.83, 185.00, 246.94, 293.66, 369.99] },
    { drone: 69.30, notes: [138.59, 174.61, 207.65, 277.18, 349.23, 415.30] }
  ];

  private chords = this.chordsL1;
  private currentChordIndex = 0;
  private currentLevel = 1;
  private totalBeats = 0;

  constructor() {}

  public init(): void {
    if (this.ctx) return;
    if (!(window as any).sharedAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      (window as any).sharedAudioContext = new AudioContextClass();
    }
    const ctx = (window as any).sharedAudioContext as AudioContext;
    this.ctx = ctx;

    const savedBgm = typeof localStorage !== 'undefined' ? localStorage.getItem('drakhart_bgm') : null;
    this.bgmVolScale = savedBgm !== null ? parseFloat(savedBgm) : 1.0;

    const savedSfx = typeof localStorage !== 'undefined' ? localStorage.getItem('drakhart_sfx') : null;
    this.sfxVolScale = savedSfx !== null ? parseFloat(savedSfx) : 1.0;

    // 1. Create BGM volume control node
    this.bgmGainNode = ctx.createGain();
    this.bgmGainNode.gain.value = 0.35 * this.bgmVolScale; // Default BGM volume
    this.bgmGainNode.connect(ctx.destination);

    // 1b. Dynamic music filter (opens during combat, closes during exploration)
    this.bgmFilterNode = ctx.createBiquadFilter();
    this.bgmFilterNode.type = 'lowpass';
    this.bgmFilterNode.frequency.value = 1800;
    this.bgmFilterNode.Q.value = 0.7;
    // Insert filter between BGM gain and destination
    this.bgmGainNode.disconnect();
    this.bgmGainNode.connect(this.bgmFilterNode);
    this.bgmFilterNode.connect(ctx.destination);

    // 2. Create SFX volume control node
    this.sfxGainNode = ctx.createGain();
    this.sfxGainNode.gain.value = 0.65 * this.sfxVolScale; // Default SFX volume
    this.sfxGainNode.connect(ctx.destination);

    // 3. Create Echo/Reverb channel for card collections and ambient sweeps
    this.echoNode = ctx.createDelay(1.5);
    this.echoNode.delayTime.value = 0.35;

    this.echoGain = ctx.createGain();
    this.echoGain.gain.value = 0.4; // 40% feedback

    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1000; // dark, soft echoes

    // Hook feedback loop: echo -> filter -> gain -> echo input
    this.echoNode.connect(echoFilter);
    echoFilter.connect(this.echoGain);
    this.echoGain.connect(this.echoNode);

    // Connect echo output to master destination
    this.echoNode.connect(ctx.destination);

    // 4. Generate 2 seconds of white noise for weapon swipes and sweeps
    this.noiseBuffer = this.createNoiseBuffer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const rate = this.ctx?.sampleRate || 44100;
    const size = rate * 2;
    const buffer = this.ctx!.createBuffer(1, size, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playBGM(level: number = 1): void {
    this.init();
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.currentLevel = level;
    this.chords = level === 4 ? this.chordsBoss : (level === 3 ? this.chordsL3 : (level === 2 ? this.chordsL2 : this.chordsL1));

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.currentChordIndex = 0;
    this.totalBeats = 0;

    // Trigger initial low string drone
    this.triggerCelloDrone();

    // Variable tempo intervals:
    // Level 1: 120 BPM -> 250ms
    // Level 2: 90 BPM -> 333ms (heavy industrial stomp)
    // Level 3: 200 BPM -> 150ms (ultra fast shmup)
    // Level 4: 187 BPM -> 160ms (hyper intense boss)
    const interval = this.currentLevel === 4 ? 160 : (this.currentLevel === 3 ? 150 : (this.currentLevel === 2 ? 333 : 250));

    // Start beat loop
    this.bgmTimer = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      const chord = this.chords[this.currentChordIndex];

      // Schedule drum components and piano notes on specific eighth-note subdivisions
      this.scheduleBGMStep(chord, this.totalBeats % 16);

      this.totalBeats++;

      // Change chords every 16 subdivisions
      if (this.totalBeats % 16 === 0) {
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
        this.triggerCelloDrone();
      }
    }, interval);
  }

  private scheduleBGMStep(chord: { drone: number; notes: number[] }, step: number): void {
    if (!this.ctx) return;

    if (this.currentLevel === 1) {
      // Level 1: Standard Gothic Platformer
      if (step === 0 || step === 8) {
        this.synthesizeBGMKick();
      }
      if (step === 4 || step === 12) {
        this.synthesizeBGMHiHat();
      } else if (step === 0 || step === 8 || step === 2 || step === 10) {
        this.synthesizeBGMShaker();
      }
      const melodyPattern = [
        -1,  0,  1, -1,  2, -1,  3,  1,
        -1,  4,  3, -1,  5,  2,  1, -1
      ];
      const noteIndex = melodyPattern[step];
      if (noteIndex !== -1) {
        this.synthesizeBGMPiano(chord.notes[noteIndex % chord.notes.length]);
      }
    } else if (this.currentLevel === 2) {
      // Level 2: Heavy Industrial Refinery (Four-on-the-floor kick, clangs, heavy synths)
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        this.synthesizeHeavyKick();
      }
      if (step === 4 || step === 12) {
        this.synthesizeIndustrialClang();
      }
      if (step % 2 === 1) {
        this.synthesizeBGMShaker();
      }
      const heavyPattern = [
        0, -1, 1, -1, 2, 1, -1, 0,
        3, -1, 2, -1, 4, 3, 1, -1
      ];
      const noteIndex = heavyPattern[step];
      if (noteIndex !== -1) {
        this.synthesizeHeavySynth(chord.notes[noteIndex % chord.notes.length]);
      }
    } else if (this.currentLevel === 3) {
      // Level 3: Fast energetic SHMUP (high tempo, offbeat hat, arpeggiated lead)
      if (step % 4 === 0 || step % 8 === 2) {
        this.synthesizeBGMKick();
      }
      if (step === 4 || step === 12) {
        this.synthesizeSHMUPSnare();
      }
      if (step % 2 === 1) {
        this.synthesizeBGMHiHat();
      }
      const fastPattern = [
        0, 1, 0, 2, 0, 3, 0, 4,
        0, 5, 0, 4, 3, 2, 1, 2
      ];
      const noteIndex = fastPattern[step];
      if (noteIndex !== -1) {
        this.synthesizeSHMUPSynth(chord.notes[noteIndex % chord.notes.length]);
      }
    } else if (this.currentLevel === 4) {
      // Level 4: Hyper intense mini-boss theme (Fast double kicks, snare rolls, rapid square synths)
      if (step % 2 === 0) {
        this.synthesizeHeavyKick();
      }
      if (step === 4 || step === 12 || step === 14) {
        this.synthesizeSHMUPSnare();
      }
      if (step % 2 === 1) {
        this.synthesizeBGMHiHat();
      }
      const bossPattern = [
        0, 3, 1, 4, 2, 5, 3, 4,
        0, 3, 1, 4, 2, 5, 4, 5
      ];
      const noteIndex = bossPattern[step];
      if (noteIndex !== -1) {
        this.synthesizeSHMUPSynth(chord.notes[noteIndex % chord.notes.length]);
      }
    }
  }

  private triggerCelloDrone(): void {
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freq = this.chords[this.currentChordIndex].drone;

    // Fade out active cellos
    this.currentDroneGains.forEach((active) => {
      active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
      active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      setTimeout(() => {
        active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
      }, 1600);
    });
    this.currentDroneGains = [];

    // Detuned sawtooth string ensemble
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.value = freq;
    osc1.detune.value = -10;

    osc2.frequency.value = freq;
    osc2.detune.value = 10;

    const stringFilter = this.ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    stringFilter.frequency.value = this.currentLevel === 3 ? 380 : (this.currentLevel === 2 ? 130 : 220); // Resonances

    droneGain.gain.setValueAtTime(0, t);
    droneGain.gain.linearRampToValueAtTime(0.12, t + 1.2); // 1.2s smooth attack

    osc1.connect(stringFilter);
    osc2.connect(stringFilter);
    stringFilter.connect(droneGain);
    droneGain.connect(this.bgmGainNode);

    osc1.start(t);
    osc2.start(t);

    this.currentDroneGains.push({
      gainNode: droneGain,
      oscillators: [osc1, osc2]
    });
  }

  private synthesizeBGMKick(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12); // Kick pitch drop

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15); // Quick decay

    osc.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  private synthesizeBGMHiHat(): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04); // Super sharp tick

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.05);
  }

  private synthesizeBGMShaker(): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.08);
  }

  private synthesizeBGMPiano(freq: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const oscTri = this.ctx.createOscillator();
    const oscSine = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscTri.type = 'triangle';
    oscSine.type = 'sine';

    oscTri.frequency.value = freq;
    oscSine.frequency.value = freq * 2; // high chime harmonic

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.6);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.006); // Plucky attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    oscTri.connect(filter);
    oscSine.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    oscTri.start(t);
    oscSine.start(t);

    oscTri.stop(t + 0.9);
    oscSine.stop(t + 0.9);
  }

  private synthesizeHeavyKick(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.22);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  private synthesizeIndustrialClang(): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 320;
    osc2.type = 'sawtooth';
    osc2.frequency.value = 475;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 600;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.bgmGainNode);

    osc1.start(t);
    osc2.start(t);
    noiseSource.start(t);

    osc1.stop(t + 0.25);
    osc2.stop(t + 0.25);
    noiseSource.stop(t + 0.2);
  }

  private synthesizeHeavySynth(freq: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const oscSaw = this.ctx.createOscillator();
    const oscSqu = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscSaw.type = 'sawtooth';
    oscSaw.frequency.value = freq * 0.5;
    oscSqu.type = 'square';
    oscSqu.frequency.value = freq * 0.5;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.3);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    oscSaw.connect(filter);
    oscSqu.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    oscSaw.start(t);
    oscSqu.start(t);
    oscSaw.stop(t + 0.45);
    oscSqu.stop(t + 0.45);
  }

  private synthesizeSHMUPSnare(): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    oscGain.gain.setValueAtTime(0.1, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.bgmGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.12);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private synthesizeSHMUPSynth(freq: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.18);
    filter.Q.value = 3.0;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGainNode);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public setBGMVolume(volume: number): void {
    this.init();
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(volume * this.bgmVolScale, this.ctx.currentTime);
    }
  }

  public update(playerX: number): void {
    // Dynamic BGM fade-out past x = 6500 (approaching the Dragon Core at 7478)
    if (playerX > 6500) {
      const fadeDist = 800;
      const multiplier = Math.max(0, 1 - (playerX - 6500) / fadeDist);
      this.setBGMVolume(multiplier * 0.35);
    } else {
      this.setBGMVolume(0.35);
    }

    // Smooth combat intensity lerp
    this.combatIntensity += (this.targetIntensity - this.combatIntensity) * 0.05;
    if (this.bgmGainNode && this.ctx) {
      const boost = 1 + this.combatIntensity * 0.3;
      this.bgmGainNode.gain.setValueAtTime(0.35 * this.bgmVolScale * boost, this.ctx.currentTime);
    }
  }

  public setCombatActive(active: boolean): void {
    this.targetIntensity = active ? 1 : 0;
    this.updateMusicFilter();
  }

  public setBossActive(active: boolean): void {
    this.targetIntensity = active ? 2 : (this.targetIntensity > 0 ? 1 : 0);
    this.updateMusicFilter();
  }

  public setDragonActive(active: boolean): void {
    this.dragonActive = active;
    this.updateMusicFilter();
  }

  private updateMusicFilter(): void {
    if (!this.bgmFilterNode || !this.ctx) return;
    const t = this.ctx.currentTime;

    if (this.targetIntensity >= 2) {
      // Boss: fully open, bright
      this.bgmFilterNode.frequency.setTargetAtTime(6000, t, 0.3);
      this.bgmFilterNode.Q.setTargetAtTime(0.3, t, 0.3);
    } else if (this.targetIntensity >= 1) {
      // Combat: open mid-highs
      this.bgmFilterNode.frequency.setTargetAtTime(3500, t, 0.5);
      this.bgmFilterNode.Q.setTargetAtTime(0.5, t, 0.5);
    } else if (this.dragonActive) {
      // Dragon: ethereal, slightly filtered with resonance
      this.bgmFilterNode.frequency.setTargetAtTime(2200, t, 0.8);
      this.bgmFilterNode.Q.setTargetAtTime(1.2, t, 0.8);
    } else {
      // Exploration: mellow, distant
      this.bgmFilterNode.frequency.setTargetAtTime(1400, t, 1.0);
      this.bgmFilterNode.Q.setTargetAtTime(0.7, t, 1.0);
    }
  }

  // ═══════════════════════════════════════
  //  SPATIAL AUDIO (pan by screen position)
  // ═══════════════════════════════════════

  public playSpatialSFX(
    playFn: (destination: AudioNode) => void,
    worldX: number,
    cameraScrollX: number,
    viewportWidth: number
  ): void {
    if (!this.ctx) {
      return;
    }

    const screenX = worldX - cameraScrollX;
    const pan = Phaser.Math.Clamp((screenX / viewportWidth) * 2 - 1, -1, 1);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.ctx.destination);

    playFn(panner);

    setTimeout(() => {
      try { panner.disconnect(); } catch (e) {}
    }, 200);
  }

  // ═══════════════════════════════════════
  //  SOUND EFFECTS (SFX) SYNTHESIS
  // ═══════════════════════════════════════

  public playJump(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(360, t + 0.15); // Rising jump sweep

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  public playLand(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1); // Deep land thud

    filter.type = 'lowpass';
    filter.frequency.value = 150;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playAttack(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // 1. Noise element for sword slash "swoosh"
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    // 2. Triangle wave for blade impact weight
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    oscGain.gain.setValueAtTime(0.1, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.16);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playHeavyAttack(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // Heavy Mecha slash
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.22);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 350;

    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(lowpass);
    lowpass.connect(oscGain);
    oscGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.24);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playFireball(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    // Warm base tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.26);

    oscGain.gain.setValueAtTime(0.08, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.32);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playDamage(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.18); // Grunt pitch fall

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 280;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.sfxGainNode);

    // Noise crack/impact
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 350;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.2);

    noiseSource.start(t);
    noiseSource.stop(t + 0.14);
  }

  public playEnemyHit(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2200; // High frequency metal clack/spark

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.06);
  }

  public playShieldBlock(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // 1. High resonant metallic clang (chime/bell element)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t); // High A pitch
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    // 2. High detuned ring modulator chime
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, t);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode);

    // 3. Short metallic spark noise burst
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4000;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    osc.start(t);
    osc2.start(t);
    noiseSource.start(t);

    osc.stop(t + 0.2);
    osc2.stop(t + 0.15);
    noiseSource.stop(t + 0.1);
  }

  public playEnemyDeath(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.35);

    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.38);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  public playDestruction(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.65);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  public playBushRustle(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 4; // Resonant grass swipe

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + 0.14);
  }

  public playCardCollect(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
    
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(this.echoNode); // Route to echo channel for magical shimmer

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  public playCoreCollect(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Resonant major chord swell (E major choir swell)
    const chord = [164.81, 246.94, 329.63, 392.00]; // E3, B3, E4, G4

    chord.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // Swell envelope: fades in slowly, then decays
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 1.8); // 1.8s swell
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.6);

      osc.connect(gain);
      gain.connect(this.echoNode);

      osc.start(t);
      osc.stop(t + 2.7);
    });

    // 2. High sparkle chime sweep starting at 1.0s
    const sparkleNotes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
    sparkleNotes.forEach((freq, idx) => {
      const noteTime = t + 1.0 + idx * 0.15;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.echoNode);

      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });
  }

  public playTransform(): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    // Power surge sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.8);

    const dist = this.ctx.createWaveShaper();
    const makeDistortionCurve = (amount = 30) => {
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    };
    dist.curve = makeDistortionCurve(15);
    dist.oversample = '4x';

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(dist);
    dist.connect(gain);
    gain.connect(this.sfxGainNode);

    // Noise rushing wind swell
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(100, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, t + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.25, t + 0.4);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.82);

    noiseSource.start(t);
    noiseSource.stop(t + 0.82);
  }

  public playRevert(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.4); // Downward energy drop

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  public playDeathTheme(): void {
    this.stopBGM();
    this.init();
    if (!this.ctx) return;
    this.isPlaying = true;

    // Tragic A-minor progression
    const deathChords = [
      { drone: 55.00, notes: [110.00, 130.81, 164.81, 220.00, 261.63, 329.63] }, // Am
      { drone: 43.65, notes: [87.31, 110.00, 130.81, 174.61, 220.00, 349.23] },  // F
      { drone: 36.71, notes: [73.42, 87.31, 110.00, 146.83, 174.61, 293.66] },   // Dm
      { drone: 41.20, notes: [82.41, 103.83, 123.47, 146.83, 164.81, 329.63] }  // E7
    ];

    let localChordIndex = 0;
    let localBeats = 0;

    const triggerDeathCello = (freq: number) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.value = freq;
      osc1.detune.value = -12;
      osc2.frequency.value = freq;
      osc2.detune.value = 12;

      const stringFilter = this.ctx.createBiquadFilter();
      stringFilter.type = 'lowpass';
      stringFilter.frequency.value = 140; // Extremely dark and heavy cello drone

      droneGain.gain.setValueAtTime(0, t);
      droneGain.gain.linearRampToValueAtTime(0.18, t + 1.5); // Slow tragic attack

      osc1.connect(stringFilter);
      osc2.connect(stringFilter);
      stringFilter.connect(droneGain);
      droneGain.connect(this.bgmGainNode);

      osc1.start(t);
      osc2.start(t);

      this.currentDroneGains.push({
        gainNode: droneGain,
        oscillators: [osc1, osc2]
      });
    };

    const playDeathPianoNote = (freq: number) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 2;

      noteGain.gain.setValueAtTime(0, t);
      noteGain.gain.linearRampToValueAtTime(0.20, t + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5); // Cathedral decay

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.echoNode);
      noteGain.connect(this.bgmGainNode);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 2.6);
      osc2.stop(t + 2.6);
    };

    const playWindSwell = () => {
      if (!this.ctx || !this.noiseBuffer) return;
      const t = this.ctx.currentTime;

      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.0;
      filter.frequency.setValueAtTime(100, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + 3.0);
      filter.frequency.exponentialRampToValueAtTime(100, t + 6.0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 3.0);
      gain.gain.linearRampToValueAtTime(0.001, t + 6.0);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGainNode);

      source.start(t);
      source.stop(t + 6.0);
    };

    triggerDeathCello(deathChords[0].drone);
    playWindSwell();

    this.bgmTimer = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      const chord = deathChords[localChordIndex];
      const pattern = [0, 2, 4, 1, 3, 5, -1, -1];
      const noteIdx = pattern[localBeats % 8];

      if (noteIdx !== -1) {
        playDeathPianoNote(chord.notes[noteIdx % chord.notes.length]);
      }

      localBeats++;

      if (localBeats % 8 === 0) {
        localChordIndex = (localChordIndex + 1) % deathChords.length;
        
        const t = this.ctx.currentTime;
        this.currentDroneGains.forEach((active) => {
          active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
          active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
          setTimeout(() => {
            active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
          }, 1300);
        });
        this.currentDroneGains = [];

        triggerDeathCello(deathChords[localChordIndex].drone);
        if (Math.random() < 0.5) {
          playWindSwell();
        }
      }
    }, 600);
  }

  public playCoreShatter(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(1800, t);
    osc1.frequency.exponentialRampToValueAtTime(2500, t + 0.35);

    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'highpass';
    filter1.frequency.value = 1500;

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.sfxGainNode);

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3000;
      noiseFilter.Q.value = 2.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGainNode);

      noise.start(t);
      noise.stop(t + 0.5);
    }

    const oscBoom = this.ctx.createOscillator();
    const gainBoom = this.ctx.createGain();

    oscBoom.type = 'sine';
    oscBoom.frequency.setValueAtTime(180, t);
    oscBoom.frequency.exponentialRampToValueAtTime(40, t + 0.6);

    gainBoom.gain.setValueAtTime(0.4, t);
    gainBoom.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    oscBoom.connect(gainBoom);
    gainBoom.connect(this.sfxGainNode);

    osc1.start(t);
    osc1.stop(t + 0.38);

    oscBoom.start(t);
    oscBoom.stop(t + 0.62);
  }

  public playLightningStrike(): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const oscElec = this.ctx.createOscillator();
    const gainElec = this.ctx.createGain();

    oscElec.type = 'triangle';
    oscElec.frequency.setValueAtTime(200, t);
    oscElec.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
    oscElec.frequency.exponentialRampToValueAtTime(100, t + 0.25);

    gainElec.gain.setValueAtTime(0, t);
    gainElec.gain.linearRampToValueAtTime(0.65, t + 0.01);
    gainElec.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    const waveshaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(44100);
    const deg = Math.PI / 180;
    const k = 65;
    for (let i = 0; i < 44100; ++i) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '4x';

    oscElec.connect(waveshaper);
    waveshaper.connect(gainElec);
    gainElec.connect(this.sfxGainNode);

    if (this.noiseBuffer) {
      const thunderSource = this.ctx.createBufferSource();
      thunderSource.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, t);
      filter.frequency.linearRampToValueAtTime(240, t + 0.05);
      filter.frequency.exponentialRampToValueAtTime(35, t + 1.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.75, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

      thunderSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGainNode);

      thunderSource.start(t);
      thunderSource.stop(t + 2.0);
    }

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.8);

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.85, t + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGainNode);

    oscElec.start(t);
    oscElec.stop(t + 0.32);

    subOsc.start(t);
    subOsc.stop(t + 0.82);
  }

  // ═══════════════════════════════════════
  //  AMBIENT ZONE LOOPS
  // ═══════════════════════════════════════

  private ambientNodes: { gainNode: GainNode; oscillators: OscillatorNode[]; noiseSource?: AudioBufferSourceNode; filter?: BiquadFilterNode }[] = [];
  private ambientPlaying = false;

  public playAmbientZone(zone: number): void {
    this.init();
    if (!this.ctx || this.ambientPlaying) return;
    this.ambientPlaying = true;
    const t = this.ctx.currentTime;

    if (zone === 1) {
      this.startForestAmbient(t);
    } else if (zone === 2) {
      this.startRefineryAmbient(t);
    } else if (zone === 3) {
      this.startGorgeAmbient(t);
    }
  }

  private startForestAmbient(t: number): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 300;
    windFilter.Q.value = 0.5;

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, t);
    windGain.gain.linearRampToValueAtTime(0.06, t + 2);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.sfxGainNode);
    windSource.start(t);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    lfo.start(t);

    this.ambientNodes.push({
      gainNode: windGain,
      oscillators: [lfo],
      noiseSource: windSource,
      filter: windFilter,
    });
  }

  private startRefineryAmbient(t: number): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const machineSource = ctx.createBufferSource();
    machineSource.buffer = this.noiseBuffer;
    machineSource.loop = true;

    const machineFilter = ctx.createBiquadFilter();
    machineFilter.type = 'lowpass';
    machineFilter.frequency.value = 200;
    machineFilter.Q.value = 1.5;

    const machineGain = ctx.createGain();
    machineGain.gain.setValueAtTime(0, t);
    machineGain.gain.linearRampToValueAtTime(0.08, t + 1.5);

    machineSource.connect(machineFilter);
    machineFilter.connect(machineGain);
    machineGain.connect(this.sfxGainNode);
    machineSource.start(t);

    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 1.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(machineFilter.frequency);
    lfo.start(t);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 42;
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0, t);
    thumpGain.gain.linearRampToValueAtTime(0.04, t + 1.5);
    thump.connect(thumpGain);
    thumpGain.connect(this.sfxGainNode);
    thump.start(t);

    this.ambientNodes.push({
      gainNode: machineGain,
      oscillators: [lfo, thump],
      noiseSource: machineSource,
      filter: machineFilter,
    });
  }

  private startGorgeAmbient(t: number): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'highpass';
    windFilter.frequency.value = 400;
    windFilter.Q.value = 0.3;

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, t);
    windGain.gain.linearRampToValueAtTime(0.1, t + 2);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.sfxGainNode);
    windSource.start(t);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    lfo.start(t);

    this.ambientNodes.push({
      gainNode: windGain,
      oscillators: [lfo],
      noiseSource: windSource,
      filter: windFilter,
    });
  }

  public stopAmbient(): void {
    if (!this.ctx) return;
    this.ambientPlaying = false;
    const t = this.ctx.currentTime;

    this.ambientNodes.forEach((node) => {
      try {
        node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, t);
        node.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        setTimeout(() => {
          node.oscillators.forEach((osc) => { try { osc.stop(); } catch (e) {} });
          try { if (node.noiseSource) node.noiseSource.stop(); } catch (e) {}
        }, 1100);
      } catch (e) {}
    });
    this.ambientNodes = [];
  }

  // ═══════════════════════════════════════
  //  FOOTSTEP SFX
  // ═══════════════════════════════════════

  public playFootstep(surface: 'stone' | 'metal' | 'ash' = 'stone', heavy = false): void {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const ctx = this.ctx;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';

    if (surface === 'stone') {
      filter.frequency.setValueAtTime(heavy ? 600 : 900, t);
      filter.frequency.exponentialRampToValueAtTime(heavy ? 200 : 350, t + (heavy ? 0.12 : 0.08));
      filter.Q.value = 1.8;
    } else if (surface === 'metal') {
      filter.frequency.setValueAtTime(heavy ? 1200 : 2000, t);
      filter.frequency.exponentialRampToValueAtTime(heavy ? 300 : 600, t + (heavy ? 0.1 : 0.06));
      filter.Q.value = 3.5;
    } else {
      filter.frequency.setValueAtTime(heavy ? 300 : 500, t);
      filter.frequency.exponentialRampToValueAtTime(heavy ? 80 : 150, t + (heavy ? 0.15 : 0.1));
      filter.Q.value = 1.2;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(heavy ? 0.18 : 0.08, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.15 : 0.1));

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    noiseSource.start(t);
    noiseSource.stop(t + (heavy ? 0.16 : 0.11));
  }

  public stopBGM(): void {
    this.isPlaying = false;

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.currentDroneGains.forEach((active) => {
        try {
          active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
          active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          setTimeout(() => {
            active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
          }, 450);
        } catch (e) {}
      });
      this.currentDroneGains = [];
    }
  }

  private choirGains: { gainNode: GainNode; oscillators: OscillatorNode[]; filters?: BiquadFilterNode[]; lfo?: OscillatorNode }[] = [];

  public playChoirSave(): void {
    this.init();
    if (!this.ctx) return;

    // Stop normal BGM first
    this.stopBGM();

    const t = this.ctx.currentTime;
    // Rich detuned A-minor cathedral chords (Low A, C, E, G#, high notes)
    const notes = [110.00, 130.81, 164.81, 207.65, 261.63, 329.63];

    // Create LFO for slow vocal vowel sweeping (vowel chanting "Ooo-Ah-Ooo")
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // 6.7s full modulation cycle

    notes.forEach((freq) => {
      const oscillators: OscillatorNode[] = [];
      
      // Detuned sawtooth oscillators for rich choir ensemble
      [-5, -2, 0, 2, 5].forEach((detune) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        oscillators.push(osc);
      });

      // Formant filters to shape vocal vowel resonances ("Ah" / "Oh" / "Oo")
      const bp1 = this.ctx!.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.value = 550; // "Ah" center
      bp1.Q.value = 4.0;

      const bp2 = this.ctx!.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.value = 850; // higher overtone
      bp2.Q.value = 3.5;

      const lp = this.ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1000; // cut harshness

      // Connect LFO to modulate bandpass filter center frequencies
      const lfoGain1 = this.ctx!.createGain();
      lfoGain1.gain.value = 150; // sweeps bp1 freq by +/- 150Hz (400Hz to 700Hz)
      lfo.connect(lfoGain1);
      lfoGain1.connect(bp1.frequency);

      const lfoGain2 = this.ctx!.createGain();
      lfoGain2.gain.value = 250; // sweeps bp2 freq by +/- 250Hz (600Hz to 1100Hz)
      lfo.connect(lfoGain2);
      lfoGain2.connect(bp2.frequency);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, t);
      // Haunting cathedral volume swell
      gain.gain.linearRampToValueAtTime(0.09 / notes.length, t + 1.5);

      oscillators.forEach((osc) => {
        const oscGain1 = this.ctx!.createGain();
        oscGain1.gain.value = 0.65;
        osc.connect(oscGain1);
        oscGain1.connect(bp1);

        const oscGain2 = this.ctx!.createGain();
        oscGain2.gain.value = 0.35;
        osc.connect(oscGain2);
        oscGain2.connect(bp2);
      });

      bp1.connect(lp);
      bp2.connect(lp);
      lp.connect(gain);
      
      // Connect to master BGM channel AND echo delay line for massive reverb reflections
      gain.connect(this.bgmGainNode);
      gain.connect(this.echoNode);

      oscillators.forEach(osc => osc.start(t));

      this.choirGains.push({
        gainNode: gain,
        oscillators: oscillators,
        filters: [bp1, bp2, lp],
        lfo: lfo
      });
    });

    // Start vowel LFO sweep
    lfo.start(t);

    // Deep cathedral organ sub-bass pedals (Low A1 + D2)
    [55.00, 73.42].forEach((freq) => {
      const subOsc = this.ctx!.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = freq;
      
      const subGain = this.ctx!.createGain();
      subGain.gain.setValueAtTime(0, t);
      subGain.gain.linearRampToValueAtTime(0.06, t + 1.5);
      
      subOsc.connect(subGain);
      subGain.connect(this.bgmGainNode);
      subOsc.start(t);

      this.choirGains.push({
        gainNode: subGain,
        oscillators: [subOsc]
      });
    });
  }

  public stopChoirSave(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    this.choirGains.forEach((active) => {
      try {
        active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
        active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        setTimeout(() => {
          active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
          if (active.lfo) { try { active.lfo.stop(); } catch(e) {} }
        }, 550);
      } catch (e) {}
    });

    this.choirGains = [];
  }
}
