import type { PackState } from './PackOpeningState';
export class PackUI {
  readonly root = document.createElement('section');
  private action: HTMLButtonElement;
  private status: HTMLElement;
  private abort = new AbortController();
  constructor(name: string, close: () => void, advance: () => void, anotherPack: () => void, select: (direction: number) => void) {
    this.root.className = 'pack-ui'; this.root.setAttribute('aria-label', 'Pack opening');
    this.root.innerHTML = '<header class="pack-header"><button class="pack-back" aria-label="Back to card viewer">← <span>Back</span></button><span class="pack-title"></span><button class="pack-entry pack-another" aria-label="Open another pack"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18H6zM6 6h12M6 18h12m-8-8 2-2 2 2-2 4z"/></svg><span>Open another pack</span></button></header><footer class="pack-footer"><p class="pack-status" role="status" aria-live="polite"></p><button class="pack-action"></button></footer>';
    this.root.querySelector('.pack-title')!.textContent = name;
    this.action = this.root.querySelector('.pack-action')!; this.status = this.root.querySelector('.pack-status')!;
    this.root.querySelector<HTMLButtonElement>('.pack-back')!.onclick = close;
    this.action.onclick = advance;
    this.root.querySelector<HTMLButtonElement>('.pack-another')!.onclick = anotherPack;
    document.body.append(this.root);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); select(e.key === 'ArrowLeft' ? -1 : 1); return; }
      if ((e.target as HTMLElement).matches('button,input,select,textarea')) return;
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) advance(); }
    }, { signal: this.abort.signal });
    this.root.tabIndex = -1; this.root.style.outline = 'none'; this.root.focus({ preventScroll: true });
  }
  update(state: PackState, active: number, count: number, revealed: boolean, title: string, busy: boolean) {
    const messages: Record<PackState, [string, string]> = {
      PackIntro: ['STUDIO SELECTION', 'Preparing your collection'],
      PackReady: [`SEALED · ${count} CARDS`, 'Grip the top seam →'],
      Grip: [`SEALED · ${count} CARDS`, 'Pull across the seam ↔'],
      Tear: ['OPENING THE SEAL', 'Follow the seam to tear ↔'],
      OpenWrapper: ['SEAL RELEASED', 'Pull the foil down ↓'],
      ExtractStack: ['YOUR COLLECTION', 'Slide the cards out ↑'],
      RevealCard: [revealed ? title : `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`, revealed ? active === count - 1 ? 'View collection →' : 'Next card ↑' : 'Turn the card ↑'],
      HitReveal: [title, busy ? 'A study in light' : 'View collection →'],
      PackSummary: ['THE COMPLETE COLLECTION', title ? `Inspect ${title} →` : 'Select a card to inspect'],
      Inspect: [title, 'Entering the studio'],
    };
    const [status, action] = messages[state];
    if (this.status.textContent !== status) this.status.textContent = status;
    if (this.action.textContent !== action) this.action.textContent = action;
    this.action.disabled = state === 'PackIntro' || state === 'Inspect' || busy;
  }
  dispose() { this.abort.abort(); this.root.remove(); }
}
