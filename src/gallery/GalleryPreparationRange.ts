/** CPU-only lookahead: nearest rows first in the travel direction, followed by
 * one trailing row. Independent of DOM overscan and GPU residency. */
export function galleryPreparationIndices(count: number, columns: number, first: number, last: number, direction: number) {
  if (first < 0 || last < first) return [];
  const firstRow = Math.floor(first / columns), lastRow = Math.floor(last / columns);
  const rows: number[] = [];
  for (let distance = 1; distance <= 3; distance++) rows.push(direction >= 0 ? lastRow + distance : firstRow - distance);
  rows.push(direction >= 0 ? firstRow - 1 : lastRow + 1);
  return rows.flatMap(row => row < 0 ? [] : Array.from({ length: columns }, (_, column) => row * columns + column)
    .filter(index => index < count));
}
