import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { expandedNonHoloCards } from '../src/card/NonHoloCards.ts';

test('non-holo expansion adds exactly 200 unique print-only cards', () => {
  assert.equal(expandedNonHoloCards.length, 200);
  assert.deepEqual(Object.fromEntries(Map.groupBy(expandedNonHoloCards, card => card.franchise).entries().map(([key, value]) => [key, value.length])), {
    'Pokémon': 67, 'Yu-Gi-Oh!': 67, 'Magic: The Gathering': 66,
  });
  assert.equal(new Set(expandedNonHoloCards.map(card => card.id)).size, 200);
  assert.equal(new Set(expandedNonHoloCards.map(card => card.title.toLocaleLowerCase())).size, 200);
  assert.ok(expandedNonHoloCards.every(card => card.profile === 'print-only'));
});

test('every expansion front is present and substantial high-resolution art', () => {
  const dimensions = (path: string) => {
    const bytes = readFileSync(path);
    if (bytes.subarray(1, 4).toString() === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      offset += 2 + length;
    }
    throw new Error(`Unsupported image: ${path}`);
  };
  for (const card of expandedNonHoloCards) {
    const path = `public${card.front}`;
    assert.ok(existsSync(path), `missing ${card.title}: ${path}`);
    assert.ok(statSync(path).size > 80_000, `${card.title} image is unexpectedly small`);
    const [width, height] = dimensions(path);
    const minimum = card.franchise === 'Pokémon' ? [600, 825] : card.franchise === 'Yu-Gi-Oh!' ? [813, 1185] : [744, 1040];
    assert.ok(width >= minimum[0] && height >= minimum[1], `${card.title} is only ${width} × ${height}`);
  }
});

test('expansion provenance explicitly records non-holo selection', () => {
  const sources = JSON.parse(readFileSync('public/cards/non-holo/sources.json', 'utf8'));
  const expansion = sources.filter((source: { slug: string }) => /^(sv1-|archive-|nonfoil-)/.test(source.slug));
  assert.equal(expansion.length, 200);
  assert.ok(expansion.every((source: { nonHolo?: boolean; source?: string; metadata?: string }) => source.nonHolo && source.source?.startsWith('https://') && source.metadata?.startsWith('https://')));
});
