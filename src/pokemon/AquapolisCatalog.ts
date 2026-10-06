import { localBoosterArt } from './boosterArt.ts';
import { aquapolisRecords } from './data/aquapolis.generated.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const AQUAPOLIS_ID = 'ecard2';
/** 151 ordinary entries (four a/b pairs), three Crystals, and 32 separate H cards. */
export const aquapolisCards: readonly PokemonCard[] = aquapolisRecords.map(record => ({
  ...record, setId: AQUAPOLIS_ID, setName: 'Aquapolis', seriesId: 'ecard', seriesName: 'E-Card', era: 'ecard',
  variants: record.localId.startsWith('H') || Number(record.localId) > 147 ? ['holo'] : ['normal', 'reverse'],
  boosterIds: ['arcanine', 'entei', 'scizor', 'tyranitar'],
  front: `/cards/pokemon/aquapolis/${record.front}`,
  thumbnail: `/cards/pokemon/aquapolis/thumbnails/${record.localId}.webp`,
} satisfies PokemonCard));
export const aquapolisSet: PokemonSet = {
  id: AQUAPOLIS_ID, name: 'Aquapolis', series: {id:'ecard',name:'E-Card'}, era:'ecard', releaseDate:'2003-01-15',
  logo:'/packs/pokemon/ecard2-logo.png', symbol:'/packs/pokemon/ecard2-symbol.png',
  cardIds:aquapolisCards.map(card=>card.id), boosters:localBoosterArt(AQUAPOLIS_ID)!,
};
const byId = new Map(aquapolisCards.map(card=>[card.id,card]));
export function aquapolisCard(id: string): PokemonCard {
  const card=byId.get(id);
  if(!card) throw Error(`Unknown Aquapolis card: ${id}`);
  return {...card,variants:[...card.variants],boosterIds:[...card.boosterIds!],...(card.types?{types:[...card.types]}:{})};
}
