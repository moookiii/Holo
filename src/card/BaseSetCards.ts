import type { CardDefinition } from './CardDefinition';

/** Original English 1999 printings. These identities also serve TCGdex packs. */
export const baseSetSubjects = [
  ['Alakazam', 'alakazam', [.012, .025, .065], [.005, .027, .153]],
  ['Blastoise', 'blastoise', [.042, .046, .115], [.005, .019, .050]],
  ['Chansey', 'chansey', [.031, .051, .057], [.032, .061, .105]],
  ['Charizard', 'charizard', [.050, .013, .023], [.102, .014, .014]],
  ['Clefairy', 'clefairy', [.057, .023, .052], [.063, .033, .087]],
  ['Gyarados', 'gyarados', [.007, .035, .061], [.002, .015, .072]],
  ['Hitmonchan', 'hitmonchan', [.026, .056, .024], [.013, .074, .036]],
  ['Machamp', 'machamp', [.019, .021, .051], [.007, .006, .041]],
  ['Magneton', 'magneton', [.070, .031, .009], [.095, .042, .030]],
  ['Mewtwo', 'mewtwo', [.025, .019, .058], [.010, .013, .065]],
  ['Nidoking', 'nidoking', [.060, .039, .015], [.070, .023, .004]],
  ['Ninetales', 'ninetales', [.017, .027, .054], [.012, .009, .070]],
  ['Poliwrath', 'poliwrath', [.017, .025, .073], [.014, .014, .112]],
  ['Raichu', 'raichu', [.028, .056, .043], [.007, .050, .070]],
  ['Venusaur', 'venusaur', [.015, .066, .030], [.006, .061, .019]],
  ['Zapdos', 'zapdos', [.026, .024, .030], [.011, .006, .005]],
] as const;

export const baseSetCards: CardDefinition[] = baseSetSubjects.map(([title, slug, color, backgroundColor], index) => {
  const number = index + 1;
  const root = number === 4 ? '/cards/charizard-base-set' : `/cards/pokemon/base-set/${slug}`;
  return {
    id: `${slug}-base-set`, title, franchise: 'Pokémon', set: 'Base Set · First Edition', number: `${number}/102`,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: number === 4 ? 'https://assets.tcgdex.net/en/base/base1/4/high.png' : `${root}/front.png`, back: '/cards/pokemon/back.jpg',
    profile: 'pokemon-base-set-star', seed: 1995 + number,
    maps: { foil: `${root}/foil.png`, laminate: `${root}/laminate.png` },
    layout: { artwork: [64/600, 100/825, 537/600, 423/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
    mapSettings: { embossStrength: 0 },
    // Correct the scan's median background while preserving its spatial color and rays.
    substrate: { color: [...color], backgroundColor: [...backgroundColor], printRetention: 0 },
    source: {
      image: number === 4 ? 'https://assets.tcgdex.net/en/base/base1/4/high.png' : `https://images.pokemontcg.io/base1/${number}_hires.png`,
      metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/base1.json',
      notes: number === 4
        ? 'TCGdex Base Set Charizard front image, served from the official TCGdex asset endpoint. Existing Charizard optical maps remain registered to the standard 600 × 825 card frame.'
        : 'Unmodified 600 × 825 original English Base Set scan. Individually traced subject and foreground protection, registered 1200 × 1650 background-only foil. Early Galaxy-Star sheet; no relief or image hologram. See docs/base-set-holos.md for references, authoring and visual review.',
    },
  };
});

export const baseSetAuthoredIds: Readonly<Record<string, string>> = Object.fromEntries(
  baseSetCards.map((card, index) => [`base1-${index + 1}`, card.id]),
);
