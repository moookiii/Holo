"""Cache original seller photographs for manual XY wrapper reverse review."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, re, requests
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/xy-wrappers/backs'
PAGES = {
 'xy2':['298701987110'], 'xy3':['206009347945'],
 'xy4':['265547742505','157304061473'], 'xy5':['206254433731'],
 'xy7':['127437640934','317843563433'],
}
def main():
 RAW.mkdir(parents=True,exist_ok=True)
 def page(pair):
  sid, item = pair; url='https://www.ebay.com/itm/'+item
  cache=RAW/(item+'.html')
  if not cache.exists():
   response=requests.get(url,timeout=30); response.raise_for_status(); cache.write_text(response.text,encoding='utf8')
  urls=list(dict.fromkeys(re.findall(r'https://i\.ebayimg\.com/images/g/[^\s"<>]+',cache.read_text(encoding='utf8'))))
  urls=list(dict.fromkeys(re.sub(r'/s-l\d+\.[a-z]+.*','/s-l1600.jpg',u) for u in urls))[:16]
  result=[]
  for i,u in enumerate(urls):
   path=RAW/(sid+'-'+item+'-'+str(i)+'.jpg')
   try:
    if not path.exists():
     r=requests.get(u,timeout=20); r.raise_for_status(); path.write_bytes(r.content)
    im=Image.open(path); im.load()
    result.append({'setId':sid,'page':url,'url':u,'file':str(path.relative_to(ROOT)),'dimensions':list(im.size)})
   except Exception as e: print(sid,i,str(e),flush=True)
  print(sid,item,len(result),flush=True)
  return result
 records=[r for group in ThreadPoolExecutor(6).map(page,[(s,i) for s,ids in PAGES.items() for i in ids]) for r in group]
 (RAW/'candidates.json').write_text(json.dumps(records,indent=2))
 sheet=Image.new('RGB',(1600,((len(records)+7)//8)*290),'#333')
 draw=ImageDraw.Draw(sheet)
 for i,r in enumerate(records):
  im=Image.open(ROOT/r['file']); im.thumbnail((190,255)); x=i%8*200;y=i//8*290
  sheet.paste(im,(x+(200-im.width)//2,y+25));draw.text((x+2,y+2),str(i)+' '+r['setId'],fill='white')
 sheet.save(RAW/'review.jpg')
if __name__=='__main__':main()
