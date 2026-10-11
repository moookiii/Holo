# Pokémon metadata and finish tags

The October 10, 2026 metadata pass uses an English TCGdex GraphQL snapshot of
23,736 cards. `pokemon-metadata-audit.json` records the query source, snapshot
hash, exact identity exceptions, archive corrections and per-set tag coverage.
Refresh with `node --experimental-strip-types scripts/pokemon-metadata.mjs`;
use `--cached` to regenerate from the preserved local research snapshot.

125 older gallery entries now carry rarity, Pokémon/Trainer/Energy category,
set identity and the represented print variant. 32 archive labels were attached
to the wrong names or numbers. Their existing image-source records establish
the actual identities; sampled images confirm the mismatch. For example, the
asset named `gloom.png` is Jungle Exeggutor 35/64 and `geodude.png` is Fossil
Golbat 34/62. Stable IDs and front images remain intact, while labels and metadata
match those images.

Ancient Mew has no numbered English TCGdex identity. It uses its existing exact
unnumbered promo catalog, rather than borrowing numbered Mew metadata. TCGdex
incorrectly flags the authored Umbreon GX 154/149 printing as nonfoil in this
snapshot. Its exact TCGL etched printing remains holo; the discrepancy is
recorded rather than changing the physical printing to match aggregate flags.

Finish filters use consistent physical-source labels: Cosmos, Galaxy Star,
Confetti, Cracked Ice, Sun Pillar, Rainbow, etched, gold etched and other registered
finishes. Exact printing foil metadata takes precedence over provisional shader
names. Print variants remain separately selectable. Older authored materials
provide finish labels when source foil metadata is absent. A finish tag describes
the represented printing and is not a claim that its optical reconstruction is
finished. Existing deferred surfaces remain deferred. The eight shared SVE Basic
Energy records now expose TCGdex's `Energy` category and `Normal` Energy subtype.

The live TCGdex adapter also preserves types, stage, suffix and Trainer subtype,
and handles absent/`None` rarity as `Unmarked` without inferring rarity from foil.
Local catalog rarities and variant eligibility remain printing-specific; the
pass does not change pack pools or odds, materials, masks, normals or foil placement.

Validation: metadata/filter tests and TypeScript compilation pass. Production
bundling passes with public-asset copying disabled. The live Pokémon finish
picker and Jungle/Uncommon/Non-holo intersection were checked in Edge with no
page errors. The broader Pokémon suite has nine failures, reproduced with the
pre-change source, involving existing asset checks, recipes and adapter behavior.
