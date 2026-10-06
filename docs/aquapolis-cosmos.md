# Aquapolis H1-H32 Cosmos registration

All 32 English Aquapolis Holo Rares now use `pokemon-base-set-2-cosmos` with their own registered motif PNG. Crystal cards 148-150 retain their pending finish. The Base Set 2 material, pattern generator, scale conventions, worker preparation, GPU realization and caches are unchanged. No normal, height, emboss, new optical profile or random feature positions were added.

## Source coordinates and protection

The printed masters are the untouched English H1-H32 PNGs from the Pokemon TCG image CDN, e.g. `https://images.pokemontcg.io/ecard2/H29_hires.png`. Each full front is 600x825. Placement coordinates use that complete domain: no artwork crop, flip, translation or UV offset. The motif outputs are antialiased grayscale PNGs at 1200x1650. Source, protection, window and output SHA-256 hashes are recorded per card in `scripts/aquapolis/cosmos-registration.json`.

All 32 supplied SAM protection PNGs and the existing card-specific foil-window PNGs are unchanged. SAM protection is composed with coverage by the existing map worker; it is not cut into the motif. Consequently an observed disk can remain one complete disk even where protected print or the physical window clips its response. The front is not retouched to remove baked scan reflections.

The matching ordinary Rare front is only a rejection reference for printed art. It does not supply foil positions. Examples include Bellossom's painted lower spirals, Magneton's electrical reflections, Vileplume's flower and petal marks, and Zapdos's lightning balls. Those printed features must not become foil disks simply because they are bright.

## Authoring and corrections

`scripts/aquapolis/register-cosmos.py --propose` produces candidate-only data using local contrast and multiscale blob measurements, with print-edge rejection. `cosmos-proposals.json` preserves those proposals. Every foil window was inspected at enlarged native detail against its master, including frame edges, narrow subject gaps, faint background areas and partially clipped features. Candidate counts are not proof that every physical spot was identified.

`cosmos-corrections.json` records explicit per-card additions, removals and review notes. `--finalize` applies those corrections, removes satellites inside reviewed larger features and records the finished registration. Large disks have a continuous filled interior, never a collection of internal highlights or a hollow ring. A final native-pixel close-up pass refined several disk centers and the H8, H14 and H31 noncircular contours.

Examples in full-card pixels:

| Card | Reviewed feature |
| --- | --- |
| H1 Ampharos | White disk at (254,180), radius 14 |
| H6 Blissey | Lower-left blue disk at (142,377), radius 13 |
| H14 Kingdra | Left cyan disk at (97,150), radius 12, plus a separately traced diamond |
| H21 Scizor | Left disk at (185,287), radius 11.5 |
| H29 Umbreon | Upper disk at (273,122), radius 13.5; bottom clipped disk at (444,391.5), radius 12.5 |
| H31 Vileplume | One traced upper-left noncircular flash, with a separate upper-right fleck swirl |

Swirls are recorded as the observed curling arrangement of visible registered flecks. Gaps remain open; no hidden continuation or generic spiral is substituted. Filled polygons preserve the reviewed H8 lobed feature and H14/H29/H31 noncircular flashes. Motif brightness records a restrained scan-observed weight, not measured physical reflectance or depth.

Default regeneration reads the saved registration without running image detection. It reproduces all 32 PNG hashes exactly. The existing mask regeneration also preserves authored motif files. Runtime code loads completed PNGs; there is no runtime detection or whole-set GPU preload.

## Physical reference and live review

The exact English H29/H32 print was inspected in [seller photographs of Umbreon H29/H32 Aquapolis Holo + Swirl](https://www.ebay.com/itm/376761654449), gallery photos 4 and 5. The more oblique photograph reveals many separate blue, orange and green foil points while the subject remains printed. This is another physical copy, so its spot positions were not transferred to the master. The slab and diffuse glare limit optical comparisons. Browser captures preserve the source context under `docs/aquapolis-cosmos-review/physical-H29-photo-4.png` and `physical-H29-photo-5.png`. A previously inspected short sale video was a still image and supplies no angular evidence.

`scripts/aquapolis-holo-check.mjs` captures all 32 H cards and Base Set 2 Alakazam / Entei promo references under identical controls: Studio front, left and right; Strip grazing; Low key dark; Soft specular; and Moving light. The moving-light assertion compares successive rendered frames. All 34 WebGL cards passed, with no page or Aquapolis HTTP errors. A separate WebGPU run passed H1 and both references.

GPU field readback checks the motif's actual support and orientation against each PNG: zero missing or extra sampled motif texels, with the established field orientation. Coverage readback independently repeats the worker's OffscreenCanvas/ImageBitmap sampling and verifies `foil * (1 - protection)` exactly: zero mismatches and zero leaks through fully protected pixels on all 32 H cards. Emboss strength is zero. This verifies registration and composition; it does not measure physical foil intensity.

All 32 full-card front captures were individually reviewed. Whole-window overlay and motif-only pairs were reviewed separately, with additional close-ups for large disks and irregular shapes. Umbreon was also reviewed in grazing, dark, specular and moving-light captures against the two existing reference treatments. The disks retain their registered centers and filled hierarchy as illumination changes; the subject and attack print remain readable. The bright master highlights remain visible even when dynamic foil is subdued because the master is preserved.

Representative final captures and boundary/motif pairs are committed under `docs/aquapolis-cosmos-review/`. Full regenerated overlays, native window pairs, proposal inspection images and seven-state captures for every card remain under `artifacts/aquapolis/`. `docs/aquapolis-cosmos-review.json` saves the complete live reports and hashes of the committed evidence.

## Validation and remaining uncertainty

The production build and 11 targeted Aquapolis, Expedition and Base Set 2 tests pass. The asset audit verifies all 186 master hashes, all 32 unchanged SAM/window pairs, all 32 final motif hashes and the actual filled interiors of 42 large registered disks. The gallery still displays 337 Aquapolis prints with 16 resident slots in its 48-slot cache; nine representative viewers and four nine-card pack openings pass without errors.

Faint flecks can remain ambiguous with scan grain, particularly around H16's electrical artwork and H32's lightning. Occluded and glare-obscured spots cannot be recovered reliably from a flat master; partially clipped disk boundaries remain uncertain beyond the visible arc. The physical H29 photographs do not establish calibrated angular appearance for all 32 prints. This is reviewed visible-feature registration using established Cosmos optics, not a claim that every physical dot or copy-specific finish is exact. Crystal foil remains pending. Unrelated sets and Cosmos optics were not modified by this pass.
