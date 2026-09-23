import test from 'node:test';
import assert from 'node:assert/strict';
import { baseSetCards, baseSetAuthoredIds } from '../src/card/BaseSetCards.ts';
import { cards } from '../src/card/CardDefinition.ts';
import { pokemonProfiles } from '../src/materials/profiles/pokemon.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import type { PokemonCard } from '../src/pokemon/types.ts';

test('all sixteen Base Set holos resolve to their registered local printing, even with a partial caller library', () => {
  assert.equal(baseSetCards.length, 16);
  for (const [index, authored] of baseSetCards.entries()) {
    const id = `base1-${index + 1}`;
    const card: PokemonCard = { id, localId: String(index + 1), name: authored.title,
      setId: 'base1', setName: 'Base Set', seriesId: 'base', seriesName: 'Base', era: 'base',
      rarity: 'Holo Rare', variants: ['holo'], front: 'https://example.invalid/unregistered-scan.png' };
    assert.equal(cards.filter(c => c.id === authored.id).length, 1);
    assert.equal(baseSetAuthoredIds[id], authored.id);
    for (const library of [cards, []]) {
      const result = pokemonDefinition(card, 'holo', library);
      assert.equal(result.id, `pokemon:${id}:holo`);
      assert.equal(result.pokemon?.id, id);
      assert.equal(result.front, authored.front);
      assert.deepEqual(result.maps, authored.maps);
      assert.equal(result.proceduralFoil, undefined);
      assert.equal(result.profile, 'pokemon-base-set-star');
      assert.equal(result.mapSettings?.embossStrength, 0);
      assert.equal(result.maps?.hologram, undefined);
    }
  }
});

test('Base Set cutouts never attach by name to a reprint or a normal printing', () => {
  const card: PokemonCard = { id: 'base1-4', localId: '4', name: 'Charizard', setId: 'base1',
    setName: 'Base Set', seriesId: 'base', seriesName: 'Base', era: 'base', rarity: 'Rare', variants: ['normal'] };
  assert.equal(pokemonDefinition(card, 'normal', cards).maps, undefined);
  const reprint = pokemonDefinition({ ...card, id: 'base4-4', setId: 'base4', variants: ['holo'] }, 'holo', cards);
  assert.notEqual(reprint.front, baseSetCards[3].front);
  assert.equal(reprint.maps, undefined);
});

test('the Base Set material is independent and is selected before generic era metadata', () => {
  const profile = pokemonProfiles.find(p => p.id === 'pokemon-base-set-star')!;
  assert.equal(profile.name, 'Star Holo: Base Set');
  assert.equal(profile.structure.field, 'base-set-star');
  assert.equal(profile.structure.relief, 0);
  assert.equal(profile.surface.imageHologram, undefined);
  assert.equal(profile.surface.inkTransmission, .48);
  assert.equal(profile.extendedCoverage, undefined);
  assert.equal(profile.maps, undefined, 'material must consume the cards existing masks');
  for (const card of baseSetCards) {
    assert.ok(card.substrate?.backgroundColor, `${card.title} needs its own registered printed ground`);
    assert.equal(card.substrate.printRetention, 0);
    assert.notDeepEqual(card.substrate.color, card.substrate.backgroundColor);
  }
  const legacy = pokemonProfiles.find(p => p.id === 'pokemon-galaxy-star')!;
  assert.equal(legacy.structure.field, 'galaxy-star');
  assert.equal(legacy.glints.strength, 10);
  for (let number = 1; number <= 16; number++) {
    const card = { id: `base1-${number}`, setId: 'base1', era: 'base', rarity: 'Holo Rare', foil: { holo: 'cosmos' } } as PokemonCard;
    assert.equal(pokemonProfile(card, 'holo'), profile.id);
    assert.equal(pokemonProfile(card, 'normal'), 'print-only');
    assert.notEqual(pokemonProfile({ ...card, id: `base4-${number}`, setId: 'base4' }, 'holo'), profile.id);
  }
});
