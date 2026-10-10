"""Transcribe original community observations and cache set logos, never cards."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import html
import json
import re
from PIL import Image
from fetch_prismatic_set import fetch
from fetch_sm_sources import NAMES

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/sm-integration-metadata'
SOURCE = 'https://www.elitefourum.com/t/pull-rates-in-sun-moon-sword-shield-sets/25220/1'
FIELDS = {'gx': 'rare Holo GX', 'ultra': 'rare Ultra', 'ultraPokemon': 'rare Ultra - Pokemon',
    'ultraTrainer': 'rare Ultra - Trainer', 'rainbow': 'rare Rainbow', 'secret': 'rare Secret',
    'secretPokemon': 'rare Secret - Pokemon', 'secretOther': 'rare Secret - Trainer/Energy',
    'prism': 'rare Prism Star', 'shiny': 'rare Shiny', 'shinyGX': 'rare Shiny GX',
    'character': 'rare Secret - Pokemon (Character)', 'detectivePremium': 'rare Holo'}


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    original = ROOT / 'research/tcgl/sm-pull-rate-study.json'
    if not original.exists(): original.write_bytes(fetch('https://www.elitefourum.com/t/25220.json'))
    body = json.loads(original.read_bytes())['post_stream']['posts'][0]['cooked']
    rates = {}
    for sid, table in zip(list(NAMES)[:16], list(re.finditer(r'<table.*?</table>', body, re.S))[:16]):
        rows = []
        for row in re.findall(r'<tr.*?</tr>', table[0], re.S):
            rows.append([html.unescape(re.sub('<[^>]*>', '', c)).strip()
                         for c in re.findall(r'<t[dh].*?>(.*?)</t[dh]>', row, re.S)])
        record = {'source': SOURCE, 'sampleSize': int(re.findall(r'n=(\d+)', body[:table.start()])[-1]), 'rates': {}}
        for field, label in FIELDS.items():
            matches = [row for row in rows if len(row) > 2 and (row[1] == label or label.endswith(('Pokemon', 'Trainer/Energy')) and row[1].startswith(label + ' ('))]
            value = float(re.match(r'[\d.]+', matches[0][2])[0]) / 100 if matches and matches[0][2] != 'N/A' else 0
            record['rates'][field] = value
        rates[sid] = record
    assert len(rates) == 16 and rates['sm1']['rates']['gx'] == .1115
    output = {'source': SOURCE, 'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
        'method': 'Original author burpies manually aggregated English opening videos; empirical marginals, not factory odds.',
        'sets': rates,
        'assumptions': ['Independent slots and uniform cards within measured category pools.',
            'Standard rare-position foil probability is estimated at 1/3; sample hit marginals are retained and residual holo/nonholo is modeled.',
            'Shining Legends and Dragon Majesty rare positions are guaranteed foil or better.',
            'Foil Basic Energy replaces the reverse position in Shining Legends, Dragon Majesty and Hidden Fates; 5% is an explicit unmeasured estimate.',
            'Hidden Fates full-art Trainer marginal is split between main and SV by eligible card counts; source does not measure them separately.',
            'Detective Pikachu premium terminal-card estimate has n=240; Dragon Majesty has n=389. Both have substantial uncertainty.',
            'No box guarantees, print-sheet sequencing, error packs, code inserts or Japanese God Packs simulated.']}
    (ROOT / 'docs/sm-pack-collation.json').write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'src/pokemon/data/sm-rates.generated.ts').write_text(
        '// Original English opening study; sample estimates, never official factory odds.\n'
        'export const smRates = ' + json.dumps(rates) + ' as const;\n', encoding='utf-8')
    def logo(sid):
        dex = sid.replace('-', '.') if sid != 'gum' else 'det1'
        path = RAW / (sid + '.json')
        if not path.exists(): path.write_bytes(fetch('https://api.tcgdex.net/v2/en/sets/' + dex))
        data = json.loads(path.read_bytes())
        if not data.get('logo'): return sid, None
        raw_logo = RAW / (sid + '-logo.png')
        if not raw_logo.exists(): raw_logo.write_bytes(fetch(data['logo'] + '.png'))
        target = ROOT / ('public/packs/pokemon/' + sid + '-logo.png')
        with Image.open(raw_logo) as im: im.load(); im.save(target)
        return sid, {'url': data['logo'] + '.png', 'sourceSha256': hashlib.sha256(raw_logo.read_bytes()).hexdigest(),
                     'file': target.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    with ThreadPoolExecutor(max_workers=6) as pool:
        logos = dict(pool.map(logo, list(NAMES)[:16]))
    (ROOT / 'docs/sm-set-logos.json').write_text(json.dumps(logos, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'src/pokemon/data/sm-logos.generated.ts').write_text(
        'export const smLogos: Readonly<Record<string,string>> = ' + json.dumps({sid: '/' + r['file'].removeprefix('public/') for sid, r in logos.items() if r}) + ';\n', encoding='utf-8')
    print('Transcribed all 16 study tables and prepared set logos.', flush=True)


if __name__ == '__main__': main()
