# Remaining Scarlet & Violet TCGL products

Added the seven products missing from Holo's local TCGL catalog. Previously imported sets, their fronts, masks, materials and surfaces remain unchanged. The catalog and gallery use release dates for chronological set ordering. No shader or material-profile implementation was added or edited.

| Product | Cards/entries | Exact printings | Foil printings | Etches |
| --- | ---: | ---: | ---: | ---: |
| Paldean Fates | 245 | 326 | 261 | 154 |
| Shrouded Fable | 99 | 154 | 106 | 24 |
| White Flare | 173 | 405 | 335 | 17 |
| Black Bolt | 172 | 403 | 333 | 17 |
| SVP Black Star Promos | 216 | 216 | 201 | 32 |
| Alternate printings | 237 | 237 | 222 | 13 |
| Scarlet & Violet Energy | 48 | 48 | 24 | 0 |
| **Total** | **1,190** | **1,789** | **1,482** | **257** |

Promo/alternate/Energy entries retain distinct TCGL card IDs, including multiple physical printings with the same printed collector number. Expansion variants remain grouped under their numbered card. Each variant selects its own supplied TCGL front; the original front bytes are preserved.

## Sources and maps

All imports use the exact English processed TCGL export `v0.1.9.13`, including `sv4-5`, `sv6-5`, `rsv10-5`, `zsv10-5`, `svbsp`, `svalt` and `sve`. White Flare and Black Bolt are under the `rsv` and `zsv` keys; they do not require an alternate provider. Source URLs come directly from `images.tcgl.png`. Original exports and source assets are retained under `research/tcgl/<set-id>-set/`; per-card original sources and identity records are also retained under `research/tcgl/<card-id>/`.

Every foil printing's public evidence JSON records its exact export entry, source URL, TCGL card ID, long-form variant ID, source dimensions/hashes, front hash, transformations, converted map dimensions/hashes, material reuse and review limitations. Fronts and etches are 733×1024. Foils are generally 367×512; the audit records the one 733×1024 foil separately.

Etches use the mandatory Sylveon/Espeon conversion: inverted mean RGB luminance, full-domain bilinear resize to 1800×2475, unblurred OpenCV Scharr CV_32F derivatives with scale 1/32, gain 1.03, protection applied to XY slopes after differentiation, normalized OpenGL +Y opaque RGB PNG output, alpha flattened to (128,128,255). No active height map, runtime normal generation, extra relief, synthetic grooves or noise is used. The existing `prismatic_sir_texture` profile receives `tcglEtchedFinish`, including normal scale 1, emboss 0, absolute card-derived roughness and the restrained single authored-normal response. This also applies to the three newly added etched ACE SPEC cards; the existing 24 ACE SPEC registrations are untouched.

TCGL foil masks supply continuous grayscale coverage with the encoded black floor removed. Protection/body separation uses the existing converter's TCGL-map estimates, never printed-art brightness. Roughness follows `(0.30 + 0.105 * body) * (1-secondary) + 0.27 * secondary`; no secondary region is invented. Separate masks remain PNGs. No existing asset is replaced.

Smooth cards reuse the current regular holo, reverse, Double Rare/SUN_PILLAR, Tinsel and Cracked Ice implementations. Southern Cross Double Rares reuse the existing cast-and-cure star response. The three Paradise Resort Worlds logo masks reuse the existing localized gold metallic-ink material, with zero primary foil coverage.

## Deferred effects: one shader family and one TCGL asset dependency

| Missing family | Exact affected printings | Current behavior |
| --- | ---: | --- |
| TCGL Cast-and-Cure Poké Ball / Master Ball pattern assets | 160 Poké Ball + 144 Master Ball | Source acquisition pending, not an established new-shader requirement. Exact coverage and front are imported; the shared TCGL optical pattern assets must also come from TCGL. Existing smooth material is a temporary fallback. No symbol geometry is synthesized. |
| Black/White Rare | 4 | Exact TCGL etches and coverage with the required shared etched finish. A dedicated ink/foil angular response remains unimplemented. |

