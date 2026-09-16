import { Quaternion, type PerspectiveCamera, type Scene } from 'three/webgpu';
import { CardMotion } from '../input/Motion';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardFactory } from '../card/CardFactory';
import type { CardInstance } from '../card/CardInstance';
import type { StudioLighting } from '../lighting/StudioLighting';
import { framingDistance } from '../camera/Framing';
import { PackOpeningState } from './PackOpeningState';
import { resolvePackContents, type PackDefinition, type PackCard } from './PackDefinition';
import { PackWrapper } from './wrapper/PackWrapper';
import { PackScene, type PackPose } from './PackScene';
import { PackCameraRig } from './PackCameraRig';
import { PackInteraction, type PackPointer } from './PackInteraction';
import { PackAudio } from './PackAudio';
import { PackLighting } from './PackLighting';
import { PackUI } from './PackUI';
import { clamp, ease, orientation, Spring } from './PackMath';

export type DebugPackStage = 'intro' | 'sealed' | 'gripped' | 'tear' | 'open' | 'extract' | 'stack' | 'reveal' | 'hit' | 'summary';
interface PackDependencies {
  factory: CardFactory; definitions: CardDefinition[]; scene: Scene; camera: PerspectiveCamera; lighting: StudioLighting;
  element: HTMLElement; signal: AbortSignal; close: () => void; inspect: (card: CardInstance) => void;
  progress?: (ready: number, total: number) => void;
}
export class PackOpeningController {
  readonly state = new PackOpeningState();
  readonly audio = new PackAudio();
  readonly presentation: PackScene;
  readonly camera: PackCameraRig;
  private lights: PackLighting;
  private interaction: PackInteraction;
  private ui: PackUI;
  private tear = new Spring(0, 0, 30);
  private mouth = new Spring(0, 0, 22);
  private extract = new Spring(0, 0, 18);
  private reveal = new Spring(0, 0, 16);
  private grip = new Spring(0, 0, 22);
  private settle = 0;
  private release = 0;
  private active = 0;
  private revealed = false;
  private hover = -1;
  private selected = -1;
  private start?: PackPointer;
  private dragBase = 0;
  private handling = false;
  private packMotion = new CardMotion('rotate');
  private previousPointer?: PackPointer;
  private dragDistance = 0;
  private pointerX = new Spring();
  private pointerY = new Spring();
  private frozen = false;
  private disposed = false;
  private media = matchMedia('(prefers-reduced-motion: reduce)');
  private inspectionComplete = false;
  private constructor(readonly definition: PackDefinition, readonly contents: PackCard[], cards: CardInstance[], wrapper: PackWrapper, private deps: PackDependencies, seed: number) {
    this.presentation = new PackScene(cards, wrapper, deps.scene, seed);
    this.camera = new PackCameraRig(deps.camera); this.camera.begin();
    this.lights = new PackLighting(deps.lighting, deps.scene);
    this.interaction = new PackInteraction(deps.element, deps.camera, this.presentation, { down: p => this.down(p), move: (p, held) => this.move(p, held), up: cancel => this.up(cancel) });
    this.ui = new PackUI(definition.name, deps.close, () => this.advance(), () => { void this.audio.unlock(); this.audio.setMuted(!this.audio.muted); return this.audio.muted; }, direction => {
      if (this.state.value === 'PackSummary') { this.frozen = false; this.hover = (Math.max(0, this.hover) + direction + this.contents.length) % this.contents.length; }
    });
  }
  static async create(definition: PackDefinition, seed: number, deps: PackDependencies) {
    const contents = resolvePackContents(definition, seed);
    const definitions = contents.map(entry => { const card = deps.definitions.find(c => c.id === entry.cardId); if (!card) throw new Error(`Unknown pack card: ${entry.cardId}`); return card; });
    const total = definitions.length * 2 + 2;
    let ready = 0; deps.progress?.(0, total);
    // Prepare card assets concurrently, but defer GPU compilation until the shared
    // renderer has one card at a time. Parallel compileAsync calls contend for the
    // same shader compiler and are slower on WebGPU and fallback backends.
    const results = await Promise.allSettled([PackWrapper.create(definition, deps.factory.assets).then(wrapper => {
      deps.progress?.(++ready, total); return wrapper;
    }), ...definitions.map(async card => {
      const instance = await deps.factory.create(card, deps.signal, false); deps.progress?.(++ready, total); return instance;
    })]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure || deps.signal.aborted) {
      results.forEach(result => { if (result.status === 'fulfilled') result.value.dispose(); });
      if (failure?.status === 'rejected') throw failure.reason;
      deps.signal.throwIfAborted();
    }
    const wrapper = (results[0] as PromiseFulfilledResult<PackWrapper>).value;
    const cards = results.slice(1).map(result => (result as PromiseFulfilledResult<CardInstance>).value);
    try {
      for (const card of cards) {
        deps.signal.throwIfAborted();
        await deps.factory.compile(card.mesh);
        deps.progress?.(++ready, total);
      }
      await deps.factory.compile(wrapper.root); deps.signal.throwIfAborted(); deps.progress?.(++ready, total);
    } catch (error) { wrapper.dispose(); cards.forEach(card => card.dispose()); throw error; }
    return new PackOpeningController(definition, contents, cards, wrapper, deps, seed);
  }
  private down(p: PackPointer) {
    this.frozen = false; void this.audio.unlock(); this.start = this.previousPointer = p; this.dragDistance = 0;
    if (this.state.value === 'PackReady' || this.state.value === 'Grip' || this.state.value === 'Tear') {
      if (p.local && p.local.y > this.presentation.wrapper.tearHeight - .55) {
        if (this.state.value === 'PackReady') this.state.transition('Grip');
        this.packMotion.reset();
        this.grip.target = 1; this.dragBase = this.tear.target; this.audio.play('tension', .6);
      } else if (p.local) { this.handling = true; this.packMotion.halt(); this.packMotion.dragging = true; this.audio.play('handle', .3); }
      else this.start = undefined;
    } else if (this.state.value === 'OpenWrapper') { if (p.local) this.dragBase = this.mouth.target; else this.start = undefined; }
    else if (this.state.value === 'ExtractStack') { if (p.card >= 0 || p.local) this.dragBase = this.extract.target; else this.start = undefined; }
    else if (this.state.value === 'RevealCard' || this.state.value === 'HitReveal') {
      if (p.card !== this.active) { this.start = undefined; return; }
      if (this.revealed) this.next();
      this.dragBase = 0;
    } else if (this.state.value === 'PackSummary' && p.card >= 0) this.inspect(p.card);
  }
  private move(p: PackPointer, held: boolean) {
    if (this.disposed) return;
    if (!held) {
      if (this.state.value === 'PackSummary' && this.hover !== p.card) { this.frozen = false; this.hover = p.card; }
      const object = p.local || p.card >= 0;
      this.deps.element.style.cursor = object ? 'grab' : 'default';
      return;
    }
    if (!this.start) return;
    this.deps.element.style.cursor = 'grabbing';
    const dx = p.x - this.start.x, dy = p.y - this.start.y;
    this.dragDistance = Math.max(this.dragDistance, Math.hypot(dx, dy));
    if (this.handling) {
      if (this.previousPointer) this.packMotion.applyRotation(new Quaternion().setFromUnitVectors(this.previousPointer.ball, p.ball), clamp((p.time - this.previousPointer.time) / 1000, .001, .05));
      this.previousPointer = p;
      this.audio.play('handle', (Math.abs(dx) + Math.abs(dy)) * .15); return;
    }
    if (this.state.value === 'Grip' && dx > .1) { this.state.transition('Tear'); this.audio.play('tear-start', .8, -.5); }
    if (this.state.value === 'Tear') {
      const old = this.tear.target; this.tear.target = Math.max(old, clamp(this.dragBase + dx / 6.3));
      this.audio.play('tear', (this.tear.target - old) * 24, this.tear.target * 1.4 - .7);
    } else if (this.state.value === 'OpenWrapper') {
      this.mouth.target = clamp(this.dragBase - dy / 2); this.audio.play('wrinkle', Math.abs(dy) * .4);
    } else if (this.state.value === 'ExtractStack') {
      const old = this.extract.target; this.extract.target = clamp(this.dragBase + dy / 7.4);
      this.audio.play('slide', Math.abs(this.extract.target - old) * 28);
    } else if (this.state.value === 'RevealCard' && !this.revealed) {
      this.reveal.target = clamp(dy / 3.4); this.audio.play('card', Math.abs(dy) * .2);
    }
  }
  private up(cancel: boolean) {
    if (this.state.value === 'Grip') this.state.transition('PackReady');
    if (this.state.value === 'RevealCard' && !this.revealed) this.reveal.target = !cancel && this.start && (this.dragDistance < .10 || this.reveal.target > .52) ? 1 : 0;
    this.packMotion.dragging = false; if (cancel || this.media.matches) this.packMotion.velocity.set(0, 0, 0);
    this.grip.target = 0; this.pointerX.target = 0; this.pointerY.target = 0; this.handling = false; this.start = undefined;
  }
  advance() {
    if (this.disposed) return;
    void this.audio.unlock(); this.frozen = false;
    switch (this.state.value) {
      case 'PackReady': this.packMotion.reset(); this.state.transition('Grip');
      // Accessible equivalent follows the same springs and state boundaries.
      case 'Grip': this.state.transition('Tear'); this.audio.play('tear-start');
      case 'Tear': this.tear.target = 1; break;
      case 'OpenWrapper': this.mouth.target = 1; this.audio.play('open'); break;
      case 'ExtractStack': this.extract.target = 1; this.audio.play('slide'); break;
      case 'RevealCard': if (this.revealed) this.next(); else this.reveal.target = 1; break;
      case 'HitReveal': if (this.state.elapsed > (this.media.matches ? .4 : 1.8)) this.next(); break;
      case 'PackSummary': this.inspect(this.hover >= 0 ? this.hover : this.contents.length - 1); break;
    }
  }
  private next() {
    if (this.state.value === 'HitReveal' && this.state.elapsed < (this.media.matches ? .4 : 1.8)) return;
    if (this.active >= this.contents.length - 1) { this.state.transition('PackSummary'); this.audio.play('summary'); this.hover = -1; }
    else { this.active++; this.reveal.snap(0); this.revealed = false; this.state.transition('RevealCard'); }
  }
  private inspect(index: number) {
    this.selected = index; this.presentation.beginInspect(index); this.state.transition('Inspect'); this.audio.play('card');
  }
  update(delta: number, force = false) {
    if (this.disposed) return;
    const dt = this.frozen ? 0 : clamp(delta, 0, .06), reduced = this.media.matches;
    const duration = reduced ? .35 : 1.25;
    this.state.elapsed += dt;
    this.packMotion.update(dt); this.presentation.root.quaternion.copy(this.packMotion.orientation);
    [this.tear, this.mouth, this.extract, this.reveal, this.grip, this.pointerX, this.pointerY].forEach(spring => spring.step(dt));
    if (!this.frozen) {
      if (this.state.value === 'PackIntro' && this.state.elapsed > duration) this.state.transition('PackReady');
      if (this.state.value === 'Tear' && this.tear.value > .998) { this.tear.snap(1); this.grip.target = 0; this.state.transition('OpenWrapper'); this.audio.play('strip'); this.start = undefined; }
      if (this.tear.value === 1) this.release = clamp(this.release + dt / (reduced ? .3 : 1.1));
      if (this.state.value === 'OpenWrapper' && this.mouth.value > .998) { this.mouth.snap(1); this.state.transition('ExtractStack'); this.start = undefined; }
      if (this.state.value === 'ExtractStack' && this.extract.value > .998) {
        this.extract.snap(1); this.settle = clamp(this.settle + dt / duration);
        if (this.settle === 1) this.state.transition('RevealCard');
      }
      if (this.state.value === 'RevealCard' && this.reveal.value > .998 && !this.revealed) {
        this.reveal.snap(1); this.revealed = true;
        if (this.contents[this.active].reveal === 'studio-sweep') { this.state.transition('HitReveal'); this.audio.play('hit', .7); }
        else this.audio.play('reveal', .5);
      }
    }
    const state = this.state.value, portrait = this.deps.camera.aspect < .85;
    const hit = state === 'HitReveal' ? clamp(this.state.elapsed / (reduced ? .45 : 2.4)) : 0;
    const inspect = state === 'Inspect' ? clamp(this.state.elapsed / (reduced ? .4 : 1.3)) : 0;
    const pose: PackPose = { state, intro: state === 'PackIntro' ? this.state.elapsed / duration : 1,
      tear: this.tear.value, mouth: this.mouth.value, extract: this.extract.value, settle: ease(this.settle), reveal: this.reveal.value,
      active: this.active, hit, hover: this.hover, selected: this.selected, inspect, grip: this.grip.value,
      tension: this.tear.velocity, release: ease(this.release), pointerX: this.pointerX.value, pointerY: this.pointerY.value };
    this.presentation.update(pose, dt, portrait, reduced, force);
    if (state === 'PackSummary') this.camera.frame(portrait ? 10.5 : this.contents.length * 3.35 + 5, portrait ? 18 : 11, -.4, 0, 3.5);
    else if (state === 'Inspect') {
      const card = this.presentation.cards[this.selected];
      this.camera.viewer(framingDistance(card.definition.dimensions, orientation(-.10, .025), this.deps.camera.aspect, this.deps.camera.fov, innerHeight));
    } else if (state === 'RevealCard' || state === 'HitReveal') this.camera.frame(8, state === 'HitReveal' ? 9.7 : 10.3, .1, 0, 1.6);
    else this.camera.frame(9.8, 13 + 10.9 * this.extract.value * (1 - ease(this.settle)), this.extract.value * (this.extract.value - .45) * .9 * (1 - ease(this.settle)), 0, 1);
    this.camera.update(dt, force, reduced);
    this.lights.update(state === 'HitReveal' ? ease(clamp(this.state.elapsed / .5)) : 0, hit, inspect);
    const titleIndex = state === 'PackSummary' ? this.hover : state === 'Inspect' ? this.selected : this.revealed ? this.active : -1;
    this.ui.update(state, this.active, this.contents.length, this.revealed, titleIndex >= 0 ? this.presentation.cards[titleIndex].definition.title : '', state === 'HitReveal' && this.state.elapsed < (reduced ? .4 : 1.8));
    if (state === 'Inspect' && inspect === 1 && !this.inspectionComplete) {
      this.inspectionComplete = true;
      // Snap the last subpixel of settling before transferring the same mesh.
      this.presentation.update(pose, 0, portrait, reduced, true); this.camera.update(0, true);
      this.deps.inspect(this.presentation.take(this.selected));
    }
  }
  setStage(stage: DebugPackStage, progress = 0) {
    this.frozen = true; this.start = undefined; this.handling = false;
    this.packMotion.setPose(0, 0); this.packMotion.dragging = false;
    this.tear.snap(0); this.mouth.snap(0); this.extract.snap(0); this.reveal.snap(0); this.grip.snap(0); this.pointerX.snap(0); this.pointerY.snap(0);
    this.active = 0; this.revealed = false; this.settle = 0; this.release = 0; this.hover = -1;
    const afterTear = ['open', 'extract', 'stack', 'reveal', 'hit', 'summary'].includes(stage);
    if (afterTear) { this.tear.snap(1); this.release = 1; }
    if (['extract', 'stack', 'reveal', 'hit', 'summary'].includes(stage)) this.mouth.snap(1);
    if (['stack', 'reveal', 'hit', 'summary'].includes(stage)) { this.extract.snap(1); this.settle = 1; }
    switch (stage) {
      case 'intro': this.state.set('PackIntro'); this.state.elapsed = clamp(progress) * (this.media.matches ? .35 : 1.25); break;
      case 'sealed': this.state.set('PackReady'); break;
      case 'gripped': this.state.set('Grip'); this.grip.snap(1); break;
      case 'tear': this.state.set('Tear'); this.tear.snap(clamp(progress)); this.grip.snap(progress < 1 ? 1 : 0); this.release = progress === 1 ? .18 : 0; break;
      case 'open': this.state.set('OpenWrapper'); this.mouth.snap(clamp(progress)); break;
      case 'extract': this.state.set('ExtractStack'); this.extract.snap(clamp(progress)); break;
      case 'stack': this.state.set('RevealCard'); break;
      case 'reveal': this.state.set('RevealCard'); this.active = clamp(Math.floor(progress), 0, this.contents.length - 1); this.reveal.snap(1); this.revealed = true; break;
      case 'hit': this.state.set('HitReveal'); this.active = Math.max(0, this.contents.findIndex(c => c.reveal === 'studio-sweep')); this.reveal.snap(1); this.revealed = true; this.state.elapsed = clamp(progress) * (this.media.matches ? .45 : 2.4); break;
      case 'summary': this.state.set('PackSummary'); this.active = this.contents.length - 1; this.reveal.snap(1); this.revealed = true; break;
    }
    this.update(0, true);
  }
  select(index: number) { this.hover = clamp(index, 0, this.contents.length - 1); this.update(0, true); }
  setRevealProgress(progress: number) { this.state.set('RevealCard'); this.frozen = true; this.revealed = false; this.reveal.snap(clamp(progress)); this.update(0, true); }
  pose(yaw: number, pitch = 0, roll = 0) { this.packMotion.setPose(yaw * Math.PI / 180, pitch * Math.PI / 180, roll * Math.PI / 180); this.update(0, true); }
  stats() { return { state: this.state.value, elapsed: this.state.elapsed, frozen: this.frozen, cardCount: this.contents.length, active: this.active, revealed: this.revealed,
    tear: this.tear.value, mouth: this.mouth.value, extract: this.extract.value, reveal: this.reveal.value, reducedMotion: this.media.matches,
    history: [...this.state.history], orientation: this.packMotion.orientation.toArray(), cardIds: this.presentation.cards.map(card => card.definition.id), meshIds: this.presentation.cards.map(card => card.mesh.uuid) }; }
  dispose(except?: CardInstance) {
    if (this.disposed) return; this.disposed = true;
    this.interaction.dispose(); this.ui.dispose(); this.audio.dispose(); this.lights.restore();
    if (!except) this.camera.restore(); this.presentation.dispose(except);
  }
}
