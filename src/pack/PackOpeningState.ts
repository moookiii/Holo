export type PackState = 'PackIntro' | 'PackReady' | 'Grip' | 'Tear' | 'OpenWrapper' | 'ExtractStack' | 'RevealCard' | 'HitReveal' | 'PackSummary' | 'Inspect';
const transitions: Record<PackState, PackState[]> = {
  PackIntro: ['PackReady'], PackReady: ['Grip'], Grip: ['PackReady', 'Tear'],
  Tear: ['OpenWrapper'], OpenWrapper: ['ExtractStack'], ExtractStack: ['RevealCard'],
  RevealCard: ['RevealCard', 'HitReveal', 'PackSummary'], HitReveal: ['RevealCard', 'PackSummary'],
  PackSummary: ['Inspect'], Inspect: [],
};
export class PackOpeningState {
  value: PackState = 'PackIntro';
  elapsed = 0;
  history: PackState[] = ['PackIntro'];
  transition(next: PackState) {
    if (!transitions[this.value].includes(next)) throw new Error(`Invalid pack transition: ${this.value} → ${next}`);
    this.set(next);
  }
  /** Explicit bypass for deterministic capture and reset, never pointer interaction. */
  set(next: PackState) { this.value = next; this.elapsed = 0; this.history.push(next); if (this.history.length > 40) this.history.shift(); }
}
