import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { lobCards, validateLobCatalog, treatmentFor } from '../src/yugioh/sets/LegendOfBlueEyesCatalog.ts';
import { lobProduct } from '../src/yugioh/sets/LegendOfBlueEyesProduct.ts';
import { collateYugioh, collateBoxPack } from '../src/yugioh/collator/collate.ts';
import { normalizeCatalog, queryCatalog, YugiohCatalogProvider } from '../src/yugioh/catalog/provider.ts';
import { LOB_CATALOG_ID, LOB_PRODUCT_ID, implementationFor } from '../src/yugioh/catalog/implementations.ts';
import { yugiohDefinition } from '../src/yugioh/materials.ts';
import { resolveYugiohProduct } from '../src/yugioh/products.ts';
import { prepareExactPack } from '../src/pack/PreparedPack.ts';
import { SelectionTask } from '../src/pokemon/requests.ts';
import type { PreparedCardCpu } from '../src/card/CardCpuPreparation.ts';

test('LOB is the complete original numbered 126-card printing',()=>{
  validateLobCatalog();
  assert.deepEqual(lobCards.map(c=>c.number),Array.from({length:126},(_,i)=>`LOB-${String(i).padStart(3,'0')}`));
  assert.equal(lobCards[12].name,'Trial of Hell');
  assert.deepEqual(lobCards.filter(c=>c.rarity==='Secret Rare').map(c=>c.number),['LOB-000','LOB-125']);
  assert.throws(()=>validateLobCatalog([...lobCards.slice(1),lobCards[1]]));
  assert.equal(lobCards.filter(c=>c.rarity==='Common').length,82);
  assert.equal(lobCards.filter(c=>c.distribution==='reported-short-print').length,14);
  for(const card of lobCards){assert.ok(existsSync(`public${card.front}`));assert.ok(card.source.image);assert.ok(card.printingId.includes('na-2002:first-edition'));}
});
test('seeded LOB packs preserve rare slot, have 9 distinct cards and no guarantees',()=>{
  const outcomes=new Set<string>();
  for(let seed=0;seed<2000;seed++){
    const p=collateYugioh(lobProduct,seed);outcomes.add(p.debug.foil);
    assert.equal(p.cards.length,9);assert.equal(new Set(p.cards.map(c=>c.id)).size,9);
    assert.equal(p.cards.filter(c=>c.rarity==='Rare').length,1);
    assert.deepEqual(p,collateYugioh(lobProduct,seed));
  }
  assert.equal(outcomes.size,4);
  assert.equal(collateBoxPack(lobProduct,19,23).debug.box?.guarantees,false);
  assert.throws(()=>collateBoxPack(lobProduct,19,24));
  assert.throws(()=>collateYugioh(lobProduct,-1));
  assert.throws(()=>collateYugioh({...lobProduct,packSize:8 as 9},1));
  assert.throws(()=>collateYugioh({...lobProduct,cards:lobCards.filter(c=>c.rarity!=='Secret Rare')},1));
  assert.throws(()=>collateYugioh({...lobProduct,rules:{...lobProduct.rules,shortPrintWeight:NaN}},1));
});
test('rarities keep art, name and stamp distinct and use existing early Secret interface',()=>{
  assert.equal(treatmentFor('Rare').artwork,'printed');assert.equal(treatmentFor('Super Rare').name,'printed');assert.equal(treatmentFor('Ultra Rare').name,'gold');
  for(const c of lobCards){
    const d=yugiohDefinition(c);assert.ok(d.maps?.stamp?.endsWith('.png'));assert.ok(d.maps?.foil?.endsWith('.png'));
    assert.equal(Boolean(d.maps?.metallic),c.rarity==='Rare'||c.rarity==='Ultra Rare');
    assert.equal(Boolean(d.maps?.secondaryFoil),c.rarity==='Secret Rare');
    if(c.rarity==='Secret Rare'){assert.equal(d.profile,'ygo-secret-early-tcg');assert.equal(d.yugioh?.era,'early-tcg');assert.equal(d.profileOverrides,undefined);}
    for(const path of Object.values(d.maps??{}))assert.ok(existsSync(`public${path}`));
  }
});
const fixture=[{set_name:'Legend of Blue Eyes White Dragon',set_code:'LOB',tcg_date:'2002-03-08',num_of_cards:355},
  {set_name:'Future Booster',set_code:'FUT',tcg_date:'2030-01-01',num_of_cards:100},
  {set_name:'No date'},{set_name:'Invalid date',set_code:'BAD',tcg_date:'2002-02-31'},null,{},
  {set_name:'LOB renamed',set_code:'LOB',tcg_date:'2002-03-08',num_of_cards:126}];
