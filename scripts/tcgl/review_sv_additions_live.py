"""Arrange saved CUA captures for navigation; inspect full images separately."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]/'artifacts/sv-tcgl/additions-live'
RIGS=['front','grazing','tilt','dark','specular','moving']
directories=sorted(p for p in ROOT.iterdir() if p.is_dir())
for start in range(0,len(directories),4):
    sheet=Image.new('RGB',(1560,1520),'#202020');draw=ImageDraw.Draw(sheet)
    for row,directory in enumerate(directories[start:start+4]):
        for col,rig in enumerate(RIGS):
            im=Image.open(directory/(rig+'.jpg'))
            width,height=im.size
            im=im.crop((int(width*.35),int(height*.23),int(width*.59),int(height*.77)))
            im.thumbnail((250,340))
            sheet.paste(im,(col*260+(260-im.width)//2,row*380+30))
            draw.text((col*260+4,row*380+5),directory.name.replace('pokemon_','')+' '+rig,fill='white')
    sheet.save(ROOT/f'review-page-{start//4+1:02d}.jpg',quality=95)
print('Saved',len(directories),'card review series')
