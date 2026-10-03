/** Explicit physical product mappings. A matching prefix alone never enables a pack. */
export const LOB_CATALOG_ID = 'ygoprodeck:TCG:LOB:2002-03-08';
export const LOB_PRODUCT_ID = 'yugioh:lob:na-2002:first-edition';
export function implementationFor(id: string) {
  return id === LOB_CATALOG_ID ? { id: LOB_PRODUCT_ID, status: 'implemented' as const } : undefined;
}