test('provider boundary normalizes malformed/missing fields, aliases and explicit implementation',()=>{
  const sets=normalizeCatalog(fixture);assert.equal(sets.length,4);
  const lob=sets.find(s=>s.setCode==='LOB')!;assert.equal(lob.id,LOB_CATALOG_ID);assert.equal(lob.implementationId,LOB_PRODUCT_ID);assert.equal(lob.aliases.length,1);
  assert.equal(sets.find(s=>s.setCode==='BAD')?.releaseDate,undefined);
  assert.equal(sets.find(s=>s.setCode==='FUT')?.implementationStatus,'browse-only');
  assert.equal(implementationFor('ygoprodeck:TCG:LOB:2023-07-14'),undefined);
  assert.equal(normalizeCatalog([{set_name:'Tin 1',set_code:'CT',tcg_date:'2020-01-01'},{set_name:'Tin 2',set_code:'CT',tcg_date:'2020-08-01'}]).length,2);
});
test('name/code search, physical format, period/family filters and stable sorting',()=>{
  const sets=[...normalizeCatalog(fixture),...normalizeCatalog([{set_name:'OCG set',set_code:'OCG',ocg_date:'2001-01-01'}],'OCG')];
  const q={search:'',format:'TCG' as const,era:'',family:'',sort:'oldest' as const};
  assert.equal(queryCatalog(sets,{...q,search:'lob'}).length,1);assert.equal(queryCatalog(sets,{...q,search:'future'})[0].setCode,'FUT');
  assert.equal(queryCatalog(sets,{...q,format:'OCG'}).length,1);assert.equal(queryCatalog(sets,q)[0].setCode,'LOB');
  assert.equal(queryCatalog(sets,{...q,sort:'newest'})[0].setCode,'FUT');
  assert.equal(queryCatalog(sets,{...q,family:'Booster pack'}).length,1);
  assert.equal(queryCatalog(sets,{...q,era:'2002–2004 · Early TCG'}).length,1);
  assert.deepEqual(queryCatalog(sets,{...q,sort:'alphabetical'}).map(s=>s.name),queryCatalog(sets,q).map(s=>s.name).sort((a,b)=>a.localeCompare(b)));
});
test('fresh cache avoids requests; stale/offline and bundled snapshots survive provider failure',async()=>{
  let stored:string|null=null,calls=0;
  const storage={getItem:()=>stored,setItem:(_k:string,v:string)=>{stored=v;}};
  const online=async()=>{calls++;return new Response(JSON.stringify(fixture));};
  const provider=new YugiohCatalogProvider(online as typeof fetch,storage);
  assert.equal((await provider.sets(new AbortController().signal)).source,'network');
  assert.equal((await provider.sets(new AbortController().signal)).source,'cache');assert.equal(calls,1);
  const offline=new YugiohCatalogProvider((async()=>{throw Error('offline');}) as typeof fetch,storage,'/snapshot',()=>Date.now()+172800000);
  assert.equal((await offline.sets(new AbortController().signal)).source,'cache');
  const bundled=new YugiohCatalogProvider((async(url)=>{if(url!=='/snapshot')throw Error('offline');return new Response(JSON.stringify({version:1,fetchedAt:'2002-01-01',records:fixture}));}) as typeof fetch,undefined,'/snapshot');
  assert.equal((await bundled.sets(new AbortController().signal)).source,'bundled');
});
test('abort never falls back or publishes stale provider results',async()=>{
  const controller=new AbortController();let resolve!:(r:Response)=>void;
  const provider=new YugiohCatalogProvider((()=>new Promise<Response>(r=>{resolve=r;})) as typeof fetch);
  const pending=provider.sets(controller.signal);controller.abort();resolve(new Response(JSON.stringify(fixture)));await assert.rejects(pending);
  const tasks=new SelectionTask(),a=tasks.begin(),b=tasks.begin();assert.equal(tasks.current(a),false);assert.equal(tasks.current(b),true);assert.equal(a.signal.aborted,true);
});
test('only explicit product can open; preparation touches only the exact nine cards',async()=>{
  assert.throws(()=>resolveYugiohProduct('unknown',LOB_PRODUCT_ID,1));assert.throws(()=>resolveYugiohProduct(LOB_CATALOG_ID,'unknown',1));
  const {pack,definitions}=resolveYugiohProduct(LOB_CATALOG_ID,LOB_PRODUCT_ID,9),seen:string[]=[];
  const prepared=await prepareExactPack(pack,9,definitions,new AbortController().signal,async c=>{seen.push(c.id);return {definition:c} as PreparedCardCpu;});
  assert.equal(prepared.cards.size,9);assert.deepEqual(seen,definitions.map(c=>c.id));assert.equal(pack.collation,undefined);
});
test('browser retains Archive/Pokemon and lazy-loads LOB product only on selection',()=>{
  const source=readFileSync('src/pokemon/PackBrowser.ts','utf8');
  for(const game of ['Archive','Pokémon','Yu-Gi-Oh!'])assert.ok(source.includes(`this.button('${game}'`));
  assert.ok(source.includes("await import('../yugioh/products')"));
  const bundled=JSON.parse(readFileSync('public/catalog/yugioh/sets.json','utf8'));
  assert.ok(normalizeCatalog(bundled.records).length>900);
});
