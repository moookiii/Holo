import { prismaticRecords } from './data/prismatic.generated.ts';
import type { PokemonCard, PokemonSet, PrintVariant } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';

export const PRISMATIC_SET_ID = 'sv08.5';
export const PRISMATIC_ASSETS = '/cards/pokemon/prismatic-evolutions';

/** English numbered retail set. Promos, stamps, tins and prize-pack finishes
 * are deliberately not inferred from the provider's aggregate variant flags.
 * Source evidence: catalog.json contains the detailed TCGdex print records.
 */
export const prismaticCards: readonly PokemonCard[] = prismaticRecords.map(record => {
  const rarity = record.rarity.replace(/\b\w/g, letter => letter.toUpperCase());
  const ordinary = ['Common', 'Uncommon', 'Rare'].includes(rarity);
  const variants: PrintVariant[] = [rarity === 'Common' || rarity === 'Uncommon' ? 'normal' : 'holo'];
  if (ordinary) {
    // Exact standard, Poké Ball and Master Ball TCGL surfaces are registered.
    variants.push('reverse', 'pokeball-reverse');
    if (record.category === 'Pokemon') variants.push('masterball-reverse');
  }
  const { front, ...data } = record;
  return { ...data, rarity, setId: PRISMATIC_SET_ID, setName: 'Prismatic Evolutions',
    seriesId: 'sv', seriesName: 'Scarlet & Violet', era: 'sv', variants,
    foil: ordinary ? { 'pokeball-reverse': 'pokeball', ...(record.category === 'Pokemon' ? { 'masterball-reverse': 'masterball' } : {}) } : {},
    front: `${PRISMATIC_ASSETS}/${front}`, thumbnail: `${PRISMATIC_ASSETS}/${front}` };
});

export const prismaticSet: PokemonSet = {
  id: PRISMATIC_SET_ID, name: 'Prismatic Evolutions', series: { id: 'sv', name: 'Scarlet & Violet' },
  era: 'sv', releaseDate: '2025-01-17', cardIds: prismaticCards.map(card => card.id),
  logo: `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/sv08.5-logo.png`,
  boosters: localBoosterArt(PRISMATIC_SET_ID)!,
};

const byId = new Map(prismaticCards.map(card => [card.id, card]));
export function prismaticCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Prismatic Evolutions card: ${id}`);
  // Do not expose the shared source records to session/pack mutations.
  return { ...card, variants: [...card.variants], foil: { ...card.foil }, types: card.types ? [...card.types] : undefined };
}

export type PrismaticTreatment = 'non-holo' | 'standard-reverse' | 'regular-holo' | 'ex-holo' | 'ace-spec'
  | 'pokeball-reverse' | 'masterball-reverse' | 'fullart-texture' | 'sir-texture' | 'gold';
export interface PrismaticPrinting {
  cardId: string;
  variant: PrintVariant;
  treatment: PrismaticTreatment;
  textured: boolean;
  /** Named material destination. No generic rarity/era fallback is permitted. */
  profileId?: string;
  inScope: boolean;
}
export function prismaticPrinting(id: string, variant: PrintVariant): PrismaticPrinting {
  const card = byId.get(id);
  if (!card?.variants.includes(variant)) throw new Error(`Invalid ${variant} printing for ${id}`);
  let treatment: PrismaticTreatment;
  switch (variant) {
    case 'normal': treatment = 'non-holo'; break;
    case 'reverse': treatment = 'standard-reverse'; break;
    case 'pokeball-reverse': treatment = 'pokeball-reverse'; break;
    case 'masterball-reverse': treatment = 'masterball-reverse'; break;
    case 'holo': {
      const family: Record<string, PrismaticTreatment> = { Rare: 'regular-holo', 'Double Rare': 'ex-holo',
        'ACE SPEC Rare': 'ace-spec', 'Ultra Rare': 'fullart-texture', 'Special Illustration Rare': 'sir-texture', 'Hyper Rare': 'gold' };
      treatment = family[card.rarity];
      if (!treatment) throw new Error(`Unaudited Prismatic rarity: ${card.rarity}`);
      break;
    }
  }
  const textured = ['pokeball-reverse', 'masterball-reverse', 'fullart-texture', 'sir-texture', 'gold'].includes(treatment);
  return { cardId: id, variant, treatment, textured, inScope: true,
    profileId: treatment === 'non-holo' ? 'print-only' : treatment === 'ace-spec' ? 'pokemon-ace-spec' : `prismatic_${treatment.replaceAll('-', '_')}` };
}

/** All 447 English retail printings, including the 100 standard reverses. */
export const prismaticPrintings: readonly PrismaticPrinting[] = prismaticCards.flatMap(card =>
  card.variants.map(variant => prismaticPrinting(card.id, variant)));
