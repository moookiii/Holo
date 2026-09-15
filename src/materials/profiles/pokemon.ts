import type { HolographicProfile } from '../HolographicProfile';

/** Optical reconstructions stay in development until compared against moving, multi-light references. */
export const pokemonProfiles: HolographicProfile[] = [{
  id: 'pokemon-fireworks', name: 'Fireworks', family: 'Pokémon', status: 'reference-pending',
  description: 'Legendary Collection-inspired bursts of broken radial foil cuts, with independently flashing silver fragments and curved spectral fans. Uses the selected card’s authored foil coverage.',
  diffraction: { period: 1.35, bandwidth: .047, strength: 2.5, secondaryOrder: .19, direction: 0, crossWidth: .46, facetCoupling: 1 },
  structure: { field: 'fireworks', scale: 8.2, engraving: .10, relief: 0, facetTilt: 1, normalVariance: .40 },
  glints: { density: .018, scale: 560, sharpness: 260, strength: 2, spread: .48 },
  surface: { metalness: .86, roughness: .26, laminate: .22, laminateRoughness: .28, foilReflectance: .20, sheen: .30 },
}, {
  id: 'pokemon-crosshatch', name: 'Crosshatch', family: 'Pokémon', status: 'reference-pending',
  description: 'League-style fine diagonal microcuts grouped into crossed reflective bands; silver woven highlights exchange with two diffractive axes under tilt.',
  diffraction: { period: 1.24, bandwidth: .046, strength: 2.3, secondaryOrder: .12, direction: 0, crossWidth: .42, crossing: .46, facetCoupling: 1 },
  structure: { field: 'crosshatch', scale: 270, engraving: .12, relief: 0, facetTilt: 1, normalVariance: .40 },
  glints: { density: .008, scale: 580, sharpness: 300, strength: 1.2, spread: .24 },
  surface: { metalness: .82, roughness: .29, laminate: .20, laminateRoughness: .30, foilReflectance: .18, sheen: .26 },
}, {
  id: 'pokemon-ace-spec', name: 'ACE SPEC', family: 'Pokémon', status: 'reference-pending',
  description: 'Modern Scarlet & Violet ACE SPEC: broad diamond reflections above dense horizontal striations. The printed card supplies its ink colors; the foil remains silver and spectral.',
  diffraction: { period: 1.15, bandwidth: .052, strength: 1.85, secondaryOrder: .12, direction: 0, crossWidth: .45, facetCoupling: 1 },
  structure: { field: 'ace-spec', scale: 440, engraving: .10, relief: 0, facetTilt: .90, normalVariance: .42 },
  glints: { density: .005, scale: 610, sharpness: 280, strength: .8, spread: .20 },
  surface: { metalness: .83, roughness: .30, laminate: .24, laminateRoughness: .28, foilReflectance: .19, sheen: .26 },
}, {
  id: 'pokemon-galaxy-star', name: 'Starlight / Galaxy-Star', family: 'Pokémon', status: 'reference-pending',
  description: 'Early star sheet: sparse four- and eight-point stars, small pinpoints and coherent angular facets over a quiet spectral background.',
  diffraction: { period: 1.4, bandwidth: .055, strength: 2.1, secondaryOrder: .2, direction: 0, crossWidth: .50 },
  structure: { field: 'galaxy-star', scale: 15, engraving: .04, relief: 0, facetTilt: .8, normalVariance: .25 },
  glints: { density: .065, scale: 420, sharpness: 210, strength: 10, spread: .6 },
  surface: { metalness: .88, roughness: .27, laminate: .25, laminateRoughness: .30, foilReflectance: .16 },
}, {
  id: 'pokemon-tinsel', name: 'Tinsel', family: 'Pokémon', status: 'reference-pending',
  description: 'Thin uneven horizontal silver strands, broken spectral flashes and correlated angular reflections.',
  diffraction: { period: 1.15, bandwidth: .04, strength: 1.8, secondaryOrder: .12, direction: 0, crossWidth: .44, facetCoupling: 1 },
  structure: { field: 'tinsel', scale: 174, engraving: .08, relief: 0, facetTilt: 1.15, normalVariance: .45 },
  glints: { density: .025, scale: 640, sharpness: 340, strength: 3, spread: .20 },
  surface: { metalness: .84, roughness: .26, laminate: .18, laminateRoughness: .32, foilReflectance: .30, anisotropy: .35, sheen: .95 },
}, {
  id: 'pokemon-cosmos', name: 'Cosmos', family: 'Pokémon', status: 'reference-pending',
  description: 'Classic pixelated Cosmos: unequal circles, rosettes and a broken swirl made from small independently oriented optical cells.',
  diffraction: { period: 1.45, bandwidth: .055, strength: 1.7, secondaryOrder: .24, direction: 0, crossWidth: .42 },
  structure: { field: 'cosmos', scale: 29, engraving: .05, relief: 0, facetTilt: .9 },
  glints: { density: .22, scale: 390, sharpness: 180, strength: 30, spread: .72 },
  surface: { metalness: .88, roughness: .18, laminate: .35, laminateRoughness: .22, foilReflectance: .32 },
}, {
  id: 'pokemon-cosmos-hd', name: 'Cosmos HD', family: 'Pokémon', status: 'reference-pending',
  description: 'Later smooth-sheet Cosmos: solid circular symbols and an unbroken swirl with coherent color within each shape. No rosettes or classic pixel fragmentation.',
  diffraction: { period: 1.45, bandwidth: .045, strength: 1.35, secondaryOrder: .18, direction: 0, crossWidth: .38 },
  structure: { field: 'cosmos-hd', scale: 29, engraving: .05, relief: 0, facetTilt: .7 },
  glints: { density: .055, scale: 410, sharpness: 240, strength: 10, spread: .5 },
  surface: { metalness: .88, roughness: .2, laminate: .35, laminateRoughness: .22, foilReflectance: .32 },
}];
