import { editionLabel, type PokemonBooster } from './types.ts';
import { wotcWrappers } from './WotcProducts.ts';
import { swshWrappers } from './data/swsh-wrappers.generated.ts';
import { smWrappers } from './data/sm-wrappers.generated.ts';
import { packBacks } from './packBacks.ts';

const designs: Record<string, readonly string[]> = {
  me01: ['mega-gardevoir','mega-kangaskhan','mega-lucario','mega-venusaur'],
  me02: ['mega-charizard-x','mega-gengar','mega-sharpedo','mega-lopunny'],
  'me02.5': ['mega-dragonite'],
  me03: ['mega-clefable','mega-starmie','mega-zygarde','meowth'],
  me04: ['mega-dragalge','mega-floette','mega-greninja','mega-pyroar'],
  me05: ['mega-chandelure','mega-darkrai','mega-excadrill','mega-zeraora'],
  sv01: ['gyarados', 'koraidon', 'miraidon', 'partners'],
  sv02: ['chien-pao', 'meowscarada', 'quaquaval', 'skeledirge', 'ting-lu'],
  sv03: ['charizard', 'dragonite', 'revavroom', 'tyranitar'],
  sv04: ['armarouge', 'garchomp', 'iron-valiant', 'roaring-moon'],
  'sv04.5': ['pikachu', 'ceruledge', 'tinkaton', 'dondozo'],
  sv05: ['iron-crown', 'iron-leaves', 'raging-bolt', 'walking-wake'],
  sv06: ['dragapult', 'ogerpon', 'sinistcha', 'ursaluna'],
  'sv06.5': ['okidogi', 'munkidori', 'fezandipiti', 'pecharunt'],
  sv07: ['cinderace', 'galvantula', 'lapras', 'terapagos'],
  sv08: ['alolan-exeggutor', 'archaludon', 'latias', 'pikachu'],
  'sv08.5': ['eevee-sylveon', 'espeon-umbreon', 'leafeon-glaceon', 'vaporeon-jolteon-flareon'],
  sv09: ['hop-zacian', 'iono-bellibolt', 'lillie-clefairy', 'n-zoroark'],
  sv10: ['cynthia-garchomp', 'ethan-ho-oh', 'giovanni-mewtwo', 'team-rocket'],
  'sv10.5b': ['zekrom'],
  'sv10.5w': ['reshiram'],
};

/** TCGdex currently omits English booster metadata for these products. */
export function localBoosterArt(setId: string): PokemonBooster[] | undefined {
  const base = `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/`;
  const back = packBacks[setId] ? { back: `${base}${packBacks[setId]}` } : {};
  if (swshWrappers[setId]) return swshWrappers[setId].map(art => ({ ...art, ...back }));
  if (smWrappers[setId]) return smWrappers[setId].map(art => ({ ...art, ...back }));
  if (['me01','me02','me02.5','me03','me04','me05'].includes(setId)) return designs[setId].map((design,index) => ({ id: design,
    name: `English booster · ${design.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')}`, front: `${base}${setId}-pack-${index}.png`,
    ...back }));
  if (setId === '30th') return [{ id: 'english', name: 'English six-card booster', front: `${base}30th-front.png`, ...back }];
  if (setId === '30th-classic-upc') return [{ id: 'upc-classic', name: 'UPC three-card Classic Collection booster', front: `${base}30th-classic-front.png`, ...back }];
  if (setId === '2024sv') return [{ id: 'english', name: 'English four-card booster', front: `${base}2024sv-front.png`, ...back }];
  const product = wotcWrappers[setId];
  if (product) return product.designs.map(design => ({ id: design.id,
    name: `${design.name ?? design.id[0].toUpperCase()+design.id.slice(1)} booster${design.edition ? ' · '+editionLabel(design.edition) : ''}${design.front ? '' : ' · artwork pending'}`,
    ...(design.edition ? { edition: design.edition } : {}),
    front: design.front ? `${base}${design.front}` : undefined, frontBounds: design.frontBounds,
    back: `${base}${design.back ?? product.back}`, backBounds: design.backBounds ?? product.backBounds }));
  if (setId === 'sv03.5') return [{ id: 'featured', name: 'Featured booster', front: `${base}sv03.5.webp`, back: `${base}sv03.5-back.png` }];
  return designs[setId]?.map(design => ({ id: design,
    name: `${design.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')} booster`,
    front: `${base}${setId}-${design}.webp`, ...back }));
}
