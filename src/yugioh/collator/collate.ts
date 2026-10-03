import { randomSequence } from '../../pack/PackDefinition.ts';
import type { ResolvedYugiohPack, YugiohCard, YugiohProduct } from '../types.ts';

export function validateProduct(product: YugiohProduct) {
  const r = product.rules;
  if (product.packSize !== 9 || r.packSize !== product.packSize || r.kind !== 'rare-plus-optional-foil') throw new Error('Unsupported Yu-Gi-Oh! product/rules combination');
  if (!product.id || !product.printing.id || product.cards.some(c => c.printingId !== product.printing.id)) throw new Error('Product printing mismatch');
  if (new Set(product.cards.map(c => c.id)).size !== product.cards.length) throw new Error('Duplicate product card');
  const outcomes = ['none', 'Super Rare', 'Ultra Rare', 'Secret Rare'];
  if (Object.keys(r.foilWeights).length !== 4 || outcomes.some(k => !Object.hasOwn(r.foilWeights, k))) throw new Error('Invalid foil outcomes');
  const weights = Object.values(r.foilWeights);
  if (weights.some(w => !Number.isFinite(w) || w < 0) || Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-8 ||
      !Number.isFinite(r.shortPrintWeight) || r.shortPrintWeight <= 0 || !Number.isFinite(r.superShortPrintWeight) || r.superShortPrintWeight <= 0) throw new Error('Invalid collation weights');
  if (product.cards.filter(c => c.rarity === 'Common').length < 8 || !product.cards.some(c => c.rarity === 'Rare')) throw new Error('Insufficient common/rare pool');
  for (const rarity of ['Super Rare', 'Ultra Rare', 'Secret Rare'] as const) if (r.foilWeights[rarity] > 0 && !product.cards.some(c => c.rarity === rarity)) throw new Error(`Empty ${rarity} pool`);
}
export function collateYugioh(product: YugiohProduct, seed: number): ResolvedYugiohPack {
  validateProduct(product);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be uint32');
  const random = randomSequence(seed), r = product.rules;
  let roll = random(), foil = 'none';
  for (const [rarity, weight] of Object.entries(r.foilWeights)) { roll -= weight; if (roll < 0) { foil = rarity; break; } }
  const pool = product.cards.filter(c => c.rarity === 'Common');
  const weight = (c: YugiohCard) => c.distribution === 'reported-short-print' ? r.shortPrintWeight : c.distribution === 'reported-super-short-print' ? r.superShortPrintWeight : 1;
  const cards: YugiohCard[] = [];
  const commonCount = foil === 'none' ? 8 : 7;
  // Weighted sampling without replacement: no duplicate card within one pack.
  while (cards.length < commonCount) {
    let selection = random() * pool.reduce((sum, c) => sum + weight(c), 0), index = pool.length - 1;
    for (let i = 0; i < pool.length; i++) { selection -= weight(pool[i]); if (selection < 0) { index = i; break; } }
    cards.push(pool.splice(index, 1)[0]);
  }
  const choose = (rarity: string) => { const candidates = product.cards.filter(c => c.rarity === rarity); return candidates[Math.floor(random() * candidates.length)]; };
  // Preserve a rare slot. Presentation puts the optional foil last; pack order is modeled.
  cards.push(choose('Rare'));
  if (foil !== 'none') cards.push(choose(foil));
  return Object.freeze({ productId: product.id, printingId: product.printing.id, seed, cards: Object.freeze(cards),
    debug: Object.freeze({ rulesId: r.id, foil, commonCount, note: r.note }) });
}
/** Box indexing is deterministic but intentionally makes no box-hit guarantees. */
export function collateBoxPack(product: YugiohProduct, boxSeed: number, index: number): ResolvedYugiohPack {
  if (!Number.isInteger(boxSeed) || boxSeed < 0 || boxSeed > 0xffffffff || !Number.isInteger(index) || index < 0 || index >= product.packsPerBox) throw new Error('Invalid box state');
  const random = randomSequence(boxSeed); let seed = 0;
  for (let i = 0; i <= index; i++) seed = Math.floor(random() * 0x100000000);
  const pack = collateYugioh(product, seed);
  return Object.freeze({ ...pack, debug: Object.freeze({ ...pack.debug, box: Object.freeze({ seed: boxSeed, index, guarantees: false as const }) }) });
}
