import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { teamRocketCards, teamRocketSet } from '../src/pokemon/TeamRocketCatalog.ts';
import { teamRocketDefinitions } from '../src/card/TeamRocketCards.ts';
import { teamRocketRecipe, teamRocketSecretChance } from '../src/pokemon/TeamRocketProduct.ts';
import { collatePokemon } from '../src/pokemon/collator.ts';
import { pokemonDefinition, pokemonProfile } from '../src/pokemon/materials.ts';
import { TcgdexAdapter } from '../src/pokemon/TcgdexAdapter.ts';
import { packAvailability } from '../src/pokemon/availability.ts';

test('Team Rocket has 83 exact numbered identities, separate rare counterparts, and authentic fronts in both editions', () => {
  assert.deepEqual(teamRocketCards.map(c => Number(c.localId)), Array.from({length:83},(_,i)=>i+1));
  const counts: Record<string,number> = {};
  for (const c of teamRocketCards) counts[c.rarity]=(counts[c.rarity]??0)+1;
  assert.deepEqual(counts, {'Holo Rare':17,Rare:17,Uncommon:24,Common:24,'Secret Rare':1});
  const counterparts=[...Array.from({length:14},(_,i)=>i+18),71,72,80];
  counterparts.forEach((n,i)=>{
    assert.equal(teamRocketCards[i].name,teamRocketCards[n-1].name);
    assert.deepEqual(teamRocketCards[i].variants,['holo']);
    assert.deepEqual(teamRocketCards[n-1].variants,['normal']);
    assert.notEqual(teamRocketCards[i].front,teamRocketCards[n-1].front);
  });
  assert.equal(teamRocketCards[82].name,'Dark Raichu');
  assert.equal(teamRocketCards[16].category,'Energy');
  assert.equal(teamRocketCards[14].category,'Trainer');
  assert.equal(teamRocketCards.filter(c=>c.energyType==='Special').length,4);
  assert.ok(teamRocketCards.every(c=>c.energyType!=='Normal'));
  for(const manifest of [
    JSON.parse(readFileSync('public/cards/pokemon/team-rocket/sources.json','utf8')).map((s:any)=>({...s,file:`public/cards/pokemon/team-rocket/${s.file}`})),
    JSON.parse(readFileSync('scripts/team-rocket/unlimited-sources.json','utf8')),
  ]) {
    assert.equal(manifest.length,83);
    for(const s of manifest) assert.equal(createHash('sha256').update(readFileSync(s.file)).digest('hex'),s.sha256);
  }
});

test('both editions preserve exact fronts and deferred holo identities without any foil assets or procedural fallback',()=>{
  assert.equal(teamRocketDefinitions.length,166);
  assert.equal(new Set(teamRocketDefinitions.map(d=>d.id)).size,166);
  for(const d of teamRocketDefinitions) {
    const card=d.pokemon!, resolved=pokemonDefinition(card,card.variant,[]);
    assert.equal(resolved.id,d.id);assert.equal(resolved.front,d.front);
    assert.equal(resolved.number,d.number);assert.match(d.number,/\/82/);
    assert.equal(resolved.profile,'print-only');assert.equal(pokemonProfile(card,card.variant),'print-only');
    assert.equal(resolved.pokemon?.treatmentStatus,card.variant==='holo'?'deferred':undefined);
    for(const key of ['maps','proceduralFoil','profileOverrides'] as const) assert.equal(resolved[key],undefined);
    assert.ok(existsSync(`public${d.front}`));
    assert.equal(d.front,card.editionFronts![card.edition!]);
    assert.throws(()=>pokemonDefinition(card,'reverse',[]),/Invalid/);
  }
  assert.ok(!existsSync('public/cards/pokemon/team-rocket/maps'));
});

test('local Team Rocket selection exposes four wrapper designs in each edition with no metadata requests',async()=>{
  const catalog=new TcgdexAdapter(),signal=new AbortController().signal,old=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error('Unexpected network request');};
  try {
    assert.deepEqual(await catalog.set('base5',signal),teamRocketSet);
    assert.equal(teamRocketSet.boosters.length,8);
    assert.equal(teamRocketSet.boosters.filter(b=>b.edition==='first-edition').length,4);
    assert.ok(packAvailability('base5').ready);
    for(const c of teamRocketCards) assert.deepEqual(await catalog.card(c.id,teamRocketSet,signal),c);
    await assert.rejects(catalog.card('base4-1',teamRocketSet,signal),/Unknown/);
    for(const b of teamRocketSet.boosters) { assert.ok(existsSync(`public${b.front}`));assert.ok(existsSync(`public${b.back}`)); }
  } finally {globalThis.fetch=old;}
});

test('Team Rocket collation uses 7/3/1, covers every print, and inserts Dark Raichu into the rare slot at configured 1/90',()=>{
  assert.equal(teamRocketSecretChance,1/90);
  assert.equal(teamRocketRecipe.slots[2].outcomes.find(o=>o.cardIds?.includes('base5-83'))?.weight,1/90);
  let secrets=0,holos=0;const seen=new Set<string>();
  for(let seed=0;seed<9000;seed++) {
    const pack=collatePokemon('base5','gyarados-unlimited',seed,teamRocketCards);
    assert.equal(pack.pulls.length,11);
    assert.ok(pack.pulls.slice(0,7).every(p=>p.card.rarity==='Common'&&p.variant==='normal'));
    assert.ok(pack.pulls.slice(7,10).every(p=>p.card.rarity==='Uncommon'&&p.variant==='normal'));
    assert.equal(new Set(pack.pulls.slice(0,7).map(p=>p.card.id)).size,7);
    assert.equal(new Set(pack.pulls.slice(7,10).map(p=>p.card.id)).size,3);
    const rare=pack.pulls[10];assert.equal(rare.slot,'rare:1');
    if(rare.card.id==='base5-83'){secrets++;assert.equal(rare.variant,'holo');}
    if(rare.variant==='holo')holos++;
    pack.pulls.forEach(p=>{seen.add(p.card.id);assert.equal(p.card.edition,'unlimited');});
    if(seed<100) {
      assert.deepEqual(pack.pulls,collatePokemon('base5','giovanni-unlimited',seed,[...teamRocketCards].reverse()).pulls);
      const first=collatePokemon('base5','gyarados-first-edition',seed,teamRocketCards);
      assert.deepEqual(first.pulls.map(p=>[p.card.id,p.variant]),pack.pulls.map(p=>[p.card.id,p.variant]));
      assert.notEqual(first.identity,pack.identity);
      first.pulls.forEach(p=>{assert.equal(p.card.edition,'first-edition');assert.equal(p.card.front,p.card.editionFronts!['first-edition']);});
    }
  }
  assert.equal(seen.size,83);assert.ok(secrets>65&&secrets<140,`${secrets} secrets / 9000`);
  assert.ok(holos>2800&&holos<3200,`${holos} holos / 9000`);
  for(const n of [1,17,18,71,80,83]) assert.throws(()=>collatePokemon('base5','gyarados-unlimited',1,teamRocketCards.filter(c=>c.localId!==String(n))),/Incomplete/);
  assert.throws(()=>collatePokemon('base5','invalid',1,teamRocketCards),/booster/);
  assert.throws(()=>collatePokemon('base5','gyarados-first-edition',1,teamRocketCards.map(c=>({...c,editionFronts:{unlimited:c.front}}))),/fronts/);
});
