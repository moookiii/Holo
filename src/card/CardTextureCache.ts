import type { Texture } from 'three/webgpu';

interface Entry { texture: Texture; refs: number; bytes: number; retain: boolean; }
/** Factory-local immutable resources. Live leases cannot be evicted. Idle
 * resources have a byte budget; imported data is released at its last owner. */
export class CardTextureCache {
  private entries = new Map<object | string, Entry>();
  private idleBytes = 0;
  created = 0;
  hits = 0;
  constructor(private budget = 32 * 1024 * 1024) {}
  acquire(key: object | string, bytes: number, create: () => Texture, retain = true) {
    let entry = this.entries.get(key);
    if (entry) {
      this.hits++;
      if (!entry.refs) this.idleBytes -= entry.bytes;
      this.entries.delete(key); this.entries.set(key, entry);
    } else {
      entry = { texture: create(), refs: 0, bytes, retain };
      this.entries.set(key, entry); this.created++;
    }
    entry.refs++;
    let released = false;
    return { texture: entry.texture, release: () => {
      if (released) return; released = true;
      if (--entry.refs) return;
      if (!entry.retain) { this.entries.delete(key); entry.texture.dispose(); return; }
      this.idleBytes += entry.bytes;
      for (const [oldKey, old] of this.entries) {
        if (this.idleBytes <= this.budget) break;
        if (old.refs) continue;
        this.idleBytes -= old.bytes; old.texture.dispose(); this.entries.delete(oldKey);
      }
    } };
  }
  stats() { return { textureRealizations: this.created, textureCacheHits: this.hits, textureCacheEntries: this.entries.size, idleTextureBytes: this.idleBytes }; }
  dispose() { for (const entry of this.entries.values()) entry.texture.dispose(); this.entries.clear(); this.idleBytes = 0; }
}
