import data from './lob-data.json' with { type: 'json' };
import type { LobRarity, YugiohCard, YugiohPrinting } from '../types.ts';
import { LOB_PRODUCT_ID } from '../catalog/implementations.ts';

export const lobPrinting: YugiohPrinting = Object.freeze({ id: `${LOB_PRODUCT_ID}:printing`, language: 'en', region: 'North America',
  edition: '1st Edition', releaseDate: '2002-03-08', generation: 'original-2002' });
export function treatmentFor(rarity: LobRarity): YugiohCard['treatment'] {
  return { artwork: rarity === 'Secret Rare' ? 'secret' : rarity === 'Super Rare' || rarity === 'Ultra Rare' ? 'holo' : 'printed',
    name: rarity === 'Rare' ? 'silver' : rarity === 'Ultra Rare' ? 'gold' : rarity === 'Secret Rare' ? 'rainbow' : 'printed', stamp: 'gold-early-tcg' };
}
export const lobCards: readonly YugiohCard[] = Object.freeze(data.map(row => Object.freeze({ ...row,
  id: `yugioh:lob:${row.number}:first-edition`, printingId: lobPrinting.id,
  treatment: Object.freeze(treatmentFor(row.rarity as LobRarity)),
}) as YugiohCard));

export function validateLobCatalog(cards: readonly YugiohCard[] = lobCards) {
  if (cards.length !== 126 || new Set(cards.map(c => c.id)).size !== 126) throw new Error('LOB requires 126 unique cards');
  const counts: Record<LobRarity, number> = { Common: 82, Rare: 22, 'Super Rare': 10, 'Ultra Rare': 10, 'Secret Rare': 2 };
  for (const [rarity, count] of Object.entries(counts)) if (cards.filter(c => c.rarity === rarity).length !== count) throw new Error(`Invalid LOB ${rarity} count`);
  for (let i = 0; i < 126; i++) {
    const number = `LOB-${String(i).padStart(3, '0')}`;
    if (cards.filter(c => c.number === number).length !== 1) throw new Error(`Missing/duplicate ${number}`);
  }
  if (cards.find(c => c.number === 'LOB-000')?.name !== 'Tri-Horned Dragon' || cards.find(c => c.number === 'LOB-125')?.name !== 'Gaia the Dragon Champion') throw new Error('Invalid Secret identities');
  if (cards.some(c => c.printingId !== lobPrinting.id)) throw new Error('LOB printing mismatch');
}
validateLobCatalog();
