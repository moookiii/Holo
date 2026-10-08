# SVP Cosmos

The `svp-cosmos` profile uses the existing Cosmos manufacturing field with a dedicated, restrained silver backing, broad angular response and small flashes. It is assigned to all 193 imported Cosmos printings: 51 SVP promos, 134 alternate printings and eight Energy printings. Exact TCGL fronts, foil coverage and protection PNGs remain unchanged. Empty placement maps are no longer active. Shared placement is explicitly approved by the user for these clean fronts; vintage registered Cosmos cards remain unchanged.

This is an optical approximation, not a measurement of an individual physical copy. Modern promo copies can have different Cosmos sheets and spot positions. No etched normals or height maps were added or revised.

Validation: all three SV additions regression tests, TypeScript checking and the source/output hash audit passed. Cleffa 095 was reviewed in the live lab under neutral and strong-side lighting, face-on and diagonal, plus a moving-strip light. No browser errors were reported. Review captures are in `artifacts/svp-cosmos/`. This is a sampled review, not a claim that all 193 cards were individually compared with physical copies.

## SVP source gaps

Cleffa 095 already exists as `svp-95:holo`; it now uses SVP Cosmos.

Comparison with the [TCGdex SVP checklist](https://api.tcgdex.net/v2/en/sets/svp) found these entries absent from the current 216-entry [TCGL export](https://cdn.malie.io/file/malie-io/tcgl/export/v0.1.9.13/svbsp.en-US.json) and the raw SVBSP database checked on 2026-10-08:

| Number | Card |
| --- | --- |
| 085 | Pikachu with Grey Felt Hat |
| 102 | Oddish |
| 190 | Pikachu |
| 191 | Sprigatito |
| 192 | Fuecoco |
| 213 | Feraligatr |
| 214 | Pikachu |
| 215 | Toxtricity ex |
| 225 | Pikachu |
| 500 | Terapagos & Friends (oversized/special) |

Standard TCGL front URL probes for all ten returned HTTP 404. These cards have not been fabricated or replaced with other artwork. Their exact TCGL sources remain required before importing them; absence in the checked export does not prove they will never become available.

A follow-up name search of the current SVBSP and SVALT exports found no Grey Felt Hat / Van Gogh entry under an alternate TCGL identifier.
