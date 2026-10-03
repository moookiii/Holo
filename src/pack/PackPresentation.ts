import type { PackCard, PackDefinition } from './PackDefinition.ts';

export function presentPackContents(pack: PackDefinition, contents: readonly PackCard[]): PackCard[] {
  const order = pack.presentationOrder;
  if (!order) return [...contents];
  if (order.length !== contents.length || new Set(order).size !== contents.length
    || order.some(i => !Number.isInteger(i) || i < 0 || i >= contents.length)) throw new Error('Invalid pack presentation order');
  return order.map(i => contents[i]);
}
export function largePackLayout(count: number, portrait: boolean) {
  const columns = portrait ? 3 : 5, rows = Math.ceil(count / columns);
  return { width: columns * 7.2 + 2, height: rows * 9.8 + 3,
    position: (i: number) => [((i % columns) - (columns - 1) / 2) * 7.2, ((rows - 1) / 2 - Math.floor(i / columns)) * 9.8, 0] as const };
}
