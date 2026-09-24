"""Acceptance checks for the delivered Atticus surface, not synthetic fixtures."""
from pathlib import Path
import json
import unittest
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
MAPS=ROOT/'public/cards/pokemon/prismatic-evolutions/maps'


class AtticusSurfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maps={n:np.asarray(Image.open(MAPS/f'133-holo-{n}.png')) for n in ['foil','protection','normal','height','direction','roughness']}

    def test_protected_ink_has_no_relief(self):
        eye=np.asarray(Image.open(ROOT/'research/prismatic-evolutions/relief/133-eye/foil.png'))>0
        protected=((self.maps['foil']==0)|(self.maps['protection']>=200)) & ~eye
        self.assertTrue(np.all(self.maps['normal'][protected]==[128,128,255]))
        self.assertTrue(np.all(self.maps['height'][protected]==128))
        self.assertTrue(np.all(self.maps['direction'][protected,3]==0))

    def test_smooth_waist_and_eye_interior(self):
        for x,y in [(380,235),(365,520),(350,540),(365,755)]:
            with self.subTest(point=(x,y)):
                self.assertEqual(int(self.maps['height'][y*2,x*2]),128)
                np.testing.assert_array_equal(self.maps['normal'][y*2,x*2],[128,128,255])

    def test_clothing_glove_background_and_rim_have_relief(self):
        for x,y in [(450,170),(380,280),(205,305),(250,370),(350,665),(45,425),(10,400)]:
            with self.subTest(point=(x,y)):
                patch=self.maps['height'][y*2-10:y*2+10,x*2-8:x*2+8]
                self.assertGreater(int(patch.max())-int(patch.min()),15)
        normal=self.maps['normal'].astype(float)/127.5-1
        self.assertLess(float(np.max(np.abs(np.linalg.norm(normal,axis=2)-1))),.015)

    def test_marked_material_boundaries_do_not_spill_into_forest(self):
        # Clean-front coordinates just outside the user's marked contours.
        # These test the delivered raster, including region overwrite order.
        regions=json.loads((ROOT/'scripts/prismatic/atticus-surface-regions.json').read_text())['regions']
        names={i:r['name'] for i,r in enumerate(regions,2)}
        labels=np.asarray(Image.open(ROOT/'research/prismatic-evolutions/relief/133-regions.png'))
        for point in [(145,205),(244,201),(65,311),(97,324),(143,303),(177,356),(515,430),(480,463)]:
            x,y=point
            with self.subTest(point=point):
                self.assertEqual(names[int(labels[y*2,x*2])],'Continuous forest background')
        for point,expected in [((334,348),'Torso pink cloth'),((478,373),'Cloth face mask')]:
            x,y=point
            self.assertEqual(names[int(labels[y*2,x*2])],expected)

    def test_waist_junction_follows_printed_materials(self):
        regions=json.loads((ROOT/'scripts/prismatic/atticus-surface-regions.json').read_text())['regions']
        names={i:r['name'] for i,r in enumerate(regions,2)}
        labels=np.asarray(Image.open(ROOT/'research/prismatic-evolutions/relief/133-regions.png'))
        expected={
            (455,480):'Blue waist side',
            (440,495):'Blue waist side',
            (305,480):'Gray waist smooth',
            (295,500):'Gray waist smooth',
            (290,520):'Gray waist smooth',
            (280,530):'Continuous forest background',
        }
        for (x,y),material in expected.items():
            with self.subTest(point=(x,y)):
                self.assertEqual(names[int(labels[y*2,x*2])],material)


if __name__=='__main__':unittest.main()
