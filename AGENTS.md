# ASTRA WORKING BEHAVIOR

Always commit after each change and say the commit name in the message.

Author site masks as PNG files. If vector paths are useful during generation, rasterize them to PNG before delivery and reference only the PNG masks in the site.

# POKEMON ETCHED CARD WORKFLOW

For Prismatic Evolutions, work on one card at a time and use the real card's photos already in `research/prismatic-evolutions/photos/` before searching again. The exact-card references and authoring notes are in `research/prismatic-evolutions/references.json` and `scripts/prismatic/ETCHING.md`. Use the clean 600x825 front for printed boundaries and angled photos for physical ridge flow; do not infer relief from the scan's brightness. Record inferred spacing/depth as approximations.

Keep foil coverage, opaque print protection, and etched relief separate. Author contours in 600x825 print coordinates, rasterize to PNG, and inspect a high-resolution color outline overlay on the clean front before running the renderer. Trace finger gaps, fabric seams, hanging tips, text surroundings, and smooth areas closely; a coarse polygon can spill far beyond its intended material. Differentiate continuous relief before clipping it to a region so material edges do not become raised outlines.

For Atticus 133, edit `scripts/prismatic/fullart-regions.json` for foil/print coverage and `scripts/prismatic/atticus-surface-regions.json` for regional etched boundaries and line flow. Rebuild in this order: `create-fullart-coverage.py`, `create-atticus-eye-relief.py`, `create-atticus-surface.py`. The last generator rewrites map hashes in the evidence manifest. Region draw order determines which overlapping region wins. Run `python -m unittest discover -s scripts/prismatic -p test_atticus_surface.py` and `node --experimental-strip-types --test tests/prismatic.test.ts`; visually check the live card at several lighting angles before calling it done.

Protect outlined text by the actual letter shapes, including ascenders and antialiasing. A brightness threshold across a rectangular text row also catches pale artwork and leaves visible rectangular patches. Check the generated protection PNG against the print, especially at text/background transitions.

Visible etched ridges and foil diffraction are different structures. A card may use one sheet-wide diffraction direction while its relief lines curve by region. For that case, omit a per-region direction PNG and set `diffraction.followsAuthoredNormals: true` so the uniform foil axis responds to the authored normal map. Keep procedural engraving, extra emboss, random noise, and glints off; tune the card's normal strength and highlight width in the live renderer against photos. Register only the exact finished printing in `PrismaticSurfaces.ts`; keep ordinary non-holos in pack opening, out of the picker, and leave the standard SV reverse for its future pass.

# DEFINITION OF PREMIUM

"Premium" means:

precision;
restraint;
depth;
sharpness;
responsiveness;
controlled highlights;
strong materials;
excellent motion;
no obvious shortcuts;
no visual noise without purpose.

It does NOT simply mean:

more bloom;
more glow;
more saturation;
more effects;
more UI;
more particles.
