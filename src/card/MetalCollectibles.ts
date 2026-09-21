import type { CardDefinition } from './CardDefinition';

const root = '/cards/charizard-burger-king-1999';
const face = (side: string) => ({ height: `${root}/${side}-height.png`, normal: `${root}/${side}-normal.png`, roughness: `${root}/${side}-roughness.png`, metallic: `${root}/${side}-metallic.png` });

export const metalCollectibles: CardDefinition[] = [{
  id: 'charizard-burger-king-1999', title: 'Charizard · 23K Gold', franchise: 'Pokémon',
  set: 'Burger King · 1999 gold-plated collectible', number: '006',
  // Listed face dimensions: 1.75 × 2.75 inches. Bare slab and die heights remain estimates.
  dimensions: { width: 4.445, height: 6.985, thickness: .30, cornerRadius: .22, bevel: .045 },
  construction: { kind: 'metal', frontReliefCm: .090, backReliefCm: .040 },
  front: `${root}/front.png`, back: `${root}/back.png`,
  maps: face('front'), backMaps: face('back'),
  mapSettings: { roughnessMode: 'absolute' },
  layout: { artwork: [0,0,1,1], innerFrame: [0,0,1,1] },
  profile: 'minted-gold', seed: 1999006,
  source: {
    image: 'User-supplied front and reverse photographs (preserved byte-for-byte)',
    metadata: 'https://www.psacard.com/cert/150531212/psa',
    notes: '1999 Burger King 23K gold-plated metal collectible. Registered manufacturing maps reconstruct both faces without using photographed reflections as gold albedo. 44.45 × 69.85 mm face; 3 mm bare slab and relief depths are estimates, not measured claims. See docs/burger-king-charizard.md.',
  },
}];
