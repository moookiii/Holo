import { tcglSvSets } from './data/sv-tcgl.generated.ts';
import { tcglMegaSets } from './data/mega-tcgl.generated.ts';
import { tcglMepSets } from './data/mep-tcgl.generated.ts';
import { tcglSwshSets } from './data/swsh-tcgl.generated.ts';
import { tcglSmSets } from './data/sm-tcgl.generated.ts';
import { svpTcgdexNonfoil } from './data/svp-tcgdex-nonfoil.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';
import { localBoosterArt } from './boosterArt.ts';
import { swshSetLogo } from './SwshSetLogos.ts';
import { smLogos } from './data/sm-logos.generated.ts';

const catalogSets = [...tcglSvSets, ...tcglMegaSets, ...tcglMepSets, ...tcglSwshSets, ...tcglSmSets].map(set => set.id === 'svp'
  ? { ...set, cards: [...set.cards, ...svpTcgdexNonfoil].sort((a, b) => Number(a.localId) - Number(b.localId)) }
  : set);
const records = new Map(catalogSets.map(set => [set.id, set]));
export const svTcgdexNonfoilSource = (id: string): string | undefined =>
  svpTcgdexNonfoil.find(card => card.id === id)?.sourceEvidence;
export const svNonfoilImageProvider = (id: string): string | undefined =>
  svpTcgdexNonfoil.find(card => card.id === id)?.imageProvider;
export const isSvTcglSet = (id: string): boolean => records.has(id);
export const svTcglCards: readonly PokemonCard[] = catalogSets.flatMap(set => set.cards.map(card => ({
  ...card, setId: set.id, setName: set.name,
  seriesId: 'seriesId' in set ? set.seriesId as string : 'sv', seriesName: 'seriesName' in set ? set.seriesName as string : 'Scarlet & Violet',
  era: 'seriesId' in set ? set.seriesId as string : 'sv',
  variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil },
  front: `${set.assets}/${card.front}`, thumbnail: `${set.assets}/${card.front}`,
})));
const byId = new Map(svTcglCards.map(card => [card.id, card]));
/** Shared pack Energy IDs (sve-001) are distinct from TCGL print IDs (sve-1). */
export const isSvTcglCard = (id: string): boolean => byId.has(id);
export const svTcglSets: readonly PokemonSet[] = catalogSets.map(set => ({
  id: set.id, name: set.name, logo: set.logo ?? smLogos[set.id] ?? ('seriesId' in set && set.seriesId === 'swsh' ? swshSetLogo(set.id) : undefined), releaseDate: set.releaseDate,
  series: { id: 'seriesId' in set ? set.seriesId as string : 'sv', name: 'seriesName' in set ? set.seriesName as string : 'Scarlet & Violet' },
  era: 'seriesId' in set ? set.seriesId as string : 'sv',
  cardIds: set.cards.map(card => card.id), boosters: localBoosterArt(set.id) ?? [],
}));
export function svTcglSet(id: string): PokemonSet {
  const set = svTcglSets.find(set => set.id === id);
  if (!set) throw new Error(`Unknown TCGL set: ${id}`);
  return { ...set, series: { ...set.series }, cardIds: [...set.cardIds], boosters: set.boosters.map(b => ({ ...b })) };
}
export function svTcglCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown TCGL card: ${id}`);
  return { ...card, variants: [...card.variants], types: card.types ? [...card.types] : undefined, foil: { ...card.foil } };
}
export function svTcglCollectorNumber(id: string): string {
  const card = svTcglCard(id);
  return records.get(card.setId)!.cards.find(record => record.id === id)!.collectorNumber;
}
/** A reverse or promotional printing can have different printed TCGL art. */
export function svTcglFront(id: string, variant: import('./types.ts').PrintVariant): string {
  const card = svTcglCard(id), set = records.get(card.setId)!;
  const record = set.cards.find(record => record.id === id)!;
  return `${set.assets}/${record.variantFronts?.[variant] ?? record.front}`;
}
