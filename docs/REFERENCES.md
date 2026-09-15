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

## Foil research

A flat card scan establishes print layout, not angular foil behavior. Each established optical family needs separately documented moving/reference evidence before its quality status is accepted.

- [Konami rarity guide](https://www.yugioh-card.com/en/about/new-to-ygo/): authoritative coverage/name/emboss distinctions for the principal Yu-Gi-Oh! families.
- [Konami 25th Anniversary Rarity Collection](https://www.yugioh-card.com/en/products/ra01/): introduced international Prismatic Collector's and Prismatic Ultimate treatments; those require separate material development.
- [PokéBeach's comparison of two Cosmos sheets](https://www.pokebeach.com/2023/09/151-subtly-features-two-types-of-holofoil-energy-one-superior-to-the-other): direct inspection of classic pixelated and HD smooth Cosmos. This revealed an additional material family rather than a mere color variant.
- [Bulbapedia holofoil inventory](https://bulbapedia.bulbagarden.net/wiki/Holofoil) and [Cosmos entry](https://bulbapedia.bulbagarden.net/wiki/Cosmos_Holofoil_(TCG)): taxonomy leads and printing associations, to be checked against physical specimens and moving footage.
- Two inspected physical Jinzo photographs and their provenance are recorded in CARD-SOURCES.md. They informed the shape and alignment of Secret foil cuts; dynamic response remains unverified.

Renderer implementation signatures were checked against the installed r186 source. In that version `normalView` is the shading normal; the old `transformedNormalView` name is deprecated. The custom optical lighting therefore uses the current accessor and incorporates embossed/facet normals.
