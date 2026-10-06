import { EXPEDITION_ID, expeditionSet, expeditionCard } from './ExpeditionCatalog.ts';
import { AQUAPOLIS_ID, aquapolisSet, aquapolisCard } from './AquapolisCatalog.ts';
import { SAMPLE_SET_ID, sampleSet, sampleSetCard } from './SampleSetCatalog.ts';
import { NEO_DESTINY_ID, neoDestinyCard, neoDestinySet } from './NeoDestinyCatalog.ts';
import { NEO_REVELATION_ID, neoRevelationCard, neoRevelationSet } from './NeoRevelationCatalog.ts';
import { SOUTHERN_ISLANDS_ID, southernIslandsCard, southernIslandsSet } from './SouthernIslandsCatalog.ts';
import { NEO_DISCOVERY_ID, neoDiscoveryCard, neoDiscoverySet } from './NeoDiscoveryCatalog.ts';
import { NEO_GENESIS_ID, neoGenesisCard, neoGenesisSet } from './NeoGenesisCatalog.ts';
import { GYM_CHALLENGE_ID, gymChallengeCard, gymChallengeSet } from './GymChallengeCatalog.ts';
import { GYM_HEROES_ID, gymHeroesCard, gymHeroesSet } from './GymHeroesCatalog.ts';
import { TEAM_ROCKET_ID, teamRocketCard, teamRocketSet } from './TeamRocketCatalog.ts';
import { BASE_SET_2_ID, baseSet2Card, baseSet2Set } from './BaseSet2Catalog.ts';
import { FOSSIL_SET_ID, fossilCard, fossilSet } from './FossilCatalog.ts';
import { LEGENDARY_COLLECTION_ID, legendaryCollectionCard, legendaryCollectionSet } from './LegendaryCollectionCatalog.ts';
import TCGdex from '@tcgdex/sdk';
import type { CatalogEntry, PokemonCard, PokemonSet, PrintVariant } from './types.ts';
import { boundedMap, pause } from './requests.ts';
import { localBoosterArt } from './boosterArt.ts';
import { PRISMATIC_SET_ID, prismaticCard, prismaticSet } from './PrismaticCatalog.ts';
import { JUNGLE_SET_ID, jungleCard, jungleSet } from './JungleCatalog.ts';
import { WIZARDS_PROMO_ID, wizardsPromoCard, wizardsPromoSet } from './WizardsPromoCatalog.ts';
import { POKEMON_151_ID, pokemon151Card, pokemon151Set } from './Pokemon151Catalog.ts';
import { isSvTcglSet, svTcglCard, svTcglSet, svTcglSets } from './SvTcglCatalog.ts';

// SDK 2.9 exposes transport injection but no per-call AbortSignal. Endpoint.get
// invokes the transport synchronously, before its first await. Capture the signal
// here (never read ambient state after an await); concurrent requests stay isolated.
let requestSignal: AbortSignal | undefined;
TCGdex.fetch = async (url, init) => {
  const signal = requestSignal ?? new AbortController().signal;
  const retrySkew = [...String(url)].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 240;
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetch(url, { ...init, headers: { Accept: 'application/json' }, signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new PermanentCatalogError(`TCGdex request failed (${response.status}).`);
      if (attempt === 4) throw new PermanentCatalogError('TCGdex is temporarily unavailable. Please retry.');
    } catch (error) {
      if (signal.aborted || error instanceof PermanentCatalogError) throw error;
      if (attempt === 4) throw new PermanentCatalogError('TCGdex network access failed. Retry to continue from the cached cards.');
    }
    // Offset concurrent card retries so a temporary gateway/CORS failure does
    // not make the entire set retry in one synchronized burst.
    await pause(350 * 2 ** attempt + retrySkew, signal);
  }
};
class PermanentCatalogError extends Error {}
const client = new TCGdex('en');
const image = (path?: string) => path ? /\.(png|webp|jpe?g)$/i.test(path) ? path : `${path}.webp` : undefined;
const localSetLogo = (setId: string) => {
  const logo = setId === SOUTHERN_ISLANDS_ID ? 'si1-logo.png' : setId === 'neo4' ? 'neo4-logo.png' : setId === 'neo3' ? 'neo3-logo.png' : setId === 'neo2' ? 'neo2-logo.png' : setId === 'neo1' ? 'neo1-logo.png' : setId === 'sv05' ? 'sv05-logo.png' : setId === 'gym2' ? 'gym2-logo.png' : setId === 'lc' ? 'lc-logo.png' : undefined;
  return logo ? `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/${logo}` : undefined;
};
const titleCase = (value: string) => value.replace(/\b\w/g, c => c.toUpperCase());

