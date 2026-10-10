# Sword & Shield integration

The completed local TCGL extraction registers **3,820 card identities / 5,853
printings** across 25 tables: all 17 expansions/special sets from Sword & Shield
through Crown Zenith, four Trainer Galleries, Galarian Gallery, Classic Collection,
Black Star Promos and alternate product printings. Shining Fates includes all 122
Shiny Vault cards in its catalog. Ordinary, reverse and holo printings retain their
own fronts and maps. No shader/profile implementation was changed in this pass.

`public/cards/pokemon/tcgl-swsh/printing-index.json` maps every extraction ID to its
application identity. `checklist-audit.json` reconciles the numbered cards against
independently retrieved TCGdex lists. Main sets and numbered subsets match fully.
The extracted promo table has 301 of 307 listed promos: **SWSH074, SWSH075,
SWSH177, SWSH303, SWSH304 and SWSH305** are absent. The 156 alternate entries
retain their independent source identities and are excluded from retail packs.

## Assets and existing materials

Sources are preserved under `research/tcgl/<TCGL-id>/`, with hashes, original
dimensions, material manifest and exact long-form printing identity in evidence.
Unity's verified normalized rectangular domain is `[145/1024,0,878/1024,1]`;
fronts, foil channels and etches use the same domain without a vertical flip.
Etches use the existing offline inverted-mean-RGB Scharr converter, gain 1.03,
OpenGL +Y, opaque RGB PNG at 1800×2475, with protection after differentiation.
No runtime conversion or fabricated geometry is introduced.

| Printing | Existing profile |
|---|---|
| Nonfoil | `print-only` |
| Energy-symbol reverse | `swsh-reverse-energy` |
| Amazing Rare | `swsh-amazing` |
| Radiant Rare | `swsh-radiant` |
| Shiny silver | `swsh-shiny-silver` |
| Textured V/VMAX/VSTAR, trainers and rainbow cards | `swsh-textured` |
| Gold and black/gold etched cards | `gold-etched` |
| Standard vertical holo | `pokemon-vertical-line` |
| Celebrations regular silver | `swsh-celebrations-silver` |
| Classic Collection | `swsh-celebrations-classic` |
| Smooth character gallery rainbow | `sv_tcgl_illustration_holo` |
| Product Cosmos | `svp-cosmos`, user-approved shared promo sheet |
| Product cracked ice | `pokemon-cracked-ice` |

The ten material proof printings retain their previously reviewed map URLs and
existing calibrated profiles. All other printings use their own source plates and
etches. Source-family UV checks and automated file checks do not establish
individual physical groove depth. Conservative whiteplate protection may omit
Classic body frosting; those cards remain marked provisional. All 148 product
Cosmos printings (84 Black Star Promos and 64 alternate printings) now use the
existing shared `svp-cosmos` treatment, explicitly approved by the user. Each
printing retains its exact TCGL front, foil coverage, protection and roughness;
empty motif maps no longer suppress the sheet. Placement is shared, not an
exact physical-copy match. Vintage registered Cosmos cards and existing SVP
optics are unchanged. `cosmos-completion.json` records every printing and hashes
of its preserved maps. `scripts/tcgl/complete_swsh_cosmos.py` reapplies this
choice to the current catalog; the importer also preserves it on regeneration.
SWSH296's stamped optics are unsupported and deferred. The existing
cracked-ice profile remains reference-pending. None of these limitations is hidden
by a new shader or random motif.

Fronts are content-addressed; identical map files share canonical URLs for the
existing CPU/GPU caches. Full-resolution output hashes and PNG verification are
recorded in `asset-validation.json`. The gallery still loads textures on demand;
pack selection uses the existing preparation path and does not preload a set.

## Boosters

