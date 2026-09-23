# Card assets and optical reconstruction

## Tyranitar · Paldea Evolved 135/193

The unmodified 734 × 1021 front comes from [Pokémon TCG API's image service](https://images.pokemontcg.io/sv2/135_hires.png), with the [publisher's card entry](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/sv02/135/) confirming the identity. The official site's 245 × 342 image was inspected but replaced by the higher-resolution source. The existing official Pokémon reverse is reused.

This definition targets ordinary pack Mirage holo, not the reverse-holo or promotional Cosmos versions. The [physical Tyranitar photograph](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Mirage.jpg) informed the coverage. `foil.svg` exposes the artwork background, excluding the body, mouth, hand, crests and rules. `extended-foil.svg` adds the silver border for Mirage. `protection.png` follows copyright lettering instead of excluding a rectangular footer. Separate maps preserve the original front bytes. `create-tyranitar-maps.mjs` and `create-tyranitar-protection.py` reproduce the authored maps.

Masks and optical calibration remain estimates from static evidence. Exact physical-sheet geometry and moving multi-light agreement remain unverified. Choosing another available finish is a viewer material experiment.

## Lugia · Neo Genesis 9/111

The unmodified 600 × 825 first-edition scan is supplied by the [Pokémon TCG API image service](https://images.pokemontcg.io/neo1/9_hires.png). Metadata is cached from the API's [maintained data repository](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/neo1.json); the live API returned HTTP 500 during import. The [card entry](https://bulbapedia.bulbagarden.net/wiki/Lugia_(Neo_Genesis_9)) identifies the printing. Illustration by Hironobu Yoshida.

The shared reverse image comes from [The Pokémon Company's TCG site](https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg). Card artwork remains the property of its respective rights holders. These assets are local viewer references, not a print production package.

The scan contains strong baked foil illumination. `coverage.svg` follows the artwork window and excludes the illustrated subject. The material reconstructs a dark foil substrate within this mask while retaining the subject, border and printed text. This is an optical reconstruction, not recovered photographic albedo. A small retained scan contribution preserves grain. No generated replacement illustration is used.

The Cosmos model has heterogeneous discs, rosettes, angular points and a UV-fixed swirl, matching the structural categories in [Cosmos Holofoil](https://bulbapedia.bulbagarden.net/wiki/Cosmos_Holofoil_(TCG)). Its seed represents a sheet position rather than an exact copy of the photographed pattern. The model is `reference-pending`: moving references have been located, but not yet inspected to validate its angular response. The scan's limited resolution also constrains close-up sharpness.

[PokéBeach's physical comparison](https://www.pokebeach.com/2023/09/151-subtly-features-two-types-of-holofoil-energy-one-superior-to-the-other) identifies classic pixelated Cosmos and later smooth HD Cosmos as different sheets. The classic structure now breaks larger symbols into small optical cells; HD has a separate field and is not assigned to this Neo Genesis card. The article establishes the structural distinction; it does not validate our numerical diffraction response.

## Effect Veiler · SDWD-EN018 · user-supplied front

The front is now the exact user-supplied `codex-clipboard-0b495e64-fb13-418f-b0d9-6b8cfdb43ac5.png` (2000 × 2920), retained byte-for-byte. Its printed identifier is SDWD-EN018; it supersedes the earlier 500 × 730 RA01 scan while keeping the Effect Veiler showcase and its foil experiments.

Authored data maps approximate relief on the figure, hair, wings, artwork frame and attribute/level symbols. Metallic lettering and the security mark have independent masks. An extended mask permits cross-treatment inspection while protecting rules text; selecting classic Ultimate or Starlight on this asset is an experimental material comparison, not a claim about this printing's rarity. The supplied image's baked illumination remains a limitation; this is a user-selected real-card showcase, not a print-production reconstruction.

The active TCG reverse is the user-supplied `Back-EN.png` (927 × 1353), copied byte-for-byte to `public/cards/yugioh/back-en.png`. Its printed TCG logo and physical border are used as provided; no external attribution or image reconstruction is asserted for this local asset. The prior 1098 × 1600 reference remains only as an unused legacy cache.

Additional static structure references inspected: [classic Ultimate specimen](https://ycg.chakra42.net/images/guide-to-card-rarity/yugioh-ultimate-rare-monster.jpg) (A-Team: Trap Disposal Unit, RDS-EN033), and [Starlight specimen](https://ycg.chakra42.net/images/guide-to-card-rarity/yugioh-starlight-rare-monster.jpg) (Yata-Garasu, BLCR-EN098). The latter shows dense, broken horizontal/vertical cuts and protected rules text. These establish visible structure, not moving optical validation. A [475 × 700 Yata-Garasu scan](https://www.camarillahobbies.com/yata-garasu-blcr-en098-starlight-rare) was also inspected; its strong baked foil currently makes it unsuitable as an unlit print texture.

## Charizard · Base Set 4/102

The visible front uses TCGdex's Base Set Charizard image (`https://assets.tcgdex.net/en/base/base1/4/high.png`), with identity confirmed by the [TCGdex card record](https://api.tcgdex.net/v2/en/cards/base1-4). The visible print is 4/102 with the first-edition mark and illustration by Mitsuhiro Arita. It is presented with the official Pokémon reverse.

The background substrate is reconstructed beneath the masked foil, retaining the printed body, wings, mouth, tail and its yellow flame. The blue-edged breath shape retains a larger part of the original tint while remaining reflective. The user's reference establishes that this shape belongs in the holo background. The temporary request to remove its boundary was explicitly retracted. The original scan is not altered; source illumination remains partly visible in retained translucent areas.

The separate Galaxy-Star field reconstructs sparse pointed stars, pinpoints and fine angular sheet features. Its seed is a sheet realization rather than the exact photographed star placement. The static scan and user reference establish shape and placement categories only; moving and multi-light physical comparison remains outstanding.

## Additional pending references

Next Pokémon mechanism: Tinsel's horizontal ribbons, followed by the diagonal Sheen family. [PSA's collecting guide](https://www.psacard.com/info/tcg/pokemon-basics-guide) distinguishes those structures from star and circle sheets. A [PSA-certified Reshiram 26/114 specimen](https://www.psacard.com/cert/149630862/psa) provides a physical Black & White reference for further inspection. This reference has not been added as a showcase card, and a static image cannot establish its full angular response.

The linked 380 × 638 slab image is cached and inspected at `artifacts/references/pokemon-tinsel/psa-reshiram-26.jpg`. It shows broad horizontal light/dark foil bands with fine lateral streaks beneath the printed Reshiram. The geometric steps in the artwork are printed scene detail, not evidence that every Tinsel sheet contains a circuit pattern. It is a structural reference only; retain the character's original background geometry if a matching showcase is added later.

The user's subsequent 1608 × 2229 Tranquill photograph is now the main Tinsel appearance target: `C:/Users/jpall/AppData/Local/Temp/codex-clipboard-49873c72-4ef1-4421-bf5b-38851aa2e8dc.png`. It shows thin horizontal silver strands of unequal intensity, with longer broken spectral flashes. The image establishes the requested visual appearance; no claim about its manufacturing provenance or rarity is inferred. This image is a reference, not an instruction to add Tranquill as a card.

Candidate moving Cosmos references: [Lugia swirl](https://www.reddit.com/r/pkmntcgcollections/comments/qbnb27/) and [holo bleed example](https://www.reddit.com/r/u_AdPrevious2668/comments/1c13fgr/). The second is an atypical bleed specimen and must not define normal coverage.

Yu-Gi-Oh! reference baseline: [Konami's rarity descriptions](https://www.yugioh-card.com/en/about/new-to-ygo/) distinguish artwork foil, foil names, emboss, whole-card patterns, and Ghost art. The [YGOPRODeck API guide](https://ygoprodeck.com/api-guide/) requires local image caching. Its image IDs do not establish a specific set/rarity printing; such mappings require separate verification before a card enters this viewer.

## Yu-Gi-Oh! assets inspected, not integrated

- The YGOPRODeck default images for Polymerization, Blue-Eyes White Dragon and Jinzo explicitly contain a replica disclaimer and no set code. They remain cached research candidates, not images of LOB/SDK/PSV printings.
- [Face to Face's PSV-000 stock image](https://facetofacegames.com/products/jinzo-psv-000-secret-rare-unlimited) has modern effect wording that differs from the two physical specimens inspected below. It is useful for studying the illustrated subject but is not accepted as a matching early-print card front.
- [Yu-Gi-Wang's Polymerization LOB-059](https://yu-gi-wang.nl/yu-gi-oh-single-cards/polymerization-lob-059-super) has a visible matching code and old Magic Card layout; its 261 × 384 image is too small for a premium showcase.
- Two physical Jinzo photographs are cached under `artifacts/references/ygo-psv-000`: [Unlimited specimen](https://www.ebay.com/itm/386920664165), [First Edition specimen](https://www.ebay.com/itm/377053991375). Their diagonal foil chips form coherent spectral bands, their silver/rainbow names have a different finish, and coverage varies over the inked subject. These are static empirical references, not proof of the shader's motion response. Listing descriptions are not treated as authoritative rarity evidence.
- A low-resolution SDK-001 Blue-Eyes image is cached from [TCG Collector NZ](https://tcgcollectornz.com/products/blue-eyes-white-dragon-sdk-001-ultra-rare). Higher-quality matching front and back assets remain to be obtained. Protected retailer pages were left alone after access challenges.
# User-selected Yu-Gi-Oh! fronts — 2026-09-14

I:P Masquerena uses the exact attached `codex-clipboard-ab4d5092-52a1-46f9-bb3b-2181f2e3d6e9.png` (500 × 733). The installed `public/cards/ip-masquerena/front.png` matches SHA-256 `9178033D04B67F1E41A8AAF87B45BF219FC1064DE42C2BFAB5348569655C2A79`. It shows LAVD-EN033; its Starlight default is a viewer treatment. The previously researched CHIM-EN049 scan is not the selected front. No artwork was generated or redrawn.

Blue-Eyes now uses the exact user-selected `codex-clipboard-465e6b33-4f12-4ad7-9331-0cb6326a40d8.png` (1854 × 2700), SHA-256 `682C4953FC12E038F205DF7ED67F3A79A77625BC02D144E4E40C67F602FD3B42`. This supersedes the earlier small `s-l960.jpg` selection. The new foil reference is `codex-clipboard-8e725b5f-2d75-46eb-9668-7dc9e333ade0.png`, showing SDK-001: fine continuous foil grain, gold lettering and reflective eye/teeth/claws. The source front remains unchanged, including its own printed identifier; no claim is made that it is the same printing as the reference. Registered optical maps protect white/cyan dragon ink and expose selected small details. The user accepted the resulting appearance and requested more Yu-Gi-Oh! holos. Preserve the accepted values in CardDefinition and the map scripts.

The TCG reverse for both is the existing user-supplied `public/cards/yugioh/back-en.png`. The map-generation scripts retain source rasters byte-for-byte and only author optical data.

References for the next Yu-Gi-Oh! families: [Konami Rarity Collection](https://www.yugioh-card.com/en/products/ra01/) distinguishes the Prismatic Collector technology; [Konami Rarity Collection II](https://www.yugioh-card.com/eu/product/25th-anniversary-rarity-collection-ii/) identifies the Quarter Century watermark and Prismatic Ultimate varnish. [TCGplayer's own rarity guide](https://seller.tcgplayer.com/blog/articles/understanding-yu-gi-oh-rarities/) describes the differently oriented engraved Collector structure, historical Platinum coverage and patterned parallel layers. These descriptions guide further visual reference collection; they do not establish that the remaining families are implemented.

The [official Prismatic Collector macro comparison](https://x.com/YuGiOh_TCG/status/1793446796733075599), cached as `artifacts/references/ygo-collectors/konami-enemy-controller.jpg`, separates engraved artwork, border dazzle, colored-frame varnish and clustered pixel flashes. [Konami's Quarter Century announcement](https://www.konami.com/games/eu/en/topics/17524/) confirms gold names and the anniversary watermark. An inspected [Illusion of Chaos specimen](https://en.magi.camp/items/1423795256) shows the silver watermark within the rules area and crossed fine foil cuts; cached under `artifacts/references/ygo-quarter-century`. The [Garura Platinum Secret specimen](https://kawaiiisushi.com/products/yugioh-1x-garura-wings-of-resonant-life-ra02-platinum-secret-rare-1st-edition) shows diagonal chains of small cuts across artwork and frame, with protected subject/rules; cached under `artifacts/references/ygo-platinum`. These are structural references, not measured angular-response data.

The Quarter Century geometry uses Konami's original transparent [25th logo asset](https://www.yugioh-card.com/eu/wp-content/uploads/2023/07/25th-Logo_Layered.webp), published on the [Legendary Collection reveal page](https://www.yugioh-card.com/eu/legendary-collection-box-openings/). The unchanged source is cached in public/materials/ygo-25th.webp. The worker extracts neutral reflective glyph/outline coverage into the unused alpha channel of the existing image-hologram data map. It does not draw the red logo as printed ink. The independently reflected mark sits beneath luminance-protected rules text; its thickness and reflectance remain approximations.


Next parallel-family references: [Konami Battle Pack 3](https://www.yugioh-card.com/en/products/past_products/bp03/) explicitly distinguishes Epic Dawn Starfoil, War of the Giants Mosaic and Monster League Shatterfoil; it identifies Shatterfoil as the shattered-glass technology used in later Duel Terminal sets. [Konami's glossary](https://www.yugioh-card.com/en/about/glossary-of-yu-gi-oh-terms/) defines Parallel as foiling across the entire front. These layers need their own full-front print-protected coverage rather than reusing the artwork/frame-only mask. They are not implemented yet.


## Historical reverse showcases — 2026-09-15

- **Eevee, Legendary Collection 74/110 reverse**: unchanged 600 × 825 [PokemonTCG print image](https://images.pokemontcg.io/base6/74_hires.png), identity from [set metadata](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/base6.json). The source image is the nonfoil printing; its silver outer border, body substrate and fireworks finish are reconstructed separately. The image is not represented as a reverse-holo scan. Artwork frame and gold caption remain printed. Black text, energy medallions, HP and the outlined set mark use independent coverage. `scripts/create-reverse-maps.py` regenerates the maps without modifying the source.
- **Charizard, Expedition 40/165 reverse**: unchanged 600 × 825 [PokemonTCG print image](https://images.pokemontcg.io/ecard1/40_hires.png), identity from [set metadata](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/ecard1.json). This also uses a nonfoil print as its artwork basis. Explicit reverse masks select the red body/name areas while preserving the yellow e-reader rails, picture, evolution badge, ribbons and symbols. Coverage is estimated from physical photographs; angular matching remains pending.

Physical specimen evidence is recorded in REFERENCES.md. Both additions remain reference-pending. Cross-applying other available profiles is a treatment experiment, not a claim of additional physical printings.
