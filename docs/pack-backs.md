# English Pokemon pack backs

The October 2026 audit filled 40 missing product reverses: 17 Sword & Shield,
15 Scarlet & Violet, five Mega Evolution, both anniversary products, and
McDonald's Dragon Discovery. Existing Mega Evolution base and 151 backs remain
in use. Every art variant for an added Pokemon product now resolves to a local
back; existing WOTC reverses retain their product-specific registrations.

## Sources and reproduction

`scripts/pack-backs/sources.json` records exact image URLs, listing/product pages,
measured crops or quadrilaterals, rotations, source type and review notes.
`public/packs/pokemon/back-sources.json` additionally records source/output
dimensions, SHA-256 hashes and processing. Original downloads are preserved in
the ignored `research/pack-backs/` directory. Reproduce the PNGs with:

```sh
python scripts/pack-backs/prepare.py
```

Twelve additions use clean product artwork; 28 use photographs of the exact
English wrapper. Each photographed reverse was checked for its expansion copy
and pack configuration. Three-card fun packs and sleeved-product reverses were
excluded from ordinary booster registrations. Photographs retain natural foil
creases, reflections and regional legal/barcode differences. These are sourced
photographs, not clean scans or reconstructed printing.

The offline converter crops clean art without resizing. Photographs use a
measured four-corner perspective correction with bilinear sampling, dimensions
limited by the shorter opposing source edges, and lossless quarter-turns where
needed. Prismatic Evolutions also uses an antialiased PNG alpha outline to remove
the curved side background. No artwork/text is redrawn, generated or sharpened
into artificial detail. Front artwork and card materials are unchanged.

`src/pokemon/packBacks.ts` keeps reverse registration separate from front
generation, so regenerating front artwork cannot remove these backs. Dragon
Discovery's catalog now uses that same registration path.

## Verification

- Nine targeted tests passed across `pokemon-pack-backs`, `pokemon-assets` and
  `dragon-discovery`; every added product/art variant has an existing local back,
  and source evidence matches PNG dimensions and hashes.
- `npx tsc --noEmit` passed.
- Browser preparation decoded all 42 registered modern product reverses without
  SVG fallback. Live pack picker and 180-degree reverse renders passed for Sword
  & Shield, Prismatic Evolutions and Pitch Black, without browser errors.
- Native asset reviews and live captures are preserved locally in the ignored
  `artifacts/pack-back-research/` directory; `browser-report.json` records the live
  checks. Photographed highlights remain baked into the supplied source images.
