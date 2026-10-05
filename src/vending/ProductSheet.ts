import { artwork, button, element } from './elements';
import type { VendingProduct } from './types';

export class ProductSheet {
  readonly root = element('section', 'vm-sheet');
  private art = 'random';
  private preview = element('div', 'vm-sheet-preview');
  private controls = element('div', 'vm-art-options');
  private action: HTMLButtonElement;
  constructor(readonly product: VendingProduct, gameName: string, close: () => void, dispense: (art: string) => void) {
    this.root.setAttribute('aria-label', `${product.name} details`);
    const info = element('div', 'vm-sheet-info');
    const top = element('div', 'vm-sheet-top');
    top.append(element('span', 'vm-eyebrow', gameName), button('← Catalog', close, 'vm-text-button'));
    info.append(top, element('h2', '', product.name));
    info.append(element('p', 'vm-metadata', [product.year, product.era, product.size ? `${product.size} cards in set` : 'Set size unavailable',
      product.packSize ? `${product.packSize} cards / pack` : undefined].filter(Boolean).join(' · ')));
    const selectArt = (id: string) => {
      this.art = id; this.preview.replaceChildren(artwork(product.artwork.find(a => a.id === id) ?? product.artwork[0], true));
      this.controls.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.artId === id)));
    };
    this.controls.setAttribute('aria-label', 'Booster artwork');
    for (const art of [{ id: 'random', name: 'Random' }, ...product.artwork]) {
      const choice = button(art.id === 'random' ? '↝ Random' : art.name.replace(/ booster/, ''), () => selectArt(art.id));
      choice.dataset.artId = art.id; this.controls.append(choice);
    }
    if (product.artwork.length) info.append(element('p', 'vm-eyebrow', 'Wrapper artwork'), this.controls);
    const availability = element('p', 'vm-availability', product.available ? '● Ready to dispense' : 'Browse only · Opening unavailable');
    info.append(availability);
    if (product.note) {
      const notes = element('details', 'vm-notes'); notes.append(element('summary', '', 'Product notes'), element('p', '', product.note)); info.append(notes);
    }
    this.action = button(product.available ? 'DISPENSE PACK ↓' : 'BROWSE ONLY', () => dispense(this.art), 'vm-dispense');
    this.action.disabled = !product.available;
    info.append(this.action); this.root.append(this.preview, info); selectArt('random');
  }
  busy(value: boolean) {
    this.root.querySelectorAll('button').forEach(b => b.disabled = value);
    this.action.disabled = value || !this.product.available;
  }
  async animate(signal: AbortSignal) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = this.preview.animate([
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: 'translateY(-8px) scale(1.025)', opacity: 1, offset: .2 },
      { transform: 'translateY(230px) scale(.72)', opacity: 0 },
    ], { duration: 700, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
    const abort = () => animation.cancel(); signal.addEventListener('abort', abort, { once: true });
    try { await animation.finished; } finally { signal.removeEventListener('abort', abort); animation.cancel(); }
  }
}
