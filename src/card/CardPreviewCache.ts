import type { CardDefinition } from './CardDefinition';
import type { CardPreview } from './CardPreviewPreparation';

/** Session-local LRU. Keep the exact prepared pixels; never trade quality for reuse. */
export class CardPreviewCache {
  private entries = new Map<string, { preview: CardPreview; bytes: number }>();
  private bytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  readonly budget: number;
  constructor(budget = 192 * 1024 * 1024) { this.budget = budget; }
  has(card: CardDefinition) { return this.entries.has(JSON.stringify(card)); }
  get(card: CardDefinition, countMiss = true) {
    // Include seed, layout, fallback and coverage mode as well as map/profile data.
    const key = JSON.stringify(card), entry = this.entries.get(key);
    if (!entry) { if (countMiss) this.misses++; return undefined; }
    this.entries.delete(key); this.entries.set(key, entry); this.hits++;
    return entry.preview;
  }
  set(card: CardDefinition, preview: CardPreview) {
    const key = JSON.stringify(card);
    const bytes = preview.images.reduce((total, image) => total + image.byteLength, preview.parameters.byteLength);
    const previous = this.entries.get(key);
    if (previous) { this.bytes -= previous.bytes; this.entries.delete(key); }
    if (bytes > this.budget) return;
    this.entries.set(key, { preview, bytes }); this.bytes += bytes;
    while (this.bytes > this.budget) {
      const oldest = this.entries.keys().next().value!;
      this.bytes -= this.entries.get(oldest)!.bytes; this.entries.delete(oldest);
      this.evictions++;
    }
  }
  stats() { return { previewBytes: this.bytes, previewBudget: this.budget, previewCacheEntries: this.entries.size, previewCacheHits: this.hits,
    previewCacheMisses: this.misses, previewCacheEvictions: this.evictions }; }
  clear() { this.entries.clear(); this.bytes = 0; }
}
