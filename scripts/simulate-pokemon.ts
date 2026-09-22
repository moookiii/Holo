/** Developer-only: node --experimental-strip-types scripts/simulate-pokemon.ts sv01 10000 */
import { pokemonCatalog } from '../src/pokemon/TcgdexAdapter.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { recipeFor } from '../src/pokemon/recipes.ts';

const setId = process.argv[2] ?? 'sv01', count = Number(process.argv[3] ?? 10000);
if (!recipeFor(setId)) throw new Error('No validated recipe for this set');
if (!Number.isInteger(count) || count < 1 || count > 1000000) throw new Error('Use 1–1000000 packs');
const signal = AbortSignal.timeout(180000);
const set = await pokemonCatalog.set(setId, signal), cards = await pokemonCatalog.cards(set, signal);
const boosterId = process.argv[4] ?? set.boosters[0].id;
const frequency = new Map<string, number>();
for (let seed = 0; seed < count; seed++) {
  for (const pull of collatePokemon(setId, boosterId, seed, cards).pulls) {
    const key = `${pull.slot.split(':')[0]} / ${pull.card.rarity} / ${pull.variant}`;
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  if (seed % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
}
console.log(`${set.name}: ${count} packs. Observed simulation frequencies are not recipe evidence.`);
console.table([...frequency].map(([slot, cards]) => ({ slot, cards, perPack: (cards / count).toFixed(5) })));
