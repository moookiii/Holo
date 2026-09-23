import type { CardDefinition } from './CardDefinition';

/** Original English 1999 printings. These identities also serve TCGdex packs. */
export const baseSetSubjects = [
  ['Alakazam', 'alakazam', [.012, .025, .065]],
  ['Blastoise', 'blastoise', [.042, .046, .115]],
  ['Chansey', 'chansey', [.031, .051, .057]],
  ['Charizard', 'charizard', [.050, .013, .023]],
  ['Clefairy', 'clefairy', [.057, .023, .052]],
  ['Gyarados', 'gyarados', [.007, .035, .061]],
  ['Hitmonchan', 'hitmonchan', [.026, .056, .024]],
  ['Machamp', 'machamp', [.019, .021, .051]],
  ['Magneton', 'magneton', [.070, .031, .009]],
  ['Mewtwo', 'mewtwo', [.025, .019, .058]],
  ['Nidoking', 'nidoking', [.060, .039, .015]],
  ['Ninetales', 'ninetales', [.017, .027, .054]],
  ['Poliwrath', 'poliwrath', [.017, .025, .073]],
  ['Raichu', 'raichu', [.028, .056, .043]],
  ['Venusaur', 'venusaur', [.015, .066, .030]],
  ['Zapdos', 'zapdos', [.026, .024, .030]],
] as const;

export const baseSetCards: CardDefinition[] = baseSetSubjects.map(([title, slug, color], index) => {
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
    // Suppress stationary scan illumination while retaining the colored ground.
    // Zapdos's illustrated rays need more print retention than the plain fields.
    substrate: { color: [...color], printRetention: number === 16 ? .34 : .09 },
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
