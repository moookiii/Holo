/** Plain application data. SDK models never cross this boundary. */
export type PrintVariant = 'normal' | 'reverse' | 'holo';
export interface CatalogEntry { id: string; name: string; logo?: string; }
export interface PokemonBooster extends CatalogEntry { front?: string; back?: string; }
export interface PokemonSet extends CatalogEntry {
  series: CatalogEntry; era: string; releaseDate: string; cardIds: string[]; boosters: PokemonBooster[];
}
export interface PokemonCard {
  id: string; localId: string; name: string; setId: string; setName: string;
  seriesId: string; seriesName: string; era: string; rarity: string;
  category?: string;
  energyType?: string;
  variants: PrintVariant[]; foil?: Partial<Record<PrintVariant, string>>;
  evolveFrom?: string;
  /** Undefined means no published restriction; [] means explicitly in no boosters. */
  boosterIds?: string[]; front?: string; thumbnail?: string;
}
export interface PokemonPull { card: PokemonCard; variant: PrintVariant; slot: string; }
export interface ResolvedPokemonPack {
  type: 'pokemon'; setId: string; boosterId: string; eligibilityKey: string;
  recipeId: string; recipeVersion: string; seed: number;
  pulls: readonly PokemonPull[]; identity: string;
}
