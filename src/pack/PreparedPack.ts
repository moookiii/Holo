import type { PreparedCardCpu } from '../card/CardCpuPreparation.ts';
import type { CardDefinition } from '../card/CardDefinition.ts';
import type { PackCard, PackDefinition } from './PackDefinition.ts';
import { resolvePackContents } from './PackDefinition.ts';

export interface PreparedPack {
  identity: string; seed: number; definition: PackDefinition; contents: PackCard[];
  definitions: CardDefinition[]; cards: Map<string, PreparedCardCpu>;
}
export function packIdentity(definition: PackDefinition, seed: number, contents = resolvePackContents(definition, seed)) {
  return JSON.stringify([definition.id, definition.pokemon?.identity, seed, definition.wrapper, contents]);
}
export async function prepareExactPack(definition: PackDefinition, seed: number, definitions: readonly CardDefinition[], signal: AbortSignal,
  prepare: (card: CardDefinition, signal: AbortSignal) => Promise<PreparedCardCpu>, progress: (done: number, total: number) => void = () => {}): Promise<PreparedPack> {
  const contents = resolvePackContents(definition, seed);
  const selected = contents.map(entry => {
    const card = definitions.find(c => c.id === entry.cardId);
    if (!card) throw new Error(`Unavailable card: ${entry.cardId}`); return card;
  });
  const cards = new Map<string, PreparedCardCpu>(); let done = 0;
  for (const card of selected) {
    signal.throwIfAborted();
    if (!cards.has(card.id)) cards.set(card.id, await prepare(card, signal));
    signal.throwIfAborted(); progress(++done, selected.length);
  }
  const identity = packIdentity(definition, seed, contents);
  contents.forEach(Object.freeze); Object.freeze(contents);
  return Object.freeze({ identity, seed, definition, contents, definitions: selected, cards });
}
