import './gallery.css';
import type { PerspectiveCamera, Scene } from 'three/webgpu';
import type { CardDefinition } from '../card/CardDefinition';
import type { CardCpuPreparation } from '../card/CardCpuPreparation';
import type { CardPreview } from '../card/CardPreviewPreparation';
import type { StudioLighting } from '../lighting/StudioLighting';
import { GalleryRenderer } from './GalleryRenderer';
import { GalleryResidency } from './GalleryResidency';
import { galleryLayout } from './GalleryLayout';
import { facets, filterCards, type GalleryQuery } from './GalleryQuery';
import { damp, defaultTilt, influence } from './GalleryMotion';
import { galleryLightingControls } from './GalleryLighting';
import { profiles } from '../materials/profiles';
import { printVariantLabel, type PrintVariant } from '../pokemon/types';

interface Entry { token: number; ready: boolean; error?: string; preview?: CardPreview; pitch: number; yaw: number; }
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
  private buttons = new Map<string, HTMLButtonElement>();
  private filtered: CardDefinition[] = [];
  private assigned: { id: string; slot: number; token: number; changed: boolean }[] = [];
  private layout = galleryLayout(1, 1, 0, 0);
  private pointer?: { x: number; y: number };
  private observer: ResizeObserver;
  private abort = new AbortController();
  private refreshLighting: () => void;
  private dirty = true;
  private disposed = false;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  active = false;
  loading = false;
  constructor(private options: { cards: CardDefinition[]; scene: Scene; camera: PerspectiveCamera; cpu: CardCpuPreparation; lighting: StudioLighting; open: (id: string) => Promise<void>; close: () => Promise<void> }) {
    this.graphics = new GalleryRenderer(options.scene);
    this.root.className = 'gallery'; this.root.hidden = true; this.root.setAttribute('aria-label', 'Card gallery');
    const header = document.createElement('header'); header.className = 'gallery-header';
    const title = document.createElement('h1'); title.textContent = 'Collection';
    const close = document.createElement('button'); close.textContent = 'Back to viewer'; close.onclick = () => { void this.transition(options.close); };
    header.append(title, this.count, close);
    const filters = document.createElement('div'); filters.className = 'gallery-filters';
    this.search.type = 'search'; this.search.placeholder = 'Search cards'; this.search.setAttribute('aria-label', 'Search gallery cards');
    this.search.oninput = () => { this.query.search = this.search.value; this.applyFilters(); }; filters.append(this.search);
    for (const facet of facets) {
      const label = document.createElement('label'); label.textContent = facet.label;
      const select = document.createElement('select'); select.setAttribute('aria-label', facet.label);
      select.onchange = () => { this.query[facet.key] = select.value; this.applyFilters(); };
      this.filters.set(facet.key, select); label.append(select); filters.append(label);
    }
    const clear = document.createElement('button'); clear.textContent = 'Clear filters';
    clear.onclick = () => { this.search.value = this.query.search = ''; for (const facet of facets) { delete this.query[facet.key]; this.filters.get(facet.key)!.value = ''; } this.applyFilters(); }; filters.append(clear);
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
    for (const request of this.requests.values()) request.abort();
    try { await action(); }
    catch (error) { this.status.textContent = error instanceof Error ? error.message : 'Unable to open card. Try again.'; }
    finally { this.loading = false; this.root.removeAttribute('aria-busy'); }
  }
  show() {
    this.active = true; this.root.hidden = false; this.graphics.mesh.visible = false; this.refreshLighting();
    for (const facet of facets) {
      const select = this.filters.get(facet.key)!;
      const values = [...new Set(this.options.cards.map(facet.value).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
      select.replaceChildren(new Option(`Any ${facet.label.toLowerCase()}`, ''), ...values.map(value => new Option(facet.key === 'finish'
        ? profiles.find(p => p.id === value)?.name ?? printVariantLabel(value as PrintVariant) ?? value : value, value)));
      select.value = this.query[facet.key] ?? '';
    }
    this.applyFilters(false); (this.tools.open ? this.search : this.tools.querySelector('summary')!).focus({ preventScroll: true });
  }
  hide() {
    this.active = false; this.root.hidden = true; this.graphics.mesh.visible = false; this.pointer = undefined;
    for (const request of this.requests.values()) request.abort();
  }
  private applyFilters(reset = true) {
    this.filtered = filterCards(this.options.cards, this.query);
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
    this.assigned = this.residency.reconcile(visible.map(card => card.id));
    const wanted = new Set(visible.map(c => c.id));
    for (const [id, button] of this.buttons) if (!wanted.has(id)) { button.remove(); this.buttons.delete(id); }
    for (const [slot, request] of this.requests) if (!this.assigned.some(a => a.slot === slot && this.entries.get(slot)?.token === a.token)) request.abort();
    for (const item of this.assigned) {
      if (item.changed || !this.entries.has(item.slot)) { this.requests.get(item.slot)?.abort(); this.entries.set(item.slot, { token: item.token, ready: false, pitch: 0, yaw: 0 }); }
      const index = this.layout.start + visible.findIndex(c => c.id === item.id), card = this.filtered[index];
      let button = this.buttons.get(card.id);
      if (!button) {
        button = document.createElement('button'); button.className = 'gallery-card';
        button.setAttribute('aria-label', `Open ${card.title}, ${card.set}, ${card.number}`);
        const name = document.createElement('span'); name.className = 'gallery-card-name'; name.textContent = card.title;
        const detail = document.createElement('span'); detail.className = 'gallery-card-detail'; detail.textContent = `${card.set} · ${card.number}`;
        const placeholder = document.createElement('span'); placeholder.className = 'gallery-placeholder'; placeholder.textContent = 'Loading…';
        button.append(placeholder, name, detail);
        button.onclick = () => { const entry = this.entries.get(item.slot); if (entry?.error) { entry.error = undefined; return; } void this.transition(() => this.options.open(card.id)); };
        this.buttons.set(card.id, button); this.content.append(button);
      }
      button.dataset.cardIndex = String(index);
      const cardHeight = this.layout.cell * card.dimensions.height / card.dimensions.width;
      Object.assign(button.style, { left: `${this.layout.left + index % this.layout.columns * (this.layout.cell + this.layout.gap)}px`, top: `${this.layout.padding + Math.floor(index / this.layout.columns) * this.layout.row}px`, width: `${this.layout.cell}px`, height: `${cardHeight + 54}px` });
      button.style.setProperty('--card-height', `${cardHeight}px`);
    }
  }
  update(dt: number, width: number, height: number) {
    if (!this.active || this.disposed) return;
    if (this.dirty) this.reconcile();
    const rect = this.viewport.getBoundingClientRect();
    this.graphics.hideAll();
    let uploaded = false;
    for (const item of this.assigned) {
      const entry = this.entries.get(item.slot)!, button = this.buttons.get(item.id)!;
      if (entry.preview && !uploaded) { this.graphics.upload(item.slot, entry.preview); entry.preview = undefined; entry.ready = true; uploaded = true; }
      button.classList.toggle('is-ready', entry.ready);
      const placeholder = button.firstElementChild!; placeholder.textContent = entry.error ? 'Preview unavailable · Retry' : 'Loading…';
      const index = Number(button.dataset.cardIndex), card = this.filtered[index];
      const cardHeight = this.layout.cell * card.dimensions.height / card.dimensions.width;
      const x = rect.left + this.layout.left + index % this.layout.columns * (this.layout.cell + this.layout.gap) + this.layout.cell / 2;
      const y = rect.top + this.layout.padding + Math.floor(index / this.layout.columns) * this.layout.row - this.viewport.scrollTop + cardHeight / 2;
      const target = this.pointer && !this.reduced.matches ? influence(this.pointer.x - x, this.pointer.y - y, this.tilt) : { pitch: 0, yaw: 0 };
      entry.pitch = damp(entry.pitch, target.pitch, dt, this.tilt.damping); entry.yaw = damp(entry.yaw, target.yaw, dt, this.tilt.damping);
      if (entry.ready && y + cardHeight / 2 >= rect.top && y - cardHeight / 2 <= rect.bottom)
        this.graphics.place(item.slot, x, y, this.layout.cell, cardHeight, entry.pitch, entry.yaw, width, height, this.options.camera);
      if (!entry.ready && !entry.preview && !entry.error && !this.requests.has(item.slot) && this.requests.size < 2 && !this.loading) {
        const request = new AbortController(); this.requests.set(item.slot, request);
        void this.options.cpu.preparePreview(card, request.signal).then(preview => {
          if (!request.signal.aborted && this.residency.owns(item.slot, item.token) && !this.disposed) entry.preview = preview;
        }).catch(error => { if (!request.signal.aborted && this.residency.owns(item.slot, item.token)) entry.error = String(error); })
          .finally(() => { if (this.requests.get(item.slot) === request) this.requests.delete(item.slot); });
      }
    }
    this.graphics.updateLighting(this.options.lighting, this.options.camera);
    // Zero-sized instances need no shader. Defer first compilation until an
    // actual preview can be drawn, so opening the controls stays responsive.
    this.graphics.mesh.visible = this.graphics.stats().visible > 0;
  }
  stats() { return { ...this.graphics.stats(), active: this.active, filtered: this.filtered.length, domCards: this.buttons.size, pending: this.requests.size, failed: [...this.entries.values()].filter(e => e.error).length, tilted: [...this.entries.values()].filter(e => Math.abs(e.pitch) + Math.abs(e.yaw) > .001).length, scrollTop: this.viewport.scrollTop }; }
  dispose() { this.disposed = true; this.hide(); this.abort.abort(); this.observer.disconnect(); this.graphics.dispose(); this.residency.clear(); this.entries.clear(); this.buttons.clear(); this.root.remove(); }
}
