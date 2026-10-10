import type { CardDefinition } from './CardDefinition';

const proofSets: Record<string, string> = {
  reverse: 'Sword & Shield', amazing: 'Vivid Voltage', radiant: 'Astral Radiance',
  shiny: 'Shining Fates', v: 'Astral Radiance', vmax: 'Vivid Voltage',
  vstar: 'Brilliant Stars', celebrations: 'Celebrations', classic: 'Celebrations',
  'black-gold': 'Lost Origin',
};

/** Small, explicit material workbench. No set catalog or pack integration. */
export const swshProofCases = [
  ['reverse', 'swsh1_10_ph', 'Grookey', '010/202', 'swsh-reverse-energy', false],
  ['amazing', 'swsh4_50', 'Raikou', '050/185', 'swsh-amazing', true],
  ['radiant', 'swsh10_46', 'Radiant Greninja', '046/189', 'swsh-radiant', true],
  ['shiny', 'swsh4-5_95', 'Suicune', 'SV022/SV122', 'swsh-shiny-silver', true],
  ['v', 'swsh10_161', 'Beedrill V', '161/189', 'swsh-textured', true],
  ['vmax', 'swsh4_44', 'Pikachu VMAX', '044/185', 'swsh-textured', true],
  ['vstar', 'swsh9_123', 'Arceus VSTAR', '123/172', 'swsh-textured', true],
  ['celebrations', 'swsh7-5_11', 'Mew', '011/025', 'swsh-celebrations-silver', false],
  ['classic', 'swsh7-5r_2', 'Charizard', '4/102', 'swsh-celebrations-classic', true],
] as const;

export const swshProofCards: CardDefinition[] = swshProofCases.map(([finish, id, title, number, profile, etched]) => {
  const base = `/cards/pokemon/swsh-proofs/${id}`;
  return {
    id: `swsh-proof:${finish}`, title, number: `${number} · ${finish}`,
    franchise: 'Pokémon', set: proofSets[finish], profile, seed: 202001, galleryVisible: true,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: `${base}/front.png`, back: '/cards/pokemon/back.jpg',
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    maps: { foil: `${base}/foil.png`, foilControls: `${base}/foil-source.png`,
      roughness: `${base}/roughness.png`, ...(etched ? { normal: `${base}/normal.png` } : {}),
      ...(finish === 'radiant' ? { secondaryFoil: `${base}/secondary.png`, secondaryDirection: '/cards/pokemon/swsh-proofs/stock/radiant-field.png' } : {}),
      ...(finish === 'classic' ? { secondaryFoil: `${base}/foil.png`, secondaryDirection: '/cards/pokemon/swsh-proofs/stock/classic-field.png' } : {}) },
    mapSettings: { normalScale: etched ? 1 : 0, embossStrength: 0, roughnessMode: 'absolute' },
    source: { image: `${base}/front.png`, metadata: `${base}/evidence.json`,
      notes: 'Exact extracted TCGL printing. Registered full-card crop; authentic foil and offline Scharr normal where present. Physical calibration status: docs/swsh-materials.md.' },
  };
});
