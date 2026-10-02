# Legendary Collection reverse protection

Run `python scripts/legendary-collection/create-maps.py` to compose the reviewed
protection PNGs for all 110 reverse prints. The entry point invokes
`compose-reverse-maps.py`; it no longer re-extracts approved text or guesses
energy circles on each regeneration. These are optical masks, not relief.

`reverse-protection-inputs` holds the user's evolved and basic PNG masters and
the preserved per-card text layers. The old evolution region, info banner,
medal and right frame remnant were cleared before the text was combined with
the appropriate master. The user's existing Alakazam text edit is included.
Masters apply to the 99 Pokemon; Energy and Trainer layouts retain their own
text. Eevee now uses the same LC output path as the rest of the set.

`reverse-protection-registration.json` records 751 solid energy discs in
600 x 825 source coordinates: header types, attack costs, weakness, resistance,
retreat stars, and small symbols inside rules text. Initial scan measurements
were reviewed together against all fronts; missed circles and off-center
placements were corrected explicitly. No circle detection runs in the compositor.
Protection is never clipped against artwork coverage, preserving the entire
evolution medallion even where it overlaps the illustration.

`reverse-foil-corrections.json` restores missing foil immediately above the
artwork frames on cards 1, 5, 6, 7, 8, 12, 13, 14, 15, 17, 18 and 19. Only those
top strips are changed. The existing card-4 correction is retained, and foil
coverage for cards 20-110 is unchanged.

The compositor writes individual colored overlays, six full-set contact sheets,
and a registration report to `artifacts/lc-rework`. Green marks protection;
magenta marks the foil exclusion boundary. Source fronts remain unchanged.
Set-icon placement is separately registered in
`reverse-set-icon-registration.json`. All 110 icons were reviewed at 4x against
their fronts. The 97 displaced Pokemon icons move 0-6 pixels left and 1-4
pixels up, matching their printed positions. Alakazam and Dark Blastoise retain
the original master position; Energy and Trainer icons retain their existing
scan-registered protection. The compositor clears the old icon before placing
the shifted copy, without translating the banner or artwork-frame protection.
All 110 overlays were reviewed. Pixel checks verified retained text, unclipped
masters, solid circle interiors, and unchanged coverage outside the selected
top strips. Live WebGL captures cover Dark Persian, Alakazam, Flareon, Hypno,
Golduck, Snorlax, Eevee, Full Heal Energy and Pokemon Breeder at two card angles;
Dark Persian also has a Strip-light capture. The LC tests and badge checks pass.

Gallery reverse coverage uses the 512 x 720 artwork alpha channel so thin ink
is not reduced to the 128 x 180 optical map grid. Primary grating and facet maps
use 256 x 360; other layers retain the reduced tier. Legendary previews apply
facet normals per fragment and retain each card's printed type color with restrained diffraction.
The nine-array, 48-slot gallery allocation is approximately 127 MiB.

Validation: production build; 15 LC/gallery/pattern tests; live WebGL viewer
captures for Pidgeotto, Graveler, Omanyte, Full Heal Energy and Pokemon Breeder,
plus gallery captures for Pidgeotto, Graveler and Omanyte. Browser check:
`node scripts/legendary-collection-reverse-check.mjs`.

The former color-derived evolution badge has been replaced by the user's PNG
master. Approved glyph extraction remains baked into the preserved text inputs,
including its local-contrast treatment of red lettering.
