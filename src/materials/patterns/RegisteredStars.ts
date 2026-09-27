/** A full-front PNG, not a repeating symbol tile. Top-left image coordinates. */
export interface StarImage { width: number; height: number; data: Uint8Array; }

/** Label the authored islands once. Every ray of a star shares one optical
 * orientation, even when it crosses a procedural grain cell boundary. */
export function labelRegisteredStars(image: StarImage): Uint16Array {
  const { width, height, data } = image;
  const labels = new Uint16Array(width * height);
  const queue = new Int32Array(width * height);
  let next = 0;
  for (let start = 0; start < labels.length; start++) {
    if (data[start] < 8 || labels[start]) continue;
    const id = ++next;
    let head = 0, tail = 1;
    queue[0] = start; labels[start] = id;
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const q = ny * width + nx;
        if (data[q] < 8 || labels[q]) continue;
        labels[q] = id; queue[tail++] = q;
      }
    }
  }
  return labels;
}
