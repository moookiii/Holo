import type { CardDefinition } from './CardDefinition';

/** Small, explicit material workbench. No set catalog or pack integration. */
export const swshProofCases = [
  ['reverse', 'swsh1_10_ph', 'Grookey', '010/202', 'swsh-reverse-energy', false],
] as const;

export const swshProofCards: CardDefinition[] = swshProofCases.map(([finish, id, title, number, profile, etched]) => {
  const base = `/cards/pokemon/swsh-proofs/${id}`;
  return {
    id: `swsh-proof:${finish}`, title, number: `${number} · ${finish}`,
    franchise: 'Pokémon', set: 'Sword & Shield · Material proofs', profile, seed: 202001,
    dimensions: { width: 6.3, height: 8.8, thickness: .032, cornerRadius: .3, bevel: .007 },
    front: `${base}/front.png`, back: '/cards/pokemon/back.jpg',
    layout: { artwork: [0, 0, 1, 1], innerFrame: [0, 0, 1, 1] },
    maps: { foil: `${base}/foil.png`, foilControls: `${base}/foil-source.png`,
      roughness: `${base}/roughness.png`, ...(etched ? { normal: `${base}/normal.png` } : {}) },
    mapSettings: { normalScale: etched ? 1 : 0, embossStrength: 0, roughnessMode: 'absolute' },
    source: { image: `${base}/front.png`, metadata: `${base}/evidence.json`,
      notes: 'Exact extracted TCGL printing. Registered full-card crop; authentic foil and offline Scharr normal where present. Physical calibration status: docs/swsh-materials.md.' },
  };
});
