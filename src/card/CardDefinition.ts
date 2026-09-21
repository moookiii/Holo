import type { CardProfileOverrides } from '../materials/HolographicProfile';
import { nonHoloCards } from './NonHoloCards.ts';
import { holoBulkCards } from './HoloBulkCards.ts';
import { yugiohTopCards } from './YugiohTopCards.ts';

export type Franchise = 'Original' | 'Pokémon' | 'Yu-Gi-Oh!' | 'Magic: The Gathering';
export interface CardLayout {
  /** Normalized rectangles in the front image, measured from its top left. */
  artwork: [number, number, number, number];
  innerFrame: [number, number, number, number];
}
export const DEFAULT_FOIL_LAYOUT: CardLayout = { artwork: [.12, .18, .88, .70], innerFrame: [.035, .023, .965, .977] };

export interface CardMapPaths {
  /** Packed RGBA: primary foil, secondary foil, metallic ink, laminate. */
  coverage?: string;
  /** Packed RGB: height, roughness, sparkle. Alpha is reserved. */
  surface?: string;
  /** Individual grayscale maps override the corresponding packed channel. */
  foil?: string;
  /** Authored body/border coverage for a reverse printing; never inferred from artwork. */
  reverseFoil?: string;
  /** Grayscale repeated symbol for CPU manufacturing; adds no GPU sampler. */
  motif?: string;
  secondaryMotif?: string;
  stampMotif?: string;
  /** Additional foil areas for full-card/parallel treatments, with print exclusions authored into the mask. */
  extendedFoil?: string;
  secondaryFoil?: string;
  metallic?: string;
  laminate?: string;
  height?: string;
  roughness?: string;
  sparkle?: string;
  stamp?: string;
  /** Pattern visibility does not remove the underlying metal substrate. */
  pattern?: string;
  secondaryPattern?: string;
  stampPattern?: string;
  /** White protects print from all foil/metal/stamp coverage; black retains it. */
  protection?: string;
  /** RG: double-angle grating axis, B: relative spacing, A: patterned regions. */
  direction?: string;
  secondaryDirection?: string;
  stampDirection?: string;
  /** OpenGL tangent-space normal map, +Y up. */
  normal?: string;
  /** Image hologram data: R virtual depth, G image window, B angular offset. NoColorSpace. */
  hologram?: string;
}

export interface CardDimensions {
  /** Centimetres; all scene geometry uses the same units. */
  width: number;
  height: number;
  thickness: number;
  cornerRadius: number;
  bevel: number;
}

export const DIMENSIONS = {
  standard: { width: 6.3, height: 8.8, thickness: 0.032, cornerRadius: 0.3, bevel: 0.007 },
  yugioh: { width: 5.9, height: 8.6, thickness: 0.031, cornerRadius: 0.1, bevel: 0.006 },
} satisfies Record<string, CardDimensions>;

export interface CardDefinition {
  id: string;
  title: string;
  franchise: Franchise;
  set: string;
  number: string;
  dimensions: CardDimensions;
  front: string;
  back: string;
  /** Normalized image rectangle [left, top, right, bottom], before UV Y inversion. */
  backCrop?: [number, number, number, number];
  profile: string;
  seed: number;
  /** Selects the authored primary mask before packing; other optical regions stay independent. */
  coverageMode?: 'artwork' | 'reverse';
  profileOverrides?: CardProfileOverrides;
  mapSettings?: { roughnessMode?: 'profile' | 'absolute' | 'offset'; embossStrength?: number; normalScale?: number; };
  /** Local file imports are retained only for the current browser session. */
  imported?: boolean;
  /** Optional reconstruction of unprinted foil beneath a scan with baked highlights. Linear RGB. */
  substrate?: { color: [number, number, number]; printRetention: number;
    /** Original paper reflectance, for removing its contribution without washing out printed ink. */
    backgroundColor?: [number, number, number]; };
  /** Linear RGB correction for a photographed front margin outside layout.innerFrame. */
  frontBorderColor?: [number, number, number];
  source?: { image: string; metadata: string; notes: string; };
  maps?: CardMapPaths;
  /** Two-sided cast metal; dimensions.thickness is the base slab, relief is additional centimetres. */
  construction?: { kind: 'metal'; frontReliefCm: number; backReliefCm: number; };
  backMaps?: CardMapPaths;
  layout?: CardLayout;
}

