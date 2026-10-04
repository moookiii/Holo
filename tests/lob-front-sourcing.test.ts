import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lobCards } from '../src/yugioh/sets/LegendOfBlueEyesCatalog.ts';

test('all LOB fronts separate catalog identity, printing evidence and local provenance', () => {
  const report = JSON.parse(readFileSync('public/cards/yugioh/lob-first-edition/sources.json','utf8'));
  assert.equal(report.records.length,126);
  for (const card of lobCards) {
    const p = JSON.parse(readFileSync(`public${card.source.provenance}`,'utf8'));
    assert.equal(p.schemaVersion,2);
    assert.equal(p.catalogIdentity.provider,'YGOPRODeck');
    assert.equal(p.catalogIdentity.cardId,card.passcode);
    assert.equal(p.catalogIdentity.setCode,card.number);
    assert.equal(p.catalogIdentity.rarity,card.rarity);
    assert.equal(p.printingIdentity.target.region,'North America');
    assert.equal(p.imageProvenance.runtimePath,card.front);
    assert.ok(card.front.startsWith('/cards/yugioh/lob-first-edition/'));
    assert.ok(existsSync(`public${card.front}`));
    assert.ok(p.imageProvenance.sourceUrl && p.imageProvenance.originalImageUrl);
    assert.equal(p.imageProvenance.sha256,createHash('sha256').update(readFileSync(p.imageProvenance.originalPath)).digest('hex'));
    assert.equal(p.imageProvenance.upscaled,false);
    if (p.imageProvenance.fallback) {
      assert.equal(card.source.fidelity,'general-image-fallback');
      assert.equal(p.manualReview.required,true);
    } else {
      assert.equal(p.printingIdentity.verificationStatus,'verified');
      assert.equal(p.printingIdentity.verified.region,'North America');
    }
    if (card.source.assetStatus === 'original-print-region-review') {
      assert.equal(p.imageProvenance.exactPrint,false);
      assert.equal(p.printingIdentity.verified.region,undefined);
      assert.equal(p.printingIdentity.verificationStatus,'front-verified-region-unresolved');
    }
    if (card.front.endsWith('.png')) {
      const bytes = readFileSync(`public${card.front}`);
      assert.equal(p.imageProvenance.runtimeSha256,createHash('sha256').update(bytes).digest('hex'));
      assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],p.imageProvenance.resolution);
      assert.ok(p.imageProvenance.resolution[0]>=650 && p.imageProvenance.resolution[1]>=1000);
      for (const suffix of ['foil','name','stamp']) {
        const path = `/cards/yugioh/lob-first-edition/maps/${card.number}-${suffix}.png`;
        const map = readFileSync(`public${path}`);
        assert.deepEqual([map.readUInt32BE(16),map.readUInt32BE(20)],p.imageProvenance.resolution);
      }
    }
  }
  assert.equal(report.summary.exactPrintHighQuality + report.summary.fallback,126);
  assert.equal(report.summary.exactPrintHighQuality + report.summary.provisionalOriginalFronts + report.summary.legacyFallbacks,126);
  assert.deepEqual(report.summary.ygoprodeckFallback,['LOB-042','LOB-071','LOB-088']);
});

test('rejected seller-title mismatches retain the actual observed printing', () => {
  const manifest = JSON.parse(readFileSync('scripts/lob-fronts/candidates.json','utf8'));
  assert.equal(manifest.candidates.find((c: {id:string})=>c.id==='LOB-005-additional-ebay').printingEvidence.observed.setCode,'LDB-P005');
  assert.equal(manifest.candidates.find((c: {id:string})=>c.id==='LOB-068-additional-ebay').printingEvidence.observed.edition,'Unlimited');
  assert.ok(manifest.candidates.every((c:{setCode:string})=>/^LOB-\d{3}$/.test(c.setCode) && Number(c.setCode.slice(4))<=125));
});
