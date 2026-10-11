/** Exact English SM printings; kept outside generated imports so reimporting preserves the finish. */
export const prismStarIds = new Set([
  'sm5-58', 'sm5-62', 'sm5-77', 'sm5-89', 'sm5-120', 'sm5-136',
  'sm6-31', 'sm6-74', 'sm6-96', 'sm6-110', 'sm6-117',
  'sm7-5-7', 'sm7-5-61', 'sm7-97', 'sm7-107', 'sm7-108',
  'sm8-19', 'sm8-144', 'sm8-154', 'sm8-178', 'sm8-180', 'sm8-182', 'sm8-191',
  'sm9-10', 'sm9-51', 'sm9-134', 'sm9-158',
]);
export const isPrismStar = (id: string, variant: string) => variant === 'holo' && prismStarIds.has(id);
export function prismStarMaps(id: string) {
  const split = id.lastIndexOf('-');
  const root = `/cards/pokemon/prism-star/${id.slice(0, split)}_${id.slice(split + 1)}`;
  return { extendedFoil: `${root}/border.png`, protection: `${root}/protection.png` };
}
