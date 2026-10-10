"""Replace low-resolution wrappers with original archive files, without upscaling."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, html, json, re, math
import requests
import numpy as np
import cv2
from PIL import Image, ImageDraw
from swsh_wrappers import ROOT, WRAPPER_NAMES, SLUGS, reviewed_bounds

BASE = 'https://archives.bulbagarden.net'
CATEGORY = BASE + '/wiki/Category:English_Sword_%26_Shield_Series_packs'
RAW = ROOT / 'research/tcgl/swsh-wrappers/bulbagarden'

def canonical(name):
    for word in ['Gigantamax ', 'Eternamax ', 'Forme ', ' (Amped Form)', ' copy', 'Radiant ']:
        name = name.replace(word, '')
    return name.lower().replace(' ', '')

def main():
    RAW.mkdir(parents=True, exist_ok=True)
    page = requests.get(CATEGORY, timeout=60); page.raise_for_status()
    files = set(html.unescape(x) for x in re.findall(r'title="File:([^"]+)"', page.text))
    records = json.loads((ROOT / 'public/packs/pokemon/swsh-wrapper-sources.json').read_text())
    def upgrade(record):
        sid, index = record['setId'], int(record['design'])
        name = WRAPPER_NAMES[sid][index]
        special = {'swsh4-5': 'Shining Fates', 'swsh7-5': 'Celebrations', 'swsh10-5': 'Pokémon GO', 'swsh12-5': 'Crown Zenith', 'swsh3-5': 'Champion Path'}
        prefix = special.get(sid, sid.upper()) + ' Booster'
        candidates = [f for f in files if f.startswith(prefix + '.') or f.startswith(prefix + ' ')]
        candidates = [f for f in candidates if f.startswith(prefix + '.') or canonical(f[len(prefix)+1:].rsplit('.',1)[0]) == canonical(name)]
        if len(candidates) != 1:
            raise ValueError((sid, name, candidates))
        filename = candidates[0].replace(' ', '_')
        digest = hashlib.md5(filename.encode()).hexdigest()
        url = BASE + '/media/upload/' + digest[0] + '/' + digest[:2] + '/' + requests.utils.quote(filename)
        source = RAW / filename
        if not source.exists():
            response = requests.get(url, timeout=60); response.raise_for_status(); source.write_bytes(response.content)
        image = Image.open(source).convert('RGBA')
        if image.height < 1000:
            print('Pending higher resolution:', sid, name, image.size, flush=True)
            return record
        pixels = np.asarray(image)
        foreground = (pixels[:,:,:3].min(2) < 240).astype('uint8')
        _, _, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
        x,y,w,h,_ = max(stats[1:], key=lambda s:s[4])
        # Carry forward the approved native wrapper trims, scaled to the new
        # source pixels. This removes presentation caps and tapered side gaps.
        legacy = next((ROOT/'research/tcgl/swsh-wrappers').glob(SLUGS[sid]+'-pack-'+str(index)+'.*'))
        legacy_size = Image.open(legacy).size
        original = (0, 0, *legacy_size)
        trimmed = reviewed_bounds(sid, index, original)
        sx = image.width / original[2]; sy = image.height / original[3]
        left,top,right,bottom = (trimmed[0], trimmed[1], original[2]-trimmed[2], original[3]-trimmed[3])
        bounds = tuple(map(int, (x+round(left*sx), y+round(top*sy), x+w-round(right*sx), y+h-round(bottom*sy))))
        # Native archive exports retain a tapered white gutter beyond the
        # scaled legacy crop. Keep the rectangle inside its widest extent.
        side_inset = math.ceil(image.width * .023)
        bounds = (max(bounds[0], side_inset), bounds[1], min(bounds[2], image.width-side_inset), bounds[3])
        crop = image.crop(bounds)
        target = ROOT / record['output']; crop.save(target)
        return dict(record, url=url, sourcePage=BASE+'/wiki/File:'+requests.utils.quote(filename), source=source.relative_to(ROOT).as_posix(), sourceDimensions=list(image.size), sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), crop=list(bounds), dimensions=list(crop.size), sha256=hashlib.sha256(target.read_bytes()).hexdigest(), cropStatus='Native resolution; approved wrapper trims scaled from prior source; no resizing')
    records = list(ThreadPoolExecutor(6).map(upgrade, records))
    (ROOT/'public/packs/pokemon/swsh-wrapper-sources.json').write_text(json.dumps(records,indent=2)+'\n')
    registry = {}
    for record in records:
        sid, index = record['setId'], int(record['design'])
        front = '/packs/pokemon/'+Path(record['output']).name
        if 'bulbagarden' in record['source']:
            front += '?v='+record['sha256'][:12]
        registry.setdefault(sid, []).append({'id':'art-'+str(index), 'name':WRAPPER_NAMES[sid][index]+' booster', 'front':front})
    (ROOT/'src/pokemon/data/swsh-wrappers.generated.ts').write_text('// Sourced English retail wrappers; generated offline.\nimport type { PokemonBooster } from "../types.ts";\nexport const swshWrappers: Record<string, PokemonBooster[]> = '+json.dumps(registry)+';\n')
    sheet = Image.new('RGB',(8*190,((len(records)+7)//8)*310),'#222222'); draw=ImageDraw.Draw(sheet)
    for i,r in enumerate(records):
        im=Image.open(ROOT/r['output']); im.thumbnail((180,280)); x=i%8*190; y=i//8*310
        sheet.paste(im,(x+(190-im.width)//2,y+20)); draw.text((x+4,y+2),r['setId']+' '+r['design'],fill='white')
    sheet.save(ROOT/'artifacts/swsh-wrappers-hires.png')
    print('Upgraded',sum('bulbagarden' in r['source'] for r in records),'of',len(records),flush=True)

if __name__ == '__main__': main()
