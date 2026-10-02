"""Compatibility entry point for the reviewed LC reverse-mask compositor.

Approved text is preserved in PNG inputs. Do not re-extract it from scan color.
"""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('compose-reverse-maps.py')), run_name='__main__')
