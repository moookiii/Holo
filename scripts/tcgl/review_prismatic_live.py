"""Assemble saved live renderer captures for visual inspection, never maps."""
from pathlib import Path
import argparse,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
LIVE=ROOT/'artifacts/prismatic-tcgl-set/live'
RIGS=['front','grazing','tilt','dark','specular','moving']
parser=argparse.ArgumentParser();parser.add_argument('ids',nargs='+');parser.add_argument('--output',required=True);args=parser.parse_args()
sheet=Image.new('RGB',(1560,len(args.ids)*380),'#202020');draw=ImageDraw.Draw(sheet)
for row,id in enumerate(args.ids):
    record=json.loads((LIVE/id/'state.json').read_text())
    for col,rig in enumerate(RIGS):
        image=Image.open(LIVE/id/(rig+'.png')).crop((390,120,975,865));image.thumbnail((255,340))
        sheet.paste(image,(col*260,row*380+28));draw.text((col*260+4,row*380+5),id+' '+rig,fill='white')
sheet.save(LIVE/args.output,quality=95)
