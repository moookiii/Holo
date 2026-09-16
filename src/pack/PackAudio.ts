import { randomSequence } from './PackDefinition';
import { clamp } from './PackMath';

export type PackSound = 'handle' | 'wrinkle' | 'tension' | 'tear-start' | 'tear' | 'strip' | 'open' | 'slide' | 'card' | 'reveal' | 'hit' | 'summary';
/** Synthesized Foley: seeded noise grains, band resonances and short envelopes.
 * Each cue is replaceable by a recorded layer without changing interaction code. */
export class PackAudio {
  private context?: AudioContext;
  private noise?: AudioBuffer;
  private master?: GainNode;
  private last = new Map<PackSound, number>();
  muted = false;
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : .5; this.master.connect(this.context.destination);
      this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const data = this.noise.getChannelData(0), random = randomSequence(1741); let previous = 0;
      for (let i = 0; i < data.length; i++) { const n = random() * 2 - 1; data[i] = n - previous * .65; previous = n; }
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }
  setMuted(value: boolean) { this.muted = value; if (this.master && this.context) this.master.gain.setTargetAtTime(value ? 0 : .5, this.context.currentTime, .025); }
  play(cue: PackSound, speed = .5, pan = 0) {
    const ctx = this.context; if (!ctx || ctx.state !== 'running' || !this.noise || !this.master || this.muted) return;
    const now = ctx.currentTime, continuous = ['handle', 'wrinkle', 'tension', 'tear', 'slide', 'card'].includes(cue);
    if (now - (this.last.get(cue) ?? -10) < (continuous ? .055 : .16)) return;
    this.last.set(cue, now); speed = clamp(speed, .05, 1);
    const configurations: Record<PackSound, [number, number, number, number]> = {
      handle: [.08, 2600, .025, 1.8], wrinkle: [.06, 3300, .032, 2.1], tension: [.12, 1200, .022, 3],
      'tear-start': [.16, 4200, .085, 1.2], tear: [.1, 3700, .064, 1.3], strip: [.13, 2000, .035, .8],
      open: [.24, 2400, .05, 1.1], slide: [.1, 1600, .028, .7], card: [.09, 1100, .026, .8],
      reveal: [.19, 1500, .042, 1], hit: [.5, 740, .055, .7], summary: [.26, 1200, .035, .8],
    };
    const [duration, frequency, level, q] = configurations[cue];
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain(), stereo = ctx.createStereoPanner();
    source.buffer = this.noise; source.playbackRate.value = .82 + speed * .35;
    filter.type = 'bandpass'; filter.frequency.value = frequency * (.8 + speed * .4); filter.Q.value = q;
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(level * (.25 + speed * .75), now + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    stereo.pan.value = clamp(pan, -1, 1);
    source.connect(filter).connect(envelope).connect(stereo).connect(this.master);
    source.start(now, (now * .137) % .5); source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); stereo.disconnect(); };
    if (cue === 'hit' || cue === 'summary') {
      const tone = ctx.createOscillator(), gain = ctx.createGain(); tone.type = 'sine';
      tone.frequency.setValueAtTime(cue === 'hit' ? 164.81 : 220, now); tone.frequency.exponentialRampToValueAtTime(82.4, now + .9);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.027, now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
      tone.connect(gain).connect(this.master); tone.start(now); tone.stop(now + 1.2); tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    }
  }
  dispose() { void this.context?.close(); }
}
