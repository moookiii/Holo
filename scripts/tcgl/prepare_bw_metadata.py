"""Transcribe original BW opening-study models and observed card sheets."""
from pathlib import Path
import json, re, html, hashlib
ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'research/tcgl/bw-integration'

def main():
    posts = {p['post_number']: p for p in json.loads((RAW / 'posts.json').read_bytes())}
    rows = json.loads((ROOT / 'research/tcgl/bw-series/dataset/inventory.json').read_bytes())
    def normalize(s): return ''.join(c for c in s.removeprefix('[Ability] ').lower() if c.isalnum())
    def sheet(number):
        cooked = posts[number]['cooked']; start = cooked.index('†'); end = cooked.index('†', start + 1)
        names = html.unescape(re.sub('<[^>]+>', '', cooked[start+1:end])).strip().split(', ')
        sid = 'bw1' if number == 99 else 'bw6-5'
        selected = [r for r in rows if r['set_id'] == sid and r['variant'] == 0
                    and (number != 99 or r['long_form_id'].split('_')[-3] in ('Common','CommonBasicEnergy'))]
        output = []
        for name in names:
            name = name.strip()
            match = re.match(r'^(.*?) \((.*?)\)$', name)
            base, attack = match.groups() if match else (name, None)
            energy = {'Grass':'G','Fire':'R','Water':'W','Lightning':'L','Psychic':'P',
                      'Fighting':'F','Darkness':'D','Metal':'M'}.get(base.removesuffix(' Energy'))
            if energy:
                base = 'Basic {' + energy + '} Energy'
            matches = [r for r in selected if normalize(r['name']) == normalize(base)
                       and (not attack or any(normalize(r['row'].get(field) or '') == normalize(attack)
                            for field in ['EN Attack Name','EN Attack Name 2','EN Attack Name 3','EN Attack Name 4']))]
            if attack and len(matches) > 1:
                matches = [r for r in matches if normalize(r['row']['EN Attack Name']) == normalize(attack)]
            assert len(matches) == 1, (name, [r['card_id'] for r in matches])
            output.append(matches[0]['card_id'].replace('_', '-', 1))
        assert len(output) == 121, (number, len(output))
        return output
    # Source author estimates per 36-card box. Secret fractions are inferred
    # sheet occupancy, separately documented, never asserted factory odds.
    models = {
        'bw1': [99, 9.5, 0, 2, .5, 0], 'bw2': [100, 10, 0, 2, 0, 0],
        'bw3': [101, 9.5, 0, 2, .5, 0],
        'bw4': [104, 52/6, 2, 1, 1/3, 0], 'bw5': [105, 52/6, 2, 1, 1/3, 0],
        'bw6': [106, 52/6, 2, 1, 1/3, 0],
        'bw7': [114, 49/6, 2, 11/6*.8, 11/6*.2, 2],
        'bw8': [116, 8, 16/6, 8/6*.85, 8/6*.15, 1.5],
        'bw9': [117, 50/6, 2, 10/6*.82, 10/6*.18, 1],
        'bw10': [118, 52/6, 2, 8/6*.72, 8/6*.28, 1.5],
        'bw11': [119, 18, 6, 0, 1/3, 0],
    }
    rates = {sid: {'source': f'https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/{v[0]}',
                  **dict(zip(['holo','ex','fullArt','secret','ace'], [x/36 for x in v[1:]]))}
             for sid, v in models.items()}
    output = {
        'sources': [{'file': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                    for p in RAW.glob('rarity-guide-page*.json')],
        'imageSources': json.loads((RAW / 'image-sources.json').read_bytes()),
        'models': rates, 'observedSheets': {'bw1': sheet(99), 'bw6-5': sheet(107)},
        'limits': [
            'Primary observer estimates from original English opening videos and reconstructed sheets; not official odds.',
            'Independent rarity slots; uniform inside rare/foil category pools. No box guarantees or error boxes simulated.',
            'BW1 common and Dragon Vault holo slots follow observed 121-position sheets; sheet starts are unknown.',
            'BW1 TCGL lacks eight reverse Basic Energy variants despite physical checklist evidence; no replacement created.',
            'Legendary Treasures reverse/holo 50/50; EX 6/36; gold 1/108; RC premium 70% uncommon / 30% ultra, plus one RC common.',
            'Team Plasma uncommon pools and blue-border rare/holo splits are preserved; shield graphics remain original print.',
            'ACE SPEC replaces the reverse position in BW7–BW10. Manufacturer rates are unavailable.',
        ],
    }
    (ROOT / 'docs/bw-pack-collation.json').write_text(json.dumps(output, indent=2)+'\n', encoding='utf-8')
    (ROOT / 'src/pokemon/data/bw-rates.generated.ts').write_text(
        '// Primary English BW observer models; not manufacturer odds. Evidence: docs/bw-pack-collation.json\n'
        'export const bwRates = '+json.dumps(rates)+' as const;\n'
        'export const bwCommonSheet: readonly string[] = '+json.dumps(sheet(99))+';\n'
        'export const dragonVaultSheet: readonly string[] = '+json.dumps(sheet(107))+';\n', encoding='utf-8')
    print('Transcribed 11 models and two 121-position sheets.')

if __name__ == '__main__': main()
