import { localBoosterArt } from './boosterArt.ts';
import { teamRocketRecords } from './data/team-rocket.generated.ts';
import { teamRocketWrapper } from './TeamRocketProduct.ts';
import type { PokemonCard, PokemonSet } from './types.ts';

export const TEAM_ROCKET_ID = 'base5';
export const teamRocketCards: readonly PokemonCard[] = teamRocketRecords.map(record => {
  const n = Number(record.localId), holo = n <= 17 || n === 83;
  const editionFronts = {
    'first-edition': `/cards/pokemon/team-rocket/${record.front}`,
  };
  return { ...record, setId: TEAM_ROCKET_ID, setName: 'Team Rocket', seriesId: 'base', seriesName: 'Base', era: 'base',
    rarity: n === 83 ? 'Secret Rare' : holo ? 'Holo Rare' : record.rarity,
    // TCGdex omits energyType for the holo Rainbow Energy print (#17).
    ...(record.category === 'Energy' ? { energyType: 'Special' } : {}),
    variants: [holo ? 'holo' : 'normal'], edition: 'first-edition', editionFronts,
    boosterIds: teamRocketWrapper.designs.map(d => d.id),
    front: editionFronts['first-edition'], thumbnail: editionFronts['first-edition'] };
});
export const teamRocketSet: PokemonSet = {
  id: TEAM_ROCKET_ID, name: 'Team Rocket', series: { id: 'base', name: 'Base' }, era: 'base', releaseDate: '2000-04-24',
  logo: '/packs/pokemon/base5-logo.png', cardIds: teamRocketCards.map(c => c.id), boosters: localBoosterArt(TEAM_ROCKET_ID)!,
};
const byId = new Map(teamRocketCards.map(c => [c.id, c]));
export function teamRocketCard(id: string): PokemonCard {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown Team Rocket card: ${id}`);
  return { ...card, variants: [...card.variants], boosterIds: [...card.boosterIds!], editionFronts: { ...card.editionFronts }, ...(card.types ? { types: [...card.types] } : {}) };
}
