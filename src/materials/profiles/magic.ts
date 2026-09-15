import type { FoilLayer, HolographicProfile } from '../HolographicProfile';

const security: FoilLayer = {
  diffraction: { period: 1.06, bandwidth: .045, strength: .85, secondaryOrder: .15, direction: 1.1, crossWidth: .46 },
  structure: { field: 'plain', scale: 1, engraving: 0, relief: 0, facetTilt: 0 },
  glints: { density: 0, scale: 450, sharpness: 300, strength: 0, spread: .2 },
  surface: { metalness: .85, roughness: .22, laminate: .2, laminateRoughness: .3, foilReflectance: .12 },
};

export const magicProfiles: HolographicProfile[] = [{
  id: 'mtg-halo', name: 'Halo foil', family: 'Magic: The Gathering', status: 'reference-pending',
  description: 'Curved filaments and interrupted silver strands catch the light in shifting arcs beneath the printed art.',
  diffraction: { period: 1.08, bandwidth: .034, strength: 1.65, secondaryOrder: .06, direction: .12, crossWidth: .26, facetCoupling: 1 },
  structure: { field: 'mtg-halo', scale: 108, engraving: .12, relief: 0, facetTilt: 1.1, normalVariance: .35 },
  glints: { density: 0, scale: 550, sharpness: 300, strength: 0, spread: .25 },
  surface: { metalness: .57, roughness: .32, laminate: .16, laminateRoughness: .38, foilReflectance: .05 },
  metallicInk: { roughness: .48, metalness: .015 }, stamp: security,
}, {
  id: 'mtg-surge', name: 'Surge foil', family: 'Magic: The Gathering', status: 'reference-pending',
  description: 'Uneven rippling bands with ragged metallic crests; neighboring foil cuts flash together as the card turns.',
  diffraction: { period: 1.12, bandwidth: .042, strength: 1.65, secondaryOrder: .07, direction: -.15, crossWidth: .30, facetCoupling: 1 },
  structure: { field: 'mtg-surge', scale: 650, engraving: .08, relief: 0, facetTilt: 1.4, normalVariance: .45 },
  glints: { density: 0, scale: 650, sharpness: 300, strength: 0, spread: .25 },
  surface: { metalness: .56, roughness: .30, laminate: .16, laminateRoughness: .38, foilReflectance: .06 },
  metallicInk: { roughness: .48, metalness: .015 }, stamp: security,
}, {
  id: 'mtg-fracture', name: 'Fracture foil', family: 'Magic: The Gathering', status: 'reference-pending',
  description: 'Small irregular shards split into reflective slivers, with independent silver and spectral flashes beneath selective ink coverage.',
  diffraction: { period: 1.06, bandwidth: .042, strength: 1.45, secondaryOrder: .10, direction: 0, crossWidth: .32, facetCoupling: 1 },
  structure: { field: 'mtg-fracture', scale: 66, engraving: .04, relief: 0, facetTilt: 1.4, normalVariance: .42 },
  glints: { density: 0, scale: 600, sharpness: 300, strength: 0, spread: .25 },
  surface: { metalness: .65, roughness: .26, laminate: .14, laminateRoughness: .38, foilReflectance: .07 },
  metallicInk: { roughness: .48, metalness: .015 }, stamp: security,
}, {
  id: 'mtg-traditional', name: 'Traditional foil', family: 'Magic: The Gathering', status: 'reference-pending',
  description: 'Continuous silver foil beneath translucent color, with broad directional spectral reflection, protected printed ink and an independent oval security stamp.',
  diffraction: { period: 1.16, bandwidth: .075, strength: .8, secondaryOrder: .07, direction: -.22, crossWidth: .56 },
  structure: { field: 'satin', scale: 680, engraving: .04, relief: 0, facetTilt: .2, normalVariance: .25 },
  glints: { density: 0, scale: 600, sharpness: 250, strength: 0, spread: .2 },
  surface: { metalness: .52, roughness: .31, laminate: .2, laminateRoughness: .32, foilReflectance: .08 },
  metallicInk: { roughness: .48, metalness: .015 }, stamp: security,
}];
