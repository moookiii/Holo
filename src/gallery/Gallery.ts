import './gallery.css';
import type { Object3D, PerspectiveCamera, Scene } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardCpuPreparation } from '../card/CardCpuPreparation';
import type { CardPreview } from '../card/CardPreviewPreparation';
import type { StudioLighting } from '../lighting/StudioLighting';
import { GalleryRenderer } from './GalleryRenderer';
import { GalleryResidency } from './GalleryResidency';
import { GalleryUploadBudget } from './GalleryUploadBudget';
import { GalleryPerformance } from './GalleryPerformance';
import { galleryCardSize, galleryLayout } from './GalleryLayout';
import { compareGallerySetNames, facets, GalleryQueryIndex, gallerySetName, type GalleryQuery } from './GalleryQuery';
import { damp, defaultTilt, influence } from './GalleryMotion';
import { galleryLightingControls } from './GalleryLighting';
import { gallerySkimLightY } from './GallerySkim';
import { profiles } from '../materials/profiles';
import { printVariantLabel, type PrintVariant } from '../pokemon/types';

interface Entry { token: number; ready: boolean; uploading?: boolean; error?: string; preview?: CardPreview; pitch: number; yaw: number; }
const PREVIEW_CONCURRENCY = 4;
export class Gallery {
  readonly root = document.createElement('section');
  readonly viewport = document.createElement('div');
  private content = document.createElement('div');
  private count = document.createElement('p');
  private status = document.createElement('p');
  private tools = document.createElement('details');
  private search = document.createElement('input');
  private filters = new Map<string, HTMLSelectElement>();
  readonly query: GalleryQuery = { search: '' };
  readonly tilt = { ...defaultTilt };
  readonly graphics: GalleryRenderer;
  private residency = new GalleryResidency(48);
  private entries = new Map<number, Entry>();
  private requests = new Map<number, AbortController>();
  private nearRequests = new Map<string, AbortController>();
  private nearCards: CardDefinition[] = [];
  private nearFailed = new Set<string>();
  private lastScroll = 0;
  private scrollDirection = 1;
  private buttons = new Map<string, HTMLButtonElement>();
  private filtered: CardDefinition[] = [];
  private catalog: GalleryQueryIndex;
  private assigned: { id: string; slot: number; token: number; changed: boolean }[] = [];
  private layout = galleryLayout(1, 1, 0, 0);
  private pointer?: { x: number; y: number };
  private observer: ResizeObserver;
  private abort = new AbortController();
  private refreshLighting: () => void;
  private dirty = true;
  private disposed = false;
  private lightingInitialized = false;
  private uploadBudget = new GalleryUploadBudget();
  private performance = new GalleryPerformance();
  private visibleExpected = 0;
  private visibleFailed = 0;
  private savedLighting?: Pick<StudioLighting, 'preset' | 'azimuth' | 'elevation' | 'intensity' | 'speed' | 'filterAngle' | 'playing'>;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  active = false;
  openingReady = false;
  loading = false;
  constructor(private options: { cards: CardDefinition[]; scene: Scene; camera: PerspectiveCamera; cpu: CardCpuPreparation; lighting: StudioLighting; compile: (mesh: Object3D) => Promise<void>; open: (id: string) => Promise<void>; close: () => Promise<void>; pack: () => Promise<void> }) {
    this.catalog = new GalleryQueryIndex(options.cards);
    this.graphics = new GalleryRenderer(options.scene, options.compile);
    this.root.className = 'gallery'; this.root.hidden = true; this.root.setAttribute('aria-label', 'Card gallery');
    const header = document.createElement('header'); header.className = 'gallery-header';
    const title = document.createElement('h1'); title.textContent = 'Collection';
    const close = document.createElement('button'); close.textContent = 'Back to viewer'; close.onclick = () => { void this.transition(options.close); };
    const pack = document.createElement('button'); pack.textContent = 'Open a pack'; pack.onclick = () => { if (!this.loading) void options.pack(); };
    const actions = document.createElement('div'); actions.className = 'gallery-header-actions'; actions.append(close, pack);
    header.append(title, this.count, actions);
    const filters = document.createElement('div'); filters.className = 'gallery-filters';
    this.search.type = 'search'; this.search.placeholder = 'Search cards'; this.search.setAttribute('aria-label', 'Search gallery cards');
    this.search.oninput = () => { this.query.search = this.search.value; this.applyFilters(); }; filters.append(this.search);
    for (const facet of facets) {
      const label = document.createElement('label'); label.textContent = facet.label;
      const select = document.createElement('select'); select.setAttribute('aria-label', facet.label);
      select.onchange = () => {
        if (select.value) this.query[facet.key] = select.value;
        else delete this.query[facet.key];
        this.refreshFacetOptions(); this.applyFilters();
      };
      this.filters.set(facet.key, select); label.append(select); filters.append(label);
    }
    const clear = document.createElement('button'); clear.textContent = 'Clear filters';
    clear.onclick = () => {
      this.search.value = this.query.search = '';
      for (const facet of facets) delete this.query[facet.key];
      this.refreshFacetOptions(); this.applyFilters();
    }; filters.append(clear);
    const light = document.createElement('div'); light.className = 'gallery-light';
    this.refreshLighting = galleryLightingControls(light, options.lighting);
    const tools = this.tools; tools.className = 'gallery-tools'; tools.open = true;
    const toolsSummary = document.createElement('summary'); toolsSummary.textContent = 'Filters & lighting';
    const toolsContent = document.createElement('div'); toolsContent.append(filters, light);
    tools.append(toolsSummary, toolsContent);
    this.viewport.className = 'gallery-viewport'; this.viewport.tabIndex = 0; this.viewport.setAttribute('aria-label', 'Scrollable card collection');
    this.content.className = 'gallery-content'; this.viewport.append(this.content);
    this.status.className = 'gallery-status'; this.status.setAttribute('role', 'status');
    const toolbar = document.createElement('div'); toolbar.className = 'gallery-toolbar'; toolbar.append(header, tools);
    this.root.append(toolbar, this.viewport, this.status); document.body.append(this.root);
    const signal = this.abort.signal;
    this.viewport.addEventListener('scroll', () => { this.dirty = true; }, { passive: true, signal });
    this.viewport.addEventListener('pointermove', event => { if (event.pointerType !== 'touch') this.pointer = { x: event.clientX, y: event.clientY }; }, { passive: true, signal });
    this.viewport.addEventListener('pointerleave', () => { this.pointer = undefined; }, { signal });
    window.addEventListener('blur', () => { this.pointer = undefined; }, { signal });
    this.root.addEventListener('keydown', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-card-index]');
      if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = Number(button.dataset.cardIndex), columns = this.layout.columns;
      const target = Math.max(0, Math.min(this.filtered.length - 1, event.key === 'Home' ? 0 : event.key === 'End' ? this.filtered.length - 1 : index + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key] ?? 0)));
      this.viewport.scrollTop = Math.floor(target / columns) * this.layout.row;
      this.dirty = true; this.reconcile(); this.buttons.get(this.filtered[target].id)?.focus({ preventScroll: true });
    }, { signal });
    this.observer = new ResizeObserver(() => { this.dirty = true; }); this.observer.observe(this.viewport);
  }
  private async transition(action: () => Promise<void>) {
    if (this.loading) return;
    this.loading = true; this.root.setAttribute('aria-busy', 'true'); this.status.textContent = 'Opening full-quality card…';
    for (const slot of this.requests.keys()) this.cancelRequest(slot);
    this.cancelNearRequests();
    try { await action(); }
    catch (error) { this.status.textContent = error instanceof Error ? error.message : 'Unable to open card. Try again.'; }
    finally { this.loading = false; this.root.removeAttribute('aria-busy'); }
  }
  show() {
    if (this.savedLighting) {
      this.options.lighting.setPreset(this.savedLighting.preset);
      Object.assign(this.options.lighting, this.savedLighting);
    }
    if (!this.lightingInitialized) {
      this.options.lighting.setPreset('Skim');
      this.options.lighting.elevation = 28;
      this.lightingInitialized = true;
    }
    this.openingReady = false;
    this.performance.begin();
    this.active = true; this.root.hidden = false; this.graphics.mesh.visible = false; this.refreshLighting();
    this.refreshFacetOptions();
    this.applyFilters(false); (this.tools.open ? this.search : this.tools.querySelector('summary')!).focus({ preventScroll: true });
  }
  private refreshFacetOptions() {
    let cards: readonly CardDefinition[] = this.catalog.cards();
    for (const facet of facets) {
      const select = this.filters.get(facet.key)!;
      const values = [...new Set(cards.map(facet.value).filter((v): v is string => !!v))].sort((a, b) => facet.key === 'set'
        ? compareGallerySetNames(a, b) : a.localeCompare(b));
      const selected = this.query[facet.key] ?? '';
      if (selected && !values.includes(selected)) delete this.query[facet.key];
      select.replaceChildren(new Option(`Any ${facet.label.toLowerCase()}`, ''), ...values.map(value => new Option(facet.key === 'finish'
        ? profiles.find(p => p.id === value)?.name ?? printVariantLabel(value as PrintVariant) ?? value : value, value)));
      select.value = this.query[facet.key] ?? '';
      const active = this.query[facet.key];
      if (active) cards = cards.filter(card => facet.value(card) === active);
    }
  }
  hide() {
    if (this.active) {
      const { preset, azimuth, elevation, intensity, speed, filterAngle, playing } = this.options.lighting;
      this.savedLighting = { preset, azimuth, elevation, intensity, speed, filterAngle, playing };
      this.options.lighting.setPreset('Studio');
    }
    this.active = false; this.root.hidden = true; this.graphics.mesh.visible = false; this.pointer = undefined;
    for (const slot of this.requests.keys()) this.cancelRequest(slot);
    this.cancelNearRequests();
  }
  private cancelNearRequests() { for (const request of this.nearRequests.values()) request.abort(); this.nearRequests.clear(); }
  private cancelRequest(slot: number) { this.requests.get(slot)?.abort(); this.requests.delete(slot); }
  private needsPreview(entry: Entry) { return !entry.ready && !entry.uploading && !entry.preview && !entry.error; }
  private applyFilters(reset = true) {
    this.filtered = this.catalog.filter(this.query);
    this.count.textContent = `${this.filtered.length.toLocaleString()} cards`;
    this.status.textContent = this.filtered.length ? '' : 'No cards match. Try clearing a filter.';
    if (reset) this.viewport.scrollTop = 0;
    this.dirty = true;
  }
  private reconcile() {
    this.dirty = false;
    this.layout = galleryLayout(this.viewport.clientWidth, this.viewport.clientHeight, this.filtered.length, this.viewport.scrollTop);
    this.content.style.height = `${this.layout.total}px`;
    const visible = this.filtered.slice(this.layout.start, this.layout.end);
    const scroll = this.viewport.scrollTop;
    if (scroll !== this.lastScroll) this.scrollDirection = Math.sign(scroll - this.lastScroll);
    this.lastScroll = scroll;
    const onScreen = visible.filter((card, offset) => {
      const top = this.layout.padding + Math.floor((this.layout.start + offset) / this.layout.columns) * this.layout.row - scroll;
      return top <= this.viewport.clientHeight && top + galleryCardSize(card.dimensions, this.layout.cell).cardHeight >= 0;
    });
    // Overscan owns CPU preparation only. It cannot evict a resident texture.
    this.assigned = this.residency.reconcile(onScreen.map(card => card.id));
    const onScreenIds = new Set(onScreen.map(card => card.id));
    this.nearCards = visible.filter(card => !onScreenIds.has(card.id));
    if (this.scrollDirection > 0) this.nearCards.reverse();
    const nearIds = new Set(this.nearCards.map(card => card.id));
    for (const id of this.nearFailed) if (!nearIds.has(id)) this.nearFailed.delete(id);
    for (const [id, request] of this.nearRequests) if (!nearIds.has(id) && !onScreenIds.has(id)) { request.abort(); this.nearRequests.delete(id); }
    const wanted = new Set(visible.map(c => c.id));
    for (const [id, button] of this.buttons) if (!wanted.has(id)) { button.remove(); this.buttons.delete(id); }
    for (const slot of this.requests.keys()) if (!this.assigned.some(a => a.slot === slot && this.entries.get(slot)?.token === a.token)) this.cancelRequest(slot);
    // Pending CPU pixels remain in the byte-budgeted cache; slot bookkeeping
    // must not keep an extra unaccounted copy alive after RAM eviction.
    for (const [slot, entry] of this.entries) if (!this.assigned.some(item => item.slot === slot)) entry.preview = undefined;
    for (const item of this.assigned) {
      if (item.changed || !this.entries.has(item.slot)) { this.cancelRequest(item.slot); this.entries.set(item.slot, { token: item.token, ready: false, pitch: 0, yaw: 0 }); }
    }
    for (const [offset, card] of visible.entries()) {
      const index = this.layout.start + offset;
      let button = this.buttons.get(card.id);
      if (!button) {
        button = document.createElement('button'); button.className = 'gallery-card';
        button.setAttribute('aria-label', `Open ${card.title}, ${gallerySetName(card)}, ${card.number}`);
        const name = document.createElement('span'); name.className = 'gallery-card-name'; name.textContent = card.title;
        const detail = document.createElement('span'); detail.className = 'gallery-card-detail'; detail.textContent = `${gallerySetName(card)} · ${card.number}`;
        const placeholder = document.createElement('span'); placeholder.className = 'gallery-placeholder'; placeholder.textContent = 'Loading…';
        button.append(placeholder, name, detail);
        button.onclick = () => { const item = this.assigned.find(item => item.id === card.id), entry = item && this.entries.get(item.slot); if (entry?.error) { entry.error = undefined; return; } void this.transition(() => this.options.open(card.id)); };
        this.buttons.set(card.id, button); this.content.append(button);
      }
      button.dataset.cardIndex = String(index);
      const { cardWidth, cardHeight } = galleryCardSize(card.dimensions, this.layout.cell);
      Object.assign(button.style, { left: `${this.layout.left + index % this.layout.columns * (this.layout.cell + this.layout.gap) + (this.layout.cell - cardWidth) / 2}px`, top: `${this.layout.padding + Math.floor(index / this.layout.columns) * this.layout.row}px`, width: `${cardWidth}px`, height: `${cardHeight + 54}px` });
      button.style.setProperty('--card-height', `${cardHeight}px`);
    }
  }
  update(dt: number, width: number, height: number) {
    if (!this.active || this.disposed) return;
    if (this.dirty) this.reconcile();
    const rect = this.viewport.getBoundingClientRect();
    const lighting = this.options.lighting;
    lighting.update(dt, true);
    if (lighting.preset === 'Skim' && height > 0) {
      const camera = this.options.camera;
      lighting.key.position.y = gallerySkimLightY(lighting.elevation, rect.top, rect.bottom, height, camera.position.z, camera.fov, lighting.key.position.z);
      lighting.key.lookAt(0, 0, 0);
    }
    this.graphics.hideAll();
    const prioritized = this.assigned.map(item => {
      const index = Number(this.buttons.get(item.id)!.dataset.cardIndex), card = this.filtered[index];
      const { cardWidth, cardHeight } = galleryCardSize(card.dimensions, this.layout.cell);
      const x = rect.left + this.layout.left + index % this.layout.columns * (this.layout.cell + this.layout.gap) + this.layout.cell / 2;
      const y = rect.top + this.layout.padding + Math.floor(index / this.layout.columns) * this.layout.row - this.viewport.scrollTop + cardHeight / 2;
      return { ...item, card, cardWidth, cardHeight, x, y, visible: y + cardHeight / 2 >= rect.top && y - cardHeight / 2 <= rect.bottom };
    }).sort((a, b) => Number(b.visible) - Number(a.visible));
    // Cache hits do not need a worker slot, even when cold requests fill the queue.
    for (const item of prioritized) {
      const entry = this.entries.get(item.slot)!;
      if (this.needsPreview(entry) && !this.requests.has(item.slot)) entry.preview = this.options.cpu.cachedPreview(item.card);
    }
    const waiting = Math.min(PREVIEW_CONCURRENCY, prioritized.filter(item => item.visible
      && this.needsPreview(this.entries.get(item.slot)!) && !this.requests.has(item.slot) && !this.nearRequests.has(item.id)).length);
    for (const [id, request] of [...this.nearRequests].reverse()) {
      if (this.requests.size + this.nearRequests.size + waiting <= PREVIEW_CONCURRENCY) break;
      if (this.assigned.some(item => item.id === id)) continue;
      request.abort(); this.nearRequests.delete(id);
    }
    // After a scroll, unfinished overscan must not delay the new visible rows.
    for (const item of prioritized) if (!item.visible && this.requests.has(item.slot)
      && this.requests.size + waiting > PREVIEW_CONCURRENCY) this.cancelRequest(item.slot);
    this.uploadBudget.beginFrame();
    this.visibleExpected = prioritized.filter(item => item.visible).length;
    this.visibleFailed = 0;
    let waitingForVisibleCard = false;
    for (const item of prioritized) {
      const entry = this.entries.get(item.slot)!, button = this.buttons.get(item.id)!;
      const previewBytes = entry.preview ? entry.preview.images.reduce((sum, image) => sum + image.byteLength,
        entry.preview.parameters.byteLength) : 0;
      // Overscan may populate the CPU cache, but only a visible card starts GPU
      // uploads or shader compilation. A scroll must not inherit cold optical
      // programs belonging to rows the user has never seen.
      if (item.visible && entry.preview && this.uploadBudget.allows(previewBytes)) {
        const preview = entry.preview; entry.preview = undefined; entry.uploading = true;
        void this.graphics.upload(item.slot, preview).then(() => {
          if (!this.disposed && this.residency.owns(item.slot, item.token)) entry.ready = true;
        }).catch(error => {
          if (!this.disposed && this.residency.owns(item.slot, item.token)) entry.error = String(error);
        }).finally(() => { entry.uploading = false; });
        this.uploadBudget.record(previewBytes);
      }
      button.classList.toggle('is-ready', entry.ready);
      const placeholder = button.firstElementChild!; placeholder.textContent = entry.error ? 'Preview unavailable · Retry' : 'Loading…';
      const { card, cardWidth, cardHeight, x, y } = item;
      if (item.visible && !entry.ready && !entry.error)
        waitingForVisibleCard = true;
      if (item.visible && entry.error) this.visibleFailed++;
      const target = this.pointer && !this.reduced.matches ? influence(this.pointer.x - x, this.pointer.y - y, this.tilt) : { pitch: 0, yaw: 0 };
      entry.pitch = damp(entry.pitch, target.pitch, dt, this.tilt.damping); entry.yaw = damp(entry.yaw, target.yaw, dt, this.tilt.damping);
      if (entry.ready && item.visible)
        this.graphics.place(item.slot, x, y, cardWidth, cardHeight, entry.pitch, entry.yaw, width, height, this.options.camera);
      if (this.needsPreview(entry) && !this.requests.has(item.slot) && !this.nearRequests.has(item.id)
        && this.requests.size + this.nearRequests.size < PREVIEW_CONCURRENCY && !this.loading) {
        const request = new AbortController(); this.requests.set(item.slot, request);
        void this.options.cpu.preparePreview(card, request.signal).then(preview => {
          if (!request.signal.aborted && this.residency.owns(item.slot, item.token) && !this.disposed) entry.preview = preview;
        }).catch(error => { if (!request.signal.aborted && this.residency.owns(item.slot, item.token)) entry.error = String(error); })
          .finally(() => { if (this.requests.get(item.slot) === request) this.requests.delete(item.slot); });
      }
    }
    for (const card of this.nearCards) {
      if (this.loading || this.requests.size + this.nearRequests.size >= PREVIEW_CONCURRENCY) break;
      if (this.nearRequests.has(card.id) || this.nearFailed.has(card.id) || this.options.cpu.hasPreview(card)) continue;
      const request = new AbortController(); this.nearRequests.set(card.id, request);
      void this.options.cpu.preparePreview(card, request.signal).then(preview => {
        // Promote an in-flight prefetch when it enters view, without canceling
        // and restarting the expensive worker job.
        if (request.signal.aborted || this.disposed) return;
        const item = this.assigned.find(item => item.id === card.id), entry = item && this.entries.get(item.slot);
        if (entry && item && entry.token === item.token && this.needsPreview(entry)) entry.preview = preview;
      }).catch(() => { if (!request.signal.aborted) this.nearFailed.add(card.id); })
        .finally(() => { if (this.nearRequests.get(card.id) === request) this.nearRequests.delete(card.id); });
    }
    this.graphics.updateLighting(this.options.lighting, this.options.camera);
    this.graphics.mesh.visible = this.graphics.stats().visible > 0;
    this.openingReady = !waitingForVisibleCard;
  }
  recordFrame(intervalMs: number, submissionMs: number) {
    this.performance.frame(intervalMs, submissionMs, this.graphics.stats().visible, this.visibleExpected, this.visibleFailed,
      this.uploadBudget.stats().frameUploads > 0 || [...this.entries.values()].some(entry => entry.uploading));
  }
  stats() { return { ...this.graphics.stats(), ...this.uploadBudget.stats(), ...this.performance.stats(), visibleExpected: this.visibleExpected, visibleFailed: this.visibleFailed,
    ...this.residency.stats(), active: this.active, filtered: this.filtered.length, domCards: this.buttons.size,
    pending: this.requests.size + this.nearRequests.size, activeVisibleLoads: this.requests.size, activeNearLoads: this.nearRequests.size,
    queued: this.assigned.filter(item => this.needsPreview(this.entries.get(item.slot)!) && !this.requests.has(item.slot) && !this.nearRequests.has(item.id)).length,
    failed: [...this.entries.values()].filter(e => e.error).length, tilted: this.assigned.filter(item => { const e = this.entries.get(item.slot)!; return Math.abs(e.pitch) + Math.abs(e.yaw) > .001; }).length, scrollTop: this.viewport.scrollTop }; }
  presentationKey() { return JSON.stringify([this.query, this.assigned.map(item => item.id), this.viewport.scrollTop,
    this.viewport.clientWidth, this.viewport.clientHeight]); }
  dispose() { this.disposed = true; this.hide(); this.abort.abort(); this.observer.disconnect(); this.graphics.dispose(); this.residency.clear(); this.entries.clear(); this.buttons.clear(); this.root.remove(); }
}
