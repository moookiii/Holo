"""Register optical data to the user's exact front; never redraw the source print."""
from pathlib import Path
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
out = root / 'public/cards/angel-of-serenity'
back = root / 'public/cards/magic'
out.mkdir(parents=True, exist_ok=True)
back.mkdir(parents=True, exist_ok=True)
shutil.copyfile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-a4a0f53f-a3e9-439e-90f7-4308d197d311.png', out/'front.png')
shutil.copyfile('C:/Users/jpall/AppData/Local/Temp/codex-clipboard-c6a1b756-6cf0-474b-a510-796459d5c3f8.png', back/'back.png')
im = Image.open(out/'front.png').convert('RGB')
w,h = im.size
rgb = np.asarray(im,dtype=np.float32)/255
luma = rgb @ np.array([.2126,.7152,.0722])
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)
foil = Image.new('L',(w,h),0)
d=ImageDraw.Draw(foil)
d.rounded_rectangle((27,27,646,869),radius=19,fill=62)
d.rectangle((48,588,624,856),fill=32)
d.rectangle((50,105,622,518),fill=176)
# Partial ink opacity in the wing feathers; the sky remains a continuous sheet.
d.polygon([(285,259),(315,205),(362,159),(451,106),(602,106),(566,153),(522,181),(481,215),(431,240),(391,269),(350,292)],fill=38)
d.polygon([(267,274),(232,249),(167,231),(136,231),(107,248),(110,282),(145,319),(190,344),(230,348),(257,311)],fill=34)
# Face, armor, arms and lower figure stay legible through colored reflections.
d.polygon([(214,208),(240,178),(276,179),(304,199),(301,233),(326,248),(370,261),(413,258),(444,235),(467,254),(447,294),(401,301),(369,297),(352,321),(374,359),(385,390),(425,417),(415,452),(403,481),(410,518),(294,518),(286,482),(275,442),(259,405),(246,383),(218,406),(192,396),(213,367),(232,344),(235,306),(248,280),(222,259)],fill=7)
f=np.asarray(foil).astype(np.float32)
# Translucent white highlights catch more foil than dark painted armor.
art=np.zeros((h,w),bool);art[105:519,50:623]=True
f[art] *= .30+.70*smooth(.10,.72,luma[art])
Image.fromarray(np.uint8(np.clip(f,0,255))).save(out/'foil.png')
protection=np.zeros((h,w),np.float32)
for x0,y0,x1,y1 in [(41,43,629,94),(42,533,623,578),(43,589,627,855),(527,837,631,885),(27,876,645,923)]:
    protection[y0:y1,x0:x1]=1-smooth(.24,.70,luma[y0:y1,x0:x1])
protected=Image.fromarray(np.uint8(protection*255)).filter(ImageFilter.MaxFilter(3))
# Footer ink protection must not truncate the independently reflective seal.
ImageDraw.Draw(protected).ellipse((303,855,369,890),fill=0)
protected.save(out/'protection.png')
def svg(inner):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1344" height="1872" viewBox="0 0 672 936">{inner}</svg>'
(out/'laminate.svg').write_text(svg('<rect width="672" height="936" fill="#333"/><rect x="50" y="105" width="572" height="414" fill="#999"/><rect x="44" y="589" width="581" height="266" fill="#222"/>'))
(out/'stamp.svg').write_text(svg('<rect width="672" height="936" fill="black"/><path d="M306.5 872 C306.5 864.4 319.8 858 336 858 C352.2 858 365.5 864.4 365.5 872 C365.5 880.2 352.2 886.5 336 886.5 C319.8 886.5 306.5 880.2 306.5 872Z" fill="white"/>'))
(out/'hologram.svg').write_text(svg('<rect width="672" height="936" fill="#800080"/><rect x="50" y="105" width="572" height="414" fill="#80ff80"/>'))
print('Angel of Serenity: exact front/back copied; foil, ink protection, laminate and security maps generated.')
