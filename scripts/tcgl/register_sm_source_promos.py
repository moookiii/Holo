"""Register seven authentic TCGL promo fronts whose long-form table IDs are absent.

Their source identities are the official bundle + exact material manifest, never
fabricated TCGL longFormIDs. They are print-only and in the promo collection.
"""
from pathlib import Path
import hashlib
import json
import sys
sys.dont_write_bytecode = True
from PIL import Image
from prepare_swsh_proofs import registered
from import_sm import ROOT, OUT, SOURCE, write


def main():
    target = ROOT / 'src/pokemon/data/sm-tcgl.generated.ts'
    lines = target.read_text(encoding='utf-8').splitlines()
    def data(name):
        line = next(l for l in lines if l.startswith('export const ' + name + ':'))
        return json.loads(json.loads(line.split('JSON.parse(', 1)[1].removesuffix(');')))
    sets, surfaces = data('tcglSmSets'), data('tcglSmSurfaces')
    promos = next(s for s in sets if s['id'] == 'smbsp')
    index = json.loads((OUT / 'printing-index.json').read_bytes())
    for orphan in json.loads((SOURCE / 'supplementary/orphan-bundles.json').read_bytes()):
        if not orphan['bundleName'].startswith('smbsp_en_'): continue
        n = int(orphan['bundleName'].rsplit('_', 1)[-1])
        cid = f'smbsp-source-{n}'
        if any(c['id'] == cid for c in promos['cards']): continue
        assert all(a['status'] == 'not_applicable' for a in orphan['assets'] if a['kind'] != 'front')
        asset = next(a for a in orphan['assets'] if a['kind'] == 'front')
        path = SOURCE / asset['texture']['png']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == asset['texture']['png_sha256']
        source_id = orphan['bundleName'] + ':' + asset['manifest']
        front = OUT / 'shared' / ('front-source-promo-' + str(n) + '.png')
        if not front.exists():
            with Image.open(path) as raw: registered(raw, (733, 1024)).convert('RGB').save(front)
        evidence = OUT / cid / 'evidence.json'
        write(evidence, {**orphan, 'name': "Ash's Pikachu", 'printedCollectorNumber': 'SM' + str(n),
            'sourceIdentifier': source_id, 'tcglCardId': None, 'tcglVariantId': None,
            'identityEvidence': 'Printed original TCGL front and matching public SM108–SM114 checklist metadata; source bundle contains one exact MaterialManifest.',
            'note': 'Long-form ID absent from all 39 archived English TCGL tables. Original source identity retained explicitly; no long-form ID invented.'})
        card = {'id': cid, 'localId': 'SM' + str(n), 'name': "Ash's Pikachu", 'rarity': 'Promo',
            'category': 'Pokemon', 'types': ['Lightning'], 'collectorNumber': 'SM' + str(n),
            'variants': ['normal'], 'foil': {'normal': 'NonFoil'}, 'boosterIds': [],
            'front': front.relative_to(OUT).as_posix(), 'variantFronts': {'normal': front.relative_to(OUT).as_posix()}}
        promos['cards'].append(card)
        surface = {'cardId': cid, 'variant': 'normal', 'profile': 'print-only', 'textured': False,
            'maps': {}, 'evidence': '/' + evidence.relative_to(ROOT / 'public').as_posix(),
            'foilType': 'NonFoil', 'tcglCardId': None, 'tcglVariantId': None, 'sourceIdentifier': source_id,
            'treatmentStatus': 'existing-material', 'deferredEffect': None}
        surfaces.append(surface)
        index.append({'tcglCardId': None, 'tcglVariantId': None, 'sourceIdentifier': source_id,
                      'cardId': cid, 'variant': 'normal', 'setId': 'smbsp'})
    target.write_text('// Offline TCGL SM printings. Seven source-only promo IDs are explicitly nullable.\n'
        'import type { TcglSvSetRecord } from "./sv-tcgl.generated.ts";\n'
        'import type { TcglSvSurface } from "./sv-tcgl-surfaces.generated.ts";\n'
        'export const tcglSmSets: readonly (TcglSvSetRecord & {seriesId:string;seriesName:string})[] = JSON.parse(' + json.dumps(json.dumps(sets, ensure_ascii=False), ensure_ascii=False) + ');\n'
        'export const tcglSmSurfaces: readonly (TcglSvSurface & {tcglCardId:string|null;tcglVariantId:string|null;sourceIdentifier?:string;treatmentStatus:string;deferredEffect:string|null})[] = JSON.parse(' + json.dumps(json.dumps(surfaces, ensure_ascii=False), ensure_ascii=False) + ');\n', encoding='utf-8')
    write(OUT / 'printing-index.json', index)
    audit = json.loads((OUT / 'import-audit.json').read_bytes())
    audit.update(printings=len(index), sourceOnlyPromoPrintings=7)
    audit['sets']['smbsp'] = len(promos['cards'])
    audit['unregisteredSourceBundles'] = [{'bundleName': 'sm4_en_125', 'reason': 'Uncatalogued Metal Energy 125/111 source has no verified retail checklist identity; not inserted into booster pools.'}]
    write(OUT / 'import-audit.json', audit)
    print('Registered SM108–SM114 with explicit exact bundle identities, retaining absent long-form IDs.', flush=True)


if __name__ == '__main__': main()
