export class TitleAudio {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private masterFilter!: BiquadFilterNode;
  private delayNode!: DelayNode;
  private delayGain!: GainNode;
  private masterGain!: GainNode;
  private bgmVolScale = 1.0;

  // Active drone sound nodes for cross-fading
  private currentDroneGains: { gainNode: GainNode; oscillators: OscillatorNode[] }[] = [];

  // Loop timers
  private melodyTimer: any = null;
  private droneTimer: any = null;

  // Cinematic progression (Am -> F -> Dm -> E7)
  private chords = [
    // Am: A2 drone (110.00Hz), arpeggio: A3 (220.00Hz), C4 (261.63Hz), E4 (329.63Hz), A4 (440.00Hz)
    { drone: 110.00, notes: [220.00, 261.63, 329.63, 440.00, 523.25, 659.25] },
    // F: F2 drone (87.31Hz), arpeggio: A3 (220.00Hz), C4 (261.63Hz), F4 (349.23Hz), A4 (440.00Hz)
    { drone: 87.31,  notes: [220.00, 261.63, 349.23, 440.00, 523.25, 698.46] },
    // Dm: D2 drone (73.42Hz), arpeggio: A3 (220.00Hz), D4 (293.66Hz), F4 (349.23Hz), A4 (440.00Hz)
    { drone: 73.42,  notes: [220.00, 293.66, 349.23, 440.00, 587.33, 698.46] },
    // E7: E2 drone (82.41Hz), arpeggio: G#3 (207.65Hz), B3 (246.94Hz), E4 (329.63Hz), G#4 (415.30Hz)
    { drone: 82.41,  notes: [207.65, 246.94, 329.63, 415.30, 493.88, 659.25] }
  ];
  private currentChordIndex = 0;
  private melodyStep = 0;

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

    // 1. Create Master low-pass filter (for underwater sweep transition)
    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 2400; // bright and clear by default
    this.masterFilter.Q.value = 1.0;

    // 2. Create Reverb / Delay feedback line for spacious atmosphere
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.55; // 550ms delay intervals

    this.delayGain = ctx.createGain();
    this.delayGain.gain.value = 0.45; // 45% feedback

    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 750; // soft and dark echoes

