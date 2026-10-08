import type { PokemonRecipe } from './recipes.ts';
import { svTcglCard } from './SvTcglCatalog.ts';

/** Full physical opening at 12:56–15:10, not a guessed God-pack frequency.
 * The opener moves the final Energy to the front; restore sealed-pack order.
 * Collector IDs and the Metal foil Energy were checked against the video. */
const whiteFlareGod: PokemonRecipe = {
  id: 'sv10.5w-replay-jonsandman-god', version: '1', setId: 'sv10.5w', era: 'sv',
  sources: ['https://www.youtube.com/watch?v=SndovRbaKLs&t=776s'],
  note: 'Verified God pack replay · nine Illustration Rares + Whimsicott ex SIR + foil Metal Energy. This is a fixed recorded opening, not random odds.',
  energyCards: [{ ...svTcglCard('sve-24-ph'), rarity: 'Energy' }],
  slots: [...[104,139,154,87,151,96,111,156,133,165].map((number,index) => ({
    id: `replay-${index+1}`, count: 1,
    outcomes: [{ weight: 1, rarities: [index===9 ? 'Special Illustration Rare' : 'Illustration Rare'],
      variant: 'holo' as const, cardIds: [`sv10.5w-${String(number).padStart(3,'0')}`] }],
  })), { id: 'energy', count: 1, pool: 'energy',
    outcomes: [{ weight: 1, rarities: ['Energy'], variant: 'reverse', cardIds: ['sve-24-ph'] }] }],
};
export const svPackReplays: readonly PokemonRecipe[] = [whiteFlareGod];
export const replaysForSet = (setId: string) => svPackReplays.filter(recipe=>recipe.setId===setId);
