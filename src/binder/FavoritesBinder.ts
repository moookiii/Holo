import './binder.css';
import { Vector3, type PerspectiveCamera, type Scene } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardFactory } from '../card/CardFactory';
import type { CardCpuPreparation } from '../card/CardCpuPreparation';
import type { StudioLighting } from '../lighting/StudioLighting';
import { galleryLightingControls } from '../gallery/GalleryLighting';
import { BinderScene } from './BinderScene';
import { BINDER, BinderNavigation, spreadCount, spreadIndices } from './BinderLayout';

interface Options {
  scene: Scene; camera: PerspectiveCamera; cpu: CardCpuPreparation; lighting: StudioLighting;
  factory: () => CardFactory; open: (id: string) => Promise<void>; exit: () => void;
  toggle: (id: string) => void;
}
/** The gallery owns persistence/navigation; this class owns bounded physical presentation. */
export class FavoritesBinder {
  readonly root = document.createElement('section');
  readonly navigation = new BinderNavigation();
  private stage = document.createElement('div');
  private controls = document.createElement('div');
  private indicator = document.createElement('span');
  private status = document.createElement('p');
  private previous = document.createElement('button');
  private next = document.createElement('button');
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
  private wantedNeighbor?: number;
  private preparedNeighbor?: number;
  private revision = 0;
  private lightingBase?: { position: Vector3; width: number; height: number };
  private abort = new AbortController();
  private tilt = { x: -.24, y: -.025, targetX: -.24, targetY: -.025 };
  private zoom = 1;
  private drag?: { x: number; y: number; moved: boolean };
  private savedCamera?: { position: Vector3; far: number };
  active = false;
  constructor(private options: Options) {
    this.root.className = 'favorites-binder'; this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Favorites card binder');
    const header = document.createElement('header'); header.className = 'binder-header';
    const title = document.createElement('div'); title.innerHTML = '<span class="binder-eyebrow">PRIVATE COLLECTION</span><h1>Favorites</h1>';
    const exit = document.createElement('button'); exit.textContent = '← Gallery'; exit.onclick = () => { void this.exit(); };
    const light = document.createElement('div'); light.className = 'gallery-light binder-light';
    this.refreshLight = galleryLightingControls(light, options.lighting); header.append(title, light, exit);
    this.stage.className = 'binder-stage'; this.stage.tabIndex = 0; this.stage.setAttribute('aria-label', 'Drag to tilt binder. Scroll to zoom. Arrow keys turn pages.');
    this.previous.textContent = '‹'; this.previous.setAttribute('aria-label', 'Previous binder spread');
    this.next.textContent = '›'; this.next.setAttribute('aria-label', 'Next binder spread');
    this.previous.onclick = () => { void this.turn(-1); }; this.next.onclick = () => { void this.turn(1); };
    this.controls.className = 'binder-controls'; this.indicator.setAttribute('aria-live', 'polite');
    this.controls.append(this.previous, this.indicator, this.next);
    const hint = document.createElement('span'); hint.className = 'binder-hint'; hint.textContent = 'Drag to tilt · Scroll to zoom · Click a card to inspect · Shift + click to unfavorite';
    this.status.className = 'binder-status'; this.status.setAttribute('role', 'status');
    this.root.append(header, this.stage, this.controls, hint, this.status); document.body.append(this.root);
    this.physical.group.visible = false; options.scene.add(this.physical.group);
    const signal = this.abort.signal;
    this.stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || this.busy()) return;
      this.drag = { x: e.clientX, y: e.clientY, moved: false }; this.stage.setPointerCapture(e.pointerId);
    }, { signal });
    this.stage.addEventListener('pointermove', e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) this.drag.moved = true;
      if (this.drag.moved) {
        this.tilt.targetX = Math.max(-.34, Math.min(.05, this.tilt.targetX + dy * .002));
        this.tilt.targetY = Math.max(-.18, Math.min(.18, this.tilt.targetY + dx * .0015));
        this.drag.x = e.clientX; this.drag.y = e.clientY;
      }
    }, { signal });
    this.stage.addEventListener('pointerup', e => {
      const drag = this.drag; this.drag = undefined;
      if (!drag || drag.moved || this.busy()) return;
      // Projected card bounds share exactly the camera/pose used to draw them.
      const button = [...this.buttons.values()].find(b => {
        const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (button) { if (e.shiftKey) options.toggle(button.dataset.cardId!); else void this.inspect(button.dataset.cardId!); }
      else {
        const r = this.stage.getBoundingClientRect();
        if (e.clientX < r.left + r.width * .16) void this.turn(-1);
        if (e.clientX > r.right - r.width * .16) void this.turn(1);
      }
    }, { signal });
    this.stage.addEventListener('pointercancel', () => { this.drag = undefined; }, { signal });
    this.stage.addEventListener('wheel', e => { e.preventDefault(); this.zoom = Math.max(.76, Math.min(1.2, this.zoom + e.deltaY * .00045)); }, { passive: false, signal });
    this.root.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).matches('input, select')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); void this.turn(e.key === 'ArrowLeft' ? -1 : 1); }
      if (e.key === 'Escape' && !this.opening) void this.exit();
    }, { signal });
  }
  private busy() { return this.pending || this.opening || !!this.navigation.turn; }
  show(cards: CardDefinition[]) {
    this.cards = cards; this.navigation.setCount(cards.length);
    this.active = true; this.root.hidden = false; this.physical.group.visible = true;
    this.status.textContent = '';
    this.savedCamera = { position: this.options.camera.position.clone(), far: this.options.camera.far };
    this.options.camera.far = 250; this.options.camera.updateProjectionMatrix();
    this.factory ??= this.options.factory(); this.refreshLight(); this.reconcile();
    this.stage.focus({ preventScroll: true });
    void this.prepare(this.navigation.spread);
  }
  refresh(cards: CardDefinition[]) {
    const revision = ++this.revision;
    this.pending = true; this.updateControls();
    // Do not renumber a page underneath a pending GPU realization.
    void this.suspendPreparation().then(() => {
      if (!this.active || revision !== this.revision) return;
      this.physical.retain(new Set()); this.loaded.clear(); this.failed.clear(); this.preparedNeighbor = undefined;
      this.wantedNeighbor = undefined;
      this.status.textContent = '';
      this.cards = cards; this.navigation.setCount(cards.length); this.pending = false; this.reconcile(); void this.prepare(this.navigation.spread);
    });
  }
  private reconcile() {
    const spread = this.navigation.spread;
    const keep = new Set([spread * 2, spread * 2 + 1]);
    if (this.wantedNeighbor !== undefined) { keep.add(this.wantedNeighbor * 2); keep.add(this.wantedNeighbor * 2 + 1); }
    this.physical.retain(keep);
    for (const key of this.loaded) if (!keep.has(Number(key.split(':')[0]))) this.loaded.delete(key);
    this.physical.page(spread * 2); this.physical.page(spread * 2 + 1);
    for (const [index, page] of this.physical.pages) { page.group.visible = Math.floor(index / 2) === spread; page.pose(); }
    const ids = new Set(spreadIndices(spread, this.cards.length).map(i => this.cards[i].id));
    for (const [id, button] of this.buttons) if (!ids.has(id)) { button.remove(); this.buttons.delete(id); }
    for (const i of spreadIndices(spread, this.cards.length)) {
      const card = this.cards[i]; if (this.buttons.has(card.id)) continue;
      const button = document.createElement('button'); button.className = 'binder-card'; button.dataset.cardId = card.id;
      button.setAttribute('aria-label', `Inspect ${card.title}, ${card.number}. Shift + click to unfavorite.`);
      button.title = `${card.title} · ${card.number}`;
      button.onclick = e => { if (this.busy()) return; if (e.shiftKey) this.options.toggle(card.id); else void this.inspect(card.id); };
      this.stage.append(button); this.buttons.set(card.id, button);
    }
    this.updateControls();
  }
  private updateControls() {
    this.previous.disabled = this.busy() || this.navigation.spread === 0;
    this.next.disabled = this.busy() || this.navigation.spread >= spreadCount(this.cards.length) - 1;
    this.indicator.textContent = `Pages ${this.navigation.spread * 2 + 1}–${this.navigation.spread * 2 + 2} / ${spreadCount(this.cards.length) * 2} · ${this.cards.length} cards`;
    this.root.setAttribute('aria-busy', String(this.busy()));
  }
  /** One realization/compile at a time. Neighbor work starts only after the spread
   * is complete; each upload yields, and foreground inspection aborts this queue. */
  private async prepare(spread: number) {
    if (!this.active || !this.factory) return;
    if (this.job) await this.job;
    if (!this.active || !this.factory) return;
    const request = new AbortController(); this.request = request;
    const domain = this.factory;
    const job = (async () => {
      for (const index of spreadIndices(spread, this.cards.length)) {
        const pageIndex = Math.floor(index / 12), slot = index % 12, key = `${pageIndex}:${slot}`;
        if (this.loaded.has(key) || this.failed.has(key)) continue;
        if (request.signal.aborted || !this.active) return;
        const card = this.cards[index]; let instance;
        try {
          const prepared = card.construction ? undefined : await this.cpuReady(card, request.signal);
          if (request.signal.aborted) return;
          instance = prepared ? await domain.realizeCardGpu(prepared, request.signal, false)
            : await domain.create(card, request.signal, false);
          await domain.uploadCardResources([instance], true);
          // Factory compilation shares the renderer's pass context with the viewer.
          await domain.compile(instance.mesh);
          if (request.signal.aborted || !this.active) { instance.dispose(); return; }
          this.physical.page(pageIndex).attach(slot, instance); this.loaded.add(key);
          if (spread !== this.navigation.spread) this.physical.page(pageIndex).group.visible = false;
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        } catch (error) {
          instance?.dispose();
          if (request.signal.aborted) return;
          this.failed.add(key); console.warn(`Binder card ${card.id} could not load`, error);
          this.status.textContent = `${card.title} could not load. Click its pocket to inspect or reopen Favorites to retry.`;
        }
      }
    })();
    this.job = job;
    try { await job; }
    finally { if (this.job === job) { this.job = undefined; this.request = undefined; } }
    if (!request.signal.aborted && this.active && spread !== this.navigation.spread) this.preparedNeighbor = spread;
  }
  private async cpuReady(card: CardDefinition, signal: AbortSignal) {
    let cancel!: () => void;
    const aborted = new Promise<never>((_, reject) => { cancel = () => reject(signal.reason); signal.addEventListener('abort', cancel, { once: true }); });
    try { signal.throwIfAborted(); return await Promise.race([this.options.cpu.prepare(card, signal), aborted]); }
    finally { signal.removeEventListener('abort', cancel); }
  }
  async turn(direction: -1 | 1) {
    if (!this.active || this.busy()) return;
    const to = this.navigation.spread + direction;
    if (to < 0 || to >= spreadCount(this.cards.length)) return;
    this.pending = true; this.updateControls();
    try {
      if (this.wantedNeighbor !== to) {
        await this.suspendPreparation(); this.wantedNeighbor = to; this.preparedNeighbor = undefined; this.reconcile();
      }
      if (this.preparedNeighbor !== to) { this.status.textContent = 'Preparing the next sheet…'; await this.prepare(to); }
      if (!this.active) return;
      this.navigation.begin(direction); this.status.textContent = '';
    } finally { this.pending = false; this.updateControls(); }
  }
  private async inspect(id: string) {
    if (this.busy()) return;
    this.opening = true; this.updateControls(); this.status.textContent = 'Opening full-quality card…';
    try { await this.suspendPreparation(); await this.options.open(id); }
    catch (error) { this.status.textContent = String(error); }
    finally { this.opening = false; this.updateControls(); }
  }
  async suspendPreparation() { this.request?.abort(); await this.job; }
  private async exit() { if (this.opening) return; await this.suspendPreparation(); this.options.exit(); }
  private restoreLighting() {
    if (!this.lightingBase) return;
    const key = this.options.lighting.key;
    // A preset may have rebuilt the rig since our last frame. Preserve that
    // freshly applied rig instead of restoring the previous preset's shape.
    if (key.width === this.lightingBase.width * 3.3 && key.height === this.lightingBase.height * 3.3) {
      key.position.copy(this.lightingBase.position); key.width = this.lightingBase.width; key.height = this.lightingBase.height;
    }
    key.lookAt(0, 0, 0); this.lightingBase = undefined;
  }
  hide() {
    this.restoreLighting();
    this.active = false; this.root.hidden = true; this.physical.group.visible = false; this.request?.abort();
    const domain = this.factory; this.factory = undefined;
    // Disposal follows any in-flight compile so its renderer hook has unwound.
    const release = () => { this.physical.retain(new Set()); this.loaded.clear(); this.failed.clear(); domain?.dispose(); };
    if (this.job) void this.job.finally(release); else release();
    this.wantedNeighbor = this.preparedNeighbor = undefined; this.navigation.turn = undefined;
    if (this.savedCamera) { this.options.camera.position.copy(this.savedCamera.position); this.options.camera.far = this.savedCamera.far; this.options.camera.updateProjectionMatrix(); this.savedCamera = undefined; }
  }
  update(dt: number, width: number, height: number) {
    if (!this.active) return;
    this.restoreLighting();
    this.options.lighting.update(dt, true);
    const key = this.options.lighting.key;
    this.lightingBase = { position: key.position.clone(), width: key.width, height: key.height };
    // The same studio rig, enlarged to illuminate a 60cm spread instead of one card.
    key.position.multiplyScalar(3.3); key.width *= 3.3; key.height *= 3.3; key.lookAt(0, 0, 0);
    this.tilt.x += (this.tilt.targetX - this.tilt.x) * (1 - Math.exp(-Math.min(dt, .05) * 9));
    this.tilt.y += (this.tilt.targetY - this.tilt.y) * (1 - Math.exp(-Math.min(dt, .05) * 9));
    this.physical.group.rotation.set(this.tilt.x, this.tilt.y, 0);
    const camera = this.options.camera;
    const distance = Math.max(68 / camera.aspect, 43) / (2 * Math.tan(camera.fov * Math.PI / 360)) * this.zoom;
    const turn = this.navigation.turn;
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? .22 : 1.35;
    const p = turn ? Math.min(1, turn.elapsed / duration) : 0;
    const lift = Math.sin(Math.PI * p * p * (3 - 2 * p));
    // Keep the raised sheet inside the frame while preserving the resting pose.
    camera.position.set(0, 3.5 * lift, distance + 36 * lift); camera.updateMatrixWorld();
    if (turn) {
      const progress = this.navigation.advance(dt, duration);
      const outgoing = this.physical.page(turn.from * 2 + (turn.direction === 1 ? 1 : 0));
      const incoming = this.physical.page(turn.to * 2 + (turn.direction === 1 ? 0 : 1));
      const under = this.physical.page(turn.to * 2 + (turn.direction === 1 ? 1 : 0));
      outgoing.group.visible = incoming.group.visible = under.group.visible = true;
      outgoing.pose(progress, turn.direction); incoming.pose(progress, turn.direction, true);
      under.pose();
      this.buttons.forEach(b => { b.hidden = true; });
      if (!this.navigation.turn) {
        this.wantedNeighbor = undefined; this.preparedNeighbor = undefined; this.reconcile();
        this.updateControls();
      }
    }
    this.physical.group.updateMatrixWorld(true);
    if (!this.navigation.turn) {
      const stage = this.stage.getBoundingClientRect();
      for (const i of spreadIndices(this.navigation.spread, this.cards.length)) {
        const card = this.physical.pages.get(Math.floor(i / 12))?.cards.get(i % 12);
        const button = this.buttons.get(this.cards[i].id)!;
        button.hidden = false; button.disabled = this.busy();
        if (!card) { button.style.display = 'none'; continue; }
        button.style.display = '';
        const d = card.definition.dimensions;
        const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y]) => new Vector3(x * d.width / 2, y * d.height / 2, d.thickness / 2).applyMatrix4(card.mesh.matrixWorld).project(camera));
        const xs = corners.map(v => (v.x + 1) * width / 2), ys = corners.map(v => (1 - v.y) * height / 2);
        Object.assign(button.style, { left: `${Math.min(...xs) - stage.left}px`, top: `${Math.min(...ys) - stage.top}px`, width: `${Math.max(...xs) - Math.min(...xs)}px`, height: `${Math.max(...ys) - Math.min(...ys)}px` });
      }
      // Only one neighboring spread is resident, never the entire collection.
      if (!this.busy() && !this.job && this.wantedNeighbor === undefined && this.cards.length > 24) {
        const neighbor = this.navigation.spread < spreadCount(this.cards.length) - 1 ? this.navigation.spread + 1 : this.navigation.spread - 1;
        this.wantedNeighbor = neighbor; this.reconcile(); void this.prepare(neighbor);
      }
    }
  }
  stats() {
    const visiblePages = [...this.physical.pages.values()].filter(p => p.group.visible);
    return { binder: true, spread: this.navigation.spread, spreads: spreadCount(this.cards.length), turning: !!this.navigation.turn,
      preparing: this.pending, active: this.active, filtered: this.cards.length,
      visible: visiblePages.reduce((n, p) => n + p.cards.size, 0), visibleExpected: spreadIndices(this.navigation.spread, this.cards.length).length,
      visibleFailed: this.failed.size, residentCards: this.loaded.size, residentPages: this.physical.pages.size, pending: Number(!!this.job),
      neighborReady: this.preparedNeighbor, residentGpuBytes: this.factory?.retainedBytes(), domCards: this.buttons.size,
      factory: this.factory?.stats() };
  }
  dispose() { this.hide(); this.abort.abort(); this.root.remove(); if (this.job) void this.job.finally(() => this.physical.dispose()); else this.physical.dispose(); }
}
