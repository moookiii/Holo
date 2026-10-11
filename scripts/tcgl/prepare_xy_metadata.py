"""Transcribe the original author's XY collation model and observed sheet.

No factory odds are asserted. Per-box estimates, sheet assumptions and sample
limits remain in docs/xy-pack-collation.json with the preserved primary source.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import sys
sys.dont_write_bytecode = True
from fetch_prismatic_set import fetch

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/xy-integration'
# Holo / regular EX sheet / full-art sheet / BREAK per 36 packs, transcribed
# from the observer's posts, not extrapolated from a modern era.
MODELS = {
    'xy1': [121,8.4,3,1,0,0,0], 'xy2': [122,7.1,3.5,1.4,0,.09,0],
    'xy3': [123,7.1,3.5,1.4,0,.10,0], 'xy4': [125,7,3.5,1.5,0,.06,.07],
    'xy5': [126,5.6,4,2.4,0,0,.12], 'xy6': [129,5.6,4,2.4,0,0,.12],
    'xy7': [130,5.6,4,2.4,0,0,.12], 'xy8': [132,6.4,3.2,2.4,2.8,0,.12],
    'xy9': [133,6,3.6,2.4,2.4,0,.12], 'xy10': [136,5.2,4.4,2.4,2.4,0,.12],
    'xy11': [137,7.2,2.4,2.4,2.4,0,.12], 'xy12': [139,5.2,4.4,2.4,2,0,0],
    'xy5-5': [127,32,0,4,0,0,0], 'xy9-5': [134,3.8,7.4,.8,0,0,0],
}


def main():
    RAW.mkdir(exist_ok=True)
    posts, source_files = {}, []
    for page in [6,7]:
        path = RAW / f'rarity-guide-page{page}.json'
        url = f'https://www.elitefourum.com/t/39762.json?page={page}'
        if not path.exists(): path.write_bytes(fetch(url))
        data = json.loads(path.read_bytes())
        posts.update({p['post_number']:p for p in data['post_stream']['posts']})
        source_files.append({'url':url,'file':path.relative_to(ROOT).as_posix(),
                             'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    rates = {sid: {'source':f'https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/{r[0]}',
                   'holo':r[1]/36,'ex':r[2]/36,'fullArt':r[3]/36,'break':r[4]/36,
                   'exSecretFraction':r[5],'fullArtSecretFraction':r[6], 'per36Packs':r[1:5]}
             for sid,r in MODELS.items()}
    # Use the observed entire 121-position sheet for Evolutions' three-card
    # uncommon sequence. This admits its documented adjacent secret pair but
    # cannot invent triples or place these nonfoil secrets in the rare slot.
    cooked = posts[139]['cooked'].split('The uncommons sheet look as follows',1)[1]
    content = re.search(r'<em>(.*?)</em>',cooked,re.S)[1]
    names = html.unescape(re.sub('<[^>]*>','',content)).strip().strip('†').strip().split(', ')
    assert len(names) == 121
    manifest = json.loads((ROOT/'research/tcgl/xy-series/dataset/inventory.json').read_bytes())
    def normalize(name):
        name = name.replace('Imakuni?', 'Imakuni')
        if '[Exeggutor]' in name: name = 'Exeggutor'
        return ''.join(c for c in name.lower() if c.isalnum())
    by_name = {normalize(r['name']):r['card_id'].replace('_','-',1) for r in manifest
               if r['set_id']=='xy12' and r['variant']==0
               and r['long_form_id'].split('_')[-3] in ('Uncommon','RareSecret')}
    sequence = [by_name[normalize(n)] for n in names]
    assert len(set(sequence)) == 33
    output = {'sourceFiles':source_files,'sets':rates,'evolutionsUncommonSheet':sequence,
        'method':'Primary observer model from opening videos and reconstructed/photographed sheets; estimates, not official odds.',
        'uncertainties':['Independent rare/reverse slots and uniform cards within rarity categories, except observed Evolutions uncommon sheet.',
            'No box guarantees, print-run tracking, error packs, or invented god packs.',
            'BREAKthrough/BREAKpoint residual holo rates inferred from 12 rare-slot foil hits per 36 packs in the source model.',
            'Evolutions print runs have different observed hit rates; the published 4.4 EX/2.4 FA/2 BREAK model is selected.',
            'Double Crisis full-art frequency follows the author rough 1/9 model from 116 packs (14 observed full arts).',
            'Generations mixes three source samples: 170 ETB packs, 516 loose packs and 500-pack premium summary. RC uncommon/ultra split follows the photographed 72/28 sheet.',
            'Natural reveal order is modeled as ordinary commons/reverse/rare/uncommons; Generations adds premium RC before rare and common RC before uncommons. Factory-specific ordering exceptions are not established.']}
    (ROOT/'docs/xy-pack-collation.json').write_text(json.dumps(output,indent=2)+'\n')
    (ROOT/'src/pokemon/data/xy-rates.generated.ts').write_text(
        '// Primary observer estimates, not official odds. Source hashes: docs/xy-pack-collation.json\n'
        'export const xyRates = '+json.dumps(rates)+' as const;\n'
        'export const evolutionsUncommonSheet: readonly string[] = '+json.dumps(sequence)+';\n')
    print('Transcribed',len(rates),'XY product models and the 121-position Evolutions uncommon sheet.')


if __name__ == '__main__': main()