Follow-up source check: Malie's public resource page links processed card exports and raw card databases, but no shared material/texture archive. The raw database index contains 1,690 card databases and no foil/material/texture/shader asset entries. Snivy's exact raw entry identifies `CastAndCure_SVPokeBall` in `longFormID`, with `Foil Effect: FlatSilver` and `Foil Mask: Reverse`; it contains no texture URL or material reference. Its exported foil PNG was inspected separately and contains coverage, without ball symbols. No TCGL installation was found in the local uninstall registry or standard application/cache folders checked. This establishes a gap in the available exports, not absence from the TCGL client. A client bundle or extracted TCGL asset source is needed to continue. Source references: https://malie.io/static/ and https://cdn.malie.io/file/malie-io/tcgl/databases/index.json.

**Cosmos placement is a separate asset task, not a new shader:** 193 promo/alternate/Energy printings reuse `pokemon-base-set-2-cosmos` with empty 1200×1650 motif PNGs. TCGL coverage does not establish physical-copy dot placement. They are explicitly marked pending; no random dots or relief are added. All affected identities are enumerated in [the audit](../public/cards/pokemon/tcgl-sv/additions-audit.json).

The imported products are available for individual browsing/gallery rendering. Pack recipes, pull rates and wrapper art were not fabricated; these products remain browse-only. My First Battle is not in the supplied TCGL export and was not substituted from another image provider.

## Verification and regeneration

`fetch_sv_additions.py` preserves exact entries and source bytes; `review_sv_sets.py` builds paired front/foil/etch/overlay sheets. All 27 source-family sheets were inspected before conversion. They establish upright full-card registration with no crop, flip or offset in the sampled families. Individual high-zoom protection checks and angled physical-card calibration remain pending outside the reviewed samples; contact sheets are not evidence that every card is physically calibrated.

`convert_sv_additions.py` converts reviewed additions, preserves exact per-print fronts and emits separately typed surface registries to stay below TypeScript's object-literal union limit. Use `--register-only` to rebuild registration without recomputing PNGs, or `--sets <ids>` / `--numbers <numbers>` for a scoped rebuild.

`audit_sv_additions.py` checks every original-source/front/output SHA-256 hash, every PNG's dimensions, all 257 normals' format and fully protected pixels, absence of active height PNGs, and all 193 empty Cosmos motifs. The public audit lists counts, exact export URLs and every pending printing. Catalog integration tests verify all 1,789 variants, their exact front selection, map/evidence paths and required normal settings. Existing SV surface records were compared by card/variant and had zero changes.

The production build and seven focused SV/ACE/gold tests pass. The final full suite has 292 passing tests and 28 failures; a clean pre-change snapshot has 290 passing tests and the same 28 failure titles. There are no new failures. The ACE assertion distinguishes the untouched 24 existing registrations from the three new mandatory etched-reference cards.

Live review captures are stored under `artifacts/sv-tcgl/additions-live/`. Sample review covers representative etched, smooth, reverse, promo, Energy and pending finishes alongside Sylveon 156 and Espeon 155 using matching front, grazing, tilted, dark, strong-reflection and moving-light controls. This verifies sampled rendering/registration, not measured groove depth or a completed physical review of all 1,190 entries.

The 16-card review contains 112 ready-gated 1280×720 screenshots. Four contact sheets were inspected for navigation, with full saved Mew, Kingdra, Reshiram and Worlds promo frames inspected separately. Sampled fronts remain upright and registered; the Worlds logo changes reflection locally, while etched cards retain subdued line response at grazing angles. The ball-symbol and Cosmos placement gaps remain visible limitations. Strong frontal highlights can wash out pale artwork (especially White Rare); this is not a calibrated physical match. At this capture size the rendered card is approximately 250×350 pixels, so fine glyph protection and narrow-boundary inspection are still pending. No browser warnings or errors were recorded during the sample run.
