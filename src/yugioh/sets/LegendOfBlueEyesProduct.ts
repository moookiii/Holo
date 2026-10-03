import type { YugiohProduct } from '../types.ts';
import { LOB_CATALOG_ID, LOB_PRODUCT_ID } from '../catalog/implementations.ts';
import { lobCards, lobPrinting } from './LegendOfBlueEyesCatalog.ts';

export const lobProduct: YugiohProduct = Object.freeze({ id: LOB_PRODUCT_ID, catalogId: LOB_CATALOG_ID,
  name: 'Legend of Blue Eyes White Dragon · NA 2002 · 1st Edition', printing: lobPrinting, packSize: 9, packsPerBox: 24, cards: lobCards,
  rules: Object.freeze({ id: 'lob-na-independent-model-v1', kind: 'rare-plus-optional-foil', packSize: 9,
    foilWeights: Object.freeze({ none: 0.72, 'Super Rare': 0.17, 'Ultra Rare': 0.08, 'Secret Rare': 0.03 }),
    shortPrintWeight: 1, superShortPrintWeight: 1,
    evidence: ['https://www.psacard.com/cardfacts/non-sports-cards/2002-yu-gi-oh-legend-blue-eyes-white-dragon/32427',
      'https://www.ebay.com/itm/306922281454', 'https://ygofirstedition.com/about/'],
    note: 'Independent simulation: 8 Commons + 1 Rare; an optional foil replaces one Common. Foil weights 72/17/8/3 are Holo modeling choices, NOT verified historical pull rates. Commons are equally weighted; reported short prints are recorded without invented frequency ratios. No box or hobby/retail Secret guarantees.',
  }),
});
