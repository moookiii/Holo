// TCGL IDs differ from TCGdex for promos and special expansions. Collections
// without a distinct expansion logo use their parent expansion's artwork.
const aliases: Readonly<Record<string, string>> = {
  xybsp: 'xyp', xyalt: 'xy1',
  'xy5-5': 'dc1', 'xy9-5': 'g1', 'xy9-5r': 'g1',
};

export function xySetLogo(id: string): string {
  return `/packs/pokemon/${aliases[id] ?? id}-logo.png`;
}