export class TcgdexAdapter {
  private cache = new Map<string, unknown>();
  private async read<T>(key: string, signal: AbortSignal, run: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    if (this.cache.has(key)) return this.cache.get(key) as T;
    let pending: Promise<T>;
    requestSignal = signal;
    try { pending = run(); } finally { requestSignal = undefined; }
    const value = await pending;
    signal.throwIfAborted(); this.cache.set(key, value); return value;
  }
  series(signal: AbortSignal): Promise<CatalogEntry[]> {
    return this.read('series', signal, async () => {
      const entries = await client.serie.list();
      if (!entries.length) throw new Error('No Pokémon series are available.');
      return entries.map(s => ({ id: s.id, name: s.name, logo: image(s.logo) }));
    });
  }
  sets(seriesId: string, signal: AbortSignal): Promise<CatalogEntry[]> {
    return this.read(`series:${seriesId}`, signal, async () => {
      if (seriesId === 'lc') return [{ id: LEGENDARY_COLLECTION_ID, name: legendaryCollectionSet.name, logo: legendaryCollectionSet.logo }];
      const serie = await client.serie.get(seriesId);
      if (!serie) throw new Error('This series is unavailable.');
      const sets = serie.sets
        .filter(s => seriesId !== 'base' || s.name !== 'W Promotional')
        .map(s => ({ id: s.id, name: s.name, logo: localSetLogo(s.id) ?? image(s.logo) }));
      if (seriesId === 'ecard') {
        const aquapolis = sets.findIndex(set => set.id === AQUAPOLIS_ID);
        if (aquapolis >= 0) sets.splice(aquapolis, 1);
        sets.push({ id: aquapolisSet.id, name: aquapolisSet.name, logo: aquapolisSet.logo });
        const expedition = sets.findIndex(set => set.id === EXPEDITION_ID);
        if (expedition >= 0) sets.splice(expedition, 1);
        sets.unshift({ id: expeditionSet.id, name: expeditionSet.name, logo: expeditionSet.logo });
        const old = sets.findIndex(set => set.id === SAMPLE_SET_ID);
        if (old >= 0) sets.splice(old, 1);
        // August 2002 precedes Expedition (September), Aquapolis and Skyridge.
        sets.unshift({ id: sampleSet.id, name: sampleSet.name, logo: sampleSet.logo });
        const chronology = [SAMPLE_SET_ID, EXPEDITION_ID, 'ecard2', 'ecard3'];
        sets.sort((a,b) => (chronology.indexOf(a.id) < 0 ? 99 : chronology.indexOf(a.id))
          - (chronology.indexOf(b.id) < 0 ? 99 : chronology.indexOf(b.id)));
      }
      if (seriesId === 'sv' && !sets.some(set => set.id === PRISMATIC_SET_ID)) sets.push({ id: PRISMATIC_SET_ID, name: prismaticSet.name, logo: prismaticSet.logo });
      if (seriesId === 'sv') {
        const local = [...svTcglSets, pokemon151Set, prismaticSet];
        for (const set of local) if (!sets.some(s => s.id === set.id)) sets.push({ id: set.id, name: set.name, logo: set.logo });
        const dates = new Map(local.map(set => [set.id, set.releaseDate]));
        sets.sort((a, b) => (dates.get(a.id) ?? '9999').localeCompare(dates.get(b.id) ?? '9999'));
      }
      if (seriesId === 'base') {
        // Local audited sets follow release order, even if discovery is unordered.
        let previous = 'base1';
        for (const local of [jungleSet, fossilSet, baseSet2Set, teamRocketSet]) {
          const old = sets.findIndex(set => set.id === local.id);
          if (old >= 0) sets.splice(old, 1);
          sets.splice(Math.max(0, sets.findIndex(set => set.id === previous) + 1), 0,
            { id: local.id, name: local.name, logo: local.logo });
          previous = local.id;
        }
        const promo = sets.findIndex(set => set.id === WIZARDS_PROMO_ID);
        if (promo >= 0) sets.splice(promo, 1);
        sets.push({ id: WIZARDS_PROMO_ID, name: wizardsPromoSet.name, logo: `${import.meta.env?.BASE_URL ?? '/'}packs/pokemon/basep-logo.webp` });
      }
      if (seriesId === 'neo') {
        const local = [neoGenesisSet, neoDiscoverySet, southernIslandsSet, neoRevelationSet, neoDestinySet];
        for (const set of local) if (!sets.some(s => s.id === set.id)) sets.push({ id: set.id, name: set.name, logo: set.logo });
        const dates = new Map(local.map(s => [s.id, s.releaseDate!]));
        sets.sort((a,b) => (dates.get(a.id) ?? '9999').localeCompare(dates.get(b.id) ?? '9999'));
      }
      if (seriesId === 'gym') {
        const index = sets.findIndex(s => s.id === GYM_HEROES_ID);
        if (index >= 0) sets.splice(index, 1);
        sets.unshift({ id: GYM_HEROES_ID, name: gymHeroesSet.name, logo: gymHeroesSet.logo });
        const challenge = sets.findIndex(s => s.id === GYM_CHALLENGE_ID);
        if (challenge >= 0) sets.splice(challenge, 1);
        sets.splice(1, 0, { id: GYM_CHALLENGE_ID, name: gymChallengeSet.name, logo: gymChallengeSet.logo });
      }
      return sets;
    });
  }
  set(id: string, signal: AbortSignal): Promise<PokemonSet> {
    return this.read(`set:${id}`, signal, async () => {
      if (id === EXPEDITION_ID) return { ...expeditionSet, series: { ...expeditionSet.series }, cardIds: [...expeditionSet.cardIds], boosters: expeditionSet.boosters.map(b => ({ ...b })) };
      if (id === AQUAPOLIS_ID) return { ...aquapolisSet, series: { ...aquapolisSet.series }, cardIds: [...aquapolisSet.cardIds], boosters: aquapolisSet.boosters.map(b => ({ ...b })) };
      if (id === SAMPLE_SET_ID) return { ...sampleSet, series: { ...sampleSet.series }, cardIds: [...sampleSet.cardIds], boosters: [] };
      if (isSvTcglSet(id)) return svTcglSet(id);
      if (id === POKEMON_151_ID) return { ...pokemon151Set, series: { ...pokemon151Set.series }, cardIds: [...pokemon151Set.cardIds], boosters: pokemon151Set.boosters.map(b => ({ ...b })) };
      if (id === SOUTHERN_ISLANDS_ID) return { ...southernIslandsSet, series: { ...southernIslandsSet.series }, cardIds: [...southernIslandsSet.cardIds], boosters: [] };
      if (id === NEO_DESTINY_ID) return { ...neoDestinySet, series: { ...neoDestinySet.series }, cardIds: [...neoDestinySet.cardIds], boosters: neoDestinySet.boosters.map(b => ({ ...b })) };
      if (id === NEO_REVELATION_ID) return { ...neoRevelationSet, series: { ...neoRevelationSet.series }, cardIds: [...neoRevelationSet.cardIds], boosters: neoRevelationSet.boosters.map(b => ({ ...b })) };
      if (id === NEO_DISCOVERY_ID) return { ...neoDiscoverySet, series: { ...neoDiscoverySet.series }, cardIds: [...neoDiscoverySet.cardIds], boosters: neoDiscoverySet.boosters.map(b => ({ ...b })) };
      if (id === NEO_GENESIS_ID) return { ...neoGenesisSet, series: { ...neoGenesisSet.series }, cardIds: [...neoGenesisSet.cardIds], boosters: neoGenesisSet.boosters.map(b => ({ ...b })) };
      if (id === WIZARDS_PROMO_ID) return { ...wizardsPromoSet, series: { ...wizardsPromoSet.series }, cardIds: [...wizardsPromoSet.cardIds], boosters: [] };
      if (id === GYM_CHALLENGE_ID) return { ...gymChallengeSet, series: { ...gymChallengeSet.series }, cardIds: [...gymChallengeSet.cardIds], boosters: gymChallengeSet.boosters.map(b => ({ ...b })) };
      if (id === GYM_HEROES_ID) return { ...gymHeroesSet, series: { ...gymHeroesSet.series }, cardIds: [...gymHeroesSet.cardIds], boosters: gymHeroesSet.boosters.map(b => ({ ...b })) };
      if (id === TEAM_ROCKET_ID) return { ...teamRocketSet, series: { ...teamRocketSet.series }, cardIds: [...teamRocketSet.cardIds], boosters: teamRocketSet.boosters.map(b => ({ ...b })) };
      if (id === LEGENDARY_COLLECTION_ID) return { ...legendaryCollectionSet, series: { ...legendaryCollectionSet.series }, cardIds: [...legendaryCollectionSet.cardIds], boosters: legendaryCollectionSet.boosters.map(b => ({ ...b })) };
      if (id === BASE_SET_2_ID) return { ...baseSet2Set, series: { ...baseSet2Set.series },
        cardIds: [...baseSet2Set.cardIds], boosters: baseSet2Set.boosters.map(booster => ({ ...booster })) };
      if (id === FOSSIL_SET_ID) return { ...fossilSet, series: { ...fossilSet.series },
        cardIds: [...fossilSet.cardIds], boosters: fossilSet.boosters.map(booster => ({ ...booster })) };
      if (id === JUNGLE_SET_ID) return { ...jungleSet, series: { ...jungleSet.series },
        cardIds: [...jungleSet.cardIds], boosters: jungleSet.boosters.map(booster => ({ ...booster })) };
      if (id === PRISMATIC_SET_ID) return { ...prismaticSet, series: { ...prismaticSet.series },
        cardIds: [...prismaticSet.cardIds], boosters: prismaticSet.boosters.map(booster => ({ ...booster })) };
      const set = await client.set.get(id);
      if (!set) throw new Error('This set is unavailable.');
      return { id: set.id, name: set.name, logo: localSetLogo(set.id) ?? image(set.logo), series: { id: set.serie.id, name: set.serie.name },
        era: set.serie.id, releaseDate: set.releaseDate, cardIds: set.cards.map(c => c.id),
        boosters: set.boosters?.length ? set.boosters.map(b => ({ id: b.id, name: b.name, logo: image(b.logo), front: image(b.artwork_front), back: image(b.artwork_back) }))
          : localBoosterArt(set.id) ?? [{ id: 'standard', name: 'Standard booster' }] };
    });
  }
  card(id: string, set: PokemonSet, signal: AbortSignal): Promise<PokemonCard> {
    return this.read(`card:${set.id}:${id}`, signal, async () => {
      if (set.id === EXPEDITION_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return expeditionCard(id);
      }
      if (set.id === AQUAPOLIS_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return aquapolisCard(id);
      }
      if (id.startsWith(AQUAPOLIS_ID + '-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (id.startsWith(EXPEDITION_ID + '-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === SAMPLE_SET_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return sampleSetCard(id);
      }
      if (id.startsWith(SAMPLE_SET_ID + '-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (isSvTcglSet(set.id)) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return svTcglCard(id);
      }
      if (isSvTcglSet(id.split('-')[0])) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === POKEMON_151_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return pokemon151Card(id);
      }
      if (id.startsWith(POKEMON_151_ID+'-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === SOUTHERN_ISLANDS_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return southernIslandsCard(id);
      }
      if (id.startsWith(SOUTHERN_ISLANDS_ID+'-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === NEO_DESTINY_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return neoDestinyCard(id);
      }
      if (id.startsWith('neo4-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === NEO_REVELATION_ID) {
        if (!set.cardIds.includes(id)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return neoRevelationCard(id);
      }
      if (id.startsWith('neo3-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === NEO_DISCOVERY_ID) {
        if (!id.startsWith('neo2-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return neoDiscoveryCard(id);
      }
      if (id.startsWith('neo2-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === NEO_GENESIS_ID) {
        if (!id.startsWith('neo1-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return neoGenesisCard(id);
      }
      if (id.startsWith('neo1-')) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === WIZARDS_PROMO_ID) return wizardsPromoCard(id);
      if (id.startsWith(`${WIZARDS_PROMO_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === GYM_CHALLENGE_ID) {
        if (!id.startsWith(`${GYM_CHALLENGE_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
        return gymChallengeCard(id);
      }
      if (id.startsWith(`${GYM_CHALLENGE_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === GYM_HEROES_ID) return gymHeroesCard(id);
      if (id.startsWith(`${GYM_HEROES_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === TEAM_ROCKET_ID) return teamRocketCard(id);
      if (set.id === LEGENDARY_COLLECTION_ID) return legendaryCollectionCard(id);
      if (id.startsWith(`${LEGENDARY_COLLECTION_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (id.startsWith(`${TEAM_ROCKET_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === BASE_SET_2_ID) return baseSet2Card(id);
      if (id.startsWith(`${BASE_SET_2_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === FOSSIL_SET_ID) return fossilCard(id);
      if (id.startsWith(`${FOSSIL_SET_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === JUNGLE_SET_ID) return jungleCard(id);
      if (id.startsWith(`${JUNGLE_SET_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      if (set.id === PRISMATIC_SET_ID) return prismaticCard(id);
      if (id.startsWith(`${PRISMATIC_SET_ID}-`)) throw new Error(`Card ${id} does not belong to ${set.id}`);
      const card = await client.card.get(id);
      if (!card || card.set.id !== set.id) throw new Error(`Card metadata unavailable: ${id}. Retry to keep the complete pool.`);
      const variants: PrintVariant[] = (['normal', 'reverse', 'holo'] as const).filter(v => card.variants?.[v]);
      const foil: PokemonCard['foil'] = {};
      // Exclude promotional stamps/oversize/reprint foils from retail eligibility.
      for (const v of card.variantsDetailed ?? []) {
        if ((v.size && v.size !== 'standard') || v.stamp?.length || v.subtype) continue;
        if (!['normal', 'reverse', 'holo'].includes(v.type)) continue;
        const type = v.type as PrintVariant;
        if (!variants.includes(type)) variants.push(type);
        if (v.foil && !foil[type]) foil[type] = v.foil;
        if (!v.foil) foil[type] = ''; // Ordinary printing takes precedence over e.g. tin Cosmos.
      }
      if (!variants.length) throw new Error(`Print variants missing for ${id}.`);
      // Early WotC numbered holo-only rares share TCGdex's "Rare" label.
      const rarity = set.era === 'base' && card.rarity === 'Rare' && variants.includes('holo') && !variants.includes('normal') ? 'Holo Rare' : titleCase(card.rarity);
      return { id: card.id, localId: card.localId, name: card.name, setId: set.id, setName: set.name,
        seriesId: set.series.id, seriesName: set.series.name, era: set.era, rarity, category: card.category, energyType: card.energyType, variants, foil, evolveFrom: card.evolveFrom,
        boosterIds: card.boosters?.map(b => b.id), front: card.image ? card.getImageURL('high', 'png') : undefined,
        thumbnail: card.image ? card.getImageURL('low', 'webp') : undefined };
    });
  }
  cards(set: PokemonSet, signal: AbortSignal, progress: (done: number, total: number) => void = () => {}) {
    let done = 0;
    return boundedMap(set.cardIds, 3, signal, async id => {
      const card = await this.card(id, set, signal); progress(++done, set.cardIds.length); return card;
    });
  }
}
export const pokemonCatalog = new TcgdexAdapter();
