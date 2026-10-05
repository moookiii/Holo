import './vending.css';
import { artwork, button, element } from './elements';
import { ProductGrid } from './ProductGrid';
import { ProductSheet } from './ProductSheet';
import { filterProducts, selectArtwork, type VendingGame, type VendingProduct, type VendingSelection } from './types';

export interface VendingCallbacks { classic: () => void; close: () => void; dispense: (selection: VendingSelection) => void }

export class VendingMachine {
  readonly root = element('div', 'vending-machine');
  readonly status = element('p', 'vm-status');
  private screen = element('div', 'vm-screen');
  private navigation = element('nav', 'vm-games');
  private filters = element('div', 'vm-filters');
  private search = element('input', 'vm-search');
  private era = element('select');
  private availability = element('select');
  private count = element('span', 'vm-count');
  private content = element('div', 'vm-content');
  private attract = element('button', 'vm-attract');
  private grid = new ProductGrid(product => void this.select(product));
  private games: VendingGame[] = [];
  private game?: VendingGame;
  private products: VendingProduct[] = [];
  private sheet?: ProductSheet;
  private request = new AbortController();
  private detailRequest = new AbortController();
  private lifetime = new AbortController();
  private busy = false;
  private frame = 0;
  private pointer = { x: 0, y: 0 };
  private disposed = false;
  private retry = button('Retry', () => {}, 'vm-retry');

