// Run: node --experimental-strip-types --loader ./scripts/test-ts-loader.mjs scripts/audit-unfinished.mjs
import { spawnSync } from 'node:child_process';
import { svTcglCards } from '../src/pokemon/SvTcglCatalog.ts';
import { svTcglDefinition } from '../src/pokemon/SvTcglSurfaces.ts';
import { celebrationGalleryCards } from '../src/pokemon/CelebrationSurfaces.ts';
import { neoRevelationDefinitions } from '../src/card/NeoRevelationCards.ts';
import { prismaticSurfaceProgress } from '../src/pokemon/PrismaticSurfaces.ts';
import { profiles } from '../src/materials/profiles/index.ts';

const definitions = svTcglCards.flatMap(card => card.variants.map(variant => ({
  series: card.seriesId, definition: svTcglDefinition(card.id, variant),
})));
definitions.push(...celebrationGalleryCards().map(definition => ({ series: '30th', definition })));
definitions.push(...neoRevelationDefinitions.map(definition => ({ series: 'neo3', definition })));
const deferred = {}, motifCandidates = [], profileStatuses = {};
for (const { series, definition: d } of definitions) {
  if (d.pokemon?.treatmentStatus === 'deferred') {
    const key = `${series} | ${d.profile}`;
    deferred[key] = (deferred[key] ?? 0) + 1;
  }
  if (d.profile === 'pokemon-base-set-2-cosmos' && d.maps?.motif) {
    motifCandidates.push({ id: d.id, series, path: `public${d.maps.motif}` });
  }
}
const scan = spawnSync('python', ['-c', `
import sys,json,collections
from PIL import Image
groups=collections.Counter()
empty=[]
for row in json.load(sys.stdin):
    with Image.open(row['path']) as image:
        if image.convert('L').getextrema()[1] == 0:
            groups[row['series']] += 1
            empty.append(row['id'])
print(json.dumps({'groups':dict(groups),'ids':empty,'total':len(empty)}))
`], { input: JSON.stringify(motifCandidates), encoding: 'utf8' });
if (scan.status !== 0) throw new Error(scan.stderr || 'PNG audit failed; Python and Pillow required.');
for (const p of profiles) {
  const key = `${p.family} | ${p.status}`;
  profileStatuses[key] = (profileStatuses[key] ?? 0) + 1;
}
const p = prismaticSurfaceProgress();
console.log(JSON.stringify({
  deferred, deferredTotal: Object.values(deferred).reduce((a,b) => a+b,0),
  emptyCosmos: JSON.parse(scan.stdout),
  prismatic: { required: p.required, ready: p.ready, missing: p.missing.length },
  profileStatuses,
}, null, 2));
