import catalog from './showdown-sprites.generated.json';

export const pokemonSprites = catalog;
export const SPRITE_ROW_HEIGHT = 76;
export function spriteRange(scroll: number, height: number, count: number) {
  return { start: Math.max(0, Math.floor(scroll / SPRITE_ROW_HEIGHT) - 2), end: Math.min(count, Math.ceil((scroll + height) / SPRITE_ROW_HEIGHT) + 2) };
}

/** Bounded live DOM and decoded GIFs; HTTP cache handles revisits without preloading. */
export class PokemonSpriteSelector {
  readonly button = document.createElement('button');
  readonly panel = document.createElement('div');
  private scroller = document.createElement('div');
  private content = document.createElement('div');
  private rows = new Map<number, HTMLButtonElement>();
  private failed = new Set<string>();
  private abort = new AbortController();
  private observer: ResizeObserver;
  private frame = 0;
  constructor(host: HTMLElement, select: (name: string) => void) {
    this.button.className = 'pokemon-selector-toggle';
    this.button.setAttribute('aria-label', 'Choose Pokémon');
    this.button.title = 'Choose Pokémon';
    const icon = document.createElement('img');
    icon.src = `${import.meta.env.BASE_URL}icons/pokeball-gold.png`;
    icon.alt = ''; icon.width = 22; icon.height = 22;
    this.button.append(icon);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.panel.className = 'pokemon-selector'; this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-label', 'Choose a Pokémon');
    const heading = document.createElement('div'); heading.className = 'pokemon-selector-heading';
    heading.textContent = 'National Pokédex';
    const close = document.createElement('button'); close.textContent = '×'; close.setAttribute('aria-label', 'Close Pokémon selector');
    close.onclick = () => this.close(); heading.append(close);
    this.scroller.className = 'pokemon-selector-scroll';
    this.content.className = 'pokemon-selector-content';
    this.content.style.height = `${catalog.length * SPRITE_ROW_HEIGHT}px`;
    this.scroller.append(this.content); this.panel.append(heading, this.scroller); host.append(this.panel);
    this.button.onclick = () => this.panel.hidden ? this.open() : this.close();
    const signal = this.abort.signal;
    this.scroller.addEventListener('scroll', () => {
      if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(); });
    }, { passive: true, signal });
    document.addEventListener('pointerdown', e => {
      if (!this.panel.hidden && !this.panel.contains(e.target as Node) && !this.button.contains(e.target as Node)) this.close(false);
    }, { signal });
    this.panel.addEventListener('click', e => {
      const row = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pokemon-index]');
      if (row) { select(catalog[Number(row.dataset.pokemonIndex)].name); this.close(); }
    }, { signal });
    document.addEventListener('keydown', e => {
      if (this.panel.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); return; }
      if (e.key === 'Tab') {
        const focusable = [close, ...[...this.rows].sort(([a], [b]) => a - b).map(([, row]) => row)];
        const first = focusable[0], last = focusable.at(-1)!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !this.panel.contains(document.activeElement)) return;
      e.preventDefault();
      const current = Number((document.activeElement as HTMLElement)?.dataset.pokemonIndex ?? -1);
      const next = Math.max(0, Math.min(catalog.length - 1, e.key === 'Home' ? 0 : e.key === 'End' ? catalog.length - 1 : current + (e.key === 'ArrowDown' ? 1 : -1)));
      this.scroller.scrollTop = Math.max(0, next * SPRITE_ROW_HEIGHT - this.scroller.clientHeight / 2);
      this.render(); this.rows.get(next)?.focus({ preventScroll: true });
    }, { signal, capture: true });
    this.observer = new ResizeObserver(() => { if (!this.panel.hidden) { this.position(); this.render(); } }); this.observer.observe(this.scroller);
  }
  private position() {
    const toolbar = this.button.closest<HTMLElement>('.gallery-toolbar');
    if (toolbar && this.panel.parentElement) {
      this.panel.style.top = `${toolbar.getBoundingClientRect().bottom - this.panel.parentElement.getBoundingClientRect().top}px`;
    }
  }
  open() {
    this.position();
    const toolbar = this.button.closest('.gallery-toolbar');
    if (toolbar) this.observer.observe(toolbar);
    this.panel.hidden = false; this.button.setAttribute('aria-expanded', 'true'); this.render(); this.panel.querySelector<HTMLButtonElement>('button')?.focus();
  }
  close(focus = true) {
    this.panel.hidden = true; this.button.setAttribute('aria-expanded', 'false');
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.content.replaceChildren(); this.rows.clear();
    if (focus) this.button.focus({ preventScroll: true });
  }
  private render() {
    if (this.panel.hidden) return;
    const { start, end } = spriteRange(this.scroller.scrollTop, this.scroller.clientHeight, catalog.length);
    for (const [index, row] of this.rows) if (index < start || index >= end) { row.remove(); this.rows.delete(index); }
    for (let index = start; index < end; index++) {
      if (this.rows.has(index)) continue;
      const pokemon = catalog[index], row = document.createElement('button');
      row.className = 'pokemon-selector-row'; row.dataset.pokemonIndex = String(index);
      row.style.top = `${index * SPRITE_ROW_HEIGHT}px`; row.setAttribute('aria-label', pokemon.name);
      const art = document.createElement('span'); art.className = 'pokemon-selector-art';
      const fallback = () => { art.textContent = 'No animation'; art.classList.add('is-unavailable'); art.setAttribute('aria-label', 'Animation unavailable'); };
      if (pokemon.sprite && !this.failed.has(pokemon.sprite)) {
        const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
        image.onerror = () => { this.failed.add(pokemon.sprite!); fallback(); };
        image.src = `https://play.pokemonshowdown.com/sprites/ani/${pokemon.sprite}.gif`; art.append(image);
      } else fallback();
      const label = document.createElement('span'); label.textContent = pokemon.name;
      const number = document.createElement('small'); number.textContent = `#${String(pokemon.number).padStart(4, '0')}`;
      row.append(art, label, number); this.rows.set(index, row);
    }
    // Keep keyboard/assistive reading order consistent after reverse scrolling.
    const ordered = [...this.rows].sort(([a], [b]) => a - b);
    ordered.forEach(([, row], position) => {
      const current = this.content.children[position];
      if (current !== row) this.content.insertBefore(row, current ?? null);
    });
  }
  dispose() { this.close(false); this.abort.abort(); this.observer.disconnect(); this.panel.remove(); this.button.remove(); }
}
