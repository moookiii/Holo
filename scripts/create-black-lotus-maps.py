"""Author optical data around the exact user-supplied Black Lotus print."""
from pathlib import Path
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
out=root/'public/cards/black-lotus'
out.mkdir(parents=True,exist_ok=True)
shutil.copyfile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-59ec0743-3a2c-4003-80cf-b7db8313699a.png',out/'front.png')
shutil.copyfile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-528d0f3d-746c-4af7-8f0f-a047f47bb41d.png',out/'back.png')
im=Image.open(out/'front.png').convert('RGB');w,h=im.size
rgb=np.asarray(im,dtype=np.float32)/255
luma=rgb@np.array([.2126,.7152,.0722])
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)
foil=Image.new('L',(w,h),0);d=ImageDraw.Draw(foil)
d.rectangle((36,39,635,889),fill=91)
d.rectangle((80,560,588,825),fill=43)
d.rectangle((79,95,591,505),fill=176)
# Individual petal silhouette, lower petals and stem retain their blue-black ink.
d.polygon([(297,222),(317,258),(309,211),(328,232),(344,207),(363,244),(389,223),(420,190),(440,226),(449,260),(492,209),(496,252),(528,241),(517,284),(562,284),(535,319),(510,337),(560,343),(548,366),(529,385),(491,401),(506,425),(478,438),(440,433),(407,439),(387,422),(386,399),(350,402),(315,395),(289,385),(337,370),(304,346),(287,317),(266,286),(293,304)],fill=6)
d.polygon([(386,416),(403,427),(390,466),(370,505),(357,505),(377,461)],fill=14)
f=np.asarray(foil,dtype=np.float32)
art=np.zeros((h,w),bool);art[95:506,79:592]=True
f[art]*=.3+.7*smooth(.09,.63,luma[art])
Image.fromarray(np.uint8(f)).save(out/'foil.png')
protection=np.zeros((h,w),np.float32)
for x0,y0,x1,y1 in [(42,45,623,83),(61,521,378,550),(98,589,584,747),(62,842,472,879)]:
    protection[y0:y1,x0:x1]=1-smooth(.20,.50,luma[y0:y1,x0:x1])
Image.fromarray(np.uint8(protection*255)).filter(ImageFilter.MaxFilter(3)).save(out/'protection.png')
def svg(inner):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1344" height="1872" viewBox="0 0 672 936">{inner}</svg>'
(out/'laminate.svg').write_text(svg('<rect width="672" height="936" fill="#222"/><rect x="79" y="95" width="513" height="411" fill="#777"/>'))
(out/'hologram.svg').write_text(svg('<rect width="672" height="936" fill="#800080"/><rect x="79" y="95" width="513" height="411" fill="#80ff80"/>'))
print('Black Lotus: exact source copied; petal, text and laminate coverage generated.')
