import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fossilCards, fossilSet } from '../src/pokemon/FossilCatalog.ts';
import { fossilDefinitions } from '../src/card/FossilCards.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { packAvailability } from '../src/pokemon/availability.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';

test('Fossil has 62 exact original fronts with separate holo and non-holo rare prints', () => {
  assert.equal(fossilCards.length,62);
  assert.deepEqual(fossilCards.map(c=>c.id),Array.from({length:62},(_,i)=>`base3-${i+1}`));
  assert.deepEqual(['Holo Rare','Rare','Uncommon','Common'].map(r=>fossilCards.filter(c=>c.rarity===r).length),[15,15,16,16]);
  const sources=JSON.parse(readFileSync('public/cards/pokemon/fossil/sources.json','utf8'));
  for(const [i,c] of fossilCards.entries()) {
    assert.deepEqual(c.variants,[i<15?'holo':'normal']);
    const bytes=readFileSync(`public${c.front}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sources[i].sha256);
    if(i<15){assert.equal(c.name,fossilCards[i+15].name);assert.notEqual(c.front,fossilCards[i+15].front);}
  }
  assert.equal(fossilCards[57].rarity,'Uncommon');
  assert.equal(fossilCards[61].name,'Mysterious Fossil');
});

test('Fossil holos remain deferred in picker and packs with no substitute foil or star maps', () => {
  assert.equal(fossilDefinitions.length,62);
  assert.equal(packAvailability('base3').ready,true);
  for(const c of fossilCards) {
    const variant=c.variants[0],d=pokemonDefinition(c,variant,[]);
    assert.equal(d.profile,'print-only'); assert.equal(pokemonProfile(c,variant),'print-only');
    assert.equal(d.pokemon?.treatmentStatus,variant==='holo'?'deferred':undefined);
    assert.equal(d.maps,undefined);assert.equal(d.proceduralFoil,undefined);
    assert.equal(d.front,c.front);
  }
});

test('Fossil catalog loads locally without set or card API requests', async () => {
  const catalog=new TcgdexAdapter(),signal=new AbortController().signal;
  const original=globalThis.fetch;
  globalThis.fetch=async()=>{throw new Error('Unexpected network request');};
  try {
    const set=await catalog.set('base3',signal);
    assert.deepEqual(set,fossilSet);
    for(const card of fossilCards) assert.deepEqual(await catalog.card(card.id,set,signal),card);
    await assert.rejects(catalog.card('base2-1',set,signal),/Unknown Fossil/);
  } finally {globalThis.fetch=original;}
});

test('Fossil packs have seven unique commons, three unique uncommons and exactly one rare outcome', () => {
  const seen = new Set<string>(); let holos = 0;
  for (let seed = 0; seed < 3000; seed++) {
    const pack = collatePokemon('base3', 'lapras', seed, fossilCards);
    assert.equal(pack.pulls.length, 11);
    assert.ok(pack.pulls.slice(0, 7).every(p => p.card.rarity === 'Common' && p.variant === 'normal'));
    assert.ok(pack.pulls.slice(7, 10).every(p => p.card.rarity === 'Uncommon' && p.variant === 'normal'));
    assert.equal(new Set(pack.pulls.map(p => p.card.id)).size, 11);
    assert.ok(pack.pulls.every(p => p.card.setId === 'base3' && p.card.category !== 'Energy' && p.variant !== 'reverse'));
    const rare = pack.pulls[10];
    assert.equal(rare.slot, 'rare:1');
    assert.equal(rare.variant, Number(rare.card.localId) <= 15 ? 'holo' : 'normal');
    assert.ok(Number(rare.card.localId) <= 30);
    if (rare.variant === 'holo') holos++;
    pack.pulls.forEach(p => seen.add(p.card.id));
    assert.deepEqual(pack.pulls, collatePokemon('base3', 'zapdos', seed, [...fossilCards].reverse()).pulls);
    assert.equal(pack.identity, collatePokemon('base3', 'lapras', seed, fossilCards).identity);
  }
  assert.equal(seen.size, 62);
  assert.ok(holos > 900 && holos < 1100, `Estimated 1/3 holo rate: ${holos}/3000`);
  assert.throws(() => collatePokemon('base3', 'unknown', 1, fossilCards), /booster/);
  for (const number of [1, 16, 31, 46]) assert.throws(() => collatePokemon('base3', 'lapras', 1, fossilCards.filter(c => c.localId !== String(number))), /Incomplete/);
});

