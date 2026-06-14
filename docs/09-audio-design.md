# DRAKHART — Audio Design

## Audio Direction

The soundscape of DRAKHART fuses three distinct audio identities — one per form — unified by a dark, orchestral-industrial aesthetic.

### Musical References

| Reference | Application |
|-----------|------------|
| **Draconus (Atari 8-bit)** | Moody, minimalist — the isolation of a lone warrior |
| **Escaflowne OST (Yoko Kanno)** | Orchestral grandeur, Gregorian chants, mechanical rhythms |
| **R-Type (arcade)** | Driving, urgent — the pressure of forced scroll |
| **MechWarrior 2 (PC)** | Industrial ambient, metallic percussion, computer voice warnings |

## Music System

### Dynamic Music Layers

Instead of separate tracks per zone, music is built from **layers** that fade in/out based on game state:

| Layer | Content | Active When |
|-------|---------|------------|
| **Ambient base** | Dark drones, wind, distant thunder | Always |
| **Percussion** | Industrial beats, metallic hits | Combat engaged |
| **Strings** | Orchestral swells, tension | Boss fights, scripted moments |
| **Choir** | Gregorian/Tibetan chants | Dragon form, sacred areas |
| **Synth arpeggios** | Electronic sequences | Mecha form, Imperial areas |

### Zone-Specific Music Variations

| Zone | Character | Reference |
|------|-----------|-----------|
| Ashen Forest | Sparse, ambient, lonely | Draconus title theme meets Dark Souls ambient |
| Iron Bastion | Industrial, percussive, mechanical | MechWarrior 2 meets NIN |
| Storm Gorge | Urgent, driving, synth-heavy | R-Type Stage 1 meets Carpenter Brut |
| Crystal Mines | Deep, resonant, echoing | Hollow Knight Crystal Peak |
| Sky Temple | Sacred, choral, ethereal | Escaflowne "Dance of Curse" |
| The Core | Aggressive, layered, chaotic | All layers simultaneously |

### Transformation Stingers

Each transformation triggers a short musical sting (~2 seconds) that bridges the music change:
- **Human → Mecha**: Metal impact + power-up swell
- **Mecha → Dragon**: Wing unfurl + orchestral crescendo
- **Dragon → Exhausted**: Power-down whine + strings fade

### Boss Music

Each boss has a dedicated track that intensifies per phase:
- **Phase 1**: Theme introduced, moderate tempo
- **Phase 2**: Added percussion/layers, faster tempo
- **Phase 3 (desperation)**: Full orchestration, maximal intensity

## Sound Effects

### Human Form

| Action | SFX Description | Character |
|--------|----------------|-----------|
| Footsteps | Light footfalls on stone, varied per surface | Subtle, rhythmic |
| Jump | Light whoosh + cloth rustle | Agile, quick |
| Sword slash | High-pitched metal ring + air slice | Sharp, clean |
| Sword hit | Metallic clang + spark | Impactful |
| Land | Soft thud | Grounded |
| Take damage | Grunt + armor rattle | Painful, brief |

### Mecha Form

| Action | SFX Description | Character |
|--------|----------------|-----------|
| Footsteps | Heavy, metallic stomps | Weighty, slow |
| Jump | Hydraulic burst + metal strain | Powerful, heavy |
| Hover | Continuous low hum + energy crackle | Mechanical |
| Claymore slash | Deep metal impact + bass thud | Devastating |
| Claymore hit | Crushing sound + debris | Brutal |
| Heat warning | Rising alarm beep (faster as heat increases) | Tense |
| Shutdown | Alarm → silence → power-down whine | Dramatic |
| Reactivate | Power-up sequence + system chime | Relieving |

### Dragon Form

| Action | SFX Description | Character |
|--------|----------------|-----------|
| Wing flap | Deep, leathery whoosh | Organic + mechanical |
| Fire breath | Rushing flames + crackle | Intense |
| Fire hit | Sizzle + explosion | Fiery |
| Energy low | Fading hum, heartbeat slows | Warning |
| Flight wind | Continuous rushing air | Speed |

### UI & World

| Event | SFX |
|-------|-----|
| Collect Dragon Core | Orchestral sting + heartbeat + power-up chime |
| Collect Tarot Card | Whispered arcana name + card flip + chime |
| Boss intro | Dramatic sting + boss roar |
| Boss phase transition | Explosion + music shift |
| Boss defeated | Victory fanfare + explosion decay |
| Checkpoint (Altar of Rest) | Soft chime + ambient glow |
| Barricade destroyed | Crumbling stone + metal collapse |
| Menu select | Click |
| Menu confirm | Deeper click |

## Implementation

### Current (Prototype Phase)

- **No audio implemented yet.** All systems are visual-only.
- Audio will be added in Beta phase using Phaser's SoundManager.

### Planned Implementation

```typescript
// AudioManager singleton pattern
class AudioManager {
  private scene: Phaser.Scene;
  private musicLayers: Map<string, Phaser.Sound.BaseSound>;
  private sfxPool: Map<string, Phaser.Sound.BaseSound>;
  
  playMusic(zone: Zone): void;
  fadeMusicLayer(layer: string, targetVolume: number, duration: number): void;
  playTransformSting(from: FormState, to: FormState): void;
  playSFX(key: string, config?: SoundConfig): void;
  setMasterVolume(volume: number): void;
}
```

### Audio File Format

- **Music**: OGG Vorbis (streaming, 128kbps)
- **SFX**: OGG Vorbis (loaded, 96kbps) or WAV for short sounds
- **Fallback**: MP3 for wider browser support

### Placeholder Audio (Prototype)

During the prototype phase, placeholder audio can be generated procedurally using the Web Audio API:
- Oscillator-based tones for SFX (sword = high frequency burst, claymore = low frequency burst)
- Noise-based for ambient (wind, crackle)
- Simple arpeggios for music stings

This allows testing audio timing and feel before commissioning real audio assets.
