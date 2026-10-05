import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expeditionDefinitions } from '../src/card/ExpeditionCards.ts';

test('all 32 Holo Rare reverse prints use verified clean masters, while holo prints retain their original front', () => {
  const evidence = JSON.parse(readFileSync('public/cards/pokemon/expedition/reverse-front-evidence.json','utf8'));
  const donors = [33,34,35,37,38,40,41,42,43,44,45,47,48,49,50,51,52,54,55,56,57,58,59,60,61,62,63,65,66,68,69,70];
  assert.equal(evidence.length,32);
  for (let n=1;n<=32;n++) {
    const record = evidence[n-1];
    const reverse = expeditionDefinitions.find(c=>c.pokemon?.id===`ecard1-${n}` && c.pokemon.variant==='reverse')!;
    const holo = expeditionDefinitions.find(c=>c.pokemon?.id===`ecard1-${n}` && c.pokemon.variant==='holo')!;
    assert.equal(reverse.front,`/cards/pokemon/expedition/${n}-reverse.png`);
    assert.equal(holo.front,`/cards/pokemon/expedition/${n}.png`);
    assert.equal(reverse.profile,'pokemon-e-reader');
    assert.equal(record.artSource.cardId,`ecard1-${donors[n-1]}`);
    assert.equal(record.donorRarity,'Rare');
    assert.equal(record.outsideWindowChangedPixels,0);
    assert.ok(record.registrationResidualPixels.median<0.8);
    assert.ok(record.registrationResidualPixels.p95<1.5);
    for (const [file,hash] of [[record.output,record.outputSha256],[record.frameSource.file,record.frameSource.sha256],
      [record.artSource.file,record.artSource.sha256],[record.window,record.windowSha256]]) {
      const bytes = readFileSync(`public/cards/pokemon/expedition/${file}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,file);
      assert.equal(bytes.readUInt32BE(16),600); assert.equal(bytes.readUInt32BE(20),825);
    }
  }
});
