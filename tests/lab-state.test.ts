import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileState } from '../src/lab/ProfileState.ts';
import { deserializeProfile, serializeProfile, readUserProfiles, writeUserProfiles } from '../src/lab/ProfileCodec.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';
import { yugiohProfiles } from '../src/materials/profiles/yugioh.ts';
import { magicProfiles } from '../src/materials/profiles/magic.ts';
const fixtures = [...pokemonProfiles, ...yugiohProfiles, ...magicProfiles];
test('all existing families round-trip without altered defaults or optional data', () => {
  for (const profile of fixtures) assert.deepEqual(deserializeProfile(serializeProfile(profile)), profile);
});
test('working edits isolate profiles, coalesce a drag, undo, redo and reset exactly', () => {
  const source = fixtures[0], original = structuredClone(source), state = new ProfileState(source);
  state.begin(); for (let i = 0; i < 100; i++) state.edit(p => p.diffraction.strength = i / 30); state.commit();
  assert.deepEqual(source, original); assert.ok(state.dirty);
  state.undo(); assert.deepEqual(state.current, original); assert.equal(state.canUndo, false);
  state.redo(); assert.equal(state.current.diffraction.strength, 99 / 30);
  state.reset(); assert.deepEqual(state.current, original); state.undo(); assert.equal(state.current.diffraction.strength, 99 / 30);
});
test('A/B snapshots cannot alias working state, one another or pose/lighting', () => {
  const state = new ProfileState(fixtures[0]); state.store('A'); state.edit(p => p.surface.roughness = .543); state.store('B');
  assert.notEqual(state.snapshot('A')!.surface.roughness, .543);
  state.snapshot('B')!.surface.roughness = 0;
  assert.equal(state.snapshot('B')!.surface.roughness, .543);
  assert.equal('pose' in state.snapshot('B')!, false);
});
test('layer switches and map response serialize and reset with material state', () => {
  const state = new ProfileState(fixtures[0]); state.edit(p => { p.disabledMechanisms = ['sparkle']; p.mapSettings = { normalScale: .4 }; p.secondary = structuredClone(p); });
  assert.deepEqual(deserializeProfile(serializeProfile(state.current)), state.current);
  state.reset(); assert.deepEqual(state.current, fixtures[0]); state.undo(); assert.equal(state.current.mapSettings?.normalScale, .4);
});
test('validation rejects malformed, unsafe and nonphysical data', () => {
  for (const change of [(p: any) => p.diffraction.period = 0, (p: any) => p.surface.roughness = 'bad', (p: any) => p.structure.field = 'unknown', (p: any) => p.secondary = {}, (p: any) => p.disabledMechanisms = ['unknown']]) {
    const p = structuredClone(fixtures[0]); change(p); assert.throws(() => deserializeProfile(JSON.stringify(p)));
  }
  assert.throws(() => deserializeProfile('{"__proto__":{}}'));
});
test('persistent library contains user profiles only and surfaces failed writes', () => {
  let data = ''; const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; } };
  const p = { ...structuredClone(fixtures[0]), id: 'user-example' };
  writeUserProfiles(storage, [fixtures[0], p]); assert.deepEqual(readUserProfiles(storage), [p]);
  assert.throws(() => writeUserProfiles({ setItem: () => { throw new Error('Quota'); } }, [p]));
});
