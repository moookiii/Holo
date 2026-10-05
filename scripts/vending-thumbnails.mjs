// Derived browsing assets only. Product data and full opening artwork stay authoritative.
// Run: node --experimental-strip-types scripts/vending-thumbnails.mjs
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { localBoosterArt } from '../src/pokemon/boosterArt.ts';
import { wotcWrappers } from '../src/pokemon/WotcProducts.ts';
const ids = new Set([...Object.keys(wotcWrappers), ...readdirSync('public/packs/pokemon').map(f => f.match(/^(sv[\d.]+)(?:-|\.)/)?.[1]).filter(Boolean)]);
const art = [...ids].flatMap(id => localBoosterArt(id) ?? []).filter(a => a.front);
art.push({ front: '/packs/yugioh/lob-first-edition/front.png' }, { front: '/packs/magic/alpha/thumbnail.png' });
const index = {}, jobs = [];
mkdirSync('public/packs/thumbnails', { recursive: true });
for (const a of art) {
  const key = `${a.front}|${a.frontBounds?.join(',') ?? ''}`;
  const file = `${createHash('sha256').update(key).digest('hex').slice(0, 16)}.webp`;
  index[key] = `packs/thumbnails/${file}`;
  jobs.push({ source: `public${a.front}`, output: `public/packs/thumbnails/${file}`, bounds: a.frontBounds });
}
const result = spawnSync('python', ['-c', `
import json,sys
from PIL import Image, ImageOps
for job in json.load(sys.stdin):
    im=Image.open(job['source']).convert('RGBA')
    if job.get('bounds'):
        l,t,r,b=job['bounds']; w,h=im.size
        im=im.crop((round(l*w),round(t*h),round(r*w),round(b*h)))
    im.thumbnail((240,360),Image.Resampling.LANCZOS)
    im.save(job['output'],'WEBP',quality=83,method=6)
`], { input: JSON.stringify(jobs), encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr);
writeFileSync('src/vending/thumbnails.json', JSON.stringify(index, null, 2)+'\n');
console.log(`Generated ${jobs.length} bounded thumbnails from registered wrapper art.`);
