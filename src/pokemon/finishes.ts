import type { CardDefinition } from '../card/CardDefinition.ts';
import { printVariantLabel, type PrintVariant } from './types.ts';

/** Physical finish facets are independent of renderer/profile identifiers. */
export const pokemonFinishLabels: Readonly<Record<string, string>> = {
  'foil:cosmos': 'Cosmos holo', 'foil:galaxy-star': 'Galaxy Star holo',
  'foil:etched': 'Etched holo', 'foil:gold-etched': 'Gold etched holo',
  'foil:rainbow': 'Rainbow holo', 'foil:mirage': 'Mirage holo',
  'foil:confetti': 'Confetti holo', 'foil:cracked-ice': 'Cracked Ice holo',
  'foil:tinsel': 'Tinsel holo', 'foil:line': 'Line holo',
  'foil:water-web': 'Water-Web holo', 'foil:sun-pillar': 'Sun Pillar holo',
  'foil:sun-beam': 'Sun Beam holo', 'foil:sun-lava': 'Sun Lava holo',
  'foil:angled-pillars': 'Angled Pillars holo', 'foil:flat-silver': 'Silver holo',
  'foil:radiant': 'Radiant holo', 'foil:ace-spec': 'ACE SPEC holo',
  'foil:classic': 'Classic Collection holo', 'foil:rgb': 'RGB holo',
  'foil:ancient-mew': 'Ancient Mew foil', 'foil:gold-stamp': 'Gold stamp',
  'foil:energy-reverse': 'Energy-symbol reverse holo',
  'foil:fireworks-reverse': 'Fireworks reverse holo',
  'foil:e-reader-reverse': 'E-reader reverse holo',
  'foil:pokeball-reverse': 'Poké Ball reverse holo',
  'foil:masterball-reverse': 'Master Ball reverse holo',
  'foil:stamped': 'Stamped foil',
  'foil:pikachu': 'Pikachu holo', 'foil:full-art': 'Full-art holo',
};

const sourceFinishes: Readonly<Record<string, string>> = {
  cosmos: 'cosmos', cosmosholo: 'cosmos', wotcexteriorcosmos: 'cosmos', galaxy: 'galaxy-star', galaxystar: 'galaxy-star',
  rainbow: 'rainbow', svholo: 'mirage', confetti: 'confetti', crackedice: 'cracked-ice',
  tinsel: 'tinsel', swholo: 'line', sunpillar: 'sun-pillar', sunbeam: 'sun-beam',
  sunlava: 'sun-lava', angledpillars: 'angled-pillars', flatsilver: 'flat-silver',
  radiantholo: 'radiant', acefoil: 'ace-spec', classicfoil: 'classic',
  celebrations: 'classic', rgb: 'rgb', stamped: 'stamped',
  pikachu: 'pikachu', svultra: 'full-art', svultrascodix: 'full-art',
  pokeball: 'pokeball-reverse', masterball: 'masterball-reverse', energy: 'energy-reverse',
};

const profileFinishes: Readonly<Record<string, string>> = {
  'pokemon-base-set-star': 'galaxy-star', 'pokemon-galaxy-star': 'galaxy-star',
  'pokemon-base-set-2-cosmos': 'cosmos', 'pokemon-cosmos': 'cosmos', 'pokemon-cosmos-hd': 'cosmos', 'svp-cosmos': 'cosmos',
  'modern-pokemon-base-set-2-cosmos': 'cosmos', 'modern-pokemon-cosmos': 'cosmos',
  'modern-pokemon-cosmos-hd': 'cosmos', 'modern-svp-cosmos': 'cosmos', 'modern-pokemon-evolutions-holo': 'cosmos',
  'pokemon-cracked-ice': 'cracked-ice', 'pokemon-tinsel': 'tinsel', 'pokemon-pixel': 'confetti',
  'pokemon-vertical-line': 'line', 'pokemon-water-web': 'water-web', 'pokemon-mirage': 'mirage',
  'pokemon-ace-spec': 'ace-spec', 'swsh-radiant': 'radiant', 'swsh-shiny-silver': 'flat-silver',
  'swsh-celebrations-silver': 'flat-silver', 'swsh-celebrations-classic': 'classic',
  'pokemon-ancient-mew': 'ancient-mew', 'pokemon-first-movie-gold': 'gold-stamp',
  'pokemon-legendary-reverse': 'fireworks-reverse', 'pokemon-e-reader': 'e-reader-reverse',
  'pokemon-ex-energy': 'energy-reverse', 'swsh-reverse-energy': 'energy-reverse',
  'bw-pokeball-reverse': 'pokeball-reverse', 'prismatic_pokeball_reverse': 'pokeball-reverse',
  'bw-masterball-reverse': 'masterball-reverse', 'prismatic_masterball_reverse': 'masterball-reverse',
};

export function pokemonPrintVariant(card: CardDefinition): PrintVariant | undefined {
  if (card.franchise !== 'Pokémon' || card.construction?.kind === 'metal') return undefined;
  return card.pokemon?.variant ?? (card.coverageMode === 'reverse' || /reverse holo/i.test(card.set + ' ' + card.number)
    ? 'reverse' : card.profile === 'print-only' ? 'normal' : 'holo');
}

export function pokemonFinishTags(card: CardDefinition): string[] {
  const variant = pokemonPrintVariant(card);
  if (!variant) return [];
  const tags: string[] = [variant];
  const add = (finish: string | undefined) => {
    if (!finish || finish === variant && ['pokeball-reverse', 'masterball-reverse'].includes(variant)) return;
    tags.push(`foil:${finish}`);
  };
  const rawFoil = card.pokemon?.foil?.[variant]?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sourceFinish = rawFoil ? sourceFinishes[rawFoil] : undefined;
  add(sourceFinish);
  const profileFinish = profileFinishes[card.profile];
  if (variant !== 'normal') {
    // Physical-source metadata takes precedence over a provisional shader.
    if (!sourceFinish) add(profileFinish);
    if (card.maps?.normal && /texture|etched|gold|rainbow|mega-(attack|hyper)-rare/.test(card.profile)) add('etched');
    if (/gold/.test(card.profile) && card.maps?.normal) add('gold-etched');
  } else if (profileFinish === 'gold-stamp' || /First Movie gold stamp/i.test(card.number)) add('gold-stamp');
  return [...new Set(tags)];
}

export function pokemonFinishLabel(value: string): string {
  if (value === 'holo') return 'All holo finishes';
  if (value === 'regular-holo') return 'Regular holo';
  if (value === 'special-reverse') return 'Special reverse holo';
  return pokemonFinishLabels[value] ?? printVariantLabel(value as PrintVariant) ?? value;
}
