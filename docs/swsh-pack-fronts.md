# Sword & Shield pack front upgrade

57 of the 61 registered English pack designs now use original, native-resolution
files from the Bulbagarden Archives English Sword & Shield Series packs category:
https://archives.bulbagarden.net/wiki/Category:English_Sword_%26_Shield_Series_packs

Source sizes range from 699×1280 to 831×1524. The downloaded originals remain in
`research/tcgl/swsh-wrappers/bulbagarden/`. The public source manifest records each
file URL, source page, source dimensions, source SHA-256, crop rectangle, final
dimensions and output SHA-256. Crops preserve the existing upright framing,
remove presentation caps and tapered white side gutters, and retain the colored
seal edges and printed text. No artwork is upscaled or stretched.

Run `python scripts/tcgl/upgrade_swsh_wrappers.py` to reproduce this upgrade.
The prior untouched Pokesymbols sources supply the approved framing reference;
the additional archive side inset removes the white slivers that remained after
scaling that reference. Generated pack URLs carry an output hash to invalidate
cached images when the asset changes. Design order, IDs and unrelated sets stay
unchanged.

Champion's Path's four archive files are only 187×343. Their existing fronts
remain unchanged; higher-resolution replacement sourcing is pending after this
first pass. No low-resolution archive file was substituted or enlarged.

Native-resolution Snorlax and Brilliant Stars crops and the complete contact
sheet were inspected. The first Snorlax review revealed residual white side
slivers; the corrected native PNG has no near-white pixels in either outermost
column. Review sheet: `artifacts/swsh-wrappers-hires.png`. The actual PackBrowser
component was rendered in an isolated browser harness with its registered
Sword & Shield fronts; all four decoded at 665×1194 with the new hashed URLs.
Picker capture: `artifacts/swsh-hires-picker.png`. Build validation passed.
