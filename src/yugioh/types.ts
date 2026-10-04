export type YugiohFormat = 'TCG' | 'OCG';
export type ImplementationStatus = 'implemented' | 'partial' | 'browse-only';
export type ProductFamily = 'Booster pack' | 'Starter deck' | 'Structure deck' | 'Tournament pack' | 'Tin' | 'Collection' | 'Promotion' | 'Unclassified';
export interface YugiohCatalogSet {
  id: string;
  name: string;
  aliases: string[];
  setCode?: string;
  format: YugiohFormat;
  releaseDate?: string;
  cardCount?: number;
  productFamily: ProductFamily;
  groupingBasis: 'curated' | 'name-derived' | 'unknown';
  era: string;
  region?: string;
  implementationId?: string;
  implementationStatus: ImplementationStatus;
  source: string;
}
export type LobRarity = 'Common' | 'Rare' | 'Super Rare' | 'Ultra Rare' | 'Secret Rare';
export interface YugiohPrinting {
  id: string;
  language: 'en';
  region: 'North America';
  edition: '1st Edition';
  releaseDate: string;
  generation: 'original-2002';
}
export interface YugiohCard {
  id: string;
  number: string;
  name: string;
  modernName: string;
  passcode: string;
  type: string;
  /** API text is explicitly modern; never used to manufacture an original front. */
  modernText: string;
  rarity: LobRarity;
  printingId: string;
  distribution: 'reported-short-print' | 'reported-super-short-print' | 'unclassified';
  treatment: { artwork: 'printed' | 'holo' | 'secret'; name: 'printed' | 'silver' | 'gold' | 'rainbow'; stamp: 'gold-early-tcg' };
  front: string;
  source: { image: string; reference: string; metadata: string; fidelity: 'original-scan' | 'general-image-fallback'; notes: string;
    assetStatus?: 'exact-print-high-quality' | 'original-print-region-review' | 'ygoprodeck-fallback' | 'unverified-print-fallback';
    layout?: 'early-tcg' | 'modern-general'; manualReview?: boolean; provenance?: string };
}
export interface YugiohCollationRules {
  id: string;
  kind: 'rare-plus-optional-foil';
  packSize: 9;
  /** Mutually exclusive modeled probabilities, not historical guarantees. */
  foilWeights: Record<'none' | 'Super Rare' | 'Ultra Rare' | 'Secret Rare', number>;
  shortPrintWeight: number;
  superShortPrintWeight: number;
  evidence: string[];
  note: string;
}
export interface YugiohProduct {
  id: string;
  catalogId: string;
  name: string;
  printing: YugiohPrinting;
  packSize: 9;
  packsPerBox: 24;
  rules: YugiohCollationRules;
  cards: readonly YugiohCard[];
}
export interface ResolvedYugiohPack {
  productId: string;
  printingId: string;
  seed: number;
  cards: readonly YugiohCard[];
  debug: { rulesId: string; foil: string; commonCount: number; note: string; box?: { seed: number; index: number; guarantees: false } };
}
