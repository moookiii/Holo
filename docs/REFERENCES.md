# References and implementation evidence

## Current renderer API — checked 2026-09-13

- https://threejs.org/manual/en/webgpurenderer — async initialization, automatic WebGL 2 fallback, TSL architecture.
- https://threejs.org/manual/en/webgpu-postprocessing.html — RenderPipeline and pass node composition.
- https://threejs.org/docs/pages/MeshPhysicalNodeMaterial.html — physical substrate, clearcoat, anisotropy, custom lighting model.
- https://threejs.org/docs/pages/PhysicalLightingModel.html — direct-light extension point for reflective diffraction.
- https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language — node math, derivatives and local/world transforms.
- npm registry: three and @types/three 0.186.0; Vite 8.3.0; TypeScript 7.0.2.

The implementation will also inspect the installed r186 source for precise method signatures.

## Pokémon Fireworks, Crosshatch and ACE SPEC — 2026-09-15

These are material studies in the existing treatment picker, applied through the selected card's authored coverage. Applying Fireworks to Base Set Charizard does not claim that printing used Legendary Collection reverse foil. Complete historical reverse coverage needs its own matched card and mask.

- Fireworks: inspected seller photographs of [Legendary Collection Zapdos](https://www.ebay.com/itm/205579125241) and [Ninetales](https://www.ebay.com/itm/127416316749). The sheet has fragmented radial bursts, unequal small cuts, overlapping motifs, and silver alongside spectral reflection. Implemented as fixed polar cuts with local grating axes and independently inclined segments.
- Crosshatch: inspected the [Delibird League promo photograph](https://www.ebay.com/itm/256579464015). Fine diagonal cuts form larger crossing groups; this is distinct from a solid embossed diamond array. Implemented as fine interrupted crossed cuts sharing larger diagonal sheet inclinations, with both grating axes evaluated by the TSL lighting model.
- Modern ACE SPEC: inspected two [Prime Catcher](https://www.sportscardinvestor.com/cards/prime-catcher-pokemon/2025-scarlet-violet-prismatic-evolutions-holo-ace-spec-119-131) [photographs](https://www.ebay.com/itm/376277266148). Broad diamond bands cover much finer horizontal striations. [Pokémon's release announcement](https://press.pokemon.com/en-CA/MEDIA-ALERT-Pokemon-Trading-Card-Game-Scarlet-VioletTemporal-Forces-Ex) establishes the modern magenta design. Magenta stays in the printed card rather than tinting every card assigned this optical profile. This profile targets Scarlet & Violet ACE SPEC, not the older Black & White treatment.
- [PokéBeach's ACE SPEC footage page](https://www.pokebeach.com/2024/01/footage-of-new-ace-spec-holofoil-pattern-revealed) identifies a clip from the official Japanese Pokémon channel. The embedded clip could not be fetched; no moving-reference match is claimed.

The first visual pass revealed overly uniform Fireworks rays and rounded ACE SPEC reflections. The next passes broke up the burst cuts and replaced the ACE SPEC facet construction with a continuous inclination following distance to the crossed diamond bands. Before/after captures are in `artifacts/97-pokemon-first`, `artifacts/98-pokemon-refined`, and `artifacts/100-ace-diamond-refinement`; final backend and responsive checks are in `artifacts/101-pokemon-final`. The earlier development server stopped during the artifact-100 capture, producing connection errors; the server was restarted and the complete final check passed without errors. All three retain `reference-pending` status: still photographs establish structure, not a measured multi-light angular match.

## Directional Pokémon films — 2026-09-15

The [Pokécardex physical-card comparison](https://www.pokecardex.com/forums/viewtopic.php?t=48798) supplies directly inspected close photographs of [Sheen](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Sheen.jpg), [Water-Web](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/WaterWeb.jpg), [Line](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Ligne.jpg), and [Mirage](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Mirage.jpg). Cached evidence is in `artifacts/references/directional`. These establish visible structure, not measured angular response. The Sheen photograph has no sharp engraved grooves; Water-Web has broad curved reflections; Line has narrow separated vertical cuts; Mirage has finer horizontal texture and exposed silver borders.

The [Bulbapedia inventory](https://bulbapedia.bulbagarden.net/wiki/Holofoil) provides era and regional leads. These are community names. The implementation targets international XY Sheen, Sun & Moon Water-Web, Sword & Shield Line and Scarlet & Violet Mirage. Regional direction/coverage variants still need separate validation. The [publisher's Tyranitar entry](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/sv02/135/) verifies PAL 135/193; the inspected French physical card has the same illustration. Other treatments on this Tyranitar are experiments, not assertions of additional printings.

The first numerical reconstruction produced visibly corrugated smooth films and too many bands. `structure.reflectionCoupling` now separates aggregate metal reflection from diffractive microfacet inclination, defaulting to 1 for every existing profile. Smooth films use low coupling, fewer broader inclinations and no extra cut-silver lobe. This is a rendering approximation, not a recovered physical manufacturing specification. Artifacts 103–106 preserve the comparison. Artifact 109 records eight poses under four studio rigs after source-aligned mask refinement, with no renderer errors or warnings. No bloom is enabled in this pipeline.

Further families observed in the comparison include Acid Wash (directional patterned Energy foil), Speckle (fine points, distinct from coarse Confetti), and the prototype Disco sheet. These remain research leads and are not accepted profiles. The complete scope still requires moving physical-reference comparisons and additional matched printings.

## Faceted and particulate Pokémon films — 2026-09-15

Inspected physical-card photographs from the same [Pokécardex comparison](https://www.pokecardex.com/forums/viewtopic.php?t=48798): [Cracked Ice](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/CrackedIce.jpg), [Sequin](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Sequin.jpg), [Confetti](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Confetti.jpg), and [Speckle](https://www.pokecardex.com/uploads/news/Article/Collek2024/Holo/Speckles.jpg). Evidence is cached in `artifacts/references/particulate`. Cracked Ice has broad acute triangular facets; Sequin has faceted annular motifs; Confetti has connected blocky flakes; Speckle has much smaller isolated points. These photos do not establish moving angular agreement.

[Bulbapedia's inventory](https://bulbapedia.bulbagarden.net/wiki/Holofoil#Pixel) treats Pixel and Confetti as names for the same family. The picker therefore uses “Pixel / Confetti”, without inventing a duplicate hue preset. General Mills-style Sequin remains separate. Applying these studies to an existing showcase card does not imply that card had any of these physical printings.

## Foil research

A flat card scan establishes print layout, not angular foil behavior. Each established optical family needs separately documented moving/reference evidence before its quality status is accepted.

- [Konami rarity guide](https://www.yugioh-card.com/en/about/new-to-ygo/): authoritative coverage/name/emboss distinctions for the principal Yu-Gi-Oh! families.
- [Konami 25th Anniversary Rarity Collection](https://www.yugioh-card.com/en/products/ra01/): introduced international Prismatic Collector's and Prismatic Ultimate treatments; those require separate material development.
- [PokéBeach's comparison of two Cosmos sheets](https://www.pokebeach.com/2023/09/151-subtly-features-two-types-of-holofoil-energy-one-superior-to-the-other): direct inspection of classic pixelated and HD smooth Cosmos. This revealed an additional material family rather than a mere color variant.
- [Bulbapedia holofoil inventory](https://bulbapedia.bulbagarden.net/wiki/Holofoil) and [Cosmos entry](https://bulbapedia.bulbagarden.net/wiki/Cosmos_Holofoil_(TCG)): taxonomy leads and printing associations, to be checked against physical specimens and moving footage.
- Two inspected physical Jinzo photographs and their provenance are recorded in CARD-SOURCES.md. They informed the shape and alignment of Secret foil cuts; dynamic response remains unverified.

Renderer implementation signatures were checked against the installed r186 source. In that version `normalView` is the shading normal; the old `transformedNormalView` name is deprecated. The custom optical lighting therefore uses the current accessor and incorporates embossed/facet normals.

## Historical reverse coverage and optical studies — 2026-09-15

Inspected [Legendary Collection Eevee specimen](https://www.ebay.com/itm/358658668935) and [Expedition Charizard specimen](https://www.ebay.com/itm/266983168262) photographs, cached in `artifacts/references/reverse`. Eevee's front shows dense fragmented radial foil across the body and silver outer border, with a quiet gold picture frame, caption strip and printed energy symbols. The listing later redirects to a product page; the cached inspected front is `eevee-front.jpg`, from `https://i.ebayimg.com/thumbs/images/g/W-IAAeSw1XFqHHVG/s-l500.jpg`. `eevee-detail.webp` is a back-corner photograph and is not evidence for its front foil. Charizard's `charizard-detail.webp` shows the ordinary picture separated from a reflective red body and yellow e-reader rails. This supports different authored coverage, not a universal inverse-artwork mask.

The first Fireworks application to Eevee produced overly regular small white bursts. The separate Legendary reverse field uses fewer, larger radial fields with denser fine broken cuts, lower broad sheen and independently tilted fragments. E-reader reverse instead uses a near-planar shallow sheet with microstriae and no repeated macro motifs. The early Eevee paper-to-metal mix made outlined letters; subtracting the transmitted paper contribution restores black ink edges. The user's next correction removed oversized pale icon and description cutouts. These are rendering reconstructions guided by still photographs; no empirical moving or multi-light physical match is claimed.