All 17 parent sets have recipes and sourced English wrapper artwork (61 designs).
Common/uncommon slots are 5/3, followed by reverse/replacement and rare. Champion's
Path and Pokémon GO have guaranteed holo-or-better rare slots. Shining Fates
retains nonholo rares; its Shiny Vault and Amazing cards replace the reverse slot.
Vivid Voltage Amazing cards replace reverse. Trainer Galleries, Radiant cards in
Astral/Lost/Silver/GO and Crown Zenith Galarian Gallery use replacement slots.
Crown Zenith Radiants and numbered textured Energies use the rare position.
Celebrations has four foils, no Energy, and Classic replaces the third position.
Subsets and product promos have no fabricated standalone booster.

Ordinary pack Basic Energy fronts are absent from the extracted tables and from
TCGdex's ordinary Energy catalog. The 16 matching unnumbered fronts are preserved
from Bulbagarden Archives: `*EnergySwordShield.jpg` (2020) through Fusion Strike,
and `*EnergyBrilliantStars.jpg` (2022) from Brilliant Stars through Crown Zenith.
`scripts/tcgl/fetch_swsh_energy.py` preserves original JPEGs under
`research/tcgl/swsh-pack-energy/` and decodes them to RGB PNG without cropping,
resizing, flipping or offsets. `public/cards/pokemon/swsh-energy/sources.json`
records source URLs, original dimensions and input/output SHA-256 hashes.
All 16 fronts were visually reviewed in `research/tcgl/swsh-pack-energy/review.png`.
Recipes version 2 render ten expansion cards plus one nonfoil basic Energy,
uniformly selected from the eight types. Celebrations still renders four cards
without Energy. Existing expansion card assets and materials are unchanged.
Champion's Path reverse Energy, Crown Zenith unnumbered foil Energy and GO's
peelable Ditto overlay variants are likewise not available as distinct extracted
assets. They are not approximated. Physical code cards and VSTAR markers are not
rendered game cards. This prevents claiming complete physical pack replication.

Pull frequencies are estimates, not manufacturer odds or factory print-sheet
collation. Pokecompare's per-set tables credit TCGplayer; retained numeric inputs
are in `SwshRecipes.ts`. Full/alternate art are combined into their actual TCGL
rarity pool, with uniform cards inside that pool. Unmeasured holo/nonholo residuals
use uniform eligible cards. Missing marginal evidence (notably Fusion Strike and
Pokémon GO), some Amazing/Radiant rates and Crown Zenith Energy rates use explicit
uniform-pool approximations and are labeled provisional in the interface. Gallery
rarities are grouped where finer sample rates are unavailable. Independent slots,
uniform eligible cards and no common/uncommon duplicates are simulation
assumptions; exact rare-card odds and box guarantees are not asserted.

Sources:

- [English booster composition](https://bulbapedia.bulbagarden.net/wiki/Booster_pack_(TCG))
- [Official Celebrations four-card product](https://www.pokemon.com/us/pokemon-tcg/product-gallery/celebrations-ultra-premium-collection)
- [Shining Fates original tracked sample](https://www.reddit.com/r/PokemonTCG/comments/ln53pr/compiling_shining_fates_pull_data_and_results/), 502 packs; rounded percentages normalized.
- [Celebrations original 5,000-pack sample](https://www.reddit.com/r/PokemonTCG/comments/qrm5cp/)
- [Per-set reported rates](https://pokecompare.com/pull-rates), individually linked in each recipe; secondary transcription credited to TCGplayer, not independently authenticated factory probabilities.
- [Official Shining Fates checklist](https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/swsh45_web_cardlist_en.pdf)
- [Official Crown Zenith checklist](https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/swsh125_web_cardlist_en.pdf)
- [TCGdex English catalog](https://api.tcgdex.net/v2/en/series/swsh), cached under `research/tcgl/swsh-checklists`.
- [Wrapper source archive](https://pokesymbols.com/tcg/booster-pack-art), source URLs, crops and hashes in `public/packs/pokemon/swsh-wrapper-sources.json`.

Validation: `tests/swsh-integration.test.ts` checks all 5,853 printing identities,
all referenced local assets, existing profile identifiers, set/booster access,
8,500 seeded packs and every forced outcome branch. PNG verification and output
hashes cover every referenced image; live review captures use existing lighting
and pose controls. Neither automated tests nor sample renders imply that every
printing has received individual physical-reference calibration.
