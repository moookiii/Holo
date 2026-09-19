export type PackAudioGroup = 'master' | 'wrapper' | 'tear' | 'cards';
export type PackAudioCue = 'crinkle' | 'tension' | 'tearStart' | 'tearFinish' | 'stripRelease' | 'extract' | 'cardSlide' | 'cardSettle';

const assetBase = import.meta.env?.BASE_URL ?? '/';
const asset = (name: string) => `${assetBase}audio/pack/${name}.wav`;
const numbered = (name: string, count: number) => Array.from({ length: count }, (_, index) => asset(`${name}_${String(index + 1).padStart(2, '0')}`));
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const PACK_AUDIO_MANIFEST: Readonly<Record<PackAudioCue, readonly string[]>> = {
  crinkle: numbered('wrapper_crinkle', 8),
  tension: numbered('wrapper_tension', 4),
  tearStart: numbered('tear_start', 4),
  tearFinish: numbered('tear_finish', 2),
  stripRelease: numbered('strip_release', 3),
  extract: numbered('cards_extract', 3),
  cardSlide: numbered('card_slide', 4),
  cardSettle: numbered('card_settle', 4),
};

interface CueMix { group: Exclude<PackAudioGroup, 'master'>; level: number; cooldown: number; rateVariation: number; gainVariation: number; maxDuration: number; }
const cueMix: Record<PackAudioCue, CueMix> = {
  crinkle: { group: 'wrapper', level: .38, cooldown: .085, rateVariation: .04, gainVariation: .04, maxDuration: .22 },
  tension: { group: 'wrapper', level: .34, cooldown: .30, rateVariation: .025, gainVariation: .035, maxDuration: .28 },
  tearStart: { group: 'tear', level: .62, cooldown: .25, rateVariation: .025, gainVariation: .025, maxDuration: .36 },
  tearFinish: { group: 'tear', level: .67, cooldown: .25, rateVariation: .02, gainVariation: .02, maxDuration: .32 },
  // The release recording is intentionally capped to the strip's visible
  // travel; a longer tail makes the wrapper sound as if it is still moving.
  stripRelease: { group: 'tear', level: .58, cooldown: .25, rateVariation: .025, gainVariation: .025, maxDuration: .3 },
  extract: { group: 'cards', level: .66, cooldown: .25, rateVariation: .025, gainVariation: .03, maxDuration: .5 },
  cardSlide: { group: 'cards', level: .44, cooldown: .18, rateVariation: .03, gainVariation: .03, maxDuration: .4 },
  cardSettle: { group: 'cards', level: .32, cooldown: .18, rateVariation: .025, gainVariation: .025, maxDuration: .32 },
};

/** Chooses a random recording without immediately repeating the previous one. */
export class AudioVariantPool {
  private previous = -1;
  readonly urls: readonly string[];
  constructor(urls: readonly string[]) {
    if (!urls.length) throw new Error('An audio variant pool cannot be empty.');
    this.urls = urls;
  }
  next(random = Math.random) {
    let index = Math.floor(random() * this.urls.length);
    if (this.urls.length > 1 && index === this.previous) index = (index + 1 + Math.floor(random() * (this.urls.length - 1))) % this.urls.length;
    this.previous = index;
    return this.urls[index];
  }
}

/** One cache and context are shared across pack sessions, so reopening never refetches or decodes a recording. */
export class AudioBufferCache {
  private buffers = new Map<string, Promise<AudioBuffer>>();
  load(context: AudioContext, url: string) {
    let pending = this.buffers.get(url);
    if (!pending) {
      pending = fetch(url).then(response => {
        if (!response.ok) throw new Error(`Unable to load pack sound: ${url} (${response.status})`);
        return response.arrayBuffer();
      }).then(data => context.decodeAudioData(data));
      this.buffers.set(url, pending);
    }
    return pending;
  }
  preload(context: AudioContext, urls: readonly string[]) { return Promise.all(urls.map(url => this.load(context, url))).then(() => undefined); }
}

class PackAudioEngine {
  readonly cache = new AudioBufferCache();
  private context?: AudioContext;
  getContext() { return this.context ??= new AudioContext({ latencyHint: 'interactive' }); }
}
const engine = new PackAudioEngine();

