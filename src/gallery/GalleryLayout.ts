export const GALLERY_CAPACITY = 48;
/** Row virtualization is O(visible cards), independent of collection size. */
export function galleryLayout(width: number, height: number, count: number, scroll: number, capacity = GALLERY_CAPACITY) {
  const gap = width < 600 ? 20 : 36, padding = width < 600 ? 20 : 40;
  const columns = Math.max(1, Math.min(6, Math.floor((width - padding * 2 + gap) / (180 + gap))));
  const cell = Math.min(260, (width - padding * 2 - gap * (columns - 1)) / columns);
  const row = Math.max(cell * 1.48 + 68, height / Math.max(1, Math.floor(capacity / columns) - 3));
  const total = Math.ceil(count / columns) * row + padding * 2;
  const top = Math.min(Math.max(0, scroll), Math.max(0, total - height));
  const firstRow = Math.max(0, Math.floor((top - padding) / row) - 1);
  const endRow = Math.min(Math.ceil(count / columns), Math.ceil((top + height - padding) / row) + 1);
  return { columns, cell, row, padding, total, top, start: firstRow * columns, end: Math.min(count, endRow * columns),
    left: (width - columns * cell - (columns - 1) * gap) / 2, gap };
}
