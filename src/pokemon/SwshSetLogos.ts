// TCGdex asset IDs differ from the extracted TCGL catalog IDs. Subsets without
// their own TCGdex logo use their parent expansion's logo.
const aliases: Record<string, string> = {
  swshbsp: 'swshp', swshalt: 'swsh1',
  'swsh3-5': 'swsh3.5', 'swsh4-5': 'swsh4.5',
  'swsh7-5': 'cel25', 'swsh7-5r': 'cel25',
  swsh9a: 'swsh9', swsh10a: 'swsh10', 'swsh10-5': 'swsh10.5',
  swsh11a: 'swsh11', swsh12a: 'swsh12',
  'swsh12-5': 'swsh12.5', 'swsh12-5a': 'swsh12.5',
};

export function swshSetLogo(id: string): string {
  return `https://assets.tcgdex.net/en/swsh/${aliases[id] ?? id}/logo.png`;
}
