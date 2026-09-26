"""Register both complementary physical-card photos to the TCGdex print."""
from pathlib import Path
import cv2,numpy as np,json
ROOT=Path(__file__).resolve().parents[1]; REF=ROOT/'research/umbreon-gx-sm1-154'; OUT=ROOT/'artifacts/umbreon-gx-sm1-154'
front=cv2.imread(str(ROOT/'public/cards/umbreon-gx-sm1-154/front.png'))
sift=cv2.SIFT_create(nfeatures=12000); b,db=sift.detectAndCompute(cv2.cvtColor(front,cv2.COLOR_BGR2GRAY),None)
records={}
for source,dest in [('etching-master.png','registered-photo.png'),('triangle-angle.png','registered-angle.png')]:
 photo=cv2.imread(str(REF/source)); a,da=sift.detectAndCompute(cv2.cvtColor(photo,cv2.COLOR_BGR2GRAY),None)
 matches=cv2.BFMatcher().knnMatch(da,db,k=2); good=[u for u,v in matches if u.distance<.7*v.distance]
 h,status=cv2.findHomography(np.float32([a[u.queryIdx].pt for u in good]),np.float32([b[u.trainIdx].pt for u in good]),cv2.RANSAC,3)
 cv2.imwrite(str(OUT/dest),cv2.warpPerspective(photo,np.diag([3,3,1])@h,(1800,2475)))
 records[source]={'homography':h.tolist(),'inliers':int(status.sum()),'matches':len(good)}
(REF/'registration.json').write_text(json.dumps(records,indent=2)+'\n')
