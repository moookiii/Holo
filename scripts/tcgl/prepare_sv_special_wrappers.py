"""Prepare exact English special-set wrapper fronts, without stretching."""
from pathlib import Path
from PIL import Image
import hashlib, json

ROOT=Path(__file__).resolve().parents[2]
DESIGNS={
 'sv04.5': [('pikachu','Paldean_Fates_Booster_Pikachu.png'),('ceruledge','Paldean_Fates_Booster_Ceruledge.png'),('tinkaton','Paldean_Fates_Booster_Tinkaton.png'),('dondozo','Paldean_Fates_Booster_Dondozo.png')],
 'sv06.5': [('okidogi','Shrouded_Fable_Booster_Okidogi.png'),('munkidori','Shrouded_Fable_Booster_Munkidori.png'),('fezandipiti','Shrouded_Fable_Booster_Fezandipiti.png'),('pecharunt','Shrouded_Fable_Booster_Pecharunt.png')],
 'sv10.5b': [('zekrom','SV10.5_BLK_Booster_EN.png')],
 'sv10.5w': [('reshiram','SV10.5_WHT_Booster_EN.png')],
}
def main():
 raw=ROOT/'research/sv-packs';out=ROOT/'public/packs/pokemon'
 index=json.loads((raw/'wrapper-index.json').read_text())
 by_name={v['title'].removeprefix('File:').replace(' ','_'):v['imageinfo'][0] for v in index['query']['pages'].values()}
 evidence=[]
 for set_id,designs in DESIGNS.items():
  for design,filename in designs:
   source=raw/filename
   with Image.open(source) as im:
    size=list(im.size);bounds=[16,0,im.width-16,im.height]
    # The authored originals taper by 16 px at each side. Crop to the
    # straight printed body; preserve the complete top/bottom seal height.
    cropped=im.crop(bounds)
    target=out/f'{set_id}-{design}.webp';cropped.save(target,lossless=True,method=6)
    evidence.append({'setId':set_id,'design':design,'file':target.name,'source':by_name[filename]['url'],
     'sourceDimensions':size,'cropPixels':bounds,'outputDimensions':list(cropped.size),
     'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
     'rotation':0,'resampled':False})
 (out/'sv-special-wrapper-sources.json').write_text(json.dumps(evidence,indent=2)+'\n')
 print(json.dumps(evidence,indent=2))
if __name__=='__main__':main()
