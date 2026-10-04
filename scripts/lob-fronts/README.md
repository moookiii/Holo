# Original LOB front sourcing

YGOPRODeck remains the structured catalog. `candidates.json` is a separate,
explicitly scoped acquisition manifest; it must never alter identities or rarity.
Observed printing evidence is separate from seller claims and image provenance.

Source tiers: verified native exact scan; exact market/product image; recoverable
graded archive; verified collector listing; YGOPRODeck fallback. Only candidates
passing **all** printing and quality checks enter tier/quality ranking. Unverified
images cannot win on size. Native front height must be at least 1000 px, width
650 px; fixed-scale sharpness must pass. This is a minimum, not a promise of fidelity.
Glare/compression proxies are advisory. Every listed human review check must pass;
unknown means review required. Region evidence is necessary because original
Asian-English cards may share the NA front code.

An explicit `allowRegionalReview` candidate may replace a poor baseline only
when every front-printing and quality check passes and the sole missing printing
attribute is region. It remains a **fallback**, with status
`original-print-region-review`; it never counts as a verified exact-print winner.
A known wrong region, wrong edition/code, missing checksum or failed quality
check cannot enter this path. Shared collection backs support an inference only.
Individual paired TCG backs plus the early LOB front can close regional review.

Run from the repo root with Python and `requirements.txt` dependencies:

```powershell
python scripts/lob-fronts/pipeline.py
python scripts/lob-fronts/pipeline.py --download
python scripts/lob-fronts/pipeline.py --apply
python -m unittest discover -s scripts/lob-fronts -p 'test_*.py'
```

The default is offline and writes a preview audit to `artifacts/lob-fronts/`.
`--download` requests only explicitly registered missing originals, never crawls
or dumps a remote catalog. Downloads retain original bytes and SHA-256 hashes;
changed bytes invalidate review. `--apply` publishes reviewed fronts and audits.
Reruns preserve the explicit fallback baseline. Store reviewer evidence, observed
code/edition/copyright/passcode/layout/title/stamp, source page and original URL,
quality scores, caveats and any normalization in each candidate. A seller title
or an ORB artwork match only discovers identity; it never verifies the printing.

Normalized fronts are lossless PNGs under
`public/cards/yugioh/lob-first-edition/fronts/`. Originals live under
`research/yugioh-lob/fronts/`. Existing baseline JPGs remain intact. Per-card JSON,
`sources.json` and `manual-review.json` expose full provenance and unresolved cards.
Crop coordinates and TL/TR/BR/BL perspective points use original pixels. Mild
perspective correction uses the shorter native edge and preserves 59:86 physical
proportions. Strong skew, missing corners, slab glare, synthetic enhancement and
upscaling are rejected. No denoise, sharpening, recoloring, generative fill or
foil simulation is applied. Review foil-map registration in the live viewer when
publishing a front. This pipeline does not regenerate masks or change materials.
The scoped registration script updates PNG map alignment for replacements only;
do not run the old whole-set `prepare-lob-maps.py` on this provenance schema.

`node scripts/fetch-lob.mjs` reads the cached **set-specific** YGOPRODeck catalog then
runs the offline audit; use `--refresh-metadata` to request fresh set metadata and
forward `--download` and/or `--apply` explicitly. Only `--apply` publishes changes. It does
not treat YGOPRODeck fronts or gallery filenames as authoritative original scans.
