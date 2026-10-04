"""Exterior foil registered to clean fronts, checked against English PSA photos.
No height/relief inferred from print. Artwork and opaque ink are separate masks.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/cards/pokemon/southern-islands'
OUT=ASSETS/'maps';OUT.mkdir(exist_ok=True)
REVIEW=ROOT/'artifacts/southern-islands/masks';REVIEW.mkdir(parents=True,exist_ok=True)
records=json.loads((ASSETS/'catalog.json').read_text())['cards']
# Opaque printed symbol centers measured in the 600x825 master, not rarity rules.
symbols={
 'si1-1':[(73,576,19),(338,532,17),(90,715,18)],
 'si1-4':[(73,565,20),(295,715,18),(502,715,19)],
 'si1-7':[(73,510,20),(51,618,20),(92,618,20),(88,715,18),(297,715,18),(502,715,19)],
 'si1-11':[(72,536,20),(50,644,20),(92,644,20),(90,715,19),(502,715,19)],
 'si1-14':[(73,522,20),(51,625,20),(92,625,20),(89,715,19),(481,715,19),(522,715,19)],
 'si1-17':[(74,529,20),(52,618,20),(93,618,20),(74,652,20),(88,715,19),(481,715,19),(522,715,19)],
}
tiles=[]
for record in records:
 if not record['variants']['reverse']:continue
 n=record['localId'];id=record['id']
 assert id in symbols
 rgb=np.array(Image.open(ASSETS/f'{n}.png').convert('RGB').resize((600,825)))
 foil=np.zeros((825,600),np.uint8);cv2.rectangle(foil,(23,23),(577,801),255,-1)
 body=np.zeros_like(foil);cv2.rectangle(body,(53,84),(547,437),255,-1)
 # Opaque gold print: exact colored pixels only in known label/border regions.
 hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
 gold=(hsv[:,:,0]>15)&(hsv[:,:,0]<39)&(hsv[:,:,1]>65)&(hsv[:,:,2]>120)
 gold_region=np.zeros_like(foil);gold_region[:110]=255;gold_region[441:471]=255
 # Flavor box rails are printed; retain foil in its interior and letter counters.
 cv2.rectangle(body,(46,734),(552,781),255,2)
 body[gold&(gold_region>0)]=255
 # Black lettering is individually extracted from the registered print. Reject
 # colored dark foil with a chroma test; never protect a whole text rectangle.
 lo=rgb.min(axis=2).astype(float);hi=rgb.max(axis=2).astype(float)
 gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY).astype(float)
 ink=((hi-lo)<18)&(hi<45)&(gray<cv2.GaussianBlur(gray,(0,0),3)-5)
 ink[84:438]=False
 component_count,labels,stats,_=cv2.connectedComponentsWithStats(ink.astype(np.uint8))
 glyphs=np.zeros_like(foil)
 for k in range(1,component_count):
  x,y,w,h,area=stats[k]
  if 2<=area<2500:glyphs[labels==k]=255
 # Include the antialiased fringe at source-pixel scale.
 glyphs=cv2.dilate(glyphs,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
 # The evolved title sits on a pale printed band; its antialiased ink is
 # lighter than rules ink. Keep letter-sized components in its precise band.
 if record.get('evolveFrom'):
  title=np.zeros_like(foil)
  title[48:82,123:420]=(((hi-lo)<65)&(hi<125)&(gray<cv2.GaussianBlur(gray,(0,0),3)-5))[48:82,123:420]
  count,parts,metrics,_=cv2.connectedComponentsWithStats(title)
  for k in range(1,count):
   x,y,w,h,area=metrics[k]
   if h>=12 and area>30:glyphs[parts==k]=255
 body=np.maximum(body,glyphs)
 for x,y,r in [(528,62,23),*symbols[id]]:cv2.circle(body,(x,y),r,255,-1)
 if record.get('evolveFrom'):cv2.circle(body,(56,79),47,255,-1)
 # The white palm mark is opaque printed linework, not a rectangular patch.
 palm=np.zeros_like(foil);palm[443:482,521:575]=255
 white=(lo>155)&((hi-lo)<60)&(palm>0)
 body[white]=255
 protection=np.maximum(body,255-foil)
 for kind,data in [('foil',foil),('protection',protection)]:
  Image.fromarray(data).resize((1200,1650),Image.Resampling.LANCZOS).save(OUT/f'{n}-{kind}.png')
 overlay=rgb.copy();coverage=(foil>0)&(protection<128)
 overlay[coverage]=(overlay[coverage]*.6+np.array([0,100,160])*.4).astype(np.uint8)
 Image.fromarray(overlay).save(REVIEW/f'{n}-coverage.png')
 Image.fromarray(body).save(REVIEW/f'{n}-opaque-print.png')
 tile=Image.fromarray(overlay).resize((300,413));tiles.append(tile)
sheet=Image.new('RGB',(1800,413))
for i,tile in enumerate(tiles):sheet.paste(tile,(i*300,0))
sheet.save(REVIEW/'contact.png')
