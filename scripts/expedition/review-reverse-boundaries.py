"""Apply reviewed straight-edge constraints and faint-border corrections.

Each fit reads that print's master. These corrections reject lettering and
e-Reader bars that the initial bounded edge proposals incorrectly followed.
"""
import importlib.util, json, sys
import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator

sys.dont_write_bytecode=True

spec=importlib.util.spec_from_file_location('registration',__file__.replace('review-reverse-boundaries.py','register-reverse-boundaries.py'))
reg=importlib.util.module_from_spec(spec);spec.loader.exec_module(reg)
rows=json.loads(reg.DATA.read_text())
cards=json.loads((reg.BASE/'catalog.json').read_text())['cards']

def line(values,start,end):
    x=np.arange(start,end);v=np.array(values[start:end],dtype=float)
    slope=np.clip((np.median(v[-20:])-np.median(v[:20]))/max(1,len(v)-20),-.04,.04)
    intercept=np.median(v-slope*x)
    values[start:end]=np.rint(intercept+slope*x).astype(int).tolist()

for row,card in zip(rows,cards):
    image=np.array(Image.open(reg.ROOT/row['front']).convert('RGB'))
    bottom=row['bottom'];x0=row['bottomX']
    # These are straight printed edges, not per-glyph contours.
    for a,b in [(100,215),(285,510),(554,582)]: line(bottom,a-x0,b-x0)
    if card.get('types')==['Lightning']:
        # Low contrast yellow borders: review the outer silhouette, exclude
        # weakness/copyright icons and barcode strokes from the trace.
        left=int(np.median(row['left'][:200]));right=int(np.median(row['right'][:200]))
        # Measure the bottom edge on blank spaces between the copyright glyphs.
        rgb=image.astype(float)
        edge=np.linalg.norm(rgb[770:779,285:510]-rgb[769:778,285:510],axis=2)
        # Restrict to the observed panel termination, above the reader bars.
        baseline=773+int(np.argmax(np.median(edge[3:8],axis=1)))
        plateau=round(np.median(bottom[100-x0:210-x0]))
        # Faint portions retain the physical frame curve observed in this scan;
        # the 10 Lightning fronts were reviewed individually at 2x.
        plateau=int(np.clip(plateau,753,758));baseline=int(np.clip(baseline,774,778))
        anchors=[(65,720),(66,730),(68,738),(72,747),(78,752),(90,plateau),
            (215,plateau),(232,plateau+2),(243,plateau+6),(249,plateau+6),
            (270,baseline),(515,baseline),(520,baseline-5),(529,760),(540,756),(552,755),(584,755)]
        row['bottom']=np.rint(PchipInterpolator(*[np.array(anchors)[:,i] for i in [0,1]])(np.arange(x0,x0+len(bottom)))).astype(int).tolist()
        row['left']=[left]*len(row['left']);row['right']=[right]*len(row['right'])
        row['correction']='Reviewed faint yellow perimeter; exclude glyphs/icons/bars. Border contrast limits subpixel certainty.'
    if card['category']=='Trainer':
        row['category']='Trainer'
        start=row['sideY'];ys=np.arange(start,735)
        # The reader rail is on the RIGHT on Trainer prints. It is paper;
        # coverage follows the gray rules panel and its lower rounded bulge.
        prior=np.interp(ys,[430,636,641,650,658,672,735],[545,545,561,575,583,587,587])
        row['right']=reg.seam(image,prior,'right',start,735,10)
        line(row['right'],0,max(1,632-start))
        # Refit the corner to its own gray/yellow edge, with a smooth prior that
        # prevents the left copyright/logo region from becoming a square tab.
        # This corner has a clear gray/yellow transition. Use its connected
        # rules-panel component in a small geometric band. Copyright letters
        # below the panel are disconnected and cannot extend the perimeter.
        hsv=reg.cv2.cvtColor(image[685:760,60:150],reg.cv2.COLOR_RGB2HSV)
        frame=(hsv[:,:,0]>=14)&(hsv[:,:,0]<=39)&(hsv[:,:,1]>=85)&(hsv[:,:,2]>=110)
        count,labels,stats,_=reg.cv2.connectedComponentsWithStats((~frame).astype('uint8'))
        panel=labels==(1+np.argmax(stats[1:,reg.cv2.CC_STAT_AREA]))
        for y in range(700,735):
            xs=np.flatnonzero(panel[y-685])
            if len(xs): row['left'][y-start]=int(xs[0]+60)
        for x in range(65,112):
            ys=np.flatnonzero(panel[:,x-60])
            row['bottom'][x-x0]=int(ys[-1]+686) if len(ys) else 685
        row['correction']='Own-master right reader rail and lower bulge registered; left corner rechecked.'
    # Both outer bottom corners are monotone frame curves. An internal icon
    # cannot make a tab or notch in that perimeter. Keep each print's measured
    # endpoints and plateau, remove only those contrary edge excursions.
    b=np.array(row['bottom'])
    end=100-x0
    b[:end]=np.minimum(np.maximum.accumulate(b[:end]),b[end])
    begin,end=520-x0,554-x0
    b[begin:end]=np.maximum(np.minimum.accumulate(b[begin:end]),b[end])
    row['bottom']=b.tolist()
    row['reviewStatus']='reviewed-lower-boundary'

reg.DATA.write_text(json.dumps(rows,separators=(',',':'))+'\n')
reg.rasterize()
