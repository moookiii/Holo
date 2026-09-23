"""Check topology and monochrome serialization of the reconstructed components."""
import json
import math
import unittest
import xml.etree.ElementTree as ET
import cv2
import numpy as np
from analytic_symbols import trainer
from fit_symbol import sample_path, polygon_path
from normalize import ROOT, DATA

class SymbolTests(unittest.TestCase):
    def test_trainer_keeps_band_button_ring_and_center_hole(self):
        values=[45,45,35,13,9.5,5,36,1.75]
        paths=trainer(values)
        def contains(point):
            return sum(cv2.pointPolygonTest(sample_path(p,120).astype(np.float32),tuple(map(float,point)),False)>=0 for p in paths)%2==1
        self.assertFalse(contains([45,45]))
        self.assertTrue(contains([45+7,45]))
        self.assertFalse(contains([45+11,45]))
        self.assertTrue(contains([45,45+25]))
        direction=np.array([math.cos(math.radians(36)),math.sin(math.radians(36))])
        self.assertFalse(contains(np.array([45,45])+direction*25))
        self.assertFalse(contains([0,0]))

    def test_polygon_serialization_keeps_edges_straight(self):
        vertices=[[4,3],[17,24],[30,10]]
        path=polygon_path(vertices)
        for start,curve in zip(vertices,path['curves']):
            start=np.array(start);a,b,end=np.array(curve)
            np.testing.assert_allclose(a,start+(end-start)/3)
            np.testing.assert_allclose(b,start+2*(end-start)/3)

    def test_all_exported_components_have_no_photo_or_effect(self):
        files=list((ROOT/'assets/reverse-ink/sv/components').glob('*-symbol.svg'))
        self.assertGreaterEqual(len(files),5)
        for file in files:
            with self.subTest(file=file.name):
                tree=ET.parse(file)
                tags={node.tag.rsplit('}',1)[-1] for node in tree.iter()}
                self.assertLessEqual(tags,{'svg','title','desc','path'})
                for node in tree.iter('{http://www.w3.org/2000/svg}path'):
                    self.assertEqual(node.attrib['fill'],'currentColor')
                    self.assertEqual(node.attrib['fill-rule'],'evenodd')
                family=file.stem.removesuffix('-symbol')
                report=json.loads((DATA/f'review/symbols/{family}.json').read_text())
                for path in report['refined_paths']:
                    np.testing.assert_allclose(path['start'],path['curves'][-1][2],atol=1e-10)
                    self.assertTrue(np.isfinite(sample_path(path)).all())

if __name__=='__main__':unittest.main()