    // Connect feedback loop: delay -> filter -> feedback gain -> delay input
    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);

    const savedBgm = typeof localStorage !== 'undefined' ? localStorage.getItem('drakhart_bgm') : null;
    this.bgmVolScale = savedBgm !== null ? parseFloat(savedBgm) : 1.0;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.35 * this.bgmVolScale;

    // 3. Connect nodes: masterFilter -> masterGain + delayNode -> masterGain -> destination
    this.masterFilter.connect(this.masterGain);
    this.masterFilter.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  public play(): void {
    this.init();
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Set filter back to default bright setting
    this.masterFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

    this.currentChordIndex = 0;
    this.melodyStep = 0;

    // Trigger initial cello drone chord
    this.triggerNextDrone();

    // Start piano melody and drone progression loop (chord change every 9.6 seconds)
    let beatTime = 400; // 400ms per note (150 BPM)
    let chordBeats = 24; // 24 beats per chord (9.6s)

    let totalBeats = 0;

    this.melodyTimer = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      const chord = this.chords[this.currentChordIndex];
      
      // Play a piano note on specific beats to create a melancholic arpeggiated motif
      this.playPianoStep(chord.notes, totalBeats % chordBeats);

      totalBeats++;

      // Change chord every 24 beats (9.6s)
      if (totalBeats % chordBeats === 0) {
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
        this.triggerNextDrone();
      }
    }, beatTime);
  }

  private triggerNextDrone(): void {
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const nextFreq = this.chords[this.currentChordIndex].drone;

    // Fade out previous drones
    this.currentDroneGains.forEach((active) => {
      active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
      active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.0); // cross-fade duration: 2s
      setTimeout(() => {
        active.oscillators.forEach(osc => {
          try { osc.stop(); } catch(e) {}
        });
      }, 2100);
    });
    this.currentDroneGains = [];

    // Create detuned double-sawtooth cello string voice for the new chord
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Detune oscillators slightly to create a warm, thick chorus ensemble
    osc1.frequency.value = nextFreq;
    osc1.detune.value = -8; // -8 cents detuned

    osc2.frequency.value = nextFreq;
    osc2.detune.value = 8;  // +8 cents detuned

    // String lowpass filter to remove harsh sawtooth buzz (making it cello-like)
    const stringFilter = this.ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    stringFilter.frequency.value = 280; // warm string resonance

    // Slow attack volume envelope
    droneGain.gain.setValueAtTime(0, t);
    droneGain.gain.linearRampToValueAtTime(0.16, t + 2.0); // 2s attack fade-in

    // Connect string nodes to master filter path
    osc1.connect(stringFilter);
    osc2.connect(stringFilter);
    stringFilter.connect(droneGain);
    droneGain.connect(this.masterFilter);

    // Start oscillators
    osc1.start(t);
    osc2.start(t);

    // Save active nodes to handle next cross-fade
    this.currentDroneGains.push({
      gainNode: droneGain,
      oscillators: [osc1, osc2]
    });
  }

  private playPianoStep(notes: number[], beatInChord: number): void {
    if (!this.ctx) return;

    // Arpeggiated melody sequence definition over the 24 beats
    // We play notes on specific beats and rest on others
    const melodyPattern = [
      0, 1, 2, 4, 3, 2,  // bar 1 arpeggio
      5, 4, 3, 2, 1, 0,  // bar 2 descending
      2, -1, 3, -1, 4, -1, // bar 3 syncopated
      5, 4, 3, 2, -1, -1 // bar 4 resolution
    ];

    const noteIndex = melodyPattern[beatInChord % melodyPattern.length];
    if (noteIndex === -1) return; // rest beat

    const freq = notes[noteIndex % notes.length];
    const t = this.ctx.currentTime;

    // Create piano voice nodes
    const oscTri = this.ctx.createOscillator();
    const oscSine = this.ctx.createOscillator();
    const pianoGain = this.ctx.createGain();

    oscTri.type = 'triangle'; // fundamental warm body
    oscSine.type = 'sine';     // high harmonic chime

    oscTri.frequency.value = freq;
    oscSine.frequency.value = freq * 2; // double frequency (one octave up) for shine

    // Piano dampening dynamic filter (harmonics fade out rapidly)
    const pianoFilter = this.ctx.createBiquadFilter();
    pianoFilter.type = 'lowpass';
    pianoFilter.frequency.setValueAtTime(1400, t);
    pianoFilter.frequency.exponentialRampToValueAtTime(250, t + 0.9);

    // Piano envelope: immediate attack, exponential decay
    pianoGain.gain.setValueAtTime(0, t);
    pianoGain.gain.linearRampToValueAtTime(0.24, t + 0.008); // 8ms fast attack
    pianoGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);  // 1.8s decay release

    // Connect node chain: oscillators -> filter -> envelope gain -> masterFilter
    oscTri.connect(pianoFilter);
    oscSine.connect(pianoFilter);
    pianoFilter.connect(pianoGain);
    pianoGain.connect(this.masterFilter);

    // Start synth voices
    oscTri.start(t);
    oscSine.start(t);

    // Stop nodes after decay completes to free resources
    oscTri.stop(t + 2.0);
    oscSine.stop(t + 2.0);
  }

  public triggerFilterSweep(): void {
    if (!this.ctx || !this.isPlaying) return;

    const t = this.ctx.currentTime;
    
    // Sweep the master filter down exponentially to create an "underwater/sinking" cinematic effect
    this.masterFilter.frequency.setValueAtTime(this.masterFilter.frequency.value, t);
    this.masterFilter.frequency.exponentialRampToValueAtTime(40, t + 1.2); // sweep down to 40Hz in 1.2s

    // Sub-bass drop transition boom effect
    this.playBassDrop();
  }

  private playBassDrop(): void {
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    const dist = this.ctx.createWaveShaper();

    osc.type = 'sine';
    
    // Descending frequency sweep (whoosh/rumble)
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.4); // 1.4s sweep down to sub-bass

    // Distortion shaper to make the bass rumble crunchy and heavy
    const makeDistortionCurve = (amount = 20) => {
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
    dist.curve = makeDistortionCurve(10);
    dist.oversample = '4x';

    // Volume envelope
    boomGain.gain.setValueAtTime(0, t);
    boomGain.gain.linearRampToValueAtTime(0.65, t + 0.01); // fast impact attack
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6); // 1.6s long sub rumble decay

    // Connect: osc -> dist -> gain -> masterGain
    osc.connect(dist);
    dist.connect(boomGain);
    boomGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.8);
  }

  public setVolume(volume: number): void {
    this.bgmVolScale = volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0.35 * this.bgmVolScale, this.ctx.currentTime);
    }
  }

  public stop(): void {
    this.isPlaying = false;

    if (this.melodyTimer) {
      clearInterval(this.melodyTimer);
      this.melodyTimer = null;
    }

    // Fade out and stop string oscillators
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.currentDroneGains.forEach((active) => {
        try {
          active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, t);
          active.gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          setTimeout(() => {
            active.oscillators.forEach(osc => { try { osc.stop(); } catch(e) {} });
          }, 500);
        } catch (e) {}
      });
      this.currentDroneGains = [];
    }
  }
}
