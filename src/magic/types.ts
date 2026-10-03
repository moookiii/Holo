export interface MagicCard {
  id: string; scryfallId: string; number: string; name: string; setId: string; setName: string;
  rarity: 'common' | 'uncommon' | 'rare'; typeLine: string; colors: string[]; artist: string;
  front: string; thumbnail: string; image: string; reference: string; metadata: string;
  frame: string; border: string; finishes: string[];
}
export interface MagicSet {
  id: string; name: string; series: { id: string; name: string }; releaseDate: string;
  cards: readonly MagicCard[]; productIds: readonly string[];
}
export interface MagicSheet {
  id: string; columns: number;
  /** Row-major physical positions. Repeated cells encode sheet multiplicity.
   * Multiple candidates in one cell denote unresolved art, not extra positions. */
  cells: readonly (readonly string[])[];
  evidence: string; confidence: 'reconstructed' | 'estimated'; note: string;
}
export interface MagicProduct {
  id: string; setId: string; name: string; packSize: number; collationVersion: string;
  sheets: Readonly<Record<string, MagicSheet>>;
  slots: readonly { id: string; sheet: string; count: number }[];
  presentation: readonly string[];
  /** Modeling choice: historical stripe-width frequency is not established. */
  stripeWidths: readonly number[];
  note: string;
}
export interface MagicPull { cardId: string; slot: string; sheet: string; position: number; }
export interface ResolvedMagicPack {
  productId: string; version: string; seed: number; pulls: readonly MagicPull[];
  presentationOrder: readonly number[]; identity: string;
}
