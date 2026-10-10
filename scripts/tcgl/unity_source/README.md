# Reused TCGL Unity source extractor

These three modules preserve the working Sword & Shield downloader, binary
database parser, Unity decoder, exact material reference resolver, and finalizer
from `C:/Users/jpall/TCGL-SWSH-extraction`. They are vendored here so the Holo
source acquisition command remains reusable without that external workspace.
The Sun & Moon adapter configures their destination, inventory, and set names;
it does not change their texture decoding or material selection behavior.

Dependencies: UnityPy 1.25.0, Pillow, requests. Run the adapter, rather than these
modules directly: `python scripts/tcgl/fetch_sm_sources.py`.

The adapter records upstream module hashes in acquisition evidence. Source
bundles retain original compression and mip levels; PNGs retain the decoder's
native dimensions and channels. No Holo material conversion occurs here.
