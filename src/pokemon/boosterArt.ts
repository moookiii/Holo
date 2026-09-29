import { editionLabel, type PokemonBooster } from './types.ts';
import { wotcWrappers } from './WotcProducts.ts';

const designs: Record<string, readonly string[]> = {
  sv01: ['gyarados', 'koraidon', 'miraidon', 'partners'],
  sv02: ['chien-pao', 'meowscarada', 'quaquaval', 'skeledirge', 'ting-lu'],
  sv03: ['charizard', 'dragonite', 'revavroom', 'tyranitar'],
  sv04: ['armarouge', 'garchomp', 'iron-valiant', 'roaring-moon'],
  sv05: ['iron-crown', 'iron-leaves', 'raging-bolt', 'walking-wake'],
  sv06: ['dragapult', 'ogerpon', 'sinistcha', 'ursaluna'],
  sv07: ['cinderace', 'galvantula', 'lapras', 'terapagos'],
  sv08: ['alolan-exeggutor', 'archaludon', 'latias', 'pikachu'],
  'sv08.5': ['eevee-sylveon', 'espeon-umbreon', 'leafeon-glaceon', 'vaporeon-jolteon-flareon'],
  sv09: ['hop-zacian', 'iono-bellibolt', 'lillie-clefairy', 'n-zoroark'],
  sv10: ['cynthia-garchomp', 'ethan-ho-oh', 'giovanni-mewtwo', 'team-rocket'],
};

/** TCGdex currently omits English booster metadata for these products. */
export function localBoosterArt(setId: string): PokemonBooster[] | undefined {
  const base = `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/`;
  const product = wotcWrappers[setId];
  if (product) return product.designs.map(design => ({ id: design.id,
    name: `${design.name ?? design.id[0].toUpperCase()+design.id.slice(1)} booster${design.edition ? ' · '+editionLabel(design.edition) : ''}${design.front ? '' : ' · artwork pending'}`,
    ...(design.edition ? { edition: design.edition } : {}),
    front: design.front ? `${base}${design.front}` : undefined, frontBounds: design.frontBounds,
    back: `${base}${design.back ?? product.back}`, backBounds: design.backBounds ?? product.backBounds }));
  if (setId === 'sv03.5') return [{ id: 'featured', name: 'Featured booster', front: `${base}sv03.5.webp`, back: `${base}sv03.5-back.png` }];
  return designs[setId]?.map(design => ({ id: design,
    name: `${design.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')} booster`,
    front: `${base}${setId}-${design}.webp` }));
}
