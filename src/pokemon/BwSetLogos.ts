// TCGL collection IDs share the corresponding expansion's logo.
const aliases: Readonly<Record<string, string>> = {
  bwbsp: 'bwp', bwalt: 'bw1', 'bw6-5': 'dv1', bw11r: 'bw11',
};

export function bwSetLogo(id: string): string {
  return `/packs/pokemon/${aliases[id] ?? id}-logo.png`;
}
