"""Synthetic geometry tests only; these fixtures are never Pokémon assets."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
from etched_maps import build_maps, validate_evidence, compile_file


def fixture():
    spec = {'version': 1, 'mapSize': [100, 100], 'coordinates': [100, 100],
            'dimensionsCm': [.1, .1], 'heightRangeMicrons': 4,
            'regions': [{'name': 'synthetic trace', 'label': 1, 'kind': 'etched', 'roughness': .3,
                         'lines': [{'points': [[50, 20], [50, 80]], 'halfWidthMicrons': 30,
                                    'ridgeMicrons': 2, 'valleyMicrons': 1, 'relativeGratingPeriod': 1}]}]}
    return spec, np.full((100, 100), 255, np.uint8), np.zeros((100, 100), np.uint8), np.ones((100, 100), np.uint8)


class EtchedMapTests(unittest.TestCase):
    def test_ridge_valley_normals_and_finite_extent(self):
        spec, foil, protection, labels = fixture()
        maps = build_maps(spec, foil, protection, labels)
        self.assertGreater(maps['height'][50, 49], 128)
        self.assertLess(maps['height'][50, 45], 128)
        self.assertEqual(maps['height'][50, 20], 128)
        self.assertEqual(maps['height'][2, 50], 128, 'Do not continue beyond observed line ends')
        self.assertLess(maps['normal'][50, 48, 0], 128)
        self.assertGreater(maps['normal'][50, 51, 0], 128)
        np.testing.assert_array_equal(maps['normal'][2, 50], [128, 128, 255])
        np.testing.assert_array_equal(maps['direction'][50, 49], [255, 128, 85, 255])
        self.assertEqual(maps['direction'][2, 50, 3], 0)

    def test_image_y_sign_and_unoriented_axis(self):
        spec, foil, protection, labels = fixture()
        spec['regions'][0]['lines'][0]['points'] = [[20, 50], [80, 50]]
        maps = build_maps(spec, foil, protection, labels)
        self.assertGreater(maps['normal'][48, 50, 1], 128)
        self.assertLess(maps['normal'][51, 50, 1], 128)
        np.testing.assert_array_equal(maps['direction'][49, 50], [0, 128, 85, 255])
        spec['regions'][0]['lines'][0]['points'].reverse()
        reverse = build_maps(spec, foil, protection, labels)
        for key in maps:
            np.testing.assert_array_equal(maps[key], reverse[key])

    def test_print_masks_cannot_generate_relief(self):
        spec, foil, protection, labels = fixture()
        original = build_maps(spec, foil, protection, labels)
        protection[:, 45:55] = 255
        foil[:, 30:40] = 0
        protected = build_maps(spec, foil, protection, labels)
        for key in ('height', 'normal', 'direction'):
            np.testing.assert_array_equal(original[key], protected[key])
        labels[:, 55:] = 2
        spec['regions'].append({'name': 'known smooth region', 'label': 2, 'kind': 'smooth', 'roughness': .45})
        smooth = build_maps(spec, foil, protection, labels)
        self.assertTrue(np.all(smooth['height'][:, 55:] == 128))
        np.testing.assert_array_equal(smooth['normal'][50, 55], [128, 128, 255])
        self.assertTrue(np.all(smooth['direction'][:, 55:, 3] == 0))

    def test_physical_scale_survives_resolution_change(self):
        spec, foil, protection, labels = fixture()
        low = build_maps(spec, foil, protection, labels)
        spec['mapSize'] = [200, 200]
        high = build_maps(spec, *(np.repeat(np.repeat(a, 2, axis=0), 2, axis=1) for a in (foil, protection, labels)))
        low_slope = abs((low['normal'][50, 48, 0]/255-.5)*2)
        high_slope = abs((high['normal'][100, 96, 0]/255-.5)*2)
        self.assertAlmostEqual(low_slope, high_slope, delta=.025)

    def test_reject_unreviewed_or_invalid_geometry(self):
        spec, foil, protection, labels = fixture()
        labels[0, 0] = 0
        with self.assertRaisesRegex(ValueError, 'unreviewed'):
            build_maps(spec, foil, protection, labels)
        labels[0, 0] = 1
        spec['regions'][0]['lines'][0]['points'][0][0] = float('nan')
        with self.assertRaisesRegex(ValueError, 'finite'):
            build_maps(spec, foil, protection, labels)

    def test_evidence_rejects_pending_wrong_printing_and_changed_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            photo_root = Path(folder)
            for name, data in [('a.webp', b'independent-A'), ('b.webp', b'independent-B')]:
                (photo_root / name).write_bytes(data)
            refs = {'photos': [{'file': name, 'cardId': 'synthetic', 'variant': 'holo', 'assessment': 'partial-surface'}
                               for name in ('a.webp', 'b.webp')],
                    'printingReviews': [{'cardId': 'synthetic', 'variant': 'holo', 'evidenceComplete': False}]}
            spec = {'cardId': 'synthetic', 'variant': 'holo', 'lineworkReviewed': True,
                    'regions': [{'name': 'test', 'evidence': [
                        {'photo': name, 'sha256': hashlib.sha256((photo_root/name).read_bytes()).hexdigest(), 'observed': 'Synthetic test observation'}
                        for name in ('a.webp', 'b.webp')], 'lines': [{'photos': ['a.webp', 'b.webp']}]}]}
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                validate_evidence(spec, refs, photo_root)
            refs['printingReviews'][0]['evidenceComplete'] = True
            self.assertEqual(len(validate_evidence(spec, refs, photo_root)), 2)
            wrong = copy.deepcopy(refs)
            wrong['photos'][0]['variant'] = 'reverse'
            with self.assertRaisesRegex(ValueError, 'wrong card'):
                validate_evidence(spec, wrong, photo_root)
            (photo_root/'b.webp').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'bytes changed'):
                validate_evidence(spec, refs, photo_root)

    def test_export_hashes_channels_and_pending_export_writes_nothing(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'photos').mkdir()
            spec, foil, protection, labels = fixture()
            spec.update(cardId='synthetic', variant='holo', lineworkReviewed=True,
                        depthCalibration='Synthetic test dimensions, not physical card measurements',
                        inputs={'foil': 'foil.png', 'protection': 'protection.png', 'regions': 'regions.png'})
            for key, array in [('foil', foil), ('protection', protection), ('regions', labels)]:
                Image.fromarray(array).save(root/f'{key}.png')
            evidence, photos = [], []
            for name in ('a', 'b'):
                filename = f'{name}.webp'
                (root/'photos'/filename).write_bytes(name.encode())
                evidence.append({'photo': filename, 'sha256': hashlib.sha256(name.encode()).hexdigest(), 'observed': 'Synthetic geometry'})
                photos.append({'file': filename, 'cardId': 'synthetic', 'variant': 'holo', 'assessment': 'partial-surface'})
            spec['regions'][0]['evidence'] = evidence
            spec['regions'][0]['lines'][0]['photos'] = ['a.webp', 'b.webp']
            refs = {'photos': photos, 'printingReviews': [{'cardId': 'synthetic', 'variant': 'holo', 'evidenceComplete': False}]}
            (root/'source.json').write_text(json.dumps(spec))
            (root/'references.json').write_text(json.dumps(refs))
            with patch('etched_maps.RESEARCH', root):
                with self.assertRaisesRegex(ValueError, 'incomplete'):
                    compile_file(root/'source.json', root/'output')
                self.assertFalse((root/'output').exists())
                refs['printingReviews'][0]['evidenceComplete'] = True
                (root/'references.json').write_text(json.dumps(refs))
                manifest = compile_file(root/'source.json', root/'output')
            self.assertEqual(len(manifest['maps']), 6)
            self.assertEqual(manifest['mapSettings']['embossStrength'], 0)
            for filename, digest in manifest['maps'].items():
                self.assertEqual(hashlib.sha256((root/'output'/filename).read_bytes()).hexdigest(), digest)
                with Image.open(root/'output'/filename) as image:
                    self.assertEqual(image.size, (100, 100))


if __name__ == '__main__':
    unittest.main()
