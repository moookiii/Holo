"""Geometric and source-integrity checks for the offline normalization stage."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from normalize import DATA, homography, normalize

class NormalizationTests(unittest.TestCase):
    def test_corner_order_and_projective_round_trip(self):
        corners=np.float32([[34,22],[482,58],[431,709],[17,678]])
        matrix=homography(corners,630,880)
        mapped=cv2.perspectiveTransform(corners[None],matrix)[0]
        np.testing.assert_allclose(mapped,np.float32([[0,0],[629,0],[629,879],[0,879]]),atol=.0001)
        interior=np.float32([[[117,197],[286,345],[357,541]]])
        back=cv2.perspectiveTransform(cv2.perspectiveTransform(interior,matrix),np.linalg.inv(matrix))
        np.testing.assert_allclose(back,interior,atol=.0001)

    def test_invalid_quadrilaterals_rejected(self):
        for corners in [ [[0,0],[10,10],[10,0],[0,10]], [[0,0],[0,10],[10,10],[10,0]],
                         [[0,0],[10,0],[5,0],[0,10]], [[0,0],[10,0],[10,float('nan')],[0,10]] ]:
            with self.subTest(corners=corners),self.assertRaises(ValueError):
                homography(corners,630,880)

    def test_normalization_preserves_identity_and_detects_changed_original(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);source=folder/'source.png'
            rng=np.random.default_rng(13)
            pixels=rng.integers(0,256,(88,63,3),dtype=np.uint8)
            Image.fromarray(pixels).save(source)
            record=dict(id='identity',file=source.name,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                        source_size=[63,88],corners=[[0,0],[62,0],[62,87],[0,87]],corner_method='synthetic')
            normalize(record,folder,folder,(63,88))
            np.testing.assert_array_equal(np.array(Image.open(folder/'identity.png')),pixels)
            Image.new('RGB',(63,88),'red').save(source)
            with self.assertRaisesRegex(ValueError,'Source changed'):
                normalize(record,folder,folder,(63,88))

    def test_full_reference_corpus_contract(self):
        manifest=json.loads((DATA/'references/manifest.json').read_text())
        records=manifest['references']
        expected={'grass','fire','water','lightning','psychic','fighting','darkness','colorless','dragon','trainer','metal'}
        self.assertEqual(set(manifest['families']),expected)
        self.assertEqual(len(records),34)
        self.assertEqual(len({r['id'] for r in records}),34)
        for family in expected:
            self.assertEqual(sum(r['family']==family and r['role']=='reverse-reference' for r in records),3)
        self.assertEqual([r['id'] for r in records if r['role']=='plain-comparison'],['lickitung-plain'])
        for r in records:
            self.assertTrue(r['reviewed'])
            self.assertEqual(len(r['sha256']),64)
            homography(r['corners'],630,880)

if __name__=='__main__':unittest.main()
