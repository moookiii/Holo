import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { alphaCards } from '../src/magic/AlphaCatalog.ts';
import { alphaSheets, ALPHA_COLLATION_VERSION } from '../src/magic/AlphaCollationData.ts';
import { alphaProduct, resolveMagicProduct } from '../src/magic/products.ts';
import { collateMagic } from '../src/magic/collate.ts';
import { magicDefinition, ALPHA_DIMENSIONS } from '../src/magic/materials.ts';
import { presentPackContents, largePackLayout } from '../src/pack/PackPresentation.ts';
import { resolvePackContents } from '../src/pack/PackDefinition.ts';
import { packIdentity, prepareExactPack } from '../src/pack/PreparedPack.ts';
import { filterCards } from '../src/gallery/GalleryQuery.ts';
import type { PreparedCardCpu } from '../src/card/CardCpuPreparation.ts';
import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { PackCameraRig } from '../src/pack/PackCameraRig.ts';

test('all 295 Alpha printings have cached fronts, original frames and print-only materials', () => {
  assert.equal(alphaCards.length, 295);
  assert.equal(new Set(alphaCards.map(c => c.scryfallId)).size, 295);
  assert.equal(alphaCards.filter(c => c.typeLine === 'Basic Land — Island').length, 2);
  for (const card of alphaCards) {
    assert.ok(existsSync(`public${card.front}`), card.name);
    const definition = magicDefinition(card);
    assert.equal(definition.profile, 'print-only'); assert.equal(definition.dimensions, ALPHA_DIMENSIONS);
    assert.equal(definition.maps, undefined); assert.equal(definition.proceduralFoil, undefined);
    assert.equal(card.frame, '1993'); assert.equal(card.border, 'black'); assert.deepEqual(card.finishes, ['nonfoil']);
  }
});

test('sheet membership and land multiplicity are independent of Scryfall catalog rarity', () => {
  const byId = new Map(alphaCards.map(c => [c.id, c]));
  const expected = { common: { Plains: 9, Island: 10, Swamp: 9, Mountain: 9, Forest: 10 },
    uncommon: { Plains: 6, Island: 2, Swamp: 6, Mountain: 6, Forest: 6 }, rare: { Island: 5 } };
  for (const [id, sheet] of Object.entries(alphaSheets)) {
    assert.equal(sheet.cells.length, 121);
    const counts: Record<string, number> = {};
    const spells = new Set<string>();
    for (const candidates of sheet.cells) {
      assert.ok(candidates.every(cardId => byId.has(cardId)));
      const card = byId.get(candidates[0])!;
      if (card.typeLine.startsWith('Basic Land')) counts[card.name] = (counts[card.name] ?? 0) + 1;
      else { assert.equal(card.rarity, id); assert.ok(!spells.has(card.id)); spells.add(card.id); }
    }
    assert.deepEqual(counts, expected[id as keyof typeof expected]);
    assert.equal(spells.size, { common: 74, uncommon: 95, rare: 116 }[id]);
  }
  const rare = alphaSheets.rare.cells.flat();
  assert.equal(rare.filter(id => byId.get(id)?.name === 'Black Lotus').length, 1);
});

test('Alpha is deterministic, retains physical cell provenance and can pull lands from every slot', () => {
  const before = JSON.stringify(alphaProduct);
  const landSlots = new Set<string>();
  const rareCounts = new Map<string, number>();
  for (let seed = 0; seed < 5000; seed++) {
    const resolved = collateMagic(alphaProduct, seed, ALPHA_COLLATION_VERSION);
    assert.equal(resolved.pulls.length, 15);
    assert.deepEqual(resolved.pulls.map(p => p.slot), [...Array(11).fill('common'), ...Array(3).fill('uncommon'), 'rare']);
    for (const pull of resolved.pulls) {
      assert.ok(alphaSheets[pull.sheet].cells[pull.position].includes(pull.cardId));
      if (alphaCards.find(c => c.id === pull.cardId)!.typeLine.startsWith('Basic Land')) landSlots.add(pull.slot);
    }
    const rare = resolved.pulls[14].cardId;
    rareCounts.set(rare, (rareCounts.get(rare) ?? 0) + 1);
  }
  assert.equal(rareCounts.size, 118); // 116 rares plus two Island arts, no invented Lotus override.
  assert.deepEqual([...landSlots].sort(), ['common', 'rare', 'uncommon']);
  assert.equal(JSON.stringify(alphaProduct), before);
  assert.deepEqual(collateMagic(alphaProduct, 42, ALPHA_COLLATION_VERSION), collateMagic(alphaProduct, 42, ALPHA_COLLATION_VERSION));
  assert.notEqual(collateMagic(alphaProduct, 42, ALPHA_COLLATION_VERSION).identity, collateMagic(alphaProduct, 43, ALPHA_COLLATION_VERSION).identity);
});

