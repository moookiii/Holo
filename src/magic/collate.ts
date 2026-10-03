import type { MagicProduct, MagicPull, MagicSheet, ResolvedMagicPack } from './types.ts';

function randomSequence(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
/** Columns feed bottom-to-top, synchronized, right-to-left in stripes.
 * Each pack starts at a seeded arbitrary point, not a persistent box hopper. */
function sheetRun(sheet: MagicSheet, count: number, widths: readonly number[], random: () => number) {
  const rows = sheet.cells.length / sheet.columns;
  if (!Number.isInteger(rows) || rows < 1 || !widths.length || widths.some(w => !Number.isInteger(w) || w < 1 || w > rows)
    || sheet.cells.some(cell => !cell.length)) throw new Error(`Invalid sheet: ${sheet.id}`);
  let row = Math.floor(random() * rows), column = sheet.columns - 1;
  let width = widths[Math.floor(random() * widths.length)], offset = 0;
  const next = () => {
    const position = ((row - offset + rows) % rows) * sheet.columns + column;
    if (++offset === width) {
      offset = 0;
      if (--column < 0) { column = sheet.columns - 1; row = (row - width + rows) % rows; width = widths[Math.floor(random() * widths.length)]; }
    }
    return position;
  };
  // A random pack boundary inside the first stripe cycle.
  const skip = Math.floor(random() * sheet.columns * width);
  for (let i = 0; i < skip; i++) next();
  return Array.from({ length: count }, () => {
    const position = next(), candidates = sheet.cells[position];
    return { position, cardId: candidates.length === 1 ? candidates[0] : candidates[Math.floor(random() * candidates.length)] };
  });
}
export function collateMagic(product: MagicProduct, seed: number, version: string): ResolvedMagicPack {
  if (!Number.isInteger(seed) || product.slots.reduce((sum, slot) => sum + slot.count, 0) !== product.packSize
    || product.slots.some(slot => !Number.isInteger(slot.count) || slot.count < 1 || !product.sheets[slot.sheet])
    || new Set(product.slots.map(s => s.id)).size !== product.slots.length
    || product.presentation.length !== product.slots.length || new Set(product.presentation).size !== product.slots.length
    || product.presentation.some(id => !product.slots.some(s => s.id === id))) throw new Error('Invalid Magic product');
  const random = randomSequence(seed), pulls: MagicPull[] = [];
  for (const slot of product.slots) for (const card of sheetRun(product.sheets[slot.sheet], slot.count, product.stripeWidths, random))
    pulls.push(Object.freeze({ ...card, slot: slot.id, sheet: slot.sheet }));
  const presentationOrder = product.presentation.flatMap(slot => pulls.flatMap((pull, i) => pull.slot === slot ? [i] : []));
  const identity = JSON.stringify([product.id, version, seed, pulls, presentationOrder]);
  return Object.freeze({ productId: product.id, version, seed, pulls: Object.freeze(pulls), presentationOrder: Object.freeze(presentationOrder), identity });
}
