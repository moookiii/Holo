# Implemented but unfinished — October 12, 2026

**10 workstreams identified. Runtime audit finds 2,152 distinct printings with explicit provisional/deferred status or an empty active Cosmos map.** This is a bounded implementation tally, not a claim that every other printing is physically accurate. Counts are printings, not distinct Pokémon or independent engineering tasks.

The 2,152 comprise **2,128 deferred/provisional runtime definitions + 24 additional empty active Cosmos PNGs**. The latter do not carry deferred flags. Additional documented work below is outside that mechanical total. Do not sum every row: Cosmos overlaps the flagged BW/XY definitions, and material acceptance spans multiple rows.

| # | Workstream | Count / scope | Already implemented | Still unfinished |
|---|---|---|---|---|
| 1 | Sun & Moon reverse foil | **1,891 printings**: 1,873 reverse-energy and 18 Sheen bindings | Exact fronts/maps, catalog, packs and provisional rendering | Actual Sun & Moon reverse optical treatment and physical matching. The 27 Prism Stars are overridden to their implemented finish and excluded. |
| 2 | Cosmos placement | **63 printings**: BW 17; XY 22; SM 9; Neo Revelation 15 | Catalog/material plumbing, source coverage and protection | BW/XY are print-only deferred; SM/Neo have entirely black active motif PNGs. Author and review card-specific placement. Nonempty maps elsewhere still require physical review; this audit only detects missing placement. |
| 3 | 30th Anniversary finishes | **168 flagged printings**: 94 regular-holo bindings, 12 ex, 18 IR, 44 etched | All 199 definitions resolve; offline normals, ordinary material routing, RGB control transport and specialty shader branches exist | Anniversary-specific optics/region review remain provisional. Classic secondary coverage is missing; RGB controls are loaded but not interpreted by the optical evaluator. The 30 active Pikachu treatments and Classic 027 Amazing Rare are excluded from these flags; Pikachu angular calibration remains approximate. |
| 4 | SWSH Celebrations Classic | **25 printings** | Exact catalog, surfaces and dedicated Classic material | Physical finish calibration/limitations remain deferred in the resolver. |
| 5 | Stamped promos | **3 printings**: SWSH296, MEP028, MEP092 | Exact source fronts, catalog and selection | Supported stamp optics and exact-print review. MEP uses print-only; SWSH296 has a provisional silver finish. |
| 6 | BW promos without exact etch | **2 printings**: BW73 and BW74 | Exact digital fronts and explicit fallback | Exact physical etch source unavailable in TCGL references; remain print-only. Report the missing source rather than fabricate geometry. |
| 7 | McDonald's 2024 confetti | **7 holo printings** | Fifteen-card catalog and opening; photographed foil remains in fronts | Animated confetti finish. This count comes from availability metadata, outside the resolver total above. |
| 8 | Aquapolis Crystal finish and sources | **3 Crystals; 4 low-resolution b-print fronts** | Catalog, gallery/viewer, normal/reverse handling and opening | Crystal foil and verified insertion odds; Crystals are omitted from random packs. Four b fronts are only 200 pixels wide. These are distinct finish/source gaps, not seven missing shaders. |
| 9 | Material/reference acceptance | Cross-cutting: **116 of 120 registered profiles** have development/reference-pending metadata | Working material library: 70 development, 46 reference-pending, 4 curated | Exact-print multi-angle matching, contour/coverage refinement and device/motion acceptance where documented. Includes 4 Magic profiles, 13 Yu-Gi-Oh! profiles and original treatments. Status alone is not proof of a defect or missing implementation; utility profiles are included in this metadata count. |
| 10 | Favorites binder cold opening | One performance goal | Delivered first-page scheduling/linking improvements, focused validation and visual comparison | Requested 2× improvement is not achieved. Latest retained-code report measures 34.311 → 29.061 seconds (15.3%), with a 2.817-second longest opening frame. These are historical shared-machine measurements, not a fresh benchmark. |

## Exact mechanical totals

| Runtime group | Deferred/provisional printings |
|---|---:|
| Sun & Moon | 1,891 |
| 30th Anniversary | 168 |
| SWSH: 25 Classic + SWSH296 | 26 |
| XY: Cosmos | 22 |
| BW: 17 Cosmos + 2 missing etches | 19 |
| MEP stamped | 2 |
| **Flagged subtotal** | **2,128** |
| SM empty active Cosmos maps | 9 |
| Neo Revelation empty active Cosmos maps | 15 |
| **Distinct mechanically identified total** | **2,152** |

Empty SM maps: `smbsp-52`, `smbsp-194`, `smbsp-206`, `smbsp-223`, `smalt-101`, `smalt-117`, `smalt-135`, `smalt-188`, `smalt-191`.

Empty Neo Revelation maps: numbers 2–14, 65 and 66. Ampharos 1 now has a populated active map.

## Stale notes excluded

- Prismatic's runtime progress is **368/368 required surfaces registered, zero missing**. Earlier 15/268 and remaining-253 notes are obsolete. Registration completeness does not certify physical fidelity.
- BW Radiant Collection, Generations RC, Pokémon BREAK, Steam Siege split reverses, Evolutions standard holos and Prism Star have current resolver overrides. Their generated acquisition-era pending flags are not counted as unfinished implementation.
- Jungle and Expedition regular holos have completion records. Old availability strings are stale.
- `cosmos-unfinished-tally.md` reports 135 from an earlier asset state. The current resolver plus PNG audit finds **63**, including three fewer XY deferred records and substantially fewer empty SM/Neo maps. Its old checklist must not be treated as current.
- Approved shared-sheet SV/SWSH/MEP Cosmos bindings are excluded from missing-placement work. This does not claim exact physical-copy placement.
- Anniversary acquisition-only notes are superseded by current registrations and routing. The expansion is implemented; its finishes remain partly provisional.
- Architecture-only proposed YGO families and entirely unstarted designs are excluded from this implemented-but-unfinished tally.

## Evidence and reproduction

Run from the repository root:

```powershell
node --experimental-strip-types --loader ./scripts/test-ts-loader.mjs scripts/audit-unfinished.mjs
```

Requires Python with Pillow for actual bound PNG luminance inspection. Resolver failures or missing/unreadable PNGs fail the audit rather than silently reducing counts. It resolves current BW/XY/SM/SWSH/MEP overrides, checks anniversary definitions, inspects active Cosmos motif PNGs, and reads live Prismatic progress and profile metadata. All definitions inspected resolved without errors; all candidate motif files decoded.

Implementation evidence: `src/pokemon/{SvTcglSurfaces,XySurfaces,BwSurfaces,CelebrationSurfaces,PrismaticSurfaces}.ts`, `src/card/NeoRevelationCards.ts`, and `src/materials/profiles/index.ts`.

Documented gaps: `docs/30th-shader-audit.md`, `docs/swsh-integration.md`, `docs/mep-promos.md`, `docs/aquapolis.md`, `docs/binder-first-page-optimization.md`, `docs/FOIL-INVENTORY.md`, and `src/pokemon/availability.ts`. Older narrative inventory entries are used for acceptance scope only, not current registration counts.

No renderer appearance review, physical certification, new benchmark or full application test run was performed for this tally. No card assets, masks or materials were changed.
