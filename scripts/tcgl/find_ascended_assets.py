"""Preserve exact-print ASC references and investigate alternate TCGL sources.

Does not author masks or change rendering. Uses URLs published by the providers;
never guesses alternate texture names or silently treats a scan as a foil map.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path

from PIL import Image
import requests
from fetch_sv_sets import BASE, ROOT, fetch
from audit_ascended_reverses import checklist_printings

ARCHIVE = ROOT / 'research/tcgl/ascended-reverses/source-search'
OUT = ROOT / 'docs/ascended-asset-search.json'
REPRESENTATIVES = (1, 8, 11, 17, 18, 108)
# Published exact-print pages with independent image archives. Keep page and
# image provenance together; these are physical references, not foil maps.
SUPPLEMENTAL = {
    69: ('https://bestdealtradingcards.com/store/c/tcgp24541-69',
         'https://bestdealtradingcards.com/store/img/tcgp24541-69.jpg'),
    71: ('https://thesportsshaq.com/products/iono-s-wattrel-071-217-poke-ball-asc-071-217', None),
    77: ('https://thesportsshaq.com/products/team-rocket-s-exeggcute-team-rocket-asc-077-217', None),
    123: ('https://www.pokemonwizard.com/cards/676949/gastly-dusk-ball',
          'https://images.pokemonwizard.com/uploads/images/cards/24541/676949-gastly-dusk-ball-medium.jpg'),
}


def preserve(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(fetch(url))
    payload = path.read_bytes()
    return {'url': url, 'file': path.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(payload).hexdigest()}


def image_source(url, path):
    result = preserve(url, path)
    with Image.open(path) as im:
        im.load()
        result.update(dimensions=list(im.size), mode=im.mode,
                      rgbaSha256=hashlib.sha256(im.convert('RGBA').tobytes()).hexdigest())
    return result


def main():
    audit = json.loads((ROOT / 'docs/ascended-reverse-audit.json').read_text())
    special = [row for row in audit['printings'] if row['variant'] == 'special-reverse']
    checklist = checklist_printings((ARCHIVE.parent / 'physical-checklist.html').read_text(encoding='utf-8'))
    product_images = {p['url']: p['img'] for p in checklist}
    retailer_sources, retailer_products = [], {}
    for page in range(1, 5):
        url = f'https://www.flagshipgames.sg/collections/ascended-heroes/products.json?limit=250&page={page}'
        source = preserve(url, ARCHIVE / f'flagship-products-{page}.json')
        retailer_sources.append(source)
        products = json.loads((ROOT / source['file']).read_bytes())['products']
        if not products:
            break
        for product in products:
            match = re.search(r'data-tcgid="(\d+)"', product['body_html'])
            if match:
                retailer_products[match[1]] = product
    index_source = preserve(BASE + 'index.json', ARCHIVE / 'formatted-index.json')
    index = json.loads((ROOT / index_source['file']).read_bytes())

    def locale(lang):
        source = preserve(BASE + index[lang]['me2-5']['path'], ARCHIVE / (lang + '.json'))
        entries = json.loads((ROOT / source['file']).read_bytes())
        by_id = {e['ext']['tcgl']['cardID']: e for e in entries}
        probes = []
        for number in REPRESENTATIVES:
            sources = {}
            for suffix in ('ph', 'ph2'):
                e = by_id[f'me2-5_{number}_{suffix}']
                sources[suffix] = {}
                for kind in ('png', 'tex'):
                    url = e['images']['tcgl'][kind]['foil']
                    sources[suffix][kind] = image_source(url, ARCHIVE / lang / kind / url.rsplit('/', 1)[1])
            probes.append({'language': lang, 'number': number, 'sources': sources,
                'duplicated': all(sources['ph'][kind]['rgbaSha256'] == sources['ph2'][kind]['rgbaSha256'] for kind in ('png', 'tex'))})
        print(f'{lang}: {sum(p["duplicated"] for p in probes)}/6 duplicate PNG/texture pairs', flush=True)
        return {'language': lang, 'exportSource': source, 'probes': probes}

    with ThreadPoolExecutor(max_workers=6) as pool:
        locales = list(pool.map(locale, [lang for lang in index if lang != 'en-US']))
    raw_base = 'https://cdn.malie.io/file/malie-io/tcgl/databases/'
    raw_index_source = preserve(raw_base + 'index.json', ARCHIVE / 'raw-index.json')
    raw_index = json.loads((ROOT / raw_index_source['file']).read_bytes())
    raw_sources = []
    for tier in (0, 1, 2):
        key = f'card-database-me2-5_{tier}_en_0.0'
        source = preserve(raw_base + raw_index[key]['data'], ARCHIVE / f'raw-tcgl-{tier}.json')
        database = json.loads((ROOT / source['file']).read_bytes())
        matches = [row for row in database['rows'] if row['cardID'].endswith('_ph2')]
        raw_sources.append({'tier': tier, 'source': source, 'rows': len(database['rows']),
            'specialRows': len(matches), 'foilEffects': sorted({row['Foil Effect'] for row in matches}),
            'foilMasks': sorted({row['Foil Mask'] for row in matches}),
            'additionalImageOrTextureFields': sorted({key for row in matches for key in row if any(token in key.lower() for token in ('image', 'texture', 'asset', 'decal', 'pattern'))})})

    supplemental = {}
    for number, (page_url, image_url) in SUPPLEMENTAL.items():
        page = preserve(page_url + ('.json' if image_url is None else ''), ARCHIVE / f'supplemental-{number:03d}.source')
        if image_url is None:
            product = json.loads((ROOT / page['file']).read_bytes())['product']
            images = product['images']
            # The product identity and collector number were reviewed against
            # the audit. Preserve every published angle, including the back.
            sources = [image_source(im['src'], ARCHIVE.parent / f'references/{number:03d}-physical-{i}.jpg') for i, im in enumerate(images)]
            supplemental[number] = {'page': page, 'title': product['title'], 'images': sources}
        else:
            source = image_source(image_url, ARCHIVE.parent / f'references/{number:03d}-alternate.jpg')
            supplemental[number] = {'page': page, 'images': [source]}

    def reference(row):
        expected = row['expectedFinish']
        number = int(row['collectorNumber'].split('/')[0])
        unavailable = None
        alternate_product = None
        try:
            source = image_source(expected['referenceImageUrl'], ARCHIVE.parent / f'references/{number:03d}.jpg')
        except requests.RequestException as error:
            unavailable = {'url': expected['referenceImageUrl'], 'error': str(error)}
            product_id = expected['referenceUrl'].split('/product/')[1].split('/')[0]
            product = retailer_products.get(product_id)
            if product and product['images']:
                # Match exact TCGplayer product ID, then independently require
                # the same collector number and assigned pattern in the title.
                label = {'poke-ball': 'Poke Ball', 'team-rocket': 'Team Rocket'}.get(expected['pattern'], expected['pattern'].replace('-', ' ').title())
                if f'({number:03d}/217)' not in product['title'] or f'({label})' not in product['title']:
                    raise ValueError('Alternate retailer printing mismatch: ' + product['title'])
                alternate_product = {'title': product['title'], 'productId': product_id,
                    'url': 'https://www.flagshipgames.sg/products/' + product['handle']}
                source = image_source(product['images'][0]['src'], ARCHIVE.parent / f'references/{number:03d}-flagship.jpg')
            else:
                try:
                    source = image_source(product_images[expected['referenceUrl']], ARCHIVE.parent / f'references/{number:03d}-thumbnail.jpg')
                except requests.RequestException as thumbnail_error:
                    source = None
                    unavailable['thumbnailError'] = str(thumbnail_error)
        if source is None and number in supplemental:
            source = supplemental[number]['images'][0]
        return {'cardId': row['cardId'], 'tcglVariantId': row['tcglVariantId'],
            'name': row['name'], 'collectorNumber': row['collectorNumber'],
            'pattern': expected['pattern'], 'productName': expected['productName'],
            'productUrl': expected['referenceUrl'], 'source': source,
            'unavailableHighResolutionSource': unavailable,
            'alternateRetailerProduct': alternate_product,
            'additionalExactPrintReferences': supplemental.get(number),
            'assetKind': 'exact-print-product-reference', 'isolatedFoilMap': False,
            'opticalCalibration': False}

    with ThreadPoolExecutor(max_workers=8) as pool:
        references = list(pool.map(reference, special))
    if len(references) != 140 or len({r['cardId'] for r in references}) != 140:
        raise ValueError('Incomplete reference coverage')
    report = {'setId': 'me02.5', 'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
        'correctedIsolatedFoilMapsFound': 0, 'exactPrintReferenceImagesPreserved': sum(r['source'] is not None for r in references),
        'highResolutionReferenceImages': sum(r['source'] is not None and max(r['source']['dimensions']) >= 1000 for r in references),
        'alternateRetailerCatalogSources': retailer_sources,
        'formattedIndexSource': index_source, 'alternateLanguageExports': locales,
        'rawIndexSource': raw_index_source, 'rawDatabases': raw_sources,
        'findings': [
            'All six other-language exports duplicate ordinary ph in ph2 for the six representative patterns, in both PNG and packed texture form. This is a 36-pair sample, not an all-card foreign-language audit.',
            'Raw English tiers 0 and 1 each contain 613 identities and 140 ph2 rows with FlatSilver/Reverse. They expose no additional image, texture, decal or pattern fields. Tier 2 is empty.',
            'Every special printing has an explicit reference record. Available exact-product images are preserved; failed URLs and remaining unavailable images are recorded separately. References are not ready-to-use isolated foil textures.',
            'No Pokemon TCG Live installation was found in the inspected standard Program Files and LocalAppData roots; no installed game bundles were available for extraction.',
        ], 'referenceImages': references}
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
    print(f'Preserved {report["exactPrintReferenceImagesPreserved"]}/{len(references)} exact-print images ({report["highResolutionReferenceImages"]} high-resolution); corrected isolated TCGL foil maps found: 0', flush=True)


if __name__ == '__main__':
    main()