export const cards: CardDefinition[] = [...nonHoloCards, ...holoBulkCards, ...yugiohTopCards, {
  id: 'nocturne', title: 'Nocturne', franchise: 'Original',
  set: 'Atelier', number: '01', dimensions: DIMENSIONS.standard,
  front: '/cards/nocturne/front.svg', back: '/cards/nocturne/back.svg',
  maps: { coverage: '/cards/nocturne/coverage.svg', surface: '/cards/nocturne/surface.svg', extendedFoil: '/cards/nocturne/extended-foil.svg', hologram: '/cards/nocturne/hologram.svg' },
  profile: 'master-prism', seed: 1741,
}, {
  id: 'lugia-neo-genesis', title: 'Lugia', franchise: 'Pokémon',
  set: 'Neo Genesis · First Edition', number: '9/111', dimensions: DIMENSIONS.standard,
  front: '/cards/lugia-neo-genesis/front.png', back: '/cards/pokemon/back.jpg',
  maps: { coverage: '/cards/lugia-neo-genesis/coverage.svg', hologram: '/cards/lugia-neo-genesis/hologram.svg' },
  profile: 'pokemon-cosmos', seed: 2000,
  substrate: { color: [.012, .018, .032], printRetention: .035 },
  source: {
    image: 'https://images.pokemontcg.io/neo1/9_hires.png',
    metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/neo1.json',
    notes: '600 × 825 first-edition scan. Subject and printed layout retained; the masked background foil is reconstructed to remove baked illumination. Optical reconstruction awaits moving-reference comparison.',
  },
}, {
  id: 'charizard-base-set', title: 'Charizard', franchise: 'Pokémon',
  set: 'Base Set · First Edition', number: '4/102', dimensions: DIMENSIONS.standard,
  front: '/cards/charizard-base-set/front.png', back: '/cards/pokemon/back.jpg',
  maps: { coverage: '/cards/charizard-base-set/coverage.svg', hologram: '/cards/charizard-base-set/hologram.svg', laminate: '/cards/charizard-base-set/laminate.svg' },
  profile: 'pokemon-galaxy-star', seed: 1999,
  substrate: { color: [.040, .008, .016], printRetention: .025 },
  source: {
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
    metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/base1.json',
    notes: '600 × 825 first-edition scan. Printed Charizard, wings, flame, frame and text remain unchanged; background foil is reconstructed using a traced subject mask. Moving-reference validation remains pending.',
  },
}, {
  id: 'pikachu-vmax-vivid-voltage', title: 'Pikachu VMAX', franchise: 'Pokémon',
  set: 'Vivid Voltage · Rainbow Rare', number: '188/185', dimensions: DIMENSIONS.standard,
  front: '/cards/pikachu-vmax-vivid-voltage/front.png', back: '/cards/pokemon/back.jpg',
  layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
  profile: 'pokemon-rainbow-etched', seed: 2020188,
  mapSettings: { roughnessMode: 'absolute', embossStrength: .1, normalScale: 1 },
  maps: {
    foil: '/cards/pikachu-vmax-vivid-voltage/foil.png', protection: '/cards/pikachu-vmax-vivid-voltage/protection.png',
    height: '/cards/pikachu-vmax-vivid-voltage/height.png', normal: '/cards/pikachu-vmax-vivid-voltage/normal.png',
    roughness: '/cards/pikachu-vmax-vivid-voltage/roughness.png', direction: '/cards/pikachu-vmax-vivid-voltage/direction.png',
    pattern: '/cards/pikachu-vmax-vivid-voltage/pattern.png', laminate: '/cards/pikachu-vmax-vivid-voltage/laminate.png',
    sparkle: '/cards/pikachu-vmax-vivid-voltage/sparkle.png',
  },
  source: {
    image: 'https://images.pokemontcg.io/swsh4/188_hires.png', metadata: 'https://limitlesstcg.com/cards/en/VIV/188',
    notes: 'English 2020 Vivid Voltage 188/185 Rainbow Rare, aky CG Works. Unmodified 734 × 1024 digital print; real etched treatment reconstructed with registered 1468 × 2048 surface maps from multiple physical-card photographs. No photographed lighting in the front. See docs/pikachu-vmax-rainbow.md and source.json for reference provenance and visual validation.',
  },
}, {
  id: 'tyranitar-paldea-evolved', title: 'Tyranitar', franchise: 'Pokémon',
  set: 'Paldea Evolved', number: '135/193', dimensions: DIMENSIONS.standard,
  layout: { artwork: [59/734, 102/1021, 675/734, 482/1021], innerFrame: [29/734, 28/1021, 703/734, 994/1021] },
  front: '/cards/tyranitar-paldea-evolved/front.png', back: '/cards/pokemon/back.jpg',
  maps: { foil: '/cards/tyranitar-paldea-evolved/foil.svg', extendedFoil: '/cards/tyranitar-paldea-evolved/extended-foil.svg', laminate: '/cards/tyranitar-paldea-evolved/laminate.svg', protection: '/cards/tyranitar-paldea-evolved/protection.png' },
  profile: 'pokemon-mirage', seed: 2023135,
  source: {
    image: 'https://images.pokemontcg.io/sv2/135_hires.png',
    metadata: 'https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/sv02/135/',
    notes: 'Unmodified 734 × 1021 source. Regular Paldea Evolved Mirage printing, distinct from reverse-holo and promotional Cosmos variants. Authored artwork/subject and silver-border masks are estimates; multi-angle physical matching remains pending.',
  },
}, {
  id: 'eevee-legendary-reverse', title: 'Eevee', franchise: 'Pokémon',
  set: 'Legendary Collection · Reverse holo', number: '74/110', dimensions: DIMENSIONS.standard,
  layout: { artwork: [55/600, 86/825, 546/600, 436/825], innerFrame: [23/600, 22/825, 578/600, 803/825] },
  front: '/cards/eevee-legendary-reverse/front.png', back: '/cards/pokemon/back.jpg',
  coverageMode: 'reverse',
  maps: { reverseFoil: '/cards/eevee-legendary-reverse/reverse-foil.svg', protection: '/cards/eevee-legendary-reverse/protection.png', laminate: '/cards/eevee-legendary-reverse/laminate.svg' },
  frontBorderColor: [.579, .579, .579],
  substrate: { color: [.32, .33, .34], backgroundColor: [.672, .672, .672], printRetention: 0 },
  profile: 'pokemon-legendary-reverse', seed: 2002074,
  source: {
    image: 'https://images.pokemontcg.io/base6/74_hires.png',
    metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/base6.json',
    notes: 'Unmodified 600 × 825 nonfoil print image supplies artwork and lettering. The Legendary Collection reverse finish and silver outer border are reconstructed separately from physical-card photographs. Estimated coverage and optics await moving-reference matching.',
  },
}, {
  id: 'charizard-expedition-reverse', title: 'Charizard', franchise: 'Pokémon',
  set: 'Expedition · Reverse holo', number: '40/165', dimensions: DIMENSIONS.standard,
  layout: { artwork: [54/600, 93/825, 580/600, 400/825], innerFrame: [52/600, 18/825, 582/600, 777/825] },
  front: '/cards/charizard-expedition-reverse/front.png', back: '/cards/pokemon/back.jpg',
  coverageMode: 'reverse',
  maps: { reverseFoil: '/cards/charizard-expedition-reverse/reverse-foil.svg', protection: '/cards/charizard-expedition-reverse/protection.png', laminate: '/cards/charizard-expedition-reverse/laminate.svg' },
  profile: 'pokemon-e-reader', seed: 2002040,
  source: {
    image: 'https://images.pokemontcg.io/ecard1/40_hires.png',
    metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/ecard1.json',
    notes: 'Unmodified 600 × 825 nonfoil print supplies the artwork. Reverse foil is reconstructed under the red body ink, with authored protection for lettering, yellow e-reader rails, picture, evolution badge and energy symbols. Static physical photographs guide coverage; empirical angular matching remains pending.',
  },
}, {
  id: 'squirtle-frlg-reverse', title: 'Squirtle', franchise: 'Pokémon',
  set: 'EX FireRed & LeafGreen · Reverse holo', number: '83/112', dimensions: DIMENSIONS.standard,
  layout: { artwork: [65/734, 107/1024, 669/734, 477/1024], innerFrame: [31/734, 30/1024, 703/734, 994/1024] },
  front: '/cards/squirtle-frlg-reverse/front.png', back: '/cards/pokemon/back.jpg',
  coverageMode: 'reverse',
  maps: { reverseFoil: '/cards/squirtle-frlg-reverse/reverse-foil.svg', laminate: '/cards/squirtle-frlg-reverse/laminate.svg', protection: '/cards/squirtle-frlg-reverse/protection.png' },
  substrate: { color: [.022, .065, .085], printRetention: .25 },
  profile: 'pokemon-ex-energy', seed: 2004083,
  source: {
    image: 'https://images.pokemontcg.io/ex6/83_hires.png',
    metadata: 'https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/ex6.json',
    notes: 'Unmodified 734 × 1024 nonfoil print supplies artwork and lettering. The reverse printing uses mixed energy-symbol foil in the picture, with a traced opaque subject and selective protection of white water. This common has no rare-card Poké Ball stamp. Optical and subject-mask reconstruction remain estimates pending moving-reference matching.',
  },
}, {
  id: 'effect-veiler-ra01', title: 'Effect Veiler', franchise: 'Yu-Gi-Oh!',
  layout: { artwork: [57/500, 130/730, 444/500, 516/730], innerFrame: [.035, .023, .965, .977] },
  set: 'User supplied · Structure Deck print', number: 'SDWD-EN018', dimensions: DIMENSIONS.yugioh,
  front: '/cards/effect-veiler-ra01/front.png', back: '/cards/yugioh/back-en.png',
  maps: { coverage: '/cards/effect-veiler-ra01/coverage.svg', height: '/cards/effect-veiler-ra01/height.svg', metallic: '/cards/effect-veiler-ra01/name.png', secondaryFoil: '/cards/effect-veiler-ra01/name.png', extendedFoil: '/cards/effect-veiler-ra01/extended-foil.svg', stamp: '/cards/effect-veiler-ra01/stamp.svg', hologram: '/cards/effect-veiler-ra01/hologram.svg', laminate: '/cards/effect-veiler-ra01/laminate.svg' },
  profile: 'ygo-prismatic-ultimate', seed: 2023,
  mapSettings: { embossStrength: .24 },
  profileOverrides: { stampProfile: 'ygo-prismatic-secret', stamp: { diffraction: { strength: .9 }, glints: { strength: 3 } } },
  source: {
    image: 'User supplied: codex-clipboard-0b495e64-fb13-418f-b0d9-6b8cfdb43ac5.png',
    metadata: 'Printed identifier in the supplied image: SDWD-EN018',
    notes: 'Exact user-selected 2000 × 2920 PNG, retained byte-for-byte. The supplied front supersedes the earlier RA01 scan; authored optical maps are registered to its revised artwork window and title panel. TCG reverse: user-supplied Back-EN.png, used byte-for-byte.',
  },
}, {
  id: 'dark-magician-girl', title: 'Dark Magician Girl', franchise: 'Yu-Gi-Oh!',
  layout: { artwork: [67/549, 147/800, 483/549, 564/800], innerFrame: [.04, .024, .96, .976] },
  set: 'User supplied · Starlight treatment', number: 'LED6-EN000', dimensions: DIMENSIONS.yugioh,
  front: '/cards/dark-magician-girl/front.jpg', back: '/cards/yugioh/back-en.png',
  maps: {
    coverage: '/cards/dark-magician-girl/coverage.png?v=4', surface: '/cards/dark-magician-girl/surface.png?v=4',
    metallic: '/cards/dark-magician-girl/name.png?v=4', secondaryFoil: '/cards/dark-magician-girl/name.png?v=4',
    height: '/cards/dark-magician-girl/height.png?v=4', roughness: '/cards/dark-magician-girl/roughness.png?v=4', sparkle: '/cards/dark-magician-girl/sparkle.png?v=4',
    laminate: '/cards/dark-magician-girl/laminate.png?v=4', stamp: '/cards/dark-magician-girl/stamp.svg?v=4',
    extendedFoil: '/cards/dark-magician-girl/extended-foil.png?v=4', pattern: '/cards/dark-magician-girl/pattern.png?v=4',
    hologram: '/cards/dark-magician-girl/hologram.png?v=4',
  },
  mapSettings: { roughnessMode: 'offset', embossStrength: .18 },
  profile: 'ygo-starlight', seed: 200006,
  source: {
    image: 'User supplied: dark_magician_girl_by_masaki2709_ddozokf-fullview.jpg',
    metadata: 'Printed identifier in the supplied front: LED6-EN000; second supplied image shows LDS3-EN082 as the foil reference.',
    notes: 'The supplied LDS3-EN082 photograph guides a broad spectral background, fine satin silver reflections, protected character ink and white motes, independent gold title and security stamp. The supplied print and hand-authored coverage are retained unchanged. Registered height, roughness, sparkle and laminate layers separate the character, foil and rules. Secret treatments use independent title foil; parallel treatments use a protected frame mask; Ghost uses a separate artwork depth/window map. These alternate finishes and relief are viewer studies, not claims about the LED6 printing. Angular matching remains unverified.',
  },
}, {
  id: 'ip-masquerena', title: 'I:P Masquerena', franchise: 'Yu-Gi-Oh!',
  layout: { artwork: [.12, 136/733, .884, 518/733], innerFrame: [.05, .037, .952, .959] },
  set: 'User supplied · Prismatic Collector treatment', number: 'LAVD-EN033', dimensions: DIMENSIONS.yugioh,
  front: '/cards/ip-masquerena/front.png', back: '/cards/yugioh/back-en.png',
  maps: { coverage: '/cards/ip-masquerena/coverage.svg', extendedFoil: '/cards/ip-masquerena/extended-foil.svg', metallic: '/cards/ip-masquerena/name.png', secondaryFoil: '/cards/ip-masquerena/name.png', height: '/cards/ip-masquerena/height.svg', hologram: '/cards/ip-masquerena/hologram.svg', laminate: '/cards/ip-masquerena/laminate.svg', stamp: '/cards/ip-masquerena/stamp.svg' },
  profile: 'ygo-prismatic-collector', seed: 2019,
  source: {
    image: 'User supplied: codex-clipboard-ab4d5092-52a1-46f9-bb3b-2181f2e3d6e9.png',
    metadata: 'Printed identifier in the supplied image: LAVD-EN033',
    notes: 'Exact user-selected 500 × 733 PNG, retained byte-for-byte. Authored optical maps preserve the character and rules, with independent name and security stamp. Prismatic Collector is the selected viewer treatment, not an assertion of the source printing rarity.',
  },
}, {
  id: 'blue-eyes', title: 'Blue-Eyes White Dragon', franchise: 'Yu-Gi-Oh!',
  layout: { artwork: [167/1312, 352/1911, 1161/1312, 1344/1911], innerFrame: [.04, .024, .97, .976] },
  set: 'User supplied · SDK-style Ultra', number: 'LDK2-ENK0L', dimensions: DIMENSIONS.yugioh,
  front: '/cards/blue-eyes/front.png', back: '/cards/yugioh/back-en.png',
  maps: { coverage: '/cards/blue-eyes/coverage.png', extendedFoil: '/cards/blue-eyes/extended-foil.svg', metallic: '/cards/blue-eyes/name.png', secondaryFoil: '/cards/blue-eyes/name.png', laminate: '/cards/blue-eyes/laminate.svg', stamp: '/cards/blue-eyes/stamp.svg', hologram: '/cards/blue-eyes/hologram.svg' },
  profile: 'ygo-ultra', seed: 2018,
  profileOverrides: {
    diffraction: { period: 1.08, bandwidth: .07, strength: .46, direction: -.2, crossWidth: .42, facetCoupling: 1 },
    structure: { field: 'satin', scale: 840, engraving: .20, facetTilt: .4, normalVariance: .45 },
    surface: { metalness: .38, roughness: .34, foilReflectance: .035, laminate: .12, laminateRoughness: .4, substrateDarkening: .48 },
  },
  source: {
    image: 'User supplied: codex-clipboard-465e6b33-4f12-4ad7-9331-0cb6326a40d8.png', metadata: 'User-supplied front; SDK-001 photograph as foil reference',
    notes: 'Exact selected 1854 × 2700 PNG retained byte-for-byte. Separate SDK-001 reference guides fine-grained artwork foil, reflective eye/teeth/claws and gold name. Printed identifiers are preserved from the supplied artwork. Optical coverage remains an estimate from the photograph.',
  },
}, {
  id: 'angel-of-serenity', title: 'Angel of Serenity', franchise: 'Magic: The Gathering',
  set: 'Commander 2021 · Foil study', number: '083', dimensions: DIMENSIONS.standard,
  layout: { artwork: [50/672, 105/936, 622/672, 518/936], innerFrame: [27/672, 27/936, 646/672, 869/936] },
  front: '/cards/angel-of-serenity/front.png', back: '/cards/magic/back.png',
  maps: { foil: '/cards/angel-of-serenity/foil.png', extendedFoil: '/cards/angel-of-serenity/foil.png',
    laminate: '/cards/angel-of-serenity/laminate.svg', stamp: '/cards/angel-of-serenity/stamp.svg',
    protection: '/cards/angel-of-serenity/protection.png', hologram: '/cards/angel-of-serenity/hologram.svg' },
  profile: 'mtg-halo', seed: 2021083,
  source: { image: 'User supplied: codex-clipboard-a4a0f53f-a3e9-439e-90f7-4308d197d311.png',
    metadata: 'Commander 2021, card 083; illustration by Aleksi Briclot',
    notes: 'Exact supplied front and Magic reverse retained byte-for-byte. Optical masks are authored estimates; applying a foil finish is a viewer study, not a claim that this set printing has that treatment.' },
}, {
  id: 'black-lotus', title: 'Black Lotus', franchise: 'Magic: The Gathering',
  set: 'User supplied · Foil study', number: '', dimensions: DIMENSIONS.standard,
  layout: { artwork: [79/672, 95/936, 591/672, 505/936], innerFrame: [36/672, 39/936, 635/672, 889/936] },
  front: '/cards/black-lotus/front.png', back: '/cards/black-lotus/back.png',
  maps: { foil: '/cards/black-lotus/foil.png', extendedFoil: '/cards/black-lotus/foil.png',
    protection: '/cards/black-lotus/protection.png', laminate: '/cards/black-lotus/laminate.svg',
    hologram: '/cards/black-lotus/hologram.svg' },
  profile: 'mtg-surge', seed: 1993,
  // Match the charcoal scan margin to the darker inner black keyline.
  frontBorderColor: [0.009721, 0.008568, 0.010330],
  source: { image: 'User supplied: codex-clipboard-59ec0743-3a2c-4003-80cf-b7db8313699a.png',
    metadata: 'Black Lotus; illustration credited to Christopher Rush in the supplied print',
    notes: 'Exact 672 × 936 supplied front and user-selected gold-bordered Collector’s Edition back retained. Petals and text have separate optical protection. Specialty foil is an experimental viewer treatment, not a historical foil-printing claim.' },
}];
