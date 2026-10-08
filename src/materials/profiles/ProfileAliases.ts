/** Historical set labels resolve to one material. Keep saved manifests valid
 * without exposing duplicate treatments in any profile picker. */
export function canonicalProfileId(id: string): string {
  return ['prismatic_gold', 'pokemon151_gold', 'sv_tcgl_gold'].includes(id) ? 'gold-etched' : id;
}