test('reveal order is a validated permutation and cannot change generated contents or turn rares into foil', () => {
  const { pack } = resolveMagicProduct(alphaProduct.id, 42);
  const generated = resolvePackContents(pack, 42), before = JSON.stringify(generated);
  const reversed = { ...pack, presentationOrder: generated.map((_, i) => generated.length - i - 1) };
  assert.deepEqual(presentPackContents(reversed, generated), [...generated].reverse());
  assert.equal(JSON.stringify(generated), before);
  assert.ok(generated.every(c => c.rarity === 'standard' && !c.reveal));
  assert.notEqual(packIdentity(pack, 42), packIdentity(reversed, 42));
  assert.throws(() => presentPackContents({ ...pack, presentationOrder: Array(15).fill(0) }, generated));
  assert.throws(() => collateMagic({ ...alphaProduct, presentation: ['common', 'common', 'rare'] }, 42, 'invalid'));
  for (const portrait of [true, false]) {
    const layout = largePackLayout(15, portrait);
    assert.equal(new Set(Array.from({ length: 15 }, (_, i) => layout.position(i).join())).size, 15);
    for (let i = 0; i < 15; i++) { const [x, y] = layout.position(i); assert.ok(Math.abs(x) + 3.15 < layout.width / 2); assert.ok(Math.abs(y) + 4.4 < layout.height / 2); }
  }
});

test('exact preparation preserves generated content and prepares duplicate identities once, with cancellation', async () => {
  const { pack, definitions } = resolveMagicProduct(alphaProduct.id, 51);
  const preparedIds: string[] = [];
  const prepared = await prepareExactPack(pack, 51, definitions, new AbortController().signal, async card => {
    preparedIds.push(card.id); return { definition: card } as PreparedCardCpu;
  });
  assert.equal(prepared.contents.length, 15); assert.equal(prepared.cards.size, new Set(prepared.contents.map(c => c.cardId)).size);
  assert.equal(preparedIds.length, prepared.cards.size); assert.equal(prepared.identity, packIdentity(pack, 51));
  assert.deepEqual(prepared.contents.map(c => c.cardId), pack.magic!.pulls.map(c => c.cardId));
  const request = new AbortController(); request.abort();
  await assert.rejects(prepareExactPack(pack, 51, definitions, request.signal, async () => { throw new Error('must not run'); }), { name: 'AbortError' });
});

test('gallery supports the complete Alpha set, catalog rarity and independent nonfoil finish', () => {
  const definitions = alphaCards.map(magicDefinition);
  assert.equal(filterCards(definitions, { search: '', game: 'Magic: The Gathering', set: 'Limited Edition Alpha' }).length, 295);
  assert.equal(filterCards(definitions, { search: '', rarity: 'rare', finish: 'Non-holo' }).length, 116);
  assert.equal(filterCards(definitions, { search: 'Black Lotus' })[0].id, alphaCards.find(c => c.name === 'Black Lotus')!.id);
});

test('portrait pack framing keeps all fifteen cards inside the frustum and restores the viewer far plane', () => {
  const originalWindow = globalThis.window;
  Object.assign(globalThis, { window: { innerHeight: 900 } });
  try {
    const camera = new PerspectiveCamera(30, 430 / 900, .2, 100);
    camera.position.z = 30;
    const rig = new PackCameraRig(camera); rig.begin();
    const layout = largePackLayout(15, true);
    rig.frame(layout.width, layout.height, 0, 0, 3.5); rig.update(0, true);
    assert.ok(camera.position.z > 100);
    for (let i = 0; i < 15; i++) {
      const [x, y, z] = layout.position(i);
      for (const dx of [-3.15, 3.15]) for (const dy of [-4.4, 4.4]) {
        const projected = new Vector3(x + dx, y + dy, z).project(camera);
        assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z < 1);
      }
    }
    rig.restore(); assert.equal(camera.far, 100); assert.equal(camera.position.z, 30);
  } finally { Object.assign(globalThis, { window: originalWindow }); }
});