  constructor(private callbacks: VendingCallbacks) {
    performance.mark('vending-shell-start');
    const housing = element('div', 'vm-housing');
    const cap = element('div', 'vm-cap'); cap.append(element('span', '', 'HOLO / PACK ATELIER'), element('span', '', 'DIGITAL DISPENSER'));
    const header = element('header', 'vm-header'), brand = element('div', 'vm-brand', 'holo');
    brand.append(element('span', '', 'THE PACK COLLECTION'));
    const exits = element('div', 'vm-exits'); exits.append(button('Classic', () => callbacks.classic()), button('Close', () => callbacks.close()));
    header.append(brand, exits);
    this.navigation.setAttribute('aria-label', 'Trading card game');
    this.search.type = 'search'; this.search.placeholder = 'Search sets'; this.search.setAttribute('aria-label', 'Search sets in selected era');
    this.search.oninput = () => this.filter();
    this.era.setAttribute('aria-label', 'Series or era'); this.era.onchange = () => void this.loadProducts();
    this.availability.setAttribute('aria-label', 'Pack availability');
    for (const [value, label] of [['all', 'All availability'], ['openable', 'Openable'], ['browse', 'Browse only']]) {
      const option = element('option', '', label); option.value = value; this.availability.append(option);
    }
    this.availability.onchange = () => this.filter();
    this.filters.append(this.search, this.era, this.availability);
    const title = element('div', 'vm-catalog-title'); title.append(element('h1', '', 'Select a pack'), this.count);
    this.content.append(this.grid.root);
    this.attract.type = 'button'; this.attract.setAttribute('aria-label', 'Explore the pack collection');
    this.attract.append(element('span', 'vm-eyebrow', 'A COLLECTION WORTH OPENING'), element('strong', '', 'The next pull\nis yours.'),
      element('span', 'vm-attract-art'), element('span', 'vm-attract-cta', 'Select a pack ↗'), element('small', '', 'Touch or move to explore'));
    this.attract.onclick = () => this.wake();
    this.content.append(this.attract);
    this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite'); this.status.textContent = 'Loading collection…';
    const footer = element('div', 'vm-screen-footer'); this.retry.hidden = true; footer.append(this.status, this.retry, element('span', 'vm-system', 'HOLO • 01'));
    this.screen.append(header, this.navigation, this.filters, title, this.content, footer);
    const glass = element('div', 'vm-glass'); glass.setAttribute('aria-hidden', 'true'); this.screen.append(glass);
    const base = element('div', 'vm-base'); base.append(element('span', 'vm-slot'), element('span', '', 'SELECT · DISPENSE · DISCOVER'));
    housing.append(cap, this.screen, base); this.root.append(housing);
    this.screen.onpointermove = e => {
      if (e.movementX || e.movementY) this.wake();
      if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = this.screen.getBoundingClientRect();
      this.pointer = { x: (e.clientX - rect.left) / rect.width - .5, y: (e.clientY - rect.top) / rect.height - .5 };
      if (!this.frame) this.frame = requestAnimationFrame(() => {
        this.frame = 0; glass.style.transform = `translate(${this.pointer.x * 5}px, ${this.pointer.y * 3}px)`;
      });
    };
    this.screen.onpointerleave = () => { cancelAnimationFrame(this.frame); this.frame = 0; glass.style.transform = ''; };
    this.screen.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.sheet && !this.busy) { event.preventDefault(); event.stopPropagation(); this.closeSheet(); }
    });
    // Paint the shell before fetching any catalog metadata. No WebGL resources are created here.
    requestAnimationFrame(() => {
      if (this.disposed) return;
      performance.mark('vending-shell-visible'); performance.measure('vending-shell', 'vending-shell-start', 'vending-shell-visible');
      if (performance.getEntriesByName('vending-entry').length) performance.measure('vending-entry-to-shell', 'vending-entry', 'vending-shell-visible');
      void this.initialize();
    });
  }
  private async initialize() {
    try {
      const { vendingGames } = await import('./catalog'); if (this.disposed) return;
      this.games = vendingGames;
      for (const game of this.games) {
        const tab = button(game.name, () => { this.wake(); void this.changeGame(game); }); tab.dataset.game = game.id; this.navigation.append(tab);
      }
      await this.changeGame(this.games[0]);
    } catch (error) { if (!this.disposed) this.fail(error, () => void this.initialize()); }
  }
  private wake() { this.attract.hidden = true; }
  private async changeGame(game: VendingGame) {
    if (this.busy) return;
    this.request.abort(); this.request = new AbortController(); const { signal } = this.request;
    this.game = game; this.search.value = ''; this.availability.value = 'all'; this.closeSheet(false);
    this.products = []; this.grid.set([]); this.era.replaceChildren(); this.status.textContent = 'Loading series…'; this.retry.hidden = true;
    this.navigation.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.game === game.id)));
    try {
      const eras = await game.eras(signal); signal.throwIfAborted();
      for (const era of [{ id: '', name: 'All eras' }, ...eras]) { const option = element('option', '', era.name); option.value = era.id; this.era.append(option); }
      this.era.value = eras.find(e => e.id === 'base')?.id ?? eras[0]?.id ?? '';
      await this.loadProducts();
    } catch (error) { if (!signal.aborted) this.fail(error, () => void this.changeGame(game)); }
  }
  private async loadProducts() {
    if (!this.game || this.busy) return;
    this.request.abort(); this.request = new AbortController(); const { signal } = this.request, game = this.game;
    this.closeSheet(false); this.products = []; this.grid.set([]); this.status.textContent = 'Loading sets…'; this.retry.hidden = true;
    this.grid.root.classList.add('vm-loading');
    try {
      const products = await game.products(this.era.value, signal); signal.throwIfAborted(); this.products = products;
      this.filter(false); this.status.textContent = 'Choose a pack to view its artwork and details.';
      const featured = this.products.find(p => p.artwork.some(a => a.front));
      if (featured) this.attract.querySelector('.vm-attract-art')?.replaceChildren(artwork(featured.artwork[0]));
    } catch (error) { if (!signal.aborted) this.fail(error, () => void this.loadProducts()); }
    finally { if (!signal.aborted) this.grid.root.classList.remove('vm-loading'); }
  }
  private filter(wake = true) {
    if (this.busy) return;
    if (wake) this.wake(); this.closeSheet(false);
    const products = filterProducts(this.products, this.search.value, this.availability.value);
    this.grid.set(products); this.count.textContent = `${products.length} ${products.length === 1 ? 'set' : 'sets'}`;
  }
  private async select(product: VendingProduct) {
    if (this.busy || !this.game) return;
    this.wake(); this.detailRequest.abort(); this.detailRequest = new AbortController();
    const { signal } = this.detailRequest, game = this.game;
    this.status.textContent = `Loading ${product.name}…`; this.retry.hidden = true;
    try {
      const detailed = await game.detail(product, signal); signal.throwIfAborted();
      this.sheet?.root.remove();
      this.sheet = new ProductSheet(detailed, game.name, () => this.closeSheet(), art => void this.dispense(detailed, art));
      this.content.append(this.sheet.root); this.grid.root.inert = true;
      this.sheet.root.querySelector('button')?.focus();
      this.status.textContent = detailed.available ? 'Choose wrapper artwork, then dispense.' : 'Browse only. This entry cannot dispense a pack.';
    } catch (error) { if (!signal.aborted) this.fail(error, () => void this.select(product)); }
  }
  private closeSheet(focus = true) {
    this.detailRequest.abort(); const id = this.sheet?.product.id;
    this.sheet?.root.remove(); this.sheet = undefined; this.grid.root.inert = false;
    if (focus && id) Array.from(this.grid.root.querySelectorAll<HTMLButtonElement>('button')).find(b => b.dataset.productId === id)?.focus();
  }
  private async dispense(product: VendingProduct, art: string) {
    if (this.busy || !this.sheet) return;
    try {
      const selection = selectArtwork(product, art); this.setBusy(true); this.status.textContent = 'Dispensing your pack…';
      await this.sheet.animate(this.lifetime.signal); this.lifetime.signal.throwIfAborted();
      this.callbacks.dispense(selection);
    } catch (error) { if (!this.disposed) this.fail(error, () => void this.dispense(product, art)); }
  }
  setBusy(busy: boolean) {
    this.busy = busy; this.sheet?.busy(busy); this.navigation.inert = busy; this.filters.inert = busy;
    this.root.querySelector<HTMLButtonElement>('.vm-exits button')!.disabled = busy;
    this.retry.hidden = true; this.screen.setAttribute('aria-busy', String(busy));
  }
  fail(error: unknown, retry: () => void) {
    this.setBusy(false); this.status.textContent = error instanceof Error ? error.message : String(error);
    this.retry.hidden = false; this.retry.onclick = () => { this.retry.hidden = true; retry(); };
  }
  dispose() {
    this.disposed = true; this.request.abort(); this.detailRequest.abort(); this.lifetime.abort();
    cancelAnimationFrame(this.frame); this.grid.dispose(); this.root.remove();
  }
}
