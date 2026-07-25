type SoundName = 'tap' | 'place' | 'pulse' | 'cryo' | 'impact' | 'break' | 'leak' | 'victory';

interface Tone {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  endFrequency?: number;
}

const tones: Record<SoundName, Tone> = {
  tap: { frequency: 460, duration: 0.045, type: 'sine', volume: 0.025 },
  place: { frequency: 260, endFrequency: 680, duration: 0.12, type: 'triangle', volume: 0.045 },
  pulse: { frequency: 760, endFrequency: 310, duration: 0.07, type: 'square', volume: 0.025 },
  cryo: { frequency: 980, endFrequency: 520, duration: 0.16, type: 'sine', volume: 0.035 },
  impact: { frequency: 150, duration: 0.055, type: 'sawtooth', volume: 0.02 },
  break: { frequency: 210, endFrequency: 80, duration: 0.18, type: 'sawtooth', volume: 0.04 },
  leak: { frequency: 115, endFrequency: 70, duration: 0.28, type: 'square', volume: 0.04 },
  victory: { frequency: 520, endFrequency: 1040, duration: 0.42, type: 'triangle', volume: 0.05 },
};

export class SoundService {
  private context?: AudioContext;
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  unlock(): void {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;

    const tone = tones[name];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, now);
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, now + tone.duration);
    }

    gain.gain.setValueAtTime(tone.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.duration);
  }
}
