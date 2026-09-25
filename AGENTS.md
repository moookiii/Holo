# ASTRA WORKING BEHAVIOR

Always commit after each change and say the commit name in the message.

Author site masks as PNG files. If vector paths are useful during generation, rasterize them to PNG before delivery and reference only the PNG masks in the site.

# ETCHED CARD METHODS

Use a clean front to locate printed boundaries and angled photos of the exact card to identify physical etched line flow. A flat scan does not reveal relief reliably. If photos hide an area, use complementary views; label inferred spacing, depth, and line continuation as estimates. Do not turn print brightness or random noise into a height map.

Keep foil coverage, opaque print protection, and etched relief as separate maps. Trace contours in the source card's coordinate system, rasterize to PNG, and compare a colored boundary overlay against the clean front at high zoom. Check narrow gaps, fingertips, fabric edges, text, and deliberately smooth areas. Coarse polygons spill across printed edges. When regions overlap, inspect raster draw order. Compute relief normals from the continuous height field before clipping to material regions; differentiating a clipped mask creates false raised outlines.

Protect outlined text by its individual letter shapes, including ascenders, counters, and antialiased edges. A brightness threshold over a rectangular text row also selects pale artwork and produces visible box-shaped patches. Inspect the protection PNG and the lit render around every text/background transition.

Visible etched ridges and the foil grating are distinct. Determine from the photos whether the foil direction is uniform across the sheet or varies by region; do not copy relief-line direction into a diffraction map automatically. A uniform grating can still follow authored surface normals (`diffraction.followsAuthoredNormals`) so its color response reveals the ridges. Use one authored normal response: disable extra shader emboss, procedural engraving, random sparkle, and unrelated facet noise. Tune normal strength, roughness, highlight width, and foil intensity in the live renderer at several light and card angles. A broad bright foil wash can hide otherwise correct etching; a build or unit test cannot verify that appearance.

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
