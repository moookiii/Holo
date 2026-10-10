# Sword & Shield pack crop review

Reviewed all 61 registered fronts across the 17 parent sets. Tightened 53 PNGs
across Darkness Ablaze through Crown Zenith. The eight Sword & Shield and Rebel
Clash fronts already used the approved crop and retain their pixels and hashes.

The initial pass missed the 17 pale silver-seal fronts in Brilliant Stars,
Astral Radiance, Lost Origin and Silver Tempest. The follow-up crops these too:
9-pixel side insets remove their tapered white gutters, with 22-pixel top/bottom
insets removing pale crimp margins. Each crop was reviewed against the original
front, including the bottom text and set-logo edges.

The regular capped sources now use the same 6-pixel side / 22-pixel top and
bottom inset as the approved Sword & Shield and Rebel Clash fronts. Champion's
Path photographs use individually reviewed insets; Pokemon GO loses its white
outer border. Colored seal texture, logos, artwork and text remain intact.
These are direct source crops without rotation, stretching or resampling.

`scripts/tcgl/swsh_wrappers.py` retains the crop decisions for regeneration.
`public/packs/pokemon/swsh-wrapper-sources.json` records each full-source crop,
source and output dimensions, SHA-256 hashes and review status. Original sources
under `research/tcgl/swsh-wrappers/` are unchanged.

Validation compared every output pixel with its recorded source crop and checked
all 61 dimensions and hashes. The live pack picker decoded all 61 fronts at their
expected dimensions across all 17 sets. Native-resolution front reviews, edge
strips, individual picker tiles and set captures are saved locally under
`artifacts/swsh-crop-review/`. A representative live capture is retained at
`docs/swsh-pack-crop-review/darkness-ablaze.png`; follow-up captures of all four
silver-seal sets are retained in the same directory.

No card assets, materials, picker layout or unrelated sets changed.
