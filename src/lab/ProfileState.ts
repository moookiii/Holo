import type { HolographicProfile } from '../materials/HolographicProfile.ts';

export const cloneProfile = (p: HolographicProfile): HolographicProfile => structuredClone(p);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** History contains materials only. Inspection, card, camera and lighting never enter it. */
export class ProfileState {
  current: HolographicProfile;
  baseline: HolographicProfile;
  private past: HolographicProfile[] = [];
  private future: HolographicProfile[] = [];
  private transaction?: HolographicProfile;
  private snapshots: Partial<Record<'A' | 'B', HolographicProfile>> = {};
  constructor(profile: HolographicProfile) { this.current = cloneProfile(profile); this.baseline = cloneProfile(profile); }
  get dirty() { return !equal(this.current, this.baseline); }
  get canUndo() { return this.past.length > 0 || !!this.transaction && !equal(this.transaction, this.current); }
  get canRedo() { return this.future.length > 0; }
  begin() { this.transaction ??= cloneProfile(this.current); }
  edit(change: (profile: HolographicProfile) => void) {
    const automatic = !this.transaction;
    this.begin(); change(this.current);
    if (automatic) this.commit();
  }
  commit() {
    if (this.transaction && !equal(this.transaction, this.current)) {
      this.past.push(this.transaction); if (this.past.length > 100) this.past.shift(); this.future = [];
    }
    this.transaction = undefined;
  }
  undo() { this.commit(); const previous = this.past.pop(); if (previous) { this.future.push(cloneProfile(this.current)); this.current = previous; } }
  redo() { this.commit(); const next = this.future.pop(); if (next) { this.past.push(cloneProfile(this.current)); this.current = next; } }
  reset() { this.replace(this.baseline); }
  replace(profile: HolographicProfile) { this.edit(p => { for (const key of Object.keys(p)) delete (p as unknown as Record<string, unknown>)[key]; Object.assign(p, cloneProfile(profile)); }); }
  markSaved(profile = this.current) { this.commit(); this.current = cloneProfile(profile); this.baseline = cloneProfile(profile); }
  store(slot: 'A' | 'B') { this.snapshots[slot] = cloneProfile(this.current); }
  snapshot(slot: 'A' | 'B') { const p = this.snapshots[slot]; return p && cloneProfile(p); }
}
