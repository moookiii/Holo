/** Rarity is catalog semantics; printing selects a physical manufacturing recipe.
 * A set adapter supplies this explicitly. Never infer vintage from 'LOB' alone:
 * reprints reuse that set code with different manufacturing. */
export interface YugiohPrinting {
  rarity: 'Secret Rare';
  era: 'early-tcg' | 'later-tcg';
  materialProfile?: 'ygo-secret-early-tcg' | 'ygo-secret';
}

export function yugiohPrintingProfile(printing: YugiohPrinting) {
  return printing.materialProfile ?? (printing.era === 'early-tcg' ? 'ygo-secret-early-tcg' : 'ygo-secret');
}
