import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from pipeline import normalize, local_path, write_bytes
from review_bounds import physical_quad
from PIL import ImageDraw


class NormalizationTests(unittest.TestCase):
    def test_windows_preview_file_lock_preserves_previous_buffer(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'front.png'
            path.write_bytes(b'old-image-longer')
            denied = PermissionError('Preview holds replacement lock')
            denied.winerror = 5
            with patch.object(Path, 'replace', side_effect=denied), patch('pipeline.time.sleep'):
                with self.assertRaises(PermissionError):
                    write_bytes(path, b'complete-png')
            self.assertEqual(path.read_bytes(), b'old-image-longer')

    def test_black_scan_backing_is_removed_without_clipping_printed_border(self):
        im = Image.new('RGB',(710,1030),'#101010')
        ImageDraw.Draw(im).rectangle((10,15,699,1014),fill='#707080')
        ImageDraw.Draw(im).rectangle((35,40,674,989),fill='#bb8844')
        quad = physical_quad(im)
        result = normalize(im,{'normalization':{'quad':quad}})
        self.assertTrue(680<=result.width<=690)
        self.assertTrue(990<=result.height<=1000)
        for point in [(0,result.height//2),(result.width-1,result.height//2),(result.width//2,0),(result.width//2,result.height-1)]:
            self.assertGreater(min(result.getpixel(point)),50)
        self.assertEqual(result.getpixel((result.width//2,result.height//2)),(187,136,68))

    def test_card_crop_uses_source_pixels_without_enlargement(self):
        im = Image.new('RGB', (900, 1500), '#aa7744')
        result = normalize(im, {'normalization': {'crop': [100, 100, 808, 1132]}})
        self.assertEqual(result.size, (708, 1032))
        self.assertEqual(result.getpixel((400, 600)), im.getpixel((500, 700)))

    def test_mild_quad_does_not_enlarge_native_edges(self):
        im = Image.new('RGB', (1000, 1500))
        result = normalize(im, {'normalization': {'quad': [[50, 40], [930, 50], [920, 1340], [60, 1330]]}})
        self.assertLessEqual(result.width, 860)
        self.assertLessEqual(result.height, 1290)
        self.assertAlmostEqual(result.width/result.height, 59/86, places=3)

    def test_invalid_bounds_skew_proportions_and_mirroring_fail(self):
        im = Image.new('RGB', (1000, 1500))
        for spec in [{'crop': [-1, 0, 800, 1200]}, {'crop': [0, 0, 1000, 500]},
                     {'quad': [[0, 0], [999, 0], [700, 1450], [0, 1450]]},
                     {'quad': [[900, 0], [0, 0], [0, 1300], [900, 1300]]}]:
            with self.assertRaises(ValueError): normalize(im, {'normalization': spec})
        with self.assertRaises(ValueError): local_path('../outside.jpg')


if __name__ == '__main__': unittest.main()
