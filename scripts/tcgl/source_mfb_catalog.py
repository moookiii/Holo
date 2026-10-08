"""Preserve published My First Battle fronts; no synthesized imagery."""
from pathlib import Path
import requests, json, hashlib
import cv2, numpy as np
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
out = ROOT / 'public/cards/pokemon/mfb'
out.mkdir(parents=True, exist_ok=True)
api = 'https://archives.bulbagarden.net/w/api.php'
catalog = requests.get('https://api.tcgdex.net/v2/en/sets/mfb', timeout=30).json()
special = {8:'BasicGrassEnergySVEEnergy1.jpg',16:'BasicFireEnergySVEEnergy2.jpg',24:'BasicLightningEnergySVEEnergy4.jpg',32:'BasicWaterEnergySVEEnergy3.jpg',33:'PotionScarletViolet188.jpg',34:'SwitchScarletViolet194.jpg'}
names = {c['id']: special.get(int(c['localId']), c['name']+'MyFirstBattle.jpg') for c in catalog['cards']}
index = requests.get(api, params={'action':'query','titles':'|'.join('File:'+n for n in names.values()),'prop':'imageinfo','iiprop':'url','format':'json'}, timeout=30).json()
urls = {p['title'][5:]:p['imageinfo'][0]['url'] for p in index['query']['pages'].values()}
def download(item):
    cid, name = item
    url = urls[name]
    response = requests.get(url, timeout=60); response.raise_for_status()
    target = out / (cid+'.jpg'); target.write_bytes(response.content)
    with Image.open(target) as im: size = list(im.size)
    return {'cardId':cid,'source':url,'file':target.name,'dimensions':size,'sha256':hashlib.sha256(response.content).hexdigest(),'transformation':'none','note':'Published front; the four starting Pokemon scans have blue borders. Alternate border versions are not synthesized.'}
with ThreadPoolExecutor(max_workers=4) as pool:
    evidence = list(pool.map(download, names.items()))
url = 'https://www.pokebeach.com/news/2023/09/My-First-Battle-Back.jpeg'
r = requests.get(url,timeout=60); r.raise_for_status(); (out/'back-source.jpeg').write_bytes(r.content)
corners = np.float32([[412,497],[1051,512],[1121,1429],[405,1455]])
destination = np.float32([[0,0],[732,0],[732,1023],[0,1023]])
registered = cv2.warpPerspective(cv2.imread(str(out/'back-source.jpeg')), cv2.getPerspectiveTransform(corners,destination),(733,1024),flags=cv2.INTER_LINEAR)
cv2.imwrite(str(out/'back.png'),registered)
(out/'sources.json').write_text(json.dumps({'catalogSource':'https://api.tcgdex.net/v2/en/sets/mfb','frontReference':'https://bulbapedia.bulbagarden.net/wiki/My_First_Battle_(TCG)','cards':evidence,'backSource':url,'backSha256':hashlib.sha256(r.content).hexdigest(),'backRegistration':{'sourceCornersPixels':corners.tolist(),'outputDimensions':[733,1024],'method':'perspective registration, bilinear interpolation; no generated graphics','sha256':hashlib.sha256((out/'back.png').read_bytes()).hexdigest()}},indent=2)+'\n')
records=[{'id':c['id'],'localId':c['localId'],'name':c['name'],'category':'Energy' if 'Energy' in c['name'] else 'Trainer' if c['name'] in ['Potion','Switch'] else 'Pokemon'} for c in catalog['cards']]
(ROOT/'src/pokemon/data/mfb.generated.ts').write_text('// Published ordinary My First Battle fronts. See public/cards/pokemon/mfb/sources.json.\nexport const mfbRecords = '+json.dumps(records,ensure_ascii=False)+';\n')
print(f'Preserved {len(evidence)} fronts and back reference.')
