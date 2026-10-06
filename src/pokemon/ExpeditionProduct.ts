import type { PokemonRecipe } from './recipes.ts';

export const expeditionWrapper = {
  back: 'ecard1-back.jpg',
  designs: ['venusaur', 'charizard', 'blastoise', 'feraligatr'].map(id => ({
    id, name: id[0].toUpperCase() + id.slice(1), front: `ecard1-${id}.png`,
  })),
};
/** Contemporary Wizards Q&A: the holo replaces a COMMON; the rare is guaranteed. */
export const expeditionRecipe: PokemonRecipe = {
  id: 'ecard1-english-retail', version: '1', setId: 'ecard1', era: 'ecard',
  boosterIds: expeditionWrapper.designs.map(d => d.id),
  requiredCardIds: Array.from({ length: 165 }, (_, i) => `ecard1-${i+1}`),
  sources: ['https://www.pojo.com/Features/Sept2002/090602-WOTCMTMQuestions.html',
    'https://www.pojo.com/chrisbo/092002WotcChat.html',
    'https://api.tcgdex.net/v2/en/sets/ecard1'],
  note: '2002 Expedition · 9 cards · 5 commons (a holo replaces one in 1:3 packs) + 2 uncommons + 1 non-holo rare + 1 reverse holo. No dedicated Energy slot or box guarantee. Uniform eligible cards are a simulation assumption; factory sheet frequencies are unverified.',
  slots: [
    { id: 'common', count: 4, unique: true, outcomes: [{ weight: 1, rarities: ['Common'], variant: 'normal' }] },
    { id: 'common-or-holo', count: 1, outcomes: [
      { weight: 2/3, rarities: ['Common'], variant: 'normal' },
      { weight: 1/3, rarities: ['Holo Rare'], variant: 'holo' },
    ] },
    { id: 'uncommon', count: 2, unique: true, outcomes: [{ weight: 1, rarities: ['Uncommon'], variant: 'normal' }] },
    { id: 'rare', count: 1, outcomes: [{ weight: 1, rarities: ['Rare'], variant: 'normal' }] },
    { id: 'reverse', count: 1, outcomes: [{ weight: 1, rarities: ['Common','Uncommon','Rare','Holo Rare'],
      variant: 'reverse', cardIds: Array.from({ length: 159 }, (_, i) => `ecard1-${i+1}`) }] },
  ],
};
