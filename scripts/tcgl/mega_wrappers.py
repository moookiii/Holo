"""Preserve sourced English wrapper art and crop outside the printed seals."""
import json,re,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
from fetch_sv_sets import fetch
from mega_series import ROOT,write,SETS

def main():
    root=ROOT/'research/tcgl/mega-series/wrappers';root.mkdir(parents=True,exist_ok=True)
    index=fetch('https://pokesymbols.com/tcg/booster-pack-art').decode()
    paths=set(re.findall(r'/images/tcg/sets/booster-pack-art/[^"\s<>]+\.png',index))
    records=[];tiles=[]
    for sid,_,name,_ in SETS[:6]:
        slug=name.lower().replace(' ','-')
        for number in range(1 if sid=='me02.5' else 4):
            path=f'/images/tcg/sets/booster-pack-art/{slug}-pack-{number}.png'
            if path not in paths:raise ValueError('Wrapper source missing: '+path)
            url='https://pokesymbols.com'+path;raw=root/Path(path).name
            if not raw.exists():raw.write_bytes(fetch(url))
            im=Image.open(raw).convert('RGBA');bounds=im.getchannel('A').getbbox()
            # Native-resolution review found a dark source cap above/below
            # the printed crimps and four-pixel tapered side gutters. Crop to
            # the straight printed body while retaining both complete crimps.
            left,top,right,bottom=bounds
            bounds=(left+6,top+10,right-6,bottom-11)
            cropped=im.crop(bounds)
            dest=ROOT/f'public/packs/pokemon/{sid}-pack-{number}.png';cropped.save(dest)
            records.append({'setId':sid,'design':str(number),'url':url,'raw':raw.relative_to(ROOT).as_posix(),
                'sourceDimensions':list(im.size),'sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),
                'crop':list(bounds),'rotation':0,'output':dest.relative_to(ROOT).as_posix(),'dimensions':list(cropped.size),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
            if number==0:cropped.save(ROOT/f'public/packs/pokemon/{sid}-front.png')
            tile=Image.new('RGB',(200,395),'#222222');small=cropped.copy();small.thumbnail((190,360));tile.paste(small,((200-small.width)//2,20),small);ImageDraw.Draw(tile).text((5,3),sid+' '+str(number),fill='white');tiles.append(tile)
    sheet=Image.new('RGB',(7*200,3*395),'#222222')
    for i,tile in enumerate(tiles):sheet.paste(tile,((i%7)*200,(i//7)*395))
    out=ROOT/'artifacts/mega-series/wrappers';out.mkdir(parents=True,exist_ok=True);sheet.save(out/'crops.jpg',quality=95)
    for start in range(0,len(records),7):
        native=Image.new('RGB',(4*398,2*734),'#222222');draw=ImageDraw.Draw(native)
        for i,record in enumerate(records[start:start+7]):
            im=Image.open(ROOT/record['output']).convert('RGBA');x=(i%4)*398;y=(i//4)*734
            draw.text((x+5,y+2),Path(record['output']).name,fill='white');native.paste(im,(x+5,y+20),im)
        native.save(out/f'full-resolution-{start//7+1}.png')
    write(root/'sources.json',records)
    print(f'{len(records)} wrapper fronts acquired and cropped')

if __name__=='__main__':main()
