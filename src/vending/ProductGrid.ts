import { artwork, button, element } from './elements';
import type { VendingProduct } from './types';

/** One overscan row, stable row geometry, and no offscreen image requests. */
export class ProductGrid {
  readonly root = element('div', 'vm-products');
  private canvas = element('div', 'vm-product-canvas');
  private items: readonly VendingProduct[] = [];
  private observer: ResizeObserver;
  private range = '';
  private selected?: string;
  constructor(private choose: (product: VendingProduct) => void) {
    this.root.setAttribute('aria-label', 'Pack catalog'); this.root.tabIndex = 0;
    this.root.append(this.canvas);
    this.root.onscroll = () => this.render();
    this.observer = new ResizeObserver(() => this.render()); this.observer.observe(this.root);
  }
  set(items: readonly VendingProduct[], selected?: string) {
    this.items = items; this.selected = selected; this.range = ''; this.root.scrollTop = 0; this.render();
  }
  private render() {
    const columns = this.root.clientWidth < 470 ? 2 : 3, rowHeight = 260;
    const start = Math.max(0, Math.floor(this.root.scrollTop / rowHeight) - 1);
    const end = Math.min(Math.ceil(this.items.length / columns), Math.ceil((this.root.scrollTop + this.root.clientHeight) / rowHeight) + 1);
    const key = `${start}:${end}:${columns}`; if (key === this.range) return; this.range = key;
    const focused = (document.activeElement as HTMLElement)?.dataset.productId;
    this.canvas.style.height = `${Math.ceil(this.items.length / columns) * rowHeight}px`;
    this.canvas.replaceChildren();
    for (let index = start * columns; index < Math.min(this.items.length, end * columns); index++) {
      const item = this.items[index];
      const tile = button('', () => this.choose(item), 'vm-product'); tile.dataset.productId = item.id;
      tile.setAttribute('aria-label', `${item.name} · ${item.available ? 'Opening available' : 'Browse only'}`);
      tile.setAttribute('aria-pressed', String(item.id === this.selected));
      tile.onkeydown = event => {
        const delta = { ArrowDown: columns, ArrowUp: -columns, ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (delta === undefined) return;
        event.preventDefault();
        const target = Math.max(0, Math.min(this.items.length - 1, index + delta));
        const top = Math.floor(target / columns) * rowHeight;
        if (top < this.root.scrollTop) this.root.scrollTop = top;
        else if (top + rowHeight > this.root.scrollTop + this.root.clientHeight) this.root.scrollTop = top + rowHeight - this.root.clientHeight;
        this.render();
        Array.from(this.canvas.querySelectorAll<HTMLButtonElement>('button')).find(b => b.dataset.productId === this.items[target].id)?.focus({ preventScroll: true });
      };
      Object.assign(tile.style, { top: `${Math.floor(index / columns) * rowHeight}px`, left: `${index % columns * 100 / columns}%`, width: `${100 / columns}%` });
      tile.append(artwork(item.artwork[0]), element('strong', '', item.name),
        element('small', '', [item.year, item.available ? 'Opening available' : 'Browse only'].filter(Boolean).join(' · ')));
      tile.onpointermove = event => {
        if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = tile.getBoundingClientRect();
        tile.style.setProperty('--tilt-x', `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 4}deg`);
        tile.style.setProperty('--tilt-y', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 5}deg`);
      };
      tile.onpointerleave = () => { tile.style.removeProperty('--tilt-x'); tile.style.removeProperty('--tilt-y'); };
      this.canvas.append(tile);
      if (focused === item.id) tile.focus({ preventScroll: true });
    }
    if (!this.items.length) this.canvas.append(element('p', 'vm-empty', 'No packs match. Try another era or filter.'));
  }
  dispose() { this.observer.disconnect(); }
}
