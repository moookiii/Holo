import type { PokemonBooster } from './types.ts';

const designs: Record<string, readonly string[]> = {
  sv01: ['gyarados', 'koraidon', 'miraidon', 'partners'],
  sv02: ['chien-pao', 'meowscarada', 'quaquaval', 'skeledirge', 'ting-lu'],
  sv03: ['charizard', 'dragonite', 'revavroom', 'tyranitar'],
  sv04: ['armarouge', 'garchomp', 'iron-valiant', 'roaring-moon'],
  sv05: ['iron-crown', 'iron-leaves', 'raging-bolt', 'walking-wake'],
  sv06: ['dragapult', 'ogerpon', 'sinistcha', 'ursaluna'],
  sv07: ['cinderace', 'galvantula', 'lapras', 'terapagos'],
  sv08: ['alolan-exeggutor', 'archaludon', 'latias', 'pikachu'],
  sv09: ['hop-zacian', 'iono-bellibolt', 'lillie-clefairy', 'n-zoroark'],
  sv10: ['cynthia-garchomp', 'ethan-ho-oh', 'giovanni-mewtwo', 'team-rocket'],
};

/** TCGdex currently omits English booster metadata for these products. */
export function localBoosterArt(setId: string): PokemonBooster[] | undefined {
  const base = `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/`;
  if (setId === 'base1') return ['blastoise', 'charizard', 'venusaur'].map(design => ({ id: design,
    name: `${design[0].toUpperCase()}${design.slice(1)} booster`, front: `${base}base1-${design}.${design === 'venusaur' ? 'png' : 'jpg'}`, back: `${base}base1-back.jpg` }));
  if (setId === 'sv03.5') return [{ id: 'featured', name: 'Featured booster', front: `${base}sv03.5.webp`, back: `${base}sv03.5-back.png` }];
  return designs[setId]?.map(design => ({ id: design,
    name: `${design.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')} booster`,
    front: `${base}${setId}-${design}.webp` }));
}
