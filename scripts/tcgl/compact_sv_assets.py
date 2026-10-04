"""Share storage for byte-identical generated PNGs, preserving every path."""
from pathlib import Path
import hashlib,os
ROOT=Path(__file__).resolve().parents[2]/'public/cards/pokemon/tcgl-sv'

def main():
    known={};saved=0;linked=0
    for i in range(1,11):
        for path in (ROOT/f'sv{i:02d}'/'tcgl').glob('*.png'):
            content=path.read_bytes();key=hashlib.sha256(content).digest()
            previous=known.get(key)
            if previous is None:known[key]=path;continue
            if os.path.samefile(path,previous):continue
            if previous.read_bytes()!=content:raise ValueError('Hash collision')
            temporary=path.with_suffix('.linked.png')
            os.link(previous,temporary);os.replace(temporary,path)
            saved+=len(content);linked+=1
    print(f'Shared {linked} identical PNGs; reclaimed {saved/2**30:.3f} GiB without changing bytes or paths',flush=True)

if __name__=='__main__':main()
