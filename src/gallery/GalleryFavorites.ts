export const FAVORITES_STORAGE_KEY = 'holo:gallery-favorites:v1';
type FavoriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Storage stays at this boundary; the gallery only works with canonical IDs. */
export class GalleryFavorites {
  private ids = new Set<string>();
  private storage?: FavoriteStorage;
  constructor(storage?: FavoriteStorage) {
    this.storage = storage;
    try {
      const saved: unknown = JSON.parse(storage?.getItem(FAVORITES_STORAGE_KEY) ?? '[]');
      if (Array.isArray(saved)) this.ids = new Set(saved.filter((id): id is string => typeof id === 'string' && id.length > 0));
    } catch { /* Invalid or unavailable storage starts with an empty collection. */ }
  }
  has(id: string) { return this.ids.has(id); }
  toggle(id: string) {
    if (this.ids.has(id)) this.ids.delete(id); else this.ids.add(id);
    try { this.storage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...this.ids])); }
    catch { /* Keep the interaction usable when browser storage is restricted. */ }
    return this.ids.has(id);
  }
  filter<T extends { id: string }>(cards: T[], only: boolean): T[] {
    return only ? cards.filter(card => this.has(card.id)) : cards;
  }
}

export function browserGalleryFavorites() {
  let storage: FavoriteStorage | undefined;
  try { storage = localStorage; } catch { /* Storage may be disabled. */ }
  return new GalleryFavorites(storage);
}
