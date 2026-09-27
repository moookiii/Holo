/** A fixed slot budget. Every async completion must still own its slot token.
 * Recently used non-visible slots survive until capacity is needed again. */
export class GalleryResidency {
  private clock = 0;
  readonly slots: { id?: string; token: number; used: number; visible: boolean }[];
  readonly capacity: number;
  constructor(capacity: number) {
    this.capacity = capacity;
    this.slots = Array.from({ length: capacity }, () => ({ token: 0, used: 0, visible: false }));
  }
  reconcile(ids: readonly string[]) {
    if (new Set(ids).size > this.capacity) throw new Error('Gallery viewport exceeds residency budget');
    const wanted = new Set(ids);
    for (const slot of this.slots) slot.visible = !!slot.id && wanted.has(slot.id);
    const assigned: { id: string; slot: number; token: number; changed: boolean }[] = [];
    for (const id of wanted) {
      let index = this.slots.findIndex(s => s.id === id), changed = false;
      if (index < 0) {
        index = this.slots.reduce((best, s, i) => !s.visible && (best < 0 || s.used < this.slots[best].used) ? i : best, -1);
        const slot = this.slots[index]; slot.id = id; slot.token++; changed = true;
      }
      const slot = this.slots[index]; slot.visible = true; slot.used = ++this.clock;
      assigned.push({ id, slot: index, token: slot.token, changed });
    }
    return assigned;
  }
  owns(slot: number, token: number) { return this.slots[slot]?.token === token; }
  clear() { for (const slot of this.slots) { slot.id = undefined; slot.visible = false; slot.token++; slot.used = 0; } }
}
