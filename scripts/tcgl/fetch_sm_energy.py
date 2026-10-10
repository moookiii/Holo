"""Complete the SM source library with exact TCGL EC 2017/2019 pack Energies."""
from pathlib import Path
import json
import shutil
import sys
sys.dont_write_bytecode = True
import fetch_sm_sources as sm


def main():
    sm.ROOT = sm.HOLO / 'research/tcgl/sun-moon-energy'
    sm.configure()
    sm.finalize.NAMES = {'ec': 'Sun & Moon Basic Energy'}
    sm.bootstrap()
    path = next(sm.pipeline.CONFIG.glob('card-database-ec_*_en_*.json'))
    table = sm.pipeline.database(path)
    target = sm.ROOT / 'dataset/databases' / path.name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, target)
    sm.write(target.with_name('decoded-' + path.name), table)
    records = []
    for row in table['rows']:
        number = int(row['EN Card #'])
        if not 18 <= number <= 35:
            continue
        records.append({'card_id': row['cardID'], 'long_form_id': row['longFormID'],
            'set_id': 'ec', 'printed_set_code': 'EC', 'collector_number': str(number),
            'printed_collector_number': row['CompSea Card Number'], 'name': row['EN Card Name'],
            'variant': row['variant'], 'variant_suffix': row.get('Variant Suffix') or '',
            'foil_effect': row['Foil Effect'], 'foil_mask': row['Foil Mask'],
            'bundle_name': f'ec_en_{number:03d}',
            'material_manifest': 'MaterialManifest_ph' if row['variant'] == 1 else 'MaterialManifest',
            'database': target.relative_to(sm.ROOT).as_posix(), 'row': row})
    assert len(records) == 36
    sm.write(sm.ROOT / 'dataset/inventory.json', records)
    sm.acquire(records, 6)
    manifests = json.loads((sm.ROOT / 'dataset/manifest.json').read_bytes())
    assert len(manifests) == 36
    assert all(a['status'] in ('extracted', 'not_applicable') for r in manifests for a in r['assets'].values())
    sm.write(sm.ROOT / 'sources.json', {'printings': manifests, 'databaseSha256': sm.sha(target),
        'scope': 'EC18–26: 2017 design; EC27–35: 2019 design. Nine types including Fairy, with exact std/ph material references.'})
    print('Preserved 36 exact TCGL Energy printings in 18 original bundles.', flush=True)


if __name__ == '__main__':
    main()
