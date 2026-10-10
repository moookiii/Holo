"""Acquire original English wrapper images and retain crop evidence."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import re,json,hashlib,requests
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SLUGS=dict(zip(['swsh1','swsh2','swsh3','swsh3-5','swsh4','swsh4-5','swsh5','swsh6','swsh7','swsh7-5','swsh8','swsh9','swsh10','swsh10-5','swsh11','swsh12','swsh12-5'],['sword-and-shield','rebel-clash','darkness-ablaze','champions-path','vivid-voltage','shining-fates','battle-styles','chilling-reign','evolving-skies','celebrations','fusion-strike','brilliant-stars','astral-radiance','pokemon-go','lost-origin','silver-tempest','crown-zenith']))
WRAPPER_NAMES = {'swsh1': ['Gigantamax Snorlax', 'Gigantamax Lapras', 'Zamazenta', 'Zacian'], 'swsh2': ['Gigantamax Toxtricity (Amped Form)', 'Inteleon', 'Cinderace', 'Rillaboom'], 'swsh3': ['Eternatus', 'Grimmsnarl', 'Gigantamax Centiskorch', 'Gigantamax Charizard'], 'swsh3-5': ['Drednaw', 'Gardevoir', 'Obstagoon', 'Alcremie'], 'swsh4': ['Zarude', 'Gigantamax Orbeetle', 'Celebi', 'Gigantamax Pikachu'], 'swsh4-5': ['Shiny Dragapult', 'Shiny Toxtricity', 'Shiny Corviknight', 'Shiny Gigantamax Charizard'], 'swsh5': ['Gigantamax Single Strike Urshifu', 'Tyranitar', 'Empoleon', 'Gigantamax Rapid Strike Urshifu'], 'swsh6': ['Galarian Moltres', 'Galarian Zapdos', 'Shadow Rider Calyrex', 'Galarian Articuno', 'Ice Rider Calyrex'], 'swsh7': ['Duraludon', 'Sylveon', 'Rayquaza', 'Umbreon'], 'swsh7-5': ['Pikachu anniversary'], 'swsh8': ['Boltund', 'Genesect', 'Mew', 'Gigantamax Gengar'], 'swsh9': ['Whimsicott', 'Shaymin', 'Charizard', 'Arceus'], 'swsh10': ['Hisuian Typhlosion', 'Hisuian Decidueye', 'Origin Forme Dialga', 'Hisuian Samurott', 'Origin Forme Palkia'], 'swsh10-5': ['Mewtwo, Pikachu & Blissey'], 'swsh11': ['Hisuian Zoroark', 'Origin Forme Giratina', 'Gardevoir', 'Enamorus'], 'swsh12': ['Regidrago', 'Regieleki', 'Lugia', 'Alolan Vulpix'], 'swsh12-5': ['Zacian & Zamazenta']}

# Insets from the source's connected bounding crop, in left/top/right/bottom
# order. Reviewed at native resolution: remove dark presentation caps and side
# gutters while retaining the colored crimps, artwork and all printed text.
# Base Sword & Shield and Rebel Clash already use the approved tight treatment.
SEALED_WRAPPER_SETS = {
    'swsh1', 'swsh2', 'swsh3', 'swsh4', 'swsh4-5', 'swsh5', 'swsh6',
    'swsh7', 'swsh7-5', 'swsh8', 'swsh12-5',
}
# Later silver-seal fronts also need their pale crimp margins removed. Their
# tapered white side gutters extend farther inward than the older black caps.
SILVER_SEAL_WRAPPER_SETS = {'swsh9', 'swsh10', 'swsh11', 'swsh12'}
# Photographed Champion's Path wrappers have independent, uneven margins.
DESIGN_TRIMS = {
    ('swsh3-5', 0): (4, 25, 4, 33),
    ('swsh3-5', 1): (8, 20, 6, 3),
    ('swsh3-5', 2): (6, 18, 5, 14),
    ('swsh3-5', 3): (4, 8, 4, 7),
    ('swsh10-5', 0): (9, 4, 9, 4),
}

def reviewed_bounds(sid, design, bounds):
    trim = DESIGN_TRIMS.get((sid, design))
    if trim is None:
        if sid in SILVER_SEAL_WRAPPER_SETS:
            trim = (9, 22, 9, 22)
        else:
            trim = (6, 22, 6, 22) if sid in SEALED_WRAPPER_SETS else (0, 0, 0, 0)
    left, top, right, bottom = bounds
    return (left + trim[0], top + trim[1], right - trim[2], bottom - trim[3])

def main():
    raw=ROOT/'research/tcgl/swsh-wrappers';raw.mkdir(exist_ok=True)
    html=(ROOT/'research/tcgl/swsh-wrapper-index.html').read_text(encoding='utf-8')
    paths=set(re.findall(r'/images/tcg/sets/booster-pack-art/[^"\s<>]+\.(?:png|jpg)',html))
    tasks=[]
    for sid,slug in SLUGS.items():
        found=sorted(p for p in paths if re.search('/'+slug+r'-pack-\d+\.',p))
        if not found:raise ValueError('Missing wrappers '+slug)
        tasks.extend((sid,i,p) for i,p in enumerate(found))
    def fetch(task):
        sid,i,path=task;url='https://pokesymbols.com'+path;source=raw/Path(path).name
        if not source.exists():
            r=requests.get(url,timeout=45);r.raise_for_status();source.write_bytes(r.content)
        im=Image.open(source).convert('RGBA')
        # JPEG sources have white presentation padding; use the connected
        # printed wrapper bounds rather than resizing the square source.
        import numpy as np,cv2
        pix=np.asarray(im);foreground=(pix[...,:3].min(2)<240)&(pix[...,3]>0)
        n,labels,stats,_=cv2.connectedComponentsWithStats(foreground.astype('uint8'),8)
        x,y,w,h,_=max(stats[1:],key=lambda s:s[4]);bounds=(int(x),int(y),int(x+w),int(y+h))
        bounds=reviewed_bounds(sid,i,bounds)
        crop=im.crop(bounds)
        target=ROOT/f'public/packs/pokemon/{sid}-pack-{i}.png';crop.save(target)
        return {'setId':sid,'design':str(i),'url':url,'source':source.relative_to(ROOT).as_posix(),'sourceDimensions':list(im.size),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'crop':bounds,'rotation':0,'output':target.relative_to(ROOT).as_posix(),'dimensions':list(crop.size),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'cropStatus':'native-resolution crop reviewed; artwork, text and colored seals preserved'}
    records=list(ThreadPoolExecutor(6).map(fetch,tasks))
    out=ROOT/'public/packs/pokemon/swsh-wrapper-sources.json';out.write_text(json.dumps(records,indent=2)+'\n')
    registry={sid:[{'id':'art-'+r['design'],'name':WRAPPER_NAMES[sid][int(r['design'])]+' booster','front':'/packs/pokemon/'+Path(r['output']).name} for r in records if r['setId']==sid] for sid in SLUGS}
    (ROOT/'src/pokemon/data/swsh-wrappers.generated.ts').write_text('// Sourced English retail wrappers; generated offline.\nimport type { PokemonBooster } from "../types.ts";\nexport const swshWrappers: Record<string, PokemonBooster[]> = '+json.dumps(registry)+';\n')
    sheet=Image.new('RGB',(8*190,((len(records)+7)//8)*300),'#222222');d=ImageDraw.Draw(sheet)
    for i,r in enumerate(records):
        im=Image.open(ROOT/r['output']);im.thumbnail((180,275));x=i%8*190;y=i//8*300;sheet.paste(im,(x+(190-im.width)//2,y+20));d.text((x+4,y+2),r['setId']+' '+r['design'],fill='white')
    sheet.save(ROOT/'artifacts/swsh-wrappers.png');print(len(records),'wrappers')
if __name__=='__main__':main()
