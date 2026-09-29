import type { PokemonRecipe } from './recipes.ts';
import type { PrintEdition } from './types.ts';

export const teamRocketEditions: readonly PrintEdition[] = ['first-edition'];
const designs = [
  { id: 'gyarados', name: 'Gyarados' }, { id: 'giovanni', name: 'Giovanni' },
  { id: 'jessie-james', name: 'Jessie & James' }, { id: 'team-rocket', name: 'Team Rocket' },
];
export const teamRocketWrapper = {
  back: 'base5-back.jpg', backBounds: [60/685, 48/1067, 607/685, 1010/1067] as [number, number, number, number],
  designs: teamRocketEditions.flatMap(edition => designs.map(design => ({
    id: `${design.id}-${edition}`, name: design.name, edition,
    front: `base5-${design.id}-${edition}.png`,
  }))),
};
/** Project policy, not a claim about recovered factory odds. Replaces rare. */
export const teamRocketSecretChance = 1 / 90;
export const teamRocketRecipe: PokemonRecipe = {
  id: 'base5-english-retail', version: '1', setId: 'base5', era: 'base',
  boosterIds: teamRocketWrapper.designs.map(d => d.id),
  boosterEditions: Object.fromEntries(teamRocketWrapper.designs.map(d => [d.id, d.edition])),
  requiredCardIds: Array.from({ length: 83 }, (_, i) => `base5-${i+1}`),
  sources: ['https://api.tcgdex.net/v2/en/sets/base5', 'https://www.psacard.com/articles/articleview/9247/public/locales'],
  note: '2000 Team Rocket · 7 commons + 3 uncommons + 1 rare. Dark Raichu: 1 in 90 packs (project rule). Holo visuals pending.',
  slots: [
    { id: 'common', count: 7, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'uncommon', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Rare'], variant: 'normal' },
      { weight: 1/3 - teamRocketSecretChance, rarities: ['Holo Rare'], variant: 'holo' },
      { weight: teamRocketSecretChance, rarities: ['Secret Rare'], variant: 'holo', cardIds: ['base5-83'] },
    ] },
  ],
};
