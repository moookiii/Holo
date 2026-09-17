import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AudioVariantPool, PACK_AUDIO_MANIFEST } from '../src/pack/PackAudio.ts';

test('pack audio manifest contains only the supplied recorded cue families', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(PACK_AUDIO_MANIFEST).map(([cue, urls]) => [cue, urls.length])), {
    crinkle: 8, tension: 4, tearStart: 4, tearFinish: 2, stripRelease: 3, extract: 3, cardSlide: 4, cardSettle: 4,
  });
  const publicRoot = fileURLToPath(new URL('../public', import.meta.url));
  for (const urls of Object.values(PACK_AUDIO_MANIFEST)) {
    for (const url of urls) {
      assert.match(url, /^\/audio\/pack\/[a-z0-9_]+\.wav$/, `unexpected pack audio URL: ${url}`);
      assert.ok(existsSync(`${publicRoot}${url}`), `missing ${url}`);
    }
  }
});

test('audio variant pools avoid immediate repetition', () => {
  const pool = new AudioVariantPool(['a', 'b', 'c']);
  const picks = Array.from({ length: 12 }, () => pool.next(() => 0));
  for (let index = 1; index < picks.length; index++) assert.notEqual(picks[index], picks[index - 1]);
  assert.throws(() => new AudioVariantPool([]), /cannot be empty/);
});
