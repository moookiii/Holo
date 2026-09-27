"""Leafeon coverage traced in the clean 600x825 print plane."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from coverage_raster import contour
ROOT=Path(__file__).resolve().parents[2]
REF=ROOT/'research/prismatic-evolutions/leafeon-144'
OUT=ROOT/'scripts/prismatic/leafeon-144'
REVIEW=ROOT/'artifacts/leafeon-144'
BODY=[
# Face, neck, torso and legs. Curves retain the openings between the limbs.
'M211 251 L222 249 L234 242 L242 233 L247 235 L253 229 L260 239 L268 229 L276 241 L283 231 L291 242 L297 236 L306 253 L309 260 L321 263 L311 267 L319 274 L308 274 Q309 288 297 296 L281 306 Q294 321 305 315 Q314 311 311 306 Q323 323 305 331 Q314 338 337 337 Q351 337 360 350 Q370 377 377 402 Q381 413 393 420 L399 443 Q396 456 399 467 L405 482 L407 496 L396 498 Q383 488 382 479 L377 453 Q376 440 365 437 L350 432 Q341 449 322 459 L306 469 Q295 468 286 461 Q291 452 301 451 Q314 444 326 429 Q303 413 299 392 L277 386 L266 385 Q258 394 255 408 Q248 418 248 435 L243 446 Q229 446 219 437 Q222 429 235 427 L242 410 L239 404 L214 414 L200 421 Q190 420 189 414 L190 402 L207 396 Q237 388 245 372 L247 355 Q232 366 216 360 Q203 354 200 331 Q212 343 224 336 Q208 332 207 315 Q223 328 237 316 Q246 307 243 300 Q219 287 217 270 L209 264 L201 254 Z',
# Tall left leaf ear.
'M225 251 Q212 236 212 216 L211 184 Q216 173 225 171 Q239 195 231 233 L239 250 Z',
# Right leaf ear, with its notched tip.
'M303 263 Q312 241 328 226 L350 211 L375 202 L370 214 L377 219 L366 226 Q353 252 334 258 L324 264 L316 260 Z',
# Lower neck leaf, visible behind the foreleg.
'M219 366 Q216 381 229 382 L244 370 Q241 389 229 393 Q211 397 214 376 Z',
# Tail stem and folded leaf; the broad leaf terminates at the card edge.
'M357 344 L381 336 Q403 346 430 335 L436 331 Q430 303 450 288 Q476 270 512 272 Q548 272 577 294 L577 304 Q546 297 522 307 Q505 323 495 344 Q494 360 484 371 Q458 379 433 368 L407 360 L386 353 L362 357 Z'
]
bodyim=Image.new('L',(1800,2475));d=ImageDraw.Draw(bodyim)
for path in BODY:contour(d,path,255,scale=3)
body=np.array(bodyim.filter(ImageFilter.GaussianBlur(.6)))
im=np.array(Image.open(REF/'outlined-front.png').convert('RGB'))
r=(np.max(abs(im.astype(int)-[136,0,21]),2)<40).astype('uint8')
r=cv2.morphologyEx(r,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
_,labels,stats,_=cv2.connectedComponentsWithStats(1-r)
ids=[i for i in range(1,len(stats)) if 25<stats[i,4]<10000]
g=np.uint8(np.isin(labels,ids))*255
g=cv2.dilate(g,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
gemsim=Image.fromarray(g).resize((1800,2475),Image.Resampling.LANCZOS)
d=ImageDraw.Draw(gemsim)
# Small diamonds around the jewels, ankles and tail from the clean artwork.
for cx,cy,rx,ry in [(164,151,4,7),(177,143,4,7),(210,143,4,7),(355,210,5,9),
 (138,213,5,9),(134,242,4,7),(378,258,5,9),(421,207,5,9),
 (180,300,5,10),(208,368,6,14),(363,451,8,16),
 (290,422,5,10),(330,473,7,13),(366,481,6,12),(452,402,8,16),(393,394,5,11),(420,367,5,10)]:
 d.polygon([(cx*3,(cy-ry)*3),((cx+rx)*3,cy*3),(cx*3,(cy+ry)*3),((cx-rx)*3,cy*3)],fill=255)
gems=np.array(gemsim.filter(ImageFilter.GaussianBlur(.6)))
# Crown crystals take precedence over the face trace only where annotated.
body=np.uint8(body.astype(float)*(1-gems/255))
front=np.array(Image.open(ROOT/'public/cards/pokemon/prismatic-evolutions/144.png').convert('RGB').resize((1800,2475)),float)
for name,m,color in [('body',body,(255,0,160)),('gems',gems,(0,255,140))]:
 Image.fromarray(m).save(OUT/(name+'.png'))
 a=m[...,None]/255*.48
 Image.fromarray(np.uint8(front*(1-a)+np.array(color)*a)).resize((900,1238)).save(REVIEW/(name+'-overlay.png'))
