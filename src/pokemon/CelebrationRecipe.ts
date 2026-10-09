import type { PokemonRecipe } from './recipes.ts';
import { celebrationCards, celebrationClassicIds, CELEBRATION_UPC_ID } from './CelebrationCatalog.ts';

export const celebrationRateEstimates = {
  double: 1 / 4, illustration: 1 / 5, classic: 1 / 10, special: 1 / 21, futuristic: 1 / 120,
  // One observed hit is not a reliable factory probability; retain explicitly
  // as an estimate rather than asserting the circulating 1/20,000 rumor.
  rgb: 1 / 4063,
} as const;
const ids = (rarity: string) => celebrationCards.filter(card => card.rarity === rarity).map(card => card.id);
const sources = [
  'https://www.tcgplayer.com/content/article/Collector-s-Guide-to-Pok%C3%A9mon-TCG-30th-Celebration/bac99231-4293-4373-af64-6f5ed0d5735d/',
  'https://www.pokebeach.com/2026/09/30th-celebration-pull-rates-and-most-valuable-cards-worldwide-friendliest-pull-rates-of-the-modern-era',
  'https://www.reddit.com/r/PokemonTCG/comments/1whk28a/i_recorded_30th_pull_rate_on_over_4000_pack/',
];
const r = celebrationRateEstimates;
export const celebrationRecipe: PokemonRecipe = {
  id: '30th-english-retail', version: '1-estimated-common-pools', setId: '30th', era: 'me',
  boosterIds: ['english'], poolSetIds: ['30th', '30th-classic', '30th-rgb', 'mee'],
  requiredCardIds: celebrationCards.map(card => card.id), sources,
  note: '6 foil cards · guaranteed Pikachu and anniversary Energy · estimated pull rates. Common subpool membership and RGB odds remain unverified; temporary materials.',
  slots: [
    { id: 'common-1', count: 1, unique: true, uniqueGroup: 'commons', outcomes: [{ weight: 1, rarities: ['Common'], cardIds: ids('Common'), variant: 'holo' }] },
    { id: 'common-2', count: 1, unique: true, uniqueGroup: 'commons', outcomes: [{ weight: 1, rarities: ['Common'], cardIds: ids('Common'), variant: 'holo' }] },
    { id: 'common-replacement', count: 1, unique: true, uniqueGroup: 'commons', outcomes: [
      { weight: 1-r.illustration-r.classic, rarities: ['Common'], cardIds: ids('Common'), variant: 'holo' },
      { weight: r.illustration, rarities: ['Illustration Rare'], variant: 'holo' },
      { weight: r.classic, rarities: ['Classic Collection'], cardIds: celebrationClassicIds, variant: 'holo' },
    ] },
    { id: 'rare', count: 1, outcomes: [
      { weight: 1-r.double-r.special-r.futuristic-r.rgb, rarities: ['Rare'], variant: 'holo' },
      { weight: r.double, rarities: ['Double Rare'], variant: 'holo' },
      { weight: r.special, rarities: ['Special Illustration Rare'], variant: 'holo' },
      { weight: r.futuristic, rarities: ['Futuristic Rare'], variant: 'holo' },
      { weight: r.rgb, rarities: ['Rgb Rare'], variant: 'holo' },
    ] },
    { id: 'pikachu', count: 1, outcomes: [{ weight: 1, rarities: ['Pikachu Rare'], cardIds: ids('Pikachu Rare'), variant: 'holo' }] },
    { id: 'anniversary-energy', count: 1, outcomes: [{ weight: 1, rarities: ['Energy'], cardIds: ids('Energy'), variant: 'holo' }] },
  ],
};
export const celebrationUpcRecipe: PokemonRecipe = {
  id: '30th-upc-classic', version: '1-estimated-within-pool', setId: CELEBRATION_UPC_ID, era: 'me',
  boosterIds: ['upc-classic'], poolSetIds: ['30th-classic'], requiredCardIds: celebrationClassicIds,
  sources: [sources[0]],
  note: '3 Classic Collection foil cards · UPC product. Uniform sampling without duplicates is an estimate; released November 6, 2026.',
  slots: [{ id: 'classic', count: 3, unique: true, outcomes: [{ weight: 1, rarities: ['Classic Collection'], cardIds: celebrationClassicIds, variant: 'holo' }] }],
};