/** Recorded, interaction-driven Foley for one pack-opening session. */
export class PackAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private limiter?: DynamicsCompressorNode;
  private groups = new Map<Exclude<PackAudioGroup, 'master'>, GainNode>();
  private pools = new Map<PackAudioCue, AudioVariantPool>();
  private lastPlayed = new Map<PackAudioCue, number>();
  private playCounts = new Map<PackAudioCue, number>();
  private active = new Set<AudioBufferSourceNode>();
  private activeCrinkles = new Map<AudioBufferSourceNode, GainNode>();
  private prepared?: Promise<void>;
  private disposed = false;
  private tearStarted = false;
  private tearFinished = false;
  private stripReleased = false;
  muted = false;

  constructor() {
    for (const [cue, urls] of Object.entries(PACK_AUDIO_MANIFEST) as [PackAudioCue, readonly string[]][]) this.pools.set(cue, new AudioVariantPool(urls));
  }

  prepare() {
    if (this.prepared) return this.prepared;
    const context = this.context = engine.getContext();
    this.master = context.createGain();
    this.master.gain.value = .72;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -9; this.limiter.knee.value = 8; this.limiter.ratio.value = 8;
    this.limiter.attack.value = .003; this.limiter.release.value = .12;
    this.master.connect(this.limiter).connect(context.destination);
    const levels: Record<Exclude<PackAudioGroup, 'master'>, number> = { wrapper: .72, tear: .82, cards: .74 };
    for (const group of ['wrapper', 'tear', 'cards'] as const) {
      const gain = context.createGain(); gain.gain.value = levels[group]; gain.connect(this.master); this.groups.set(group, gain);
    }
    this.prepared = engine.cache.preload(context, Object.values(PACK_AUDIO_MANIFEST).flat());
    return this.prepared;
  }

  async unlock() {
    await this.prepare();
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (this.master && this.context) this.master.gain.setTargetAtTime(value ? 0 : .72, this.context.currentTime, .025);
  }

  setGain(group: PackAudioGroup, value: number) {
    const node = group === 'master' ? this.master : this.groups.get(group);
    if (node && this.context) node.gain.setTargetAtTime(clamp(value, 0, 1.5), this.context.currentTime, .025);
  }

  stats() {
    return {
      contextState: this.context?.state ?? 'uninitialized',
      prepared: Boolean(this.prepared), muted: this.muted, activeSources: this.active.size,
      playCounts: Object.fromEntries((Object.keys(PACK_AUDIO_MANIFEST) as PackAudioCue[]).map(cue => [cue, this.playCounts.get(cue) ?? 0])),
    };
  }

  playCrinkle(intensity = .5) { this.play('crinkle', intensity); }
  fadeCrinkles(duration = .07) {
    const context = this.context;
    if (!context) return;
    const end = context.currentTime + clamp(duration, .025, .2);
    for (const [source, gain] of this.activeCrinkles) {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, end);
      try { source.stop(end + .01); } catch { /* already stopped */ }
    }
  }
  playTension(intensity = .5) { if (intensity >= .18) this.play('tension', intensity); }
  playTearStart(intensity = .7) { if (!this.tearStarted) { this.tearStarted = true; this.play('tearStart', intensity); } }
  playTearFinish(intensity = .8) { if (this.tearStarted && !this.tearFinished) { this.tearFinished = true; this.play('tearFinish', intensity); } }
  playStripRelease(intensity = .7) { if (this.tearFinished && !this.stripReleased) { this.stripReleased = true; this.play('stripRelease', intensity, .035); } }
  playExtract(intensity = .6) { this.play('extract', intensity); }
  playCardSlide(intensity = .55) { this.play('cardSlide', intensity); }
  playCardSettle(intensity = .45) { this.play('cardSettle', intensity); }

  private play(cue: PackAudioCue, intensity: number, delay = 0) {
    const context = this.context, mix = cueMix[cue], group = this.groups.get(mix.group);
    if (!context || !group || this.muted || this.disposed) return;
    const start = () => {
      if (this.disposed || this.muted || context.state !== 'running') return;
      const now = context.currentTime;
      if (now - (this.lastPlayed.get(cue) ?? -Infinity) < mix.cooldown) return;
      this.lastPlayed.set(cue, now);
      const url = this.pools.get(cue)!.next();
      void engine.cache.load(context, url).then(buffer => {
        if (!this.master || this.muted || this.disposed) return;
        const source = context.createBufferSource(), gain = context.createGain();
        const strength = clamp(intensity, .05, 1);
        source.buffer = buffer;
        source.playbackRate.value = 1 + (Math.random() * 2 - 1) * mix.rateVariation;
        gain.gain.value = mix.level * (.22 + strength * .78) * (1 + (Math.random() * 2 - 1) * mix.gainVariation);
        source.connect(gain).connect(group); this.active.add(source);
        if (cue === 'crinkle') this.activeCrinkles.set(source, gain);
        const startTime = context.currentTime + delay;
        source.start(startTime);
        // Foley clips are allowed to overlap during motion, but never outlive
        // the physical gesture they represent. This is especially important
        // for the torn strip release, which immediately transitions to opening.
        try { source.stop(startTime + mix.maxDuration); } catch { /* already scheduled */ }
        this.playCounts.set(cue, (this.playCounts.get(cue) ?? 0) + 1);
        source.onended = () => { this.active.delete(source); this.activeCrinkles.delete(source); source.disconnect(); gain.disconnect(); };
      });
    };
    if (context.state === 'suspended') void context.resume().then(start); else start();
  }

  dispose() {
    this.disposed = true;
    for (const source of this.active) { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); }
    this.active.clear(); this.activeCrinkles.clear(); this.groups.forEach(group => group.disconnect()); this.groups.clear();
    this.master?.disconnect(); this.limiter?.disconnect(); this.master = undefined; this.limiter = undefined;
  }
}
