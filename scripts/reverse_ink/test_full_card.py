"""Export-contract checks; these cannot establish tracing accuracy."""
import unittest
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
from full_card import ASSETS, DATA, read, glyph_d
from fit_symbol import polygon_path


class FullCardTests(unittest.TestCase):
    def test_compound_glyph_keeps_counters_in_one_path(self):
        outer=polygon_path([[0,0],[10,0],[10,10],[0,10]])
        hole=polygon_path([[3,3],[7,3],[7,7],[3,7]])
        d=glyph_d([outer,hole],[20,30],2,0)
        self.assertEqual(d.count('M '),2)
        self.assertEqual(d.count(' Z'),2)

    def test_all_pngs_have_card_frame_and_true_transparency(self):
        for family in read(DATA/'references/selected-sources.json')['families']:
            with self.subTest(family=family['family']):
                png=ASSETS/f'drafts/full-card/{family["family"]}.png'
                with Image.open(png) as im:
                    self.assertEqual(im.size,(1890,2640))
                    self.assertEqual(im.mode,'RGBA')
                    rgba=np.array(im)
                alpha=rgba[:,:,3]
                self.assertEqual(alpha[0,0],0)
                self.assertEqual(alpha[900,900],0)  # unknown illustration
                self.assertEqual(alpha.max(),255)
                self.assertTrue(np.any((alpha>0)&(alpha<255)))
                self.assertTrue(np.all(rgba[:,:,:3][alpha>0]==255))

    def test_exports_are_geometry_only_and_remain_candidates(self):
        for selected in read(DATA/'references/selected-sources.json')['families']:
            family=selected['family']
            with self.subTest(family=family):
                tree=ET.parse(ASSETS/f'drafts/full-card/{family}.svg')
                self.assertEqual(tree.getroot().attrib['viewBox'],'0 0 630 880')
                tags={node.tag.rsplit('}',1)[-1] for node in tree.iter()}
                self.assertLessEqual(tags,{'svg','title','desc','defs','clipPath','mask','g','rect','path'})
                report=read(DATA/f'review/full-card/{family}/review.json')
                self.assertEqual(report['source'],selected['source'])
                self.assertEqual(report['status'],'unvalidated-full-card-candidate')
                self.assertTrue(report['unknown_regions'])


if __name__=='__main__':unittest.main()
