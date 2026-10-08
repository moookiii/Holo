"""Check exact missing ball-printing etch URLs; preserve only genuine assets."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, io, json, threading
from PIL import Image
import requests

ROOT=Path(__file__).resolve().parents[2]
BASE='https://cdn.malie.io/file/malie-io/tcgl/cards/'
worker=threading.local()

def probe(item):
    if not hasattr(worker,'session'):
        worker.session=requests.Session();worker.session.headers['User-Agent']='Mozilla/5.0'
    card,variant,tcgl_id,kind,url=item
    result={'cardId':card,'variant':variant,'tcglCardId':tcgl_id,'kind':kind,'url':url}
    try:
        response=worker.session.get(url,timeout=30)
        result['httpStatus']=response.status_code
        if response.status_code==200:
            with Image.open(io.BytesIO(response.content)) as image:
                result.update(dimensions=list(image.size),mode=image.mode)
            path=ROOT/'research/tcgl'/card/Path(url).name
            path.write_bytes(response.content)
            result.update(file=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(response.content).hexdigest())
    except (requests.RequestException,OSError) as error:
        result['error']=str(error)
    return result

def main():
    tasks=[]
    for set_id in ('sv10.5b','sv10.5w','svalt'):
        source=json.loads((ROOT/f'research/tcgl/{set_id}-set/sources.json').read_text(encoding='utf-8'))
        for p in source['printings']:
            if not any(token in p['tcglVariantId'] for token in ('_CastAndCure_SVPokeBall','_CastAndCure_SVMasterBall')):continue
            etch_url=p['sources']['foil']['url'].replace('.foil.png','.etch.png')
            for kind in ('png','tex'):
                tasks.append((p['cardId'],p['variant'],p['tcglCardId'],kind,etch_url.replace('/cards/png/','/cards/'+kind+'/')))
    with ThreadPoolExecutor(max_workers=16) as pool:results=list(pool.map(probe,tasks))
    report={'scope':'All 304 added cast-and-cure ball printing IDs, including the Victini alternate; PNG and tex etch paths derived from exact foil URLs; no substitute geometry.',
            'printings':len(tasks)//2,'requests':len(tasks),'found':sum(r.get('httpStatus')==200 for r in results),
            'httpCounts':{str(code):sum(r.get('httpStatus')==code for r in results) for code in sorted({r.get('httpStatus',0) for r in results})},
            'results':results}
    (ROOT/'docs/tcgl-ball-etch-probe.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))

if __name__=='__main__':main()
