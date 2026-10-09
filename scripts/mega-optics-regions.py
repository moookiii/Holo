"""Supplemental reflection masks; approved TCGL maps remain read-only.

Seeds select reviewed flat white glyph contours in the exact etch. Fill only
uniformly dark enclosed islands, never textured artwork in glyph counters.
Original coverage and protection still clip the packed optical region.
"""
from pathlib import Path
import hashlib, json
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/mega-optics/regions'
OUT.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / 'public/cards/pokemon/mega-optics'
PUBLIC.mkdir(parents=True, exist_ok=True)
SEEDS = {
    265: [(410,423)], 266: [(367,443)],
    267: [(199,169),(96,204),(505,207),(184,282),(565,282),(371,171),(641,189)],
    268: [(193,161),(267,179),(408,198),(433,249),(544,281),(641,336),(333,172),(394,165)],
    269: [(325,468)], 270: [(171,416),(435,548)],
    271: [(377,216),(311,225),(226,288),(158,340),(66,359),(407,338),(565,238),(638,242)],
}
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
records = []
for folder in sorted((ROOT/'research/tcgl').glob('me*-*')):
    source = folder/'source.json'
    if not source.exists(): continue
    entries = json.loads(source.read_text(encoding='utf-8')).get('printings')
    if not entries: continue
    entry = entries[0]
    rarity = entry['rarity']
    if rarity not in ('Mega Attack Rare','Mega Hyper Rare'): continue
    card_id = entry['cardId']
    etch_path = next(folder.glob('*.etch.png'))
    foil_path = next(folder.glob('*.foil.png'))
    front_path = folder/etch_path.name.replace('.etch','')
    etch = np.array(Image.open(etch_path).convert('L'))
    foil = np.array(Image.open(foil_path).convert('L').resize((etch.shape[1],etch.shape[0]),Image.Resampling.BILINEAR))
    if rarity == 'Mega Attack Rare':
        threshold = 240 if int(entry['number']) in (265,266,269) else 180
        _, labels = cv2.connectedComponents(((etch>threshold)&(foil>160)).astype('uint8'),8)
        seeds = []
        for x,y in SEEDS[int(entry['number'])]:
            if labels[y,x]==0:
                yy,xx=np.nonzero(labels[max(0,y-12):y+13,max(0,x-12):x+13])
                xx+=max(0,x-12); yy+=max(0,y-12)
                nearest=np.argmin((xx-x)**2+(yy-y)**2)
                x,y=int(xx[nearest]),int(yy[nearest])
            seeds.append((x,y))
        selected = sorted(set(int(labels[y,x]) for x,y in seeds))
        region = np.isin(labels,selected).astype('uint8')
        region=cv2.morphologyEx(region,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
        count,islands,stats,_ = cv2.connectedComponentsWithStats(1-region,8)
        for i in range(1,count):
            x,y,w,h,area = stats[i]
            if x==0 or y==0 or x+w==etch.shape[1] or y+h==etch.shape[0]: continue
            pixels = islands==i
            if np.mean(etch[pixels]<128)>.70: region[pixels]=1
        mask = region.astype('float32')
        selection = {'seeds':seeds,'whiteThreshold':threshold,'foilSelectionThreshold':160,'contourGapClosurePixels':1,'darkIslandThreshold':128,'darkIslandFraction':.70}
    else:
        t = np.clip((foil.astype('float32')/255-.84)/.14,0,1)
        mask = t*t*(3-2*t)
        selection = {'foilSmoothstep':[.84,.98]}
    # Optical coverage is a subset of the exact continuous foil source.
    mask *= foil.astype('float32')/255
    path = PUBLIC/f'{card_id}-secondary.png'
    Image.fromarray(np.round(mask*255).astype('uint8')).save(path)
    front = np.array(Image.open(front_path).convert('RGB'))
    border = cv2.morphologyEx((mask>.5).astype('uint8'),cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))>0
    front[border] = [255,20,140]
    Image.fromarray(front).save(OUT/f'{card_id}-overlay.png')
    set_id = card_id.rsplit('-',1)[0]
    approved = {str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in (ROOT/f'public/cards/pokemon/tcgl-me/{set_id}/tcgl').glob(f"{entry['number']}-holo-*.png")}
    clean = ROOT/f"public/cards/pokemon/tcgl-me/{set_id}/{entry['number']}.png"
    approved[str(clean.relative_to(ROOT)).replace('\\','/')] = sha(clean)
    records.append({'cardId':card_id,'rarity':rarity,'tcglVariantId':entry['tcglVariantId'],
        'sources':{'etch':{'file':str(etch_path.relative_to(ROOT)),'sha256':sha(etch_path)},'foil':{'file':str(foil_path.relative_to(ROOT)),'sha256':sha(foil_path)}},
        'selection':selection,'dimensions':[etch.shape[1],etch.shape[0]],'verticalFlip':False,'cropOrOffset':False,
        'mask':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path),'approvedAssets':approved})
    print(card_id,round(float(mask.mean()),4))
(ROOT/'research/mega-optics/optical-regions.json').write_text(json.dumps(records,indent=2)+'\n')


