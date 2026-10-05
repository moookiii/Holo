import './binder.css';
import { Raycaster, Vector2, Vector3, type PerspectiveCamera, type Scene } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardFactory } from '../card/CardFactory';
import type { CardCpuPreparation, PreparedCardCpu } from '../card/CardCpuPreparation';
import type { StudioLighting } from '../lighting/StudioLighting';
import { galleryLightingControls } from '../gallery/GalleryLighting';
import { BinderScene } from './BinderScene';
import { binderArtwork } from './BinderArtwork';
import { BINDER, BinderNavigation, binderCount, spreadFaces, spreadIndices, faceHeight } from './BinderLayout';

interface Options {
  scene: Scene; camera: PerspectiveCamera; cpu: CardCpuPreparation; lighting: StudioLighting;
  factory: () => CardFactory; open: (id: string) => Promise<void>; exit: () => void; toggle: (id: string) => void;
}
interface Drag { mode: 'page' | 'orbit' | 'inside'; side?: -1 | 1; x: number; y: number; startX: number; startY: number; span: number; moved: boolean; time: number; progress: number; }
export class FavoritesBinder {
  readonly root = document.createElement('section');
  readonly navigation = new BinderNavigation();
  private stage = document.createElement('div');
  private status = document.createElement('p');
  private selector = document.createElement('select');
  private buttons = new Map<string, HTMLButtonElement>();
  private refreshLight: () => void;
  private physical = new BinderScene();
  private factory?: CardFactory;
  private request?: AbortController;
  private job?: Promise<void>;
  private cards: CardDefinition[] = [];
  private loaded = new Set<string>();
  private failed = new Set<string>();
  private pending = false;
  private opening = false;
  private settledAt = 0;
  private revision = 0;
  private queuedRevision = -1;
  private lightingBase?: { position: Vector3; width: number; height: number };
  private abort = new AbortController();
  private tilt = { x: -.065, y: 0, targetX: -.065, targetY: 0 };
  private drag?: Drag;
  private ray = new Raycaster();
  private savedCamera?: { position: Vector3; far: number };
  private warming = false;
  active = false;
  constructor(private options: Options) {
    this.root.className = 'favorites-binder'; this.root.hidden = true; this.root.setAttribute('aria-label', 'Favorites card binder');
    const header = document.createElement('header'); header.className = 'binder-header';
    const title = document.createElement('div'); title.innerHTML = '<span class="binder-eyebrow">PRIVATE COLLECTION</span><h1>Favorites</h1>';
    const exit = document.createElement('button'); exit.textContent = '← Gallery'; exit.onclick = () => { void this.exit(); };
    const light = document.createElement('div'); light.className = 'gallery-light binder-light';
    this.refreshLight = galleryLightingControls(light, options.lighting);
    this.selector.setAttribute('aria-label', 'Select favorites binder'); this.selector.className = 'binder-selector';
    this.selector.onchange = () => { void this.selectBinder(Number(this.selector.value)); };
    header.append(title, this.selector, light, exit);
    this.stage.className = 'binder-stage'; this.stage.tabIndex = 0;
    this.stage.setAttribute('aria-label', 'Grab a page to turn it. Drag outside the binder to rotate. Click a card to inspect.');
    this.status.className = 'binder-status'; this.status.setAttribute('role', 'status');
    this.root.append(header, this.stage, this.status); document.body.append(this.root);
    this.physical.group.visible = false; options.scene.add(this.physical.group);
    const signal = this.abort.signal;
    this.stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || this.busy()) return;
      const side = this.pageHit(e.clientX, e.clientY);
      const inside = !!side || this.ray.intersectObjects(this.physical.group.children, true).some(hit => hit.object.visible && hit.object.parent?.visible);
      const center = new Vector3(0, 0, 0).applyMatrix4(this.physical.group.matrixWorld).project(options.camera);
      const spineX = (center.x + 1) * innerWidth / 2;
      this.drag = { mode: side ? 'page' : inside ? 'inside' : 'orbit', side, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
        span: Math.max(120, Math.abs(e.clientX - spineX)), moved: false, time: performance.now(), progress: 0 };
      this.stage.setPointerCapture(e.pointerId);
    }, { signal });
    this.stage.addEventListener('pointermove', e => {
      const drag = this.drag;
      if (!drag) {
        this.stage.classList.toggle('is-page-edge', !this.busy() && !!this.pageHit(e.clientX, e.clientY)); return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6) drag.moved = true;
      if (drag.mode === 'page' && drag.moved && !this.navigation.turn && drag.side) { this.navigation.begin(drag.side, true); this.updateControls(); }
      if (drag.mode === 'page' && this.navigation.turn) {
        const p = Math.max(0, Math.min(1, (drag.startX - e.clientX) * this.navigation.turn.direction / (drag.span * 2)));
        const now = performance.now(), velocity = (p - drag.progress) / Math.max(.016, (now - drag.time) / 1000);
        this.navigation.drag(p, velocity); drag.progress = p; drag.time = now;
      } else if (drag.mode === 'orbit' && drag.moved) {
        this.tilt.targetX = Math.max(-.27, Math.min(.09, this.tilt.targetX + dy * .0015));
        this.tilt.targetY = Math.max(-.16, Math.min(.16, this.tilt.targetY + dx * .0012));
      }
      drag.x = e.clientX; drag.y = e.clientY;
    }, { signal });
    this.stage.addEventListener('pointerup', e => {
      const drag = this.drag; this.drag = undefined;
      if (this.stage.hasPointerCapture(e.pointerId)) this.stage.releasePointerCapture(e.pointerId);
      if (!drag) return;
      if (drag.mode === 'page' && drag.moved) { this.navigation.release(); return; }
      if (drag.moved || this.busy()) return;
      const button = [...this.buttons.values()].find(b => { const r = b.getBoundingClientRect(); return !b.hidden && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
      if (button) { if (e.shiftKey) options.toggle(button.dataset.cardId!); else void this.inspect(button.dataset.cardId!); }
    }, { signal });
    const cancel = () => { if (this.drag?.mode === 'page') this.navigation.release(true); this.drag = undefined; };
    this.stage.addEventListener('pointercancel', cancel, { signal }); window.addEventListener('blur', cancel, { signal });
    this.stage.addEventListener('wheel', e => e.preventDefault(), { passive: false, signal });
    this.root.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).matches('input, select')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.turn(e.key === 'ArrowLeft' ? -1 : 1); }
      if (e.key === 'Escape') { if (this.navigation.turn?.dragging) cancel(); else if (!this.opening) void this.exit(); }
    }, { signal });
  }
  private busy() { return this.pending || this.opening || !!this.navigation.turn; }
  private indices(spread = this.navigation.spread) { return spreadIndices(spread, this.cards.length, this.navigation.binder); }
  private face(index: number) { return Math.floor((index - this.navigation.binder * BINDER.capacity) / 12); }
  private windowSpreads() { const s = this.navigation.spread; return [s, s + 1, s - 1].filter(n => n >= 0 && n <= 20); }
  private pageHit(x: number, y: number): -1 | 1 | undefined {
    this.ray.setFromCamera(new Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.options.camera);
    for (const face of spreadFaces(this.navigation.spread)) {
      const page = this.physical.pages.get(face); if (!page) continue;
      const hit = this.ray.intersectObject(page.hitMesh, false)[0];
      if (hit) return page.side;
    }
    return undefined;
  }
  get canWarm() { return !this.active && !this.factory && !this.job; }
  /** Prepare only the opening spread while the gallery is idle. */
  warm(cards: CardDefinition[]) {
    if (this.active || this.warming || this.job || !cards.length) return;
    this.warming = true;
    this.cards = cards; this.navigation.setCount(cards.length);
    this.factory ??= this.options.factory();
    this.reconcile(); this.queuePreparation();
  }
  show(cards: CardDefinition[]) {
    const changed = this.cards.length > 0 && (this.cards.length !== cards.length || this.cards.some((card, i) => card !== cards[i]));
    this.warming = false;
    this.active = true; this.pending = false;
    this.root.hidden = false; this.physical.group.visible = true; this.status.textContent = '';
    this.savedCamera = { position: this.options.camera.position.clone(), far: this.options.camera.far };
    this.options.camera.far = 250; this.options.camera.updateProjectionMatrix();
    this.factory ??= this.options.factory(); this.refreshLight();
    if (changed) void this.replaceCollection(cards);
    else {
      this.cards = cards; this.navigation.setCount(cards.length);
      this.reconcile(); this.queuePreparation();
    }
    this.stage.focus({ preventScroll: true });
  }
  refresh(cards: CardDefinition[]) { void this.replaceCollection(cards); }
  private async replaceCollection(cards: CardDefinition[], binder?: number) {
    const revision = ++this.revision; this.pending = true; this.updateControls();
    await this.suspendPreparation();
    if (!this.active || revision !== this.revision) return;
    this.physical.retain(new Set()); this.loaded.clear(); this.failed.clear(); this.cards = cards;
    this.navigation.setCount(cards.length); if (binder !== undefined) this.navigation.selectBinder(binder);
    this.status.textContent = ''; this.pending = false; this.reconcile(); this.queuePreparation();
  }
  async selectBinder(binder: number) { if (!this.busy()) await this.replaceCollection(this.cards, binder); }
  private reconcile() {
    const keep = new Set(this.windowSpreads().flatMap(spreadFaces)); this.physical.retain(keep);
    for (const key of this.loaded) if (!keep.has(Number(key.split(':')[0]))) this.loaded.delete(key);
    for (const key of this.failed) if (!keep.has(Number(key.split(':')[0]))) this.failed.delete(key);
    for (const face of keep) this.physical.page(face);
    const visible = new Set(spreadFaces(this.navigation.spread));
    for (const [index, page] of this.physical.pages) { page.group.visible = visible.has(index); page.pose(); }
    this.physical.stack(this.navigation.spread);
    const ids = new Set(this.indices().map(i => this.cards[i].id));
    for (const [id, button] of this.buttons) if (!ids.has(id)) { button.remove(); this.buttons.delete(id); }
    for (const i of this.indices()) {
      const card = this.cards[i]; if (this.buttons.has(card.id)) continue;
      const button = document.createElement('button'); button.className = 'binder-card'; button.dataset.cardId = card.id;
      button.setAttribute('aria-label', `Inspect ${card.title}, ${card.number}. Shift + click to unfavorite.`); button.title = `${card.title} · ${card.number}`;
      button.onclick = e => { if (this.busy()) return; if (e.shiftKey) this.options.toggle(card.id); else void this.inspect(card.id); };
      this.stage.append(button); this.buttons.set(card.id, button);
    }
    this.updateControls();
  }
  private updateControls() {
    const n = this.navigation;
    if (this.selector.options.length !== binderCount(this.cards.length)) this.selector.replaceChildren(...Array.from({ length: binderCount(this.cards.length) }, (_, i) => new Option(`Binder ${i + 1} of ${binderCount(this.cards.length)}`, String(i))));
    this.selector.value = String(n.binder); this.selector.disabled = this.busy() || this.selector.options.length === 1;
    this.root.setAttribute('aria-busy', String(this.pending || this.opening));
  }
  private queuePreparation() {
    const revision = ++this.revision; this.queuedRevision = revision; this.request?.abort();
    void (async () => {
      await this.job;
      if (!(this.active || this.warming) || !this.factory || this.pending || this.opening || this.queuedRevision !== revision) return;
      const request = new AbortController(), domain = this.factory; this.request = request;
      const indices = this.warming ? this.indices() : this.windowSpreads().flatMap(s => this.indices(s));
      const job = (async () => {
        if (this.warming) {
          await this.physical.ready();
          if (request.signal.aborted) return;
          // Compile a detached visible shell without flashing the hidden binder
          // over the gallery. Clones share the authored geometry and materials.
          const shell = this.physical.group.clone(true); shell.visible = true;
          await domain.compile(shell);
          if (request.signal.aborted) return;
        }
        // Fill the visible spread concurrently before expensive full-quality work.
        // The same physical card transforms carry artwork through page turns.
        const artwork = async (index: number) => {
          const pageIndex = this.face(index), slot = index % 12;
          if (this.physical.pages.get(pageIndex)?.cards.has(slot)) return;
          try {
            const card = await binderArtwork(this.cards[index], this.options.cpu, request.signal);
            const page = this.physical.pages.get(pageIndex);
            if (request.signal.aborted || !(this.active || this.warming) || !page || page.cards.has(slot)) { card.dispose(); return; }
            page.attach(slot, card);
          } catch (error) {
            if (!request.signal.aborted) console.warn('Binder artwork could not load', error);
          }
        };
        await Promise.all(this.indices().map(artwork));
        if (request.signal.aborted || !(this.active || this.warming)) return;
        await Promise.all(indices.filter(index => !this.indices().includes(index)).map(artwork));
        // Fetch/decode the next few full-quality cards while the GPU prepares
        // this one. Keep the window bounded and in visible-spread order.
        const preparations = new Map<number, Promise<{ value?: PreparedCardCpu; error?: unknown; failed?: true }>>();
        const prepareAhead = (offset: number, count = 3) => {
          if (request.signal.aborted || !(this.active || this.warming)) return;
          for (const index of indices.slice(offset, offset + count)) {
            const key = `${this.face(index)}:${index % 12}`;
            if (preparations.has(index) || this.loaded.has(key) || this.failed.has(key) || this.cards[index].construction) continue;
            preparations.set(index, this.cpuReady(this.cards[index], request.signal).then(
              value => ({ value }), error => ({ error, failed: true }),
            ));
          }
        };
        prepareAhead(0, 1);
        await this.physical.ready();
        if (request.signal.aborted || !(this.active || this.warming)) return;
        // A hidden reverse/newly revealed face must have its pipeline ready
        // before the first lift, rather than compiling in that input frame.
        for (const page of this.physical.preparationPages) {
          await page.prepare(mesh => domain.compile(mesh), () => this.waitForMotion(request.signal), () => request.signal.aborted || !(this.active || this.warming));
          if (request.signal.aborted || !(this.active || this.warming)) return;
        }
        for (const [offset, index] of indices.entries()) {
          if (request.signal.aborted || !(this.active || this.warming)) return;
          prepareAhead(offset, offset === 0 ? 1 : 3);
          const pageIndex = this.face(index), slot = index % 12, key = `${pageIndex}:${slot}`;
          if (this.loaded.has(key) || this.failed.has(key)) continue;
          const card = this.cards[index]; let instance;
          try {
            const result = await preparations.get(index);
            preparations.delete(index);
            prepareAhead(offset + 1);
            if (result?.failed) throw result.error;
            const prepared = result?.value;
            await this.waitForMotion(request.signal);
            if (request.signal.aborted) return;
            instance = prepared ? await domain.realizeCardGpu(prepared, request.signal, false) : await domain.create(card, request.signal, false);
            await domain.uploadCardResources([instance], true, () => !request.signal.aborted && this.motionActive());
            await this.waitForMotion(request.signal);
            if (request.signal.aborted) { instance.dispose(); return; }
            await domain.compile(instance.mesh);
            await this.waitForMotion(request.signal);
            if (request.signal.aborted || !(this.active || this.warming)) { instance.dispose(); return; }
            const page = this.physical.pages.get(pageIndex);
            if (!page) { instance.dispose(); continue; }
            page.attach(slot, instance); this.loaded.add(key);
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          } catch (error) {
            instance?.dispose(); if (request.signal.aborted) return;
            this.failed.add(key); console.warn(`Binder card ${card.id} could not load`, error);
            this.status.textContent = `${card.title} could not load. Reopen Favorites to retry.`;
          }
        }
      })();
      this.job = job;
      try { await job; } finally { if (this.job === job) { this.job = undefined; this.request = undefined; } }
    })().catch(error => { if (this.active) this.status.textContent = String(error); });
  }
  private motionActive() { return !!this.navigation.turn || !!this.drag?.moved || performance.now() - this.settledAt < 180; }
  private async waitForMotion(signal: AbortSignal) {
    while (!signal.aborted && this.active && this.motionActive()) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
  private async cpuReady(card: CardDefinition, signal: AbortSignal) {
    let cancel!: () => void;
    const aborted = new Promise<never>((_, reject) => { cancel = () => reject(signal.reason); signal.addEventListener('abort', cancel, { once: true }); });
    try {
      // A previous spread can leave a shared CPU promise completing its abort.
      // Its cache entry is removed on rejection; retry with this live request
      // instead of permanently marking the card as a failed page slot.
      for (let attempt = 0; ; attempt++) {
        signal.throwIfAborted();
        try { return await Promise.race([this.options.cpu.prepare(card, signal), aborted]); }
        catch (error) {
          if (signal.aborted || attempt >= 1 || !(error instanceof DOMException) || error.name !== 'AbortError') throw error;
        }
      }
    }
    finally { signal.removeEventListener('abort', cancel); }
  }
  turn(direction: -1 | 1) { if (this.active && !this.busy() && this.navigation.begin(direction)) this.updateControls(); }
  private async inspect(id: string) {
    if (this.busy()) return;
    this.opening = true; this.updateControls(); this.status.textContent = 'Opening full-quality card…';
    try { await this.suspendPreparation(); await this.options.open(id); }
    catch (error) { this.status.textContent = String(error); }
    finally { this.opening = false; this.updateControls(); }
  }
  async suspendPreparation() { this.warming = false; this.queuedRevision = -1; this.request?.abort(); await this.job; }
  private async exit() { if (this.opening) return; await this.suspendPreparation(); this.options.exit(); }
  private restoreLighting() {
    if (!this.lightingBase) return;
    const key = this.options.lighting.key;
    if (key.width === this.lightingBase.width * 3.3 && key.height === this.lightingBase.height * 3.3) {
      key.position.copy(this.lightingBase.position); key.width = this.lightingBase.width; key.height = this.lightingBase.height;
    }
    key.lookAt(0, 0, 0); this.lightingBase = undefined;
  }
  hide() {
    this.warming = false; this.restoreLighting(); this.active = false; this.root.hidden = true; this.physical.group.visible = false;
    this.request?.abort(); this.queuedRevision = -1; this.revision++; this.drag = undefined;
    const domain = this.factory; this.factory = undefined;
    const release = () => { this.physical.retain(new Set()); this.loaded.clear(); this.failed.clear(); domain?.dispose(); };
    if (this.job) void this.job.finally(release); else release();
    this.navigation.turn = undefined;
    if (this.savedCamera) { this.options.camera.position.copy(this.savedCamera.position); this.options.camera.far = this.savedCamera.far; this.options.camera.updateProjectionMatrix(); this.savedCamera = undefined; }
  }
  update(dt: number, width: number, height: number) {
    if (!this.active) return;
    this.restoreLighting(); this.options.lighting.update(dt, true);
    const key = this.options.lighting.key;
    this.lightingBase = { position: key.position.clone(), width: key.width, height: key.height };
    key.position.multiplyScalar(3.3); key.width *= 3.3; key.height *= 3.3; key.lookAt(0, 0, 0);
    this.tilt.x += (this.tilt.targetX - this.tilt.x) * (1 - Math.exp(-Math.min(dt, .05) * 9));
    this.tilt.y += (this.tilt.targetY - this.tilt.y) * (1 - Math.exp(-Math.min(dt, .05) * 9));
    this.physical.group.rotation.set(this.tilt.x, this.tilt.y, 0);
    const camera = this.options.camera, distance = Math.max(69 / camera.aspect, 43) / (2 * Math.tan(camera.fov * Math.PI / 360));
    const turn = this.navigation.turn;
    const progress = turn ? this.navigation.advance(dt, matchMedia('(prefers-reduced-motion: reduce)').matches) : 0;
    camera.position.set(0, 0, distance); camera.updateMatrixWorld();
    if (turn) {
      const outgoingIndex = turn.direction === 1 ? turn.from * 2 : turn.from * 2 - 1;
      const incomingIndex = outgoingIndex + turn.direction;
      const stationary = new Set([...spreadFaces(turn.from), ...spreadFaces(turn.to)]);
      const height = faceHeight(outgoingIndex) * (1 - progress) + faceHeight(incomingIndex) * progress;
      for (const [index, page] of this.physical.pages) {
        page.group.visible = stationary.has(index);
        if (index === outgoingIndex) page.pose(progress, turn.direction, false, height);
        else if (index === incomingIndex) page.pose(progress, turn.direction, true, height);
        else if (page.group.visible) page.pose();
      }
      this.physical.stack(turn.from, Math.floor(outgoingIndex / 2));
      this.buttons.forEach(b => { b.hidden = true; });
      if (!this.navigation.turn) { this.settledAt = performance.now(); this.reconcile(); this.queuePreparation(); }
    }
    this.physical.group.updateMatrixWorld(true);
    if (!this.navigation.turn) {
      const stage = this.stage.getBoundingClientRect();
      for (const i of this.indices()) {
        const card = this.physical.pages.get(this.face(i))?.cards.get(i % 12), button = this.buttons.get(this.cards[i].id)!;
        button.hidden = false; button.disabled = this.busy();
        if (!card) { button.style.display = 'none'; continue; }
        button.style.display = '';
        const d = card.definition.dimensions;
        const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y]) => new Vector3(x * d.width / 2, y * d.height / 2, d.thickness / 2).applyMatrix4(card.mesh.matrixWorld).project(camera));
        const xs = corners.map(v => (v.x + 1) * width / 2), ys = corners.map(v => (1 - v.y) * height / 2);
        Object.assign(button.style, { left: `${Math.min(...xs) - stage.left}px`, top: `${Math.min(...ys) - stage.top}px`, width: `${Math.max(...xs) - Math.min(...xs)}px`, height: `${Math.max(...ys) - Math.min(...ys)}px` });
      }
    }
  }
  stats() {
    const faces = new Set(spreadFaces(this.navigation.spread));
    const ready = this.indices().filter(index => this.loaded.has(`${this.face(index)}:${index % 12}`)).length;
    const artworkVisible = this.indices().filter(index => this.physical.pages.get(this.face(index))?.cards.has(index % 12)).length;
    return { binder: true, artworkVisible, binderIndex: this.navigation.binder, binders: binderCount(this.cards.length), capacityPerBinder: 480,
      physicalSheets: 20, leftStack: this.navigation.spread, rightStack: 20 - this.navigation.spread,
      spread: this.navigation.spread, spreads: 21, turning: !!this.navigation.turn, dragging: !!this.navigation.turn?.dragging,
      turnProgress: this.navigation.turn?.progress ?? 0, preparing: this.pending, active: this.active, filtered: this.cards.length,
      visible: ready, visibleExpected: this.indices().length, visibleFailed: [...this.failed].filter(key => faces.has(Number(key.split(':')[0]))).length,
      residentCards: this.loaded.size, residentPages: this.physical.pages.size, pending: Number(!!this.job),
      neighborsReady: this.windowSpreads().every(s => this.indices(s).every(i => this.loaded.has(`${this.face(i)}:${i % 12}`))),
      residentGpuBytes: this.factory?.retainedBytes(), domCards: this.buttons.size, factory: this.factory?.stats() };
  }
  dispose() { this.hide(); this.abort.abort(); this.root.remove(); if (this.job) void this.job.finally(() => this.physical.dispose()); else this.physical.dispose(); }
}
