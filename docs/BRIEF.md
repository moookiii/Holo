# /GOAL — AAA HOLOGRAPHIC CARD DISPLAY SYSTEM

Build an exceptionally polished, premium, browser-based 3D holographic trading-card display application.

This is intentionally a focused product.

It is not a card game.

It is not a collection-management application.

It is not a deck builder.

It is not a marketplace.

It is not a pack-opening simulator.

It is not a large UI application.

The card itself, its physical presentation, and especially the holographic foil rendering are the product.

The holographic rendering is the single highest priority of the entire project.

The finished experience should feel like a dedicated high-end digital product-photography studio built specifically to inspect extremely expensive holographic trading cards.

A user should be able to spend several minutes doing nothing except slowly tilting one card because the way the foil catches the light is satisfying enough to justify the entire application.

Do not settle for a "rainbow shader."

Do not settle for a generic iridescent material.

Do not settle for scrolling rainbow noise.

Do not settle for one foil shader with different masks.

Do not settle for a shader that only looks good from one carefully chosen camera angle.

Build an actual reusable holographic rendering system.

---

# 1. PRIORITY ORDER

When making implementation decisions, use this exact priority hierarchy:

1. Holographic foil visual quality.
2. Accuracy and distinctiveness of different foil technologies.
3. Card material realism.
4. Lighting and reflections.
5. Smooth physical card manipulation.
6. Sharpness and image quality.
7. Frame-rate and responsiveness.
8. Extensibility of the holographic profile system.
9. Minimal presentation UI.
10. Everything else.

If improving a secondary feature would compromise holographic quality, prioritize the holograms.

If additional engineering effort produces a clearly visible improvement to the foil, spend that effort.

If additional engineering complexity does not create a visible improvement, do not add it.

---

# 2. TARGET EXPERIENCE

Opening the application should immediately present one card in a dark, premium studio environment.

The card should occupy most of the useful viewport.

There should be no splash screen unless technically necessary.

There should be no large menu hiding the card.

The experience should immediately communicate:

"Pick this card up and tilt it under the light."

The user can:

* freely rotate the card around any axis;
* tilt it extremely slowly;
* spin it quickly;
* inspect it at grazing angles;
* inspect both front and rear surfaces;
* zoom toward and away from it;
* press `F` to flip it;
* select holographic treatments;
* compare different foil technologies;
* reset its orientation when desired.

The card should remain the unmistakable visual center of the product.

---

# 3. TECHNOLOGY

Use a modern browser-native 3D architecture.

Use:

* TypeScript
* Vite
* latest appropriate stable Three.js
* `three/webgpu`
* `WebGPURenderer`
* WebGPU as the preferred backend
* WebGL 2 fallback through the modern renderer architecture
* Three.js TSL
* node materials
* modern Three.js `RenderPipeline`
* modern Three.js WebGPU-compatible post-processing

Do not default back to the older WebGL-centric material architecture simply because it is familiar.

Do not build the primary holo system with:

* `ShaderMaterial`
* `RawShaderMaterial`
* `onBeforeCompile()`
* legacy `EffectComposer`

unless a verified technical limitation forces a separate compatibility path.

The primary material architecture should use the modern Three.js node/TSL system.

Use:

```text
three/webgpu
three/tsl
```

appropriately.

Use `renderer.setAnimationLoop()` or the currently recommended WebGPU-compatible render-loop architecture.

Use asynchronous renderer initialization correctly.

Use current APIs rather than copying outdated Three.js examples.

Do not pin the project to obsolete patterns merely because more old tutorials exist for them.

Before implementing a subsystem whose Three.js API may have changed, verify the current API.

---

# 4. NO FRAMEWORK BLOAT

Do not introduce React merely because this is a browser project.

The application has very little conventional UI.

Prefer a lightweight DOM/CSS presentation layer.

If a framework becomes genuinely useful later, it can be introduced deliberately.

Do not allow UI architecture to become more complicated than the renderer.

---

# 5. PRIMARY QUALITY BAR

The hologram must look excellent:

* viewed directly;
* tilted 5 degrees;
* tilted 15 degrees;
* tilted 30 degrees;
* tilted 60 degrees;
* near grazing incidence;
* upside down;
* from diagonal orientations;
* under strong light;
* under weak light;
* while stationary;
* while moving slowly;
* while spinning;
* when viewed close up;
* when viewed from normal presentation distance.

No profile is considered finished merely because one screenshot looks impressive.

A premium physical hologram is compelling because its appearance continuously changes.

The digital material must do the same.

---

# 6. FUNDAMENTAL HOLOGRAPHIC PRINCIPLE

Treat holographic foil as a layered optical system.

Do not model it as:

```text
baseColor + rainbowGradient
```

or:

```text
texture + fresnel
```

or:

```text
noise * hue
```

Instead, conceptually model the surface as:

```text
printed card
    +
optional metallic foil substrate
    +
microscopic directional foil structure
    +
macro foil pattern
    +
micro foil pattern
    +
emboss / texture structure
    +
surface laminate
    +
normal / roughness variation
    +
view/light dependent diffraction response
    +
sparse glints
    +
physical reflection
```

Each part should perform a different visual job.

---

# 7. THE HOLOGRAM MUST NOT BE EMISSIVE RAINBOW PAINT

The surface should generally become spectacular because it catches light.

It should not constantly glow.

At many angles:

* large areas should remain relatively calm;
* some highlights should remain nearly white/silver;
* some regions should produce saturated spectral color;
* small regions should flare brightly;
* some foil structures should temporarily disappear;
* other structures should become visible;
* embossed details should catch highlights independently;
* the laminate should create broader reflections above the foil.

The visual richness should come from angular change.

Do not solve weak holo rendering by simply increasing emissive intensity.

---

# 8. PHYSICALLY INSPIRED DIFFRACTION

Implement a physically inspired diffraction model rather than relying entirely on an artistic rainbow ramp.

It does not need to be a scientific optical simulator.

It does need to produce believable directional spectral behavior.

Represent or derive a local diffraction/grating direction for each relevant point on the foil.

Allow this direction to come from:

* constant tangent orientation;
* texture fields;
* procedural line fields;
* radial patterns;
* circular patterns;
* flow fields;
* Voronoi facet orientation;
* stamped foil shapes;
* artist-authored direction maps.

Evaluate the relationship between:

* surface normal;
* tangent;
* bitangent;
* view vector;
* incident light direction;
* half vector;
* local grating orientation;
* grating spacing;
* local foil phase.

Use that relationship to determine spectral response.

---

# 9. SPECTRAL COLOR

Do not simply calculate one scalar angle and convert it directly into HSV hue.

That produces the familiar cheap "oil slick shader" appearance.

Instead construct spectral color from multiple wavelength-like bands or an equivalent high-quality analytical approximation.

For example, conceptually evaluate several regions across the visible spectrum and determine how strongly each is reinforced at the current angular relationship.

Possible conceptual wavelengths include:

* violet
* blue
* cyan
* green
* yellow
* orange
* red

The implementation does not have to literally ray-trace wavelengths.

The result must nevertheless create:

* narrow colored bands;
* broad spectral sweeps;
* overlapping colors;
* nearly white peaks where many wavelengths combine;
* isolated saturated spectral highlights;
* color separation that shifts nonlinearly with orientation.

Different holo profiles must be able to alter:

* spectral bandwidth;
* spectral intensity;
* dispersion amount;
* grating spacing;
* angular sharpness;
* color purity;
* number of diffraction orders;
* highlight width.

---

# 10. MULTIPLE DIFFRACTION ORDERS

Where useful, simulate more than one diffraction response.

A premium foil can contain:

* dominant first-order rainbow;
* weaker secondary spectral response;
* white metallic reflection;
* very fine high-frequency glints.

Do not make every hologram a single giant rainbow.

Some should have only subtle color separation.

Others should explode into spectrum.

That difference is critical to making separate foil technologies believable.

---

# 11. LOCAL-SPACE STABILITY

All foil structure must feel attached to the physical card.

Patterns must not:

* swim across the card as the camera moves;
* remain glued to screen space;
* crawl due to unstable noise;
* change position simply because render resolution changes;
* flicker because procedural detail is under-sampled.

Anchor patterns primarily in:

* card UV space;
* object space;
* tangent space;

as appropriate.

View and light vectors should change the response of the pattern, not the physical location of the pattern.

---

# 12. ANTI-ALIASING OF MICROSTRUCTURE

Holographic microdetail can alias badly.

Handle this deliberately.

For high-frequency procedural patterns:

* use derivatives where supported;
* use `fwidth`-style analytical filtering where appropriate;
* vary detail by footprint;
* use proper mipmaps for textures;
* avoid one-pixel sparkle flicker;
* suppress subpixel patterns smoothly rather than allowing them to strobe.

At distance, microscopic foil should converge into a believable aggregate sheen.

Close up, individual structure can become visible.

This transition should be intentional.

---

# 13. MULTI-SCALE MATERIAL DETAIL

Every high-quality profile should consider at least three physical scales.

## MACRO SCALE

Large features visible across significant portions of the card.

Examples:

* broad rainbow sweeps;
* giant diffraction rays;
* large crystal facets;
* broad wave patterns;
* radial Fresnel structures;
* large foil stamps.

Macro structure creates the overall identity.

## MESO SCALE

Medium-sized visible patterning.

Examples:

* stars;
* circles;
* shards;
* grid cells;
* crosshatching;
* repeating symbols;
* contour lines;
* geometric engraving;
* foil swirls.

Meso structure makes the foil identifiable.

## MICRO SCALE

Very fine structure.

Examples:

* glitter;
* foil grain;
* microfacets;
* microprisms;
* tiny etched lines;
* extremely fine scratches;
* spark points;
* micro normal variation.

Microstructure creates the final premium surface quality.

Do not use the same motion or angular response for all three scales.

---

# 14. MICROFACET GLINT SYSTEM

Implement convincing sparse glints.

A glint should behave like a tiny reflective facet.

It should:

* become extremely bright near its ideal reflection angle;
* rapidly fall off;
* remain spatially fixed on the card;
* have deterministic placement;
* vary in size;
* vary in orientation;
* vary in intensity;
* optionally exhibit spectral splitting.

Avoid random frame-to-frame sparkle.

No television static.

No glitter particles floating above the surface.

The glint should appear to originate from microscopic structure embedded in the foil.

---

# 15. SPARKLE DENSITY

Profiles need independent control over sparkle.

Some materials should have:

* almost none;
* sparse large sparkles;
* dense fine glitter;
* frequent microscopic glitter;
* rare huge flare events;
* clustered sparkles;
* ordered sparkles;
* irregular sparkles.

Do not make every foil equally glittery.

---

# 16. FOIL ROUGHNESS

Foil should have a roughness model separate from the printed card stock.

Allow profiles to control:

* base foil roughness;
* highlight width;
* micro-roughness;
* roughness variation;
* embossed-region roughness;
* laminate roughness.

This allows a foil to range from:

* broad silky sheen;

to:

* extremely sharp mirror-like prismatic flashes.

---

# 17. LAMINATE LAYER

The card should have a thin clear top coating.

Approximate the optical behavior of a transparent laminate above the print/foil.

It should contribute:

* broad specular reflection;
* subtle Fresnel;
* smooth studio-light reflections;
* slight surface roughness;
* optional micro-scratches at extremely close range.

The laminate reflection must not erase the foil below it.

Think of the laminate as a broad surface reflection over a much more intricate underlying optical structure.

---

# 18. PRINTED INK VS FOIL

Printed ink, card stock, foil, metallic ink and clear coating must not all respond identically.

The artwork should retain:

* readable printed color;
* believable contrast;
* proper blacks;
* correct texture sharpness.

The hologram should appear underneath, through, around or in place of printed regions depending on the mask.

Do not recolor the entire artwork with the rainbow unless that profile explicitly represents a full-card rainbow treatment.

---

# 19. MASK SYSTEM

Support high-quality masks for controlling material coverage.

At minimum support:

* base artwork map;
* foil mask;
* secondary foil mask;
* tertiary foil mask if useful;
* roughness mask;
* metallic mask;
* laminate/gloss mask;
* normal map;
* emboss/depth map;
* sparkle mask;
* diffraction direction map;
* diffraction scale map;
* pattern mask;
* optional printed metallic mask;
* optional text/name foil mask;
* optional border foil mask;
* optional symbol/icon foil mask.

Profiles should be composable.

For example:

```text
Artwork window:
Cosmos holo

Card border:
Normal print

Name:
Metallic gold

Rare symbol:
Gold foil

Laminate:
Full card
```

Another profile may be:

```text
Entire card:
Starlight prismatic foil

Selected artwork:
Stronger spectral response

Borders:
Micro-etched diffraction

Name:
Silver holographic

Watermark:
Subtle secondary foil
```

---

# 20. ONE SHADER DOES NOT MEAN ONE LOOK

It is acceptable and desirable for multiple profiles to share a common optical engine.

It is not acceptable for them to visibly appear like the same effect with different parameter values when their real-world technologies are substantially different.

Design the common engine from interchangeable components.

Conceptually:

```text
HolographicMaterial
├── BasePhysicalLayer
├── LaminateLayer
├── DiffractionLayer
├── PatternLayer
├── EmbossLayer
├── MicrofacetGlintLayer
├── MetallicLayer
├── SparkleLayer
└── CoverageLayer
```

A profile decides which modules participate and how.

---

# 21. HOLOGRAPHIC PROFILE DATA MODEL

Create a strongly typed data-driven profile model.

A profile should be able to define parameters resembling:

```text
id
displayName
family
description

coverage
primaryMask
secondaryMask

baseMetalness
baseRoughness
foilMetalness
foilRoughness

diffractionEnabled
diffractionStrength
diffractionSharpness
diffractionPeriod
diffractionOrderStrength
diffractionDirection
diffractionDirectionMap
dispersion
spectralSaturation
spectralBrightness

macroPattern
macroScale
macroRotation
macroIntensity

mesoPattern
mesoScale
mesoRotation
mesoIntensity

microPattern
microScale
microIntensity

sparkleEnabled
sparkleDensity
sparkleScale
sparkleSharpness
sparkleIntensity
sparkleSpectralAmount

embossEnabled
embossMap
embossStrength
embossScale

anisotropy
anisotropyDirection

laminateStrength
laminateRoughness

metallicInkStrength

normalStrength
microNormalStrength

profile-specific pattern settings
```

Do not expose parameters that have no visual purpose.

---

# 22. CARD GEOMETRY

The card must be an actual three-dimensional object.

Do not render two infinitely thin planes.

Create:

* physical thickness;
* rounded outer corners;
* very small beveled edges;
* distinct front;
* distinct rear;
* visible card-stock edge.

The silhouette must remain convincing when viewed edge-on.

Use realistic physical proportions.

Do not exaggerate card thickness merely so it is easier to see.

---

# 23. DIMENSION PRESETS

Allow card physical dimensions to be configured.

Useful presets can include:

* standard trading-card proportion;
* Pokémon-style standard card proportion;
* Yu-Gi-Oh!-style smaller card proportion;
* custom/original card dimensions.

The renderer should not make assumptions that every card uses identical dimensions.

---

# 24. EDGE MATERIAL

The edge is important because the user can rotate freely.

Create a believable card-stock edge.

It should not look like:

* polished metal;
* pure black plastic;
* glowing geometry.

Use subtle fiber/roughness variation if useful.

The bevel can catch a very small highlight.

The edge must reinforce the fact that this is a physical layered card.

---

# 25. ROUNDED CORNERS

Rounded corners must be geometric.

Do not rely only on alpha clipping a rectangular plane if the actual physical silhouette remains rectangular.

The card should cast and receive light according to its rounded physical shape.

---

# 26. AVOID COPLANAR Z-FIGHTING

Do not implement every optical layer as a stack of nearly coplanar meshes unless there is a strong reason.

Prefer composing optical layers inside the material when possible.

Separate geometry only where actual geometry provides a benefit.

Avoid:

* z-fighting;
* depth instability;
* excessive overdraw.

---

# 27. PHYSICAL SUBTLETY

At extreme close distance, consider subtle:

* card curvature;
* minute manufacturing variation;
* microscopic surface irregularity;
* extremely soft laminate waviness.

These effects must be restrained.

The card should still feel pristine and premium.

Do not make it look damaged unless a future wear system is intentionally added.

---

# 28. LIGHTING PHILOSOPHY

The lighting exists to reveal holographic structure.

Do not illuminate the card uniformly from every direction.

A completely flat lighting environment destroys the reason holographic foil is interesting.

Use a controlled premium product-photography lighting rig.

The user should be able to rotate the card and discover new highlights.

---

# 29. STUDIO LIGHT RIG

Build a small deliberate lighting rig.

Consider:

* one large soft key source;
* one narrower vertical strip source;
* a secondary soft fill;
* a restrained rim/accent source;
* an HDR environment/reflection environment.

The exact number of lights should be determined visually.

Do not add lights simply to increase brightness.

---

# 30. LIGHT SHAPES MATTER

For reflective materials, the reflected shape of a source matters.

Design studio reflections.

Examples:

* tall strip softbox producing a clean vertical sweep;
* broad overhead panel producing a controlled white sheen;
* smaller accent source producing sharp foil hits.

The reflection should feel intentionally photographed.

---

# 31. REFLECTION ENVIRONMENT

Use a high-quality reflection environment.

Keep the visible background minimal even if the reflection environment contains useful studio structures.

The card can reflect:

* softboxes;
* large dark areas;
* subtle bright strips;
* smooth studio gradients.

Avoid an environment with recognizable outdoor scenery unless specifically testing.

This is product visualization, not environmental rendering.

---

# 32. OPTIONAL SLOW LIGHT MOVEMENT

The card should remain interesting when stationary.

If necessary, permit extremely subtle movement of one studio reflection source.

This movement must be:

* slow;
* smooth;
* nearly imperceptible;
* secondary to user rotation.

Never create a nightclub light show.

The foil must fundamentally respond to physical orientation.

---

# 33. HDR LIGHTING

Maintain high dynamic range internally.

Foil glints should be able to become much brighter than normal printed regions before tone mapping.

This creates believable brilliance.

Protect against:

* flat grey foil;
* clipped giant white patches;
* oversaturated neon;
* entire card becoming bloom.

---

# 34. TONE MAPPING

Test current high-quality tone-mapping options available through the modern Three.js pipeline.

Choose the one that preserves:

* spectral saturation;
* bright white glints;
* artwork color;
* shadow depth;
* subtle metallic variation.

Do not blindly use a default because it is the default.

Evaluate it specifically for holographic rendering.

---

# 35. EXPOSURE

Exposure should be intentionally tuned.

The card's printed artwork should remain properly exposed while the brightest foil reflections reach brilliant highlight values.

Provide a debug exposure control.

Final presentation should have a curated default.

---

# 36. BLOOM

Bloom is a finishing effect only.

The shader must look excellent with bloom disabled.

Then introduce restrained bloom to the most intense highlights.

Bloom should primarily affect:

* tiny glints;
* strong spectral peaks;
* extremely bright foil edges.

Do not bloom:

* ordinary white text;
* the entire card face;
* every metallic region;
* the background.

If turning bloom off reveals that the holo is weak, improve the material instead of increasing bloom.

---

# 37. POST-PROCESSING

Use the modern Three.js WebGPU-compatible node/`RenderPipeline` approach.

Keep post-processing minimal.

Possible useful operations:

* bloom;
* final output transform;
* subtle vignette;
* very restrained color grading;
* high-quality AA if it visibly improves the result.

Avoid adding effects simply because they are available.

Do not use:

* heavy chromatic aberration;
* film damage;
* aggressive grain;
* VHS effects;
* fake lens dirt;
* strong depth of field;

unless a specific presentation mode later calls for them.

The card must remain crisp.

---

# 38. BACKGROUND

Default presentation:

* near black;
* neutral;
* subtle premium studio gradient;
* low visual noise.

The background should maximize perception of:

* silhouette;
* spectral color;
* white highlights;
* foil motion.

Do not decorate the environment heavily.

---

# 39. OPTIONAL GROUNDING

If the floating card feels insufficiently grounded, consider an extremely subtle visual anchor.

Examples:

* soft shadow;
* faint reflection;
* very subtle platform.

Do not build a room.

Do not make a pedestal visually compete with the card.

---

# 40. CAMERA

Use a perspective camera with a product-photography feel.

Avoid extreme wide-angle distortion.

Default framing should make the card large and impressive while leaving enough border around it to rotate safely.

The card should feel like it is approximately at arm's length.

---

# 41. ZOOM

Mouse wheel should provide smooth damped zoom.

Support touch/pinch where appropriate.

Set sensible minimum and maximum distance.

At maximum close-up, the user should be able to inspect foil structure.

Do not allow the camera to clip through the card.

Do not allow the card to become so small that interaction feels lost.

---

# 42. CARD MANIPULATION

Do not ship generic OrbitControls as the final interaction if it makes the card feel like an object in a CAD viewport.

Implement a dedicated card manipulation system.

Dragging should feel like physically turning a collectible card in your hand.

Use quaternions.

Support unconstrained rotation.

Avoid gimbal lock.

---

# 43. ARCBALL-LIKE ROTATION

Use a high-quality arcball/virtual-trackball interpretation or another carefully designed quaternion mapping.

Dragging:

* horizontally should produce intuitive yaw;
* vertically should produce intuitive pitch;
* diagonal drag should combine naturally;
* dragging around the object's perimeter should permit roll where appropriate.

The result should feel direct rather than mathematical.

---

# 44. ROTATION INERTIA

Pointer release should preserve angular momentum.

Implement:

* measured angular velocity;
* smooth decay;
* frame-rate-independent damping;
* velocity clamp;
* low-speed cutoff.

A tiny drag should not produce an enormous spin.

A strong flick should produce a satisfying spin.

---

# 45. PRECISION AT LOW SPEED

The interaction must be excellent for extremely small adjustments.

Collectors need to "hunt" for the exact angle that reveals a foil effect.

Low-speed motion should be:

* stable;
* precise;
* jitter-free.

Do not over-filter input so much that the card feels disconnected.

---

# 46. HIGH-REFRESH INPUT

Handle pointer motion correctly at high refresh rates.

Target excellent feel at:

* 60 Hz;
* 90 Hz;
* 120 Hz;
* 144 Hz;
* 165 Hz;
* 240 Hz.

Do not multiply movement incorrectly by frame delta if pointer deltas already represent actual movement.

Physics/damping should remain frame-rate independent.

---

# 47. POINTER CAPTURE

Use pointer capture so dragging remains stable when the cursor leaves the canvas.

Prevent unintended text selection or page dragging.

Support:

* mouse;
* pen where practical;
* touch.

---

# 48. `F` FLIP

`F` is the dedicated card flip hotkey.

Pressing `F` should perform a polished physical 180-degree flip.

Do not:

* swap textures instantly;
* reset user rotation;
* snap camera position;
* replace the mesh;
* teleport orientation.

The card must physically rotate.

---

# 49. FLIP MOTION

The flip should have premium motion.

Use:

* smooth acceleration;
* controlled peak angular velocity;
* smooth deceleration;
* appropriate easing;
* optional extremely subtle overshoot if it improves feel.

It should feel like deliberately flipping a card in hand.

Aim for responsive rather than slow/cinematic.

---

# 50. FLIP + MANUAL ORIENTATION

Manual orientation and flip state must compose correctly.

Conceptually separate:

```text
manualRotation
flipRotation
presentationRotation
```

rather than destructively overwriting one orientation.

After a flip, the user's previous tilt remains.

Repeated `F` presses should reliably alternate front/back.

---

# 51. BACK OF CARD

The back must be a real independently textured and shaded surface.

It should have:

* its own artwork;
* laminate reflection;
* optional foil if the selected card requires it;
* correct orientation.

Do not mirror the front.

---

# 52. CARD MATERIAL ARCHITECTURE

Recommended conceptual architecture:

```text
CardDefinition
    ↓
CardGeometry
    ↓
CardSurfaceMaterial
    ├── PrintLayer
    ├── MetallicInkLayer
    ├── HoloLayer
    │    ├── Diffraction
    │    ├── MacroPattern
    │    ├── MesoPattern
    │    ├── MicroPattern
    │    ├── Glints
    │    └── Emboss
    └── LaminateLayer
```

Keep the system comprehensible.

---

# 53. ORIGINAL HOLOGRAMS

Original/custom cards should NOT expose every experimental shader.

Only ship excellent original holo designs.

Maintain a larger development library if useful, but curate the presentation set.

Every shipped original effect must have a clear visual identity.

Do not include:

* weak effects;
* redundant effects;
* novelty filters;
* generic rainbow presets.

Create a small-to-medium collection of extremely strong signature foils.

---

# 54. ORIGINAL — CATHEDRAL PRISM

Create a premium radial engraved diffraction foil.

Visual behavior:

* extremely fine engraved rays;
* several larger radial sectors;
* strong spectral separation when a light crosses the ray direction;
* white-hot highlight at the center of strong reflection;
* rainbow fans expanding outward;
* microengraving catching smaller glints;
* dark areas remaining relatively restrained.

It should feel laser-etched and architectural.

Avoid a simple radial rainbow gradient.

---

# 55. ORIGINAL — AURORA SILK

Create a softer luxury foil.

Visual behavior:

* flowing elongated interference bands;
* satin-like anisotropic response;
* broader spectral colors;
* slower color changes than a sharp prism;
* smooth cyan/magenta/green transitions;
* extremely fine micrograin underneath;
* broad white studio highlights over the spectral layer.

This should look elegant rather than loud.

Think premium iridescent silk laminated into a card.

---

# 56. ORIGINAL — CRYSTAL SHARD

Create a faceted prismatic material.

Partition the foil into irregular polygonal facets.

Each facet has:

* slightly different microscopic orientation;
* different reflection threshold;
* slightly different diffraction vector.

As the card tilts:

* one facet suddenly becomes bright;
* another turns dark;
* several facets become different spectral colors;
* broad studio reflection crosses the laminate independently.

Do not draw static rainbow polygons.

The facets must change optically with orientation.

---

# 57. ORIGINAL — MICRODIAMOND

Build a dense precision microprism foil.

Appearance:

* tiny repeating diamond lattice;
* extremely crisp angular response;
* frequent tiny white/spectral flashes;
* ordered rather than random sparkle;
* subtle larger-scale color movement underneath.

At normal distance it should read as an impossibly clean shimmering foil.

Close up, the geometric lattice becomes apparent.

---

# 58. ORIGINAL — STARFIELD

Build a deep black/silver cosmic foil.

Keep the base relatively dark.

Use:

* sparse microscopic glints;
* several brightness classes;
* rare larger starburst structures;
* faint spectral dust;
* occasional broad blue/violet sheen;
* no obvious repeating texture.

The effect should become spectacular only when particular microfacets catch the light.

Avoid making it look like a static star texture.

---

# 59. ORIGINAL — HOLOGRAPHIC TOPOGRAPHY

Create an etched contour-line foil.

Use nested topographic contours or flowing elevation lines.

The line structure should:

* have physical normal/depth response;
* become visible through edge highlights;
* generate narrow spectral diffraction;
* disappear partially when not aligned to light;
* produce a sophisticated security-print feeling.

This should look engraved, not merely drawn.

---

# 60. ORIGINAL — SPECTRAL LATTICE

Use multiple intersecting diffraction directions.

Create:

* one fine diagonal grating;
* a second crossing grating;
* occasional larger nodes.

Different orientations should favor different wavelengths.

This should create shifting X-shaped and diamond-like spectral structures as the card moves.

Avoid visual moiré artifacts caused by undersampling.

Intentional optical interference is good.

Rendering aliasing is not.

---

# 61. ORIGINAL — SOLAR FRESNEL

Use concentric or elliptical etched rings.

Behavior:

* rings themselves are physically fixed;
* spectral response travels across them as orientation changes;
* strong light produces narrow circular/elliptical rainbow segments;
* highlight intensity varies around the ring rather than lighting the whole ring equally.

It should resemble precision optical film, not a target graphic.

---

# 62. ORIGINAL — LIQUID SPECTRUM

Create a smooth flowing diffraction-direction field.

The pattern itself should not scroll.

Instead, the local microscopic orientation varies across the foil in a fluid-like flow field.

Tilting the card causes:

* traveling ribbons of spectral response;
* broad color pools;
* small sharp highlights at flow convergence areas.

The perceived movement must be caused by the changing optical relationship, not time-based texture panning.

---

# 63. ORIGINAL — BLACK CHROME PRISM

Create a highly restrained luxury effect.

Base appearance:

* dark near-neutral chrome;
* deep contrast;
* low average spectral saturation.

At selected angles:

* incredibly vivid narrow rainbow lines appear;
* white mirror glints spike;
* tiny color sparks emerge;
* most of the card remains dark.

This should feel expensive because it does not constantly show everything.

---

# 64. ORIGINAL — OPAL

Create a pearlescent foil.

Instead of sharp rainbow strips:

* use broad milky interference colors;
* allow cyan, magenta, mint, violet and warm gold to overlap;
* keep highlights soft;
* layer subtle microcrystalline sparkle;
* retain a translucent/ceramic impression.

This should be closer to polished opal or nacre than metalized rainbow foil.

---

# 65. ORIGINAL — SIGNATURE MASTER FOIL

After developing the optical system, create one flagship original foil that combines the best lessons from the others.

It should not simply enable every effect simultaneously.

Design it deliberately.

Possible composition:

* restrained macro spectral movement;
* precision meso engraving;
* sparse microglints;
* selective emboss;
* extremely clean laminate highlights;
* rare intense prismatic flashes.

This should be the default card shown when the app launches.

It should represent the quality ceiling of the project.

---

# 66. ORIGINAL PROFILE QUALITY GATE

An original profile ships only if:

* it remains distinctive next to other profiles;
* it looks premium at multiple angles;
* it has convincing material depth;
* it does not depend on heavy bloom;
* it does not look like a procedural shader demo;
* it does not obviously repeat;
* it does not produce distracting aliasing;
* the artwork remains readable;
* its best moments are caused by interaction.

Delete or hide mediocre profiles.

---

# 67. POKÉMON-STYLE HOLOGRAPHIC SYSTEM

Build a comprehensive profile family capable of representing the major historical and modern Pokémon TCG holofoil technologies.

This must be treated as an optical-reference problem.

Do not assume that "Pokémon holo" is one effect.

Different eras use substantially different structures.

Create separate profiles and variants.

Where regional/language print differences materially change direction or coverage, allow those to be represented as variants.

---

# 68. POKÉMON — VINTAGE STARLIGHT / GALAXY STAR

Create the early star-like holofoil appearance.

Characteristics:

* scattered star-shaped reflective structures;
* multiple star sizes;
* slightly soft/vintage optical character;
* many smaller reflective points between obvious stars;
* irregular distribution rather than obvious tiling;
* generally concentrated in the intended holo region such as the artwork window.

Angular behavior:

* individual stars should activate at different card angles;
* a visible star should not simply remain bright continuously;
* some stars should transition from silver to faint spectrum;
* strongest points can create brilliant white cores.

Do not create a static star PNG overlay.

---

# 69. POKÉMON — COSMOS / GALAXY

This is an extremely important profile.

Create a foil containing:

* small circles;
* medium circular orbs;
* larger round structures;
* occasional swirl-like structures;
* fine background glitter.

Different structures should possess slightly different optical orientations/phases.

When rotating the card:

* certain circles flare;
* others disappear;
* swirls reveal themselves progressively;
* broad underlying foil remains reflective.

The circles should not appear like printed bubbles.

They represent structures in reflective film.

Swirls should be relatively rare so discovering one feels special.

---

# 70. POKÉMON — TINSEL

Build a fine horizontal foil structure.

Characteristics:

* dense horizontal directional patterning;
* compact modern-looking shine;
* much less emphasis on large circles/stars than Cosmos;
* long narrow highlights;
* spectral line response.

When the card tilts vertically, response should shift noticeably because the foil is directional.

The foil should have enough microvariation that it does not look like ordinary horizontal scanlines.

---

# 71. POKÉMON — SHEEN

Create a smooth directional diagonal refraction profile.

The primary response should sweep diagonally.

Characteristics:

* broad diagonal reflective band;
* finer diagonal spectral structure;
* polished smooth appearance;
* less obvious discrete motif than Cosmos or Cracked Ice.

Different language/print variants can parameterize:

* diagonal direction;
* coverage;
* border behavior.

Avoid representing Sheen as nothing more than a diagonal rainbow gradient.

The band exists because of directional optical structure and must respond to view/light orientation.

---

# 72. POKÉMON — WATER-WEB

Build a flowing wave/web diffraction structure.

Characteristics:

* interconnected wavy reflective lines;
* organic rather than perfectly periodic;
* water-like motion caused by changing angle;
* highlights propagating through curved paths;
* areas between paths retaining subtler foil response.

The structure must remain attached to the foil.

Do not animate a water texture.

Rotating the card should make the web appear to flow because different sections reach reflection conditions.

---

# 73. POKÉMON — VERTICAL LINE / SWORD & SHIELD STYLE

Create thin, vertically oriented reflective structures.

Characteristics:

* fine vertical line pattern;
* strong top-to-bottom directional response;
* narrow metallic/spectral reflections;
* restrained underlying sheen.

The lines should be fine enough to blend into a high-quality foil at normal distance while becoming identifiable up close.

---

# 74. POKÉMON — MIRAGE / MODERN HORIZONTAL SHEEN

Create the modern horizontally refracting family.

Behavior:

* broad horizontal light travel;
* modern clean holographic surface;
* controlled rainbow response;
* silver border treatment when the selected card configuration requires it.

Do not simply rotate the old Sheen effect ninety degrees and call it finished.

Tune:

* line density;
* dispersion;
* highlight width;
* laminate;
* border behavior;
* microstructure;

so it feels like its own generation of foil.

---

# 75. POKÉMON — CRACKED ICE

Create a large angular fractured foil pattern.

Generate irregular shard-like cells.

Each shard should behave like a slightly differently oriented microscopic surface.

As the card moves:

* neighboring shards flash independently;
* some appear silver;
* some split into rainbow;
* some become dark;
* sharp boundaries remain physically fixed.

Avoid:

* static rainbow shards;
* glowing stained glass;
* uniform Voronoi coloring.

The important feature is discrete angular response.

---

# 76. POKÉMON — CROSSHATCH

Create an ordered crossing-line foil.

Use at least two line directions.

Characteristics:

* precise grid/crosshatch structure;
* strong reflections along aligned directions;
* alternating bright and dark intersections;
* subtle spectrum along the lines;
* high-quality manufactured appearance.

The grid should not look like a UI texture placed over the card.

---

# 77. POKÉMON — SEQUIN / CONFETTI

Create discrete repeated reflective elements.

Elements may resemble:

* discs;
* confetti points;
* small stamped reflective shapes.

The system needs:

* local angular variation;
* individually changing brightness;
* occasional color dispersion;
* subtle backing foil.

Avoid constant blinking or random particle animation.

---

# 78. POKÉMON — PIXEL FOIL

Create a structured pixel-like holographic pattern.

The pixels are physical foil structures, not low-resolution rendering.

Maintain:

* crisp geometric placement;
* different angular response among cells;
* controlled spectral variation;
* proper anti-aliasing at distance.

It should intentionally look pixel-patterned while the rest of the card remains high resolution.

---

# 79. POKÉMON — LINE HOLO VARIANTS

Support historical/promotional line-based foil patterns separately from generic directional sheen where reference material demonstrates a distinct structure.

Allow:

* line direction;
* spacing;
* width;
* phase;
* spectral strength;
* secondary crossing direction;
* stochastic interruption.

---

# 80. POKÉMON REVERSE HOLO SYSTEM

Reverse holo must be a first-class coverage mode.

A reverse holo is not merely:

```text
foilMask = inverse(artworkMask)
```

because different eras include different printed motifs and structures.

The architecture must support:

* body foil excluding image window;
* body foil plus patterned symbols;
* alternate artwork behavior;
* holo borders;
* set-specific motif masks;
* stamped symbols;
* different foil under printed text.

---

# 81. POKÉMON — LEGENDARY COLLECTION FIREWORKS REVERSE

Create a fireworks-style reverse foil.

Characteristics:

* explosive radial starburst structures;
* repeated across the card body;
* strong reflective spikes;
* dense energetic appearance;
* foil coverage outside the primary artwork region according to the card setup.

The bursts must react directionally.

Do not create static white fireworks graphics.

---

# 82. POKÉMON — E-READER-ERA REVERSE

Support the flatter body-foil appearance used in early reverse treatments.

Focus on:

* broad metallic/holo body response;
* correct separation from artwork;
* subtle directional foil texture;
* era-appropriate restraint.

Do not over-modernize every historical foil.

---

# 83. POKÉMON — EX-ERA SYMBOL REVERSE FOILS

Create a flexible motif system capable of using:

* Energy-type symbols;
* Poké Ball motifs;
* set marks;
* star patterns;
* pinwheel/prismatic structures;
* 3D-looking Poké Ball motifs;
* other era-specific repeated marks.

The motif is not simply printed on top.

Allow it to alter:

* diffraction direction;
* foil strength;
* normal/emboss response;
* roughness.

This permits motifs to emerge from the foil when light catches them.

---

# 84. POKÉMON — TYPE-SYMBOL REVERSE SYSTEM

For eras using type-based repeated patterning, allow a profile to receive a symbol texture/SDF and generate a stable tiled or patterned structure from it.

Support:

* different Pokémon types;
* scale;
* spacing;
* orientation;
* hierarchy between large and small symbols.

The system should not require a separate shader for every type.

---

# 85. POKÉMON — MODERN TILE REVERSE

Create configurable modern reverse patterns containing combinations of:

* type icons;
* Poké Ball-style icons;
* geometric tiles;
* large identifying symbols;
* smaller repeating symbols.

Pattern resolution must remain sharp.

The entire effect still needs angle-dependent optical response.

---

# 86. POKÉMON — FULL-ART PREMIUM FOIL

Support full-card artwork where foil exists beneath or throughout much of the composition.

Do not simply rainbow-tint the illustration.

Use selective response.

Examples:

* darker ink blocks most spectral response;
* highlights allow more foil;
* backgrounds catch broad spectrum;
* character edges receive subtle metallic flash;
* printed text remains readable.

The exact behavior should be driven by masks.

---

# 87. POKÉMON — TEXTURED FULL ART

This is a major premium feature.

Implement visually convincing raised/etched linework.

Use:

* height/emboss map;
* high-quality normal perturbation;
* optionally parallax-like depth only if stable;
* anisotropic highlight on engraved lines;
* foil response affected by local embossed normal.

When tilted:

* etched ridges should catch thin bright lines;
* valleys remain darker;
* spectral behavior follows local relief;
* macro artwork remains readable.

The texture must feel pressed into or raised from the card, not like a flat line texture.

---

# 88. POKÉMON — RAINBOW PREMIUM FOIL

Support full-surface highly spectral treatments.

However, preserve:

* artwork shapes;
* line art;
* texture relief;
* contrast.

Use broad rainbow coloration combined with fine directional foil.

Do not turn the card into one flat rainbow gradient.

Different embossed structures should refract differently.

---

# 89. POKÉMON — GOLD PREMIUM FOIL

Create a rich metallic gold base.

Gold should:

* have proper metallic response;
* retain warm metallic body color;
* catch bright neutral highlights;
* contain fine engraved detail;
* optionally show restrained spectral spark where appropriate.

Do not make gold yellow plastic.

Do not make gold entirely rainbow.

It should feel like metallic foil stamping.

---

# 90. POKÉMON — RADIANT / CROSSHATCH PREMIUM TREATMENTS

Support premium treatments that combine:

* dense cross-pattern foil;
* full-art or near-full-art coverage;
* repeating geometric structure;
* intense angular sheen.

Treat these as separate profile families where references show materially distinct optical behavior.

---

# 91. POKÉMON TAXONOMY REQUIREMENT

The named profiles above are the starting required set, not permission to stop researching.

Before declaring Pokémon holo coverage complete:

1. Build a verified inventory of historically meaningful foil pattern families.
2. Distinguish actual optical differences from simple rarity-name differences.
3. Identify reverse-holo eras that require distinct visual patterns.
4. Identify major promotional foil patterns.
5. Identify modern textured/etched foil technologies.
6. Add missing materially distinct families.
7. Create aliases/variants where two names use essentially the same optical engine.
8. Do not invent visual behavior when reference material is uncertain.

"All Pokémon holos" should mean comprehensive optical coverage, not one generic Pokémon preset.

---

# 92. YU-GI-OH!-STYLE HOLOGRAPHIC SYSTEM

Yu-Gi-Oh! foil technology must also be represented as a family of separate optical systems.

Support standard, luxury, historical, parallel, embossed and special foil treatments.

Do not reduce Yu-Gi-Oh! rarity to:

```text
more rare = more rainbow
```

Different rarities differ by:

* foil coverage;
* name treatment;
* art treatment;
* pattern direction;
* emboss;
* coating;
* border treatment;
* watermark;
* repeated motifs;
* spectral density.

---

# 93. YU-GI-OH! — SUPER RARE

Create the restrained baseline holographic treatment.

Primary emphasis:

* holographic artwork;
* normal surrounding card stock;
* relatively simple foil compared with luxury rarities.

The art foil should:

* produce smooth metallic/holo sheen;
* show subtle spectral response;
* react clearly to tilting;
* remain significantly calmer than Secret/Starlight-style technologies.

This profile establishes the lower end of the holo intensity range.

---

# 94. YU-GI-OH! — ULTRA RARE

Build on Super-style artwork foil with appropriate metallic name treatment.

Separate:

* artwork foil;
* metallic/gold name layer.

The name should possess:

* metallic reflectivity;
* narrow specular highlights;
* subtle emboss impression if reference demands;
* independent response from artwork.

Do not simply recolor text yellow.

---

# 95. YU-GI-OH! — SECRET RARE

Secret-style foil needs a distinctly directional prismatic structure.

Characteristics:

* stronger rainbow separation;
* fine directional diagonal streaks/lines where appropriate to the print style;
* holographic artwork;
* holographic/silver-rainbow name behavior;
* sharper spectral flashes than Ultra.

Tilting should cause fine prismatic lines to travel strongly across the foil.

The directional pattern must remain attached to the card.

---

# 96. YU-GI-OH! — PRISMATIC SECRET RARE

Create a distinct prismatic structure rather than aliasing Secret Rare.

Use:

* different diffraction direction/orientation;
* denser prism structure;
* more uniform spectral distribution;
* strong fine-line rainbow response;
* high clarity.

Where variants historically use horizontal versus other directions, represent them explicitly.

---

# 97. YU-GI-OH! — PLATINUM SECRET RARE

Create a colder, extremely bright silver/platinum treatment.

Emphasize:

* white/silver metallic reflection;
* fine prismatic spectral highlights;
* premium high-frequency foil;
* crisp name treatment;
* controlled rainbow rather than overwhelming saturation.

It should immediately feel different from warmer gold and from broad rainbow Starlight treatments.

---

# 98. YU-GI-OH! — ULTIMATE RARE

This must be one of the most carefully built profiles.

Ultimate-style treatment is heavily dependent on relief/texture.

Implement:

* embossed artwork regions;
* etched background structures;
* dimensional foil;
* selected symbols/attributes/details catching relief;
* local normal changes;
* foil responding to embossed geometry.

The surface should visibly gain depth when rotated.

The highlight should crawl across raised structures.

At near-front orientation the emboss can be subtle.

At grazing orientation the physical-looking relief becomes obvious.

Do not fake Ultimate Rare with a contrast texture.

---

# 99. YU-GI-OH! — PRISMATIC-STYLE ULTIMATE

Treat this separately from classic embossed Ultimate.

Combine:

* raised 3D varnish/emboss impression;
* modern prismatic structure;
* strong clean highlights;
* fine rainbow splitting;
* embossed regions creating additional angular complexity.

The raised effect must alter lighting, not merely darken/lighten pixels.

---

# 100. YU-GI-OH! — GHOST / HOLOGRAPHIC RARE

This needs a completely different rendering philosophy.

Create a ghostly artwork effect with:

* low-saturation/pale base appearance;
* high-angle-dependent image visibility;
* layered reflective image depth;
* silver-white specular response;
* portions of the artwork disappearing/reappearing with tilt;
* subtle spectral accents rather than constant rainbow.

The art should sometimes feel almost monochrome or spectral.

At the correct orientation, details suddenly emerge.

If depth/parallax can be simulated convincingly, use restrained layered image displacement or multi-plane/parallax treatment.

Do not turn Ghost Rare into transparent artwork.

Do not simply lower opacity.

Its identity comes from reflective, pale, angle-dependent imagery.

---

# 101. YU-GI-OH! — COLLECTOR'S RARE

Create a luxury etched surface.

Characteristics:

* heavily detailed foil patterning;
* textured border/details;
* etched line structures;
* sophisticated sparkle;
* coverage extending beyond ordinary artwork foil;
* physical-looking surface detail.

Use multiple scales.

Macro:

* controlled foil region.

Meso:

* etched linework.

Micro:

* tiny bright facets.

This profile should feel tactile.

---

# 102. YU-GI-OH! — PRISMATIC-STYLE COLLECTOR'S RARE

Treat modern prismatic-style Collector's foil separately.

Increase:

* tiny sparkle density;
* prism behavior;
* clean spectral response.

Retain premium etched structure.

Do not merely increase saturation on the standard Collector's profile.

---

# 103. YU-GI-OH! — STARLIGHT RARE

This should be an extremely vivid full-surface luxury profile.

Characteristics:

* prismatic foil extending through many parts of the card;
* dense horizontal/structured rainbow response;
* intense fine sparkle;
* multiple spatial scales;
* silver/white base flashes;
* high spectral saturation at select angles.

The entire card should feel manufactured from precision holographic material.

However:

* text must remain readable;
* artwork must remain visible;
* dark ink should still control response;
* the entire card must not glow uniformly.

When tilted slowly, different zones should activate sequentially.

---

# 104. YU-GI-OH! — QUARTER CENTURY SECRET RARE

Build on a luxury prismatic full-card treatment but preserve its own identifying features.

Support:

* highly sparkling foil;
* prismatic body;
* holographic name;
* dedicated watermark/logo mask where appropriate;
* fine dot/sparkle coating behavior.

The watermark should appear integrated into foil/printing rather than floating above the card.

Do not make it permanently bright.

It should catch light.

---

# 105. YU-GI-OH! — 20TH SECRET / ANNIVERSARY-STYLE VARIANTS

Create configurable anniversary secret profiles.

Support:

* specialized name coloring;
* full/partial prism treatments;
* watermark/stamp regions;
* intense fine foil.

Use the same underlying modular systems where optical behavior overlaps, but maintain distinct profile definitions.

---

# 106. YU-GI-OH! — 10000 SECRET

Support the specialized premium treatment as a distinct profile/variant where reference material demonstrates unique stamp/name/pattern behavior.

The architecture must support:

* unique identifiers;
* special printed/foil marks;
* independent stamp masks;
* custom name foil.

Do not hard-code anniversary markings inside the generic holo material.

---

# 107. YU-GI-OH! — EXTRA SECRET

Create a separate profile where the optical treatment differs materially from normal Secret/Prismatic Secret.

Use verified references to determine:

* line direction;
* coverage;
* name foil;
* border response;
* foil density.

Do not guess when a regional rarity has subtle distinctions.

---

# 108. YU-GI-OH! — ULTRA SECRET

Support combinations where:

* artwork uses one holographic family;
* name uses another metallic/holographic family.

The layered architecture should make these combinations easy.

---

# 109. YU-GI-OH! — PLATINUM RARE

Support bright platinum/silver metallic coverage appropriate to references.

Keep its appearance distinct from Platinum Secret by controlling:

* spectrum amount;
* line structure;
* coverage;
* text;
* border treatment.

---

# 110. YU-GI-OH! — PARALLEL RARE SYSTEM

Parallel foil must be a general overlay architecture.

Support a holographic coating extending across the card surface.

Parallel profiles may combine with underlying rarity layers.

Conceptually:

```text
underlying rarity
+
parallel holographic coating
```

This should allow:

* Normal Parallel;
* Super Parallel;
* Ultra Parallel;
* Secret Parallel;
* Extra Secret Parallel;
* other parallel variants.

Do not duplicate entire materials when composition is sufficient.

---

# 111. YU-GI-OH! — STARFOIL

Implement repeated star-shaped foil elements across the surface.

Each star:

* remains physically located;
* activates based on angle;
* changes intensity;
* can show small spectral fringes.

Do not use static white stars.

Do not blink them randomly.

---

# 112. YU-GI-OH! — MOSAIC RARE

Create a tiled mosaic optical coating.

Use small geometric cells.

Neighboring cells should possess slightly different optical orientation.

As the card tilts:

* waves of brightness move across the mosaic;
* some cells become rainbow;
* some become silver;
* others vanish.

It should look like holographic micro-tiles embedded in the coating.

---

# 113. YU-GI-OH! — SHATTERFOIL

Create a fractured/shattered reflective overlay.

This is related conceptually to cracked-ice structures but should have its own:

* shard scale;
* distribution;
* optical intensity;
* coverage behavior;
* background relationship.

Do not simply reuse the Pokémon Cracked Ice preset unchanged.

---

# 114. YU-GI-OH! — DUEL TERMINAL / MACHINE-PATTERN PARALLEL FOILS

Support repeating geometric foil coatings associated with special machine/parallel print families.

Build a generalized patterned-parallel module supporting:

* grid structures;
* square structures;
* diamond structures;
* fine repeating motifs.

Different historical variants can share the module with separate profile data.

---

# 115. YU-GI-OH! — GOLD RARE

Gold must behave as metallic foil.

Create:

* metallic gold name;
* metallic gold border/details where applicable;
* holographic artwork according to the specific treatment.

Gold highlights should progress from:

* warm yellow metal;
* through bright pale gold;
* toward nearly white specular peak.

Do not use flat yellow.

---

# 116. YU-GI-OH! — GOLD SECRET RARE

Combine high-quality metallic gold elements with stronger Secret-style prismatic foil.

Maintain clear separation between:

* gold metal response;
* rainbow diffraction response.

They should overlap naturally but remain materially distinct.

---

# 117. YU-GI-OH! — PREMIUM GOLD

Premium gold should look physically raised/embossed where appropriate.

Use:

* stronger metallic relief;
* local normal/height response;
* sharp highlights;
* dimensional borders/details.

The gold should feel stamped onto the card.

---

# 118. YU-GI-OH! — GHOST/GOLD

Where a treatment combines Ghost-like artwork with gold detailing, compose both physically distinct systems.

Do not create one hybrid generic shader.

Ghost artwork should maintain its pale reflective behavior while gold elements retain metallic depth.

---

# 119. YU-GI-OH! — PHARAOH'S RARE

Implement a special patterned overlay system capable of Egyptian/hieroglyphic foil motifs.

The motifs should:

* be physically stable;
* reveal under reflected light;
* vary in visibility with angle;
* possess subtle emboss or foil relief where reference supports it;
* not look like opaque icons printed over the card.

Support different underlying rarity variants through composition.

---

# 120. YU-GI-OH! — MILLENNIUM-STYLE FOILS

Add an extensible motif-based premium foil family for regional/historical Millennium treatments.

Allow:

* repeated thematic symbols;
* parallel coatings;
* metallic variants;
* differing underlying rarities.

Use profile composition rather than writing a dedicated complete shader for every named rarity.

---

# 121. YU-GI-OH! — HOLOGRAPHIC PARALLEL

Support exceptionally broad holographic coating where reference material requires it.

Distinguish:

* surface overlay;
* underlying artwork foil;
* name foil;
* border behavior.

---

# 122. YU-GI-OH! — HISTORICAL / REGIONAL FOILS

The system must be capable of representing additional materially distinct TCG/OCG/historical foil technologies such as:

* Prismatic Secret variants;
* Extra Secret;
* Ultra Secret;
* Platinum;
* anniversary Secrets;
* Parallel subtypes;
* Holographic Parallel;
* Starfoil;
* Mosaic;
* Shatterfoil;
* Gold families;
* Millennium families;
* special stamped/patterned rares;
* regional promotional holographic treatments.

Do not create inaccurate profiles merely to check boxes.

Research their actual visual behavior.

---

# 123. YU-GI-OH! TAXONOMY REQUIREMENT

Before declaring Yu-Gi-Oh! holo coverage complete:

1. Create a verified rarity/foil inventory.
2. Separate "rarity name" from "actual foil technology."
3. Identify rarities that share the same optical basis.
4. Use aliases/variants where appropriate.
5. Identify substantially different generations of the same named rarity.
6. Distinguish TCG and OCG printing where visually important.
7. Include important historical and promotional parallel technologies.
8. Do not omit a foil merely because it is old.
9. Do not represent a foil inaccurately simply because its rarity is obscure.
10. Maintain a documented mapping from rarity/profile name to actual rendering profile.

"All Yu-Gi-Oh! holos" means comprehensive optical coverage.

---

# 124. REFERENCE-BASED DEVELOPMENT

Accuracy matters.

For recreating established physical foil technologies, do not design them purely from memory.

Where reference access exists:

* study multiple photographs;
* study videos of cards being tilted;
* prefer moving references over flat scans;
* compare multiple cards using the same foil;
* distinguish printing variation from the fundamental foil technology.

A flat scan is insufficient evidence for angular behavior.

The important information is how the material changes while moving.

---

# 125. NEVER COPY CAMERA LIGHTING FROM ONE REFERENCE

A photograph's appearance is a combination of:

* foil;
* light;
* camera;
* exposure;
* card orientation.

Extract the underlying foil behavior rather than reproducing one photograph's rainbow placement.

The digital card must create the effect dynamically.

---

# 126. TEMPORAL COHERENCE

All effects must remain temporally coherent while moving.

There should be no:

* boiling noise;
* pixel popping;
* random hue flicker;
* unstable normals;
* sparkling caused by aliasing instead of material behavior.

Sharp glints may appear/disappear rapidly because that is physically plausible.

Their spatial locations must remain coherent.

---

# 127. NO SCREEN-SPACE FAKE HOLOGRAM

Do not build a screen-space rainbow mask that merely moves when the card moves.

A user rotating the camera/card in arbitrary directions should expose the underlying 3D directional nature of the foil.

The material needs meaningful:

* normal;
* tangent;
* light;
* view;

relationships.

---

# 128. FRONT AND BACK LIGHTING

Because the card can rotate completely, ensure the lighting environment remains visually useful from every orientation.

The back does not need the same foil behavior unless configured.

Do not let the back become completely black simply because the studio rig was only designed for the initial front pose.

---

# 129. EXTREME ANGLES

At grazing angles:

* laminate specular should strengthen;
* printed surface can become harder to see;
* foil may produce compressed/strong directional highlights;
* card thickness becomes visible.

This is an important realism test.

Do not clamp effects merely to keep artwork equally visible at every angle.

---

# 130. DEPTH / EMBOSS IMPLEMENTATION

For textured cards, use the best stable approach available.

Possible combination:

* normal map;
* derived normal from height;
* parallax-like offset if visually useful;
* actual small geometry only when justified.

Avoid unstable deep parallax at grazing angles.

The goal is convincing shallow emboss.

---

# 131. ANISOTROPY

Use anisotropy when it materially contributes.

Examples:

* brushed metallic name foil;
* directional etched linework;
* silk-like original foil;
* narrow streak foil.

Anisotropy direction should be controllable through:

* tangent;
* UV orientation;
* direction map.

---

# 132. CARD ART COLOR PRESERVATION

Holographic brilliance should not destroy the image.

Test:

* black artwork;
* pale artwork;
* saturated red;
* saturated blue;
* skin tones if present;
* small black text;
* white text;
* fine line work.

Ensure spectral compositing preserves legibility.

---

# 133. COLOR MANAGEMENT

Set color spaces correctly.

Color textures should use correct color interpretation.

Data maps must remain data/linear maps.

Do not compensate for incorrect texture color spaces by manually changing colors.

Keep behavior consistent across WebGPU and fallback mode as much as possible.

---

# 134. TEXTURE FILTERING

Use:

* appropriate mipmaps;
* anisotropic filtering;
* high-quality min/mag filters;
* proper texture resolution.

Printed text and fine foil patterns should remain sharp at oblique angles.

---

# 135. TEXTURE RESOLUTION

Do not blindly load absurdly large textures.

Use enough source resolution for close card inspection.

Support high-resolution card art.

Consider separate resolutions for:

* artwork;
* masks;
* fine normals;
* emboss;
* foil-direction maps.

The mask driving a tiny foil engraving may need different resolution characteristics from the base color.

---

# 136. ASSET LOADING

Create a centralized asynchronous asset system.

Requirements:

* caching;
* deduplication;
* loading state;
* failures handled gracefully;
* disposal when appropriate;
* predictable color-space assignment.

Avoid loading the same map multiple times for multiple material instances.

---

# 138. CARD DEFINITION DATA

Cards should be data-driven.

Conceptually:

```text
CardDefinition
{
    id
    title

    dimensions

    frontBaseColor
    backBaseColor

    foilProfile

    foilMask
    secondaryFoilMask
    roughnessMap
    metallicMap
    normalMap
    embossMap
    directionMap
    sparkleMask

    frontMaterialOverrides
    backMaterialOverrides
}
```

Adding a card should not require changing renderer code.

---

# 139. HOLO PROFILE PREVIEWING

Provide a way to switch holo profile without reloading.

Changing profile should:

* preserve card orientation;
* preserve zoom;
* preserve lighting;
* preserve loaded artwork.

This makes comparison useful.

---

# 140. PRESENTATION UI

Keep final UI extremely minimal.

Possible controls:

* Card
* Holo
* Lighting
* Reset
* Fullscreen

And a subtle hint such as:

```text
DRAG — ROTATE
SCROLL — ZOOM
F — FLIP
```

Do not permanently occupy significant screen space.

---

# 141. UI HIDING

Allow controls to fade or collapse after inactivity.

Moving the pointer or pressing a UI hotkey can reveal them.

When hidden, almost the entire viewport should be dedicated to the card.

---

# 142. VISUAL UI STYLE

Use premium neutral styling.

Avoid:

* gamer HUD clutter;
* neon cyberpunk borders;
* excessive gradients;
* giant glass panels;
* decorative animations unrelated to the card.

The hologram supplies the visual spectacle.

The interface should be restrained enough to disappear.

---

# 143. DEVELOPER MATERIAL LAB

Create a separate debug/material-lab interface.

This is not the presentation UI.

Expose useful controls such as:

* profile;
* foil intensity;
* diffraction period;
* diffraction sharpness;
* dispersion;
* spectrum width;
* macro pattern;
* macro scale;
* meso scale;
* micro scale;
* pattern rotation;
* sparkle density;
* sparkle threshold;
* sparkle sharpness;
* sparkle intensity;
* foil roughness;
* laminate roughness;
* anisotropy;
* emboss strength;
* normal strength;
* metallic intensity;
* exposure;
* bloom;
* light intensity;
* light transforms;
* environment intensity;
* camera FOV.

Allow fast iteration.

---

# 144. DEBUG VISUALIZATION MODES

Add development-only modes for visualizing:

* UVs;
* world normals;
* tangent;
* bitangent;
* foil mask;
* secondary mask;
* roughness;
* metallic;
* emboss;
* diffraction direction;
* macro pattern;
* meso pattern;
* sparkle candidates;
* final spectral contribution;
* laminate-only;
* foil-only;
* print-only.

These make shader problems easier to isolate.

---

# 145. CANONICAL TEST CARD

Create one neutral internal test card designed specifically to reveal rendering defects.

Include regions for:

* matte black;
* matte white;
* saturated colors;
* fine text;
* thin line work;
* smooth gradients;
* large foil region;
* tiny foil region;
* embossed region;
* metallic name;
* sharp mask edges;
* soft mask edges.

Use this card when developing the optical system.

---

# 146. ANGLE TEST RIG

Create a development-only deterministic angle test.

Capture/render the card at a fixed set of orientations.

For example:

```text
front
yaw -60
yaw -30
yaw -15
yaw +15
yaw +30
yaw +60

pitch -60
pitch -30
pitch -15
pitch +15
pitch +30
pitch +60

diagonal combinations
grazing views
```

This prevents optimizing a profile for one angle.

---

# 147. LIGHT TEST RIG

Also test each major foil under:

* large soft front light;
* side strip light;
* overhead light;
* dark environment with one strong source;
* normal final studio rig.

The underlying foil should remain believable.

---

# 148. AUTOMATED VISUAL CONTACT SHEET

If practical, create a development utility that captures canonical angles into a contact sheet.

Use it to compare changes.

The purpose is not pixel-perfect regression testing.

The purpose is to make it obvious when:

* a profile works from only one direction;
* a change kills highlights;
* bloom becomes excessive;
* rainbow becomes uniform;
* patterns alias.

---

# 149. SCREENSHOT-DRIVEN ITERATION

During development, continuously inspect actual rendered output.

Do not consider code compilation proof of visual success.

For every major rendering change:

1. run the application;
2. inspect the card;
3. rotate to multiple angles;
4. inspect a close view;
5. inspect grazing view;
6. inspect movement;
7. inspect stopped state;
8. compare against the intended reference;
9. adjust;
10. repeat.

If Astra has browser/screenshot inspection available, use it repeatedly.

Do not implement the entire system blind and inspect only at the end.

---

# 150. QUALITY LOOP

For every holo profile, ask:

* Does it look like foil or colored light?
* Does it respond to both light and view direction?
* Is its spatial pattern attached to the card?
* Is it distinctive from neighboring profiles?
* Does it have macro, meso and/or micro structure appropriate to the foil?
* Do highlights reach convincing intensity?
* Are there calm regions?
* Is there enough angular change?
* Is the artwork still readable?
* Is it temporally stable?
* Does it remain good without bloom?
* Does it work at grazing angle?
* Does it avoid obvious repetition?
* Is the foil structure understandable close-up?
* Does it collapse gracefully at distance?

Do not ship the profile if several answers are no.

---

# 151. MATERIAL COMPARISON MODE

Development-only comparison can be useful.

Allow the same card to switch instantly between two selected profiles.

Optional split-screen is acceptable in debug mode.

Do not make this part of the main presentation unless it is elegant.

---

# 152. GPU PERFORMANCE

Spend GPU resources where they improve the card.

The scene contains essentially one hero object.

It is acceptable for its material to be sophisticated.

However:

* avoid unnecessary per-frame allocations;
* avoid redundant passes;
* avoid redundant texture reads;
* reuse nodes/material resources appropriately;
* avoid dozens of lights;
* avoid giant transparent layers;
* avoid unnecessary shadow maps.

---

# 153. HIGH-END DESKTOP TARGET

The primary experience should be designed for modern desktop hardware and browsers.

Aim for extremely smooth 60 FPS minimum presentation under normal conditions.

Where hardware permits, high-refresh interaction should remain smooth.

Do not sacrifice the entire material quality target to support very weak devices at identical settings.

Use quality tiers if necessary.

---

# 155. DEVICE PIXEL RATIO

Avoid unconstrained DPR on extremely high-density monitors.

Choose an intelligent cap based on:

* output resolution;
* performance;
* quality profile.

The card needs to look sharp without rendering wastefully at extreme internal resolutions.

---

# 156. RESOLUTION ADAPTATION

If dynamic resolution is introduced:

* avoid noticeable oscillation;
* use hysteresis;
* change slowly;
* protect foil microstructure;
* do not constantly shift sharpness while the card moves.

Only add this if needed.

---

# 157. MEMORY

Dispose of:

* obsolete textures;
* geometries;
* render targets;
* materials;

when actually replaced.

Avoid accumulating profile-specific GPU resources after repeatedly switching holos.

---

# 159. BROWSER FAILURE HANDLING

If the user's browser cannot initialize the renderer:

* display a minimal readable error;
* indicate the relevant browser capability;
* do not leave a blank canvas.

Keep error UX simple.

---

# 160. ACCESSIBILITY OF MOTION

The card's optical response fundamentally depends on motion, but decorative automatic motion should respect reduced-motion preferences where reasonable.

Manual rotation remains available.

Do not disable physical interaction.

---

# 161. FULLSCREEN

Support a clean fullscreen presentation.

Fullscreen should hide unnecessary browser-like UI within the app.

The card should reframe correctly on resize.

---

# 162. RESPONSIVE VIEWPORT

Handle:

* desktop widescreen;
* normal laptop;
* portrait mobile;
* landscape mobile;
* resizable windows.

Card framing and controls must adapt.

Do not distort card dimensions.

---

# 163. TOUCH

On touch devices:

* one-finger drag rotates;
* pinch zooms;
* appropriate gesture handling prevents browser scrolling while interacting with the card.

Do not attempt to emulate the `F` keyboard key on touch without providing a small flip control.

---

# 164. ARCHITECTURE

Keep responsibilities separate.

A reasonable structure could resemble:

```text
src/
    app/
        App.ts

    rendering/
        Renderer.ts
        RenderPipeline.ts
        ColorPipeline.ts

    card/
        Card.ts
        CardGeometry.ts
        CardDefinition.ts
        CardController.ts
        CardLoader.ts

    materials/
        CardSurfaceMaterial.ts
        HolographicMaterial.ts
        HolographicProfile.ts

        layers/
            DiffractionLayer.ts
            PatternLayer.ts
            SparkleLayer.ts
            EmbossLayer.ts
            LaminateLayer.ts
            PrintLayer.ts
            MetallicLayer.ts

        profiles/
            original/
            pokemon/
            yugioh/

    lighting/
        LightingRig.ts
        Environment.ts

    camera/
        CameraController.ts

    input/
        PointerController.ts
        KeyboardController.ts

    assets/
        AssetManager.ts

    ui/
        PresentationUI.ts
        DebugUI.ts

    debug/
        AngleTest.ts
        MaterialDebug.ts
        CaptureTools.ts
```

Exact filenames may change.

Maintain equivalent separation.

---

# 165. DO NOT OVER-ABSTRACT TOO EARLY

The architecture should support many profiles.

However, do not create an enormous generic materials framework before proving the optical core.

First make:

1. one exceptional foil;
2. prove the architecture;
3. extract reusable components;
4. expand profiles.

Avoid speculative abstractions with no visual validation.

---

# 166. DEVELOPMENT ORDER

Use this implementation sequence.

## PHASE 1 — FOUNDATION

Build:

* project;
* renderer;
* camera;
* card geometry;
* basic studio light;
* front/back card;
* rotation;
* zoom;
* `F` flip.

The card should already feel premium before holo complexity.

## PHASE 2 — PHYSICAL CARD

Perfect:

* proportions;
* bevel;
* edges;
* laminate;
* print;
* color management;
* sharpness.

## PHASE 3 — HOLO CORE

Create one flagship diffraction foil.

Implement:

* direction field;
* spectral response;
* macro structure;
* microstructure;
* glints;
* masking;
* laminate composition.

Iterate until it is genuinely excellent.

## PHASE 4 — PROFILE FRAMEWORK

Extract:

* reusable modules;
* typed profile data;
* material debug tools.

## PHASE 5 — ORIGINAL PREMIUM FOILS

Build and curate original profiles.

## PHASE 6 — POKÉMON FAMILY

Implement profiles systematically and compare against references.

## PHASE 7 — YU-GI-OH! FAMILY

Implement profiles systematically and compare against references.

## PHASE 8 — POLISH

Tune:

* lighting;
* bloom;
* camera;
* motion;
* UI;
* performance.

## PHASE 9 — QA

Run angle, browser, profile, resolution and performance tests.

Do not skip directly to dozens of profiles before the optical core is excellent.

---

# 167. ASTRA WORKING BEHAVIOR

Treat this as a long-running goal rather than a one-shot coding task.

Work autonomously through the phases.

Do not stop after creating scaffolding.

Do not stop after producing a basic rainbow shader.

Do not declare the goal completed because the requirements technically exist.

Continuously inspect and improve the visible result.

When something looks mediocre, iterate.

When a holo profile is too similar to another, redesign it.

When an implementation shortcut visibly harms the hologram, replace it.

---

# 168. RESEARCH BEFORE ASSUMPTION

For established Pokémon and Yu-Gi-Oh! foil technologies:

* research;
* compare multiple visual references;
* record the defining optical traits;
* implement those traits deliberately.

If reference information conflicts, prefer actual moving card footage and multiple examples over one textual description.

Do not hallucinate certainty.

If a rare regional print is insufficiently documented, structure support for it and mark the precise profile for further reference rather than inventing inaccurate behavior.

---

# 169. DON'T CHASE PERFECT PHYSICS AT THE EXPENSE OF APPEARANCE

The rendering should be physically inspired.

It does not have to simulate nanostructure with laboratory accuracy.

The goal is:

```text
physically believable
+
visually convincing
+
controllable
+
real-time
```

If a full physical model is expensive but a carefully constructed approximation creates the correct moving appearance, use the approximation.

But do not take shortcuts that visibly reduce the material to a generic rainbow.

---

# 170. ART-DIRECTION RULE

The best holo effect is not the effect that has the most rainbow.

Premium materials require contrast.

Use:

* quiet vs bright;
* dark vs reflective;
* silver vs spectral;
* broad vs sharp;
* smooth vs textured;
* ordered vs irregular.

The viewer needs calm regions to appreciate intense flashes.

---

# 171. WHITE SPECULAR IS IMPORTANT

Do not make every highlight colored.

Real premium foil should often produce brilliant white or silver reflections.

Spectral color can surround or separate from those peaks.

This dramatically improves perceived realism.

---

# 172. DARK ANGLES ARE IMPORTANT

Do not force the hologram to remain fully visible at every angle.

Some structures should become dark.

This is desirable.

What matters is that another physically plausible aspect of the material usually remains visually interesting.

The card needs dynamic range across orientation.

---

# 173. NO CONSTANT MAXIMUM EFFECT

At the default front-facing orientation, the flagship card should already look premium.

It should not show every possible holographic effect simultaneously.

Tilting must reveal additional beauty.

The card needs somewhere to go visually.

---

# 174. HIGHLIGHT HIERARCHY

Design at least three highlight levels.

Example:

1. broad laminate highlight;
2. medium foil diffraction;
3. tiny extreme microfacet glint.

This creates depth.

If everything has the same highlight width, the surface feels flat.

---

# 175. PATTERN HIERARCHY

Likewise:

1. macro pattern defines motion;
2. meso pattern identifies foil technology;
3. micro pattern gives material richness.

Not every profile requires all three at equal strength.

---

# 176. EMBOSS HIERARCHY

For textured profiles:

* very broad shallow relief;
* medium engraved structures;
* extremely fine line emboss.

Allow highlights to reveal these scales separately.

---

# 177. NO OBVIOUS PROCEDURAL NOISE

Avoid recognizable default noise.

Do not leave:

* raw Perlin;
* raw simplex;
* raw Voronoi;

visibly recognizable as the final effect.

Noise can be a building block.

Transform and art-direct it.

The viewer should see "foil manufacturing structure," not "shader noise."

---

# 178. NO UV REPETITION

For tiled patterns:

* avoid obvious seams;
* choose scale carefully;
* randomize phase where appropriate;
* use multi-scale breakup.

Ordered foil such as crosshatch may intentionally repeat.

Organic foil should not visibly tile.

---

# 179. MOTION COMES FROM OPTICS

Unless a profile explicitly requires dynamic material animation, holo motion should primarily result from:

```text
card orientation changes
light relationship changes
view relationship changes
```

not:

```text
time += delta
rainbowTexture.scroll(time)
```

This rule is fundamental.

---

# 180. IDLE PRESENTATION

If an idle animation is desired, move the card itself extremely subtly or move one light subtly.

Do not animate the foil independently merely to force activity.

An optional presentation mode may slowly tilt the card by a few degrees when untouched, but manual input should immediately take control.

---

# 181. RESET

Provide a reset command/control.

It should smoothly restore:

* default card orientation;
* default zoom.

Do not abruptly teleport unless a debug reset explicitly does so.

---

# 182. CARD PROFILE TRANSITIONS

When changing holo profile:

* avoid reloading the entire scene;
* avoid camera reset;
* avoid a large loading flash.

If compilation delay is unavoidable, prewarm common materials or provide a subtle transition.

---

# 183. SHADER/Pipeline PREWARMING

If switching to a profile causes a noticeable compilation hitch, investigate:

* shader variants;
* node graph reuse;
* precompilation/prewarming where available;
* shared material modules.

A premium viewer should not hitch every time a foil is selected.

---

# 184. FRAME-TIME TESTING

Measure real frame time.

Do not rely only on FPS counter.

Inspect:

* average;
* spikes;
* profile switch hitch;
* texture upload hitch;
* startup compile;
* interaction frame pacing.

Smooth motion is especially important because holographic perception depends on movement.

---

# 185. QUALITY VALIDATION — ORIGINAL

For every original profile, test:

* front;
* slight tilt;
* moderate tilt;
* strong tilt;
* roll;
* diagonal;
* grazing;
* dark lighting;
* bright lighting;
* close-up;
* normal distance;
* stationary;
* fast spin.

Delete weak profiles.

---

# 186. QUALITY VALIDATION — ESTABLISHED FOILS

For each Pokémon/Yu-Gi-Oh! profile:

Compare against multiple references.

Check:

* coverage;
* pattern;
* direction;
* scale;
* color behavior;
* metallic vs spectral balance;
* emboss;
* sparkle;
* text foil;
* border behavior;
* special marks.

A profile that merely "looks cool" but does not resemble the intended technology is not complete.

---

# 187. PROFILE DOCUMENTATION

Keep a small developer-facing description for each profile.

Record:

```text
visual target
coverage
macro pattern
micro pattern
directionality
emboss
sparkle
special masks
known variants
reference notes
```

This will prevent future profiles from becoming inconsistent.

---

# 188. PERFORMANCE VALIDATION

Test especially expensive profiles:

* Starlight-style;
* dense sparkle;
* embossed/textured;
* layered full-card foil.

Determine which operations actually dominate GPU cost.

Optimize based on evidence.

Do not prematurely simplify visually important operations.

---

# 189. RESPONSIVE QUALITY

A resize should not:

* reset orientation;
* lose profile;
* distort the card;
* blur textures permanently;
* break post-processing.

Recalculate camera framing correctly.

---

# 190. ERROR HANDLING

If a card asset is missing:

* use placeholder;
* report clearly in debug console/UI;
* continue rendering.

If an optional mask is missing:

* use a defined neutral fallback;
* do not crash.

---

# 191. CODE QUALITY

Use:

* strict TypeScript;
* descriptive types;
* clear ownership of GPU resources;
* small focused modules;
* comments for non-obvious optical math;
* documentation for profile parameters.

Do not comment obvious syntax.

Document why the diffraction math works the way it does.

---

# 192. NO MAGIC NUMBERS

Important optical constants and artistic tuning parameters should be:

* named;
* profile-driven;
* documented where necessary.

Do not scatter unexplained values throughout TSL graphs.

---

# 193. DETERMINISTIC RANDOMNESS

Procedural foil placement should use stable deterministic seeds.

Reloading the page should not arbitrarily change a card's physical foil layout unless explicitly configured.

Different card definitions may choose different seeds.

---

# 194. PER-CARD FOIL VARIATION

Later, allow a deterministic seed to generate subtle manufacturing variation.

This can alter:

* sparkle placement;
* foil phase;
* Cosmos circle placement;
* tiny microstructure.

Do not let this fundamentally change the named foil technology.

---

# 195. HARD FAILURE CONDITIONS

The goal is NOT complete if any of the following are true:

* the holo is mainly a moving rainbow texture;
* foil color is determined only by Fresnel;
* all profiles visibly share one generic effect;
* patterns move through screen space;
* sparkle flickers randomly every frame;
* rotation uses gimbal-prone Euler manipulation;
* `F` instantly swaps textures;
* card has no thickness;
* bloom creates most of the perceived quality;
* profiles look good only from one angle;
* artwork becomes unreadable;
* edge-on view exposes fake plane construction;
* every profile is equally bright;
* mobile/resize breaks card framing;
* WebGPU architecture uses obsolete WebGL hacks unnecessarily;
* the project stops at a prototype-quality shader.

---

# 196. DEFINITION OF PREMIUM

"Premium" means:

* precision;
* restraint;
* depth;
* sharpness;
* responsiveness;
* controlled highlights;
* strong materials;
* excellent motion;
* no obvious shortcuts;
* no visual noise without purpose.

It does NOT simply mean:

* more bloom;
* more glow;
* more saturation;
* more effects;
* more UI;
* more particles.

---

# 197. FINAL ACCEPTANCE CHECKLIST

The project is complete only when all of the following are true:

* modern Three.js WebGPU architecture is used;
* TSL/node materials drive the custom holo system;
* the modern rendering/post pipeline is used;
* WebGL 2 fallback works where supported;
* card geometry is truly 3D;
* corners are rounded;
* edges are visible and believable;
* front and back are independent;
* laminate looks separate from print;
* card rotates freely around all axes;
* quaternion manipulation is stable;
* movement feels premium;
* inertia feels premium;
* slow angular control is precise;
* zoom is smooth;
* `F` performs a physical animated flip;
* repeated flips remain stable;
* user orientation survives flipping;
* card remains sharp;
* color management is correct;
* lighting resembles a controlled product studio;
* reflections reveal the foil;
* HDR highlights remain detailed;
* bloom is restrained;
* holo responds to view direction;
* holo responds to light direction;
* holo structure is physically attached to the card;
* diffraction is more sophisticated than an HSV ramp;
* white/silver specular highlights coexist with spectral color;
* macro foil structure exists where appropriate;
* meso foil structure exists where appropriate;
* micro foil structure exists where appropriate;
* sparkle is deterministic;
* sparkle behaves angularly;
* microstructure does not alias excessively;
* emboss affects lighting;
* masks control foil placement;
* text/metallic areas can have independent materials;
* profiles are data-driven;
* profile switching is fast;
* original profiles are curated for quality;
* weak original profiles are not shipped;
* Pokémon Starlight/Galaxy-Star behavior exists;
* Pokémon Cosmos behavior exists;
* Pokémon Tinsel behavior exists;
* Pokémon Sheen behavior exists;
* Pokémon Water-Web behavior exists;
* Pokémon vertical-line behavior exists;
* Pokémon Mirage behavior exists;
* Pokémon Cracked-Ice behavior exists;
* Pokémon Crosshatch behavior exists;
* Pokémon Sequin/Confetti behavior exists;
* Pokémon Pixel behavior exists;
* Pokémon reverse-holo architecture exists;
* major historical reverse patterns are represented;
* modern patterned reverse holos are represented;
* textured full-art treatment exists;
* rainbow premium treatment exists;
* gold premium treatment exists;
* additional materially distinct Pokémon foil families discovered during reference research are added;
* Yu-Gi-Oh! Super-style foil exists;
* Ultra-style foil exists;
* Secret-style foil exists;
* Prismatic Secret-style foil exists;
* Platinum Secret-style foil exists;
* Ultimate-style embossed foil exists;
* Prismatic Ultimate-style foil exists;
* Ghost-style foil exists;
* Collector's-style foil exists;
* Prismatic Collector's-style foil exists;
* Starlight-style foil exists;
* Quarter Century-style foil exists;
* Platinum-style variants exist;
* Parallel architecture exists;
* Starfoil exists;
* Mosaic exists;
* Shatterfoil exists;
* Duel-Terminal/patterned parallel architecture exists;
* Gold exists;
* Gold Secret exists;
* Premium Gold exists;
* Ghost/Gold composition is supported;
* Pharaoh-style patterned foil is supported;
* Millennium-style patterned foil architecture is supported;
* historical/regional materially distinct Yu-Gi-Oh! foils discovered during reference research are added;
* established foil profiles are checked against references;
* profiles do not simply differ by rainbow hue;
* rendering stays temporally stable;
* foil remains interesting when slowly tilted;
* foil remains impressive during rapid movement;
* foil survives close inspection;
* card remains attractive while stationary;
* the application feels intentional rather than like a shader demo.

---

# 198. FINAL VISUAL TARGET

The finished viewer should create moments where the user rotates the card by only a few degrees and suddenly:

* a previously dark region erupts into a narrow rainbow;
* a white glint shoots along an embossed line;
* several microfacets flash;
* a Cosmos swirl becomes visible;
* a cracked-ice shard changes from blue to silver;
* a Secret-style prismatic streak travels across artwork;
* a Starlight-style surface explodes into fine spectrum;
* a textured foil reveals physical depth;
* a gold stamped region catches an almost-white metallic reflection;
* a Ghost-style image appears and disappears;
* an etched original foil reveals a pattern that was invisible one moment earlier.

These moments are the product.

The card should reward deliberate movement.

The user should naturally want to keep tilting it.

---

# 199. FINAL RULE

Whenever there is a choice between:

A technically complete holographic implementation that looks merely "good"

and

additional iteration that can make the foil genuinely exceptional,

continue iterating.

Do not optimize for the fastest path to checking requirements off a list.

Optimize for the best real-time holographic card presentation that can reasonably be produced in a modern browser.

The benchmark is not:

"Does this look like a web shader?"

The benchmark is:

"Does this feel like I am holding an extremely expensive physical holographic card under carefully designed studio lighting?"

Continue until the answer is convincingly yes.

200. REAL POKÉMON AND YU-GI-OH! CARDS

The application should display actual Pokémon and Yu-Gi-Oh! cards, not generic substitutes or original cards standing in for them.

The Pokémon and Yu-Gi-Oh! holographic profile systems should be demonstrated and validated using the real cards those foil treatments are associated with whenever the necessary card assets are available.

The card viewer must support importing and displaying high-resolution front and back card images for real cards.

Do not redesign the actual card faces into generic approximations.

Preserve the visual identity of the source card:

original card artwork;
borders;
typography;
frame;
icons;
attribute/type areas;
rarity markings;
set information;
printed colors;
card back;
other visible printed details.

The holographic renderer should enhance the physical foil behavior without destroying or unnecessarily altering the original printed design.

The goal is for a card to appear as though the real printed card has been physically recreated in 3D and placed under premium studio lighting.

The holographic system must therefore distinguish between:

printed artwork;
printed text;
card frame;
border;
metallic text;
foil artwork;
reverse-holo regions;
textured regions;
embossed regions;
special rarity stamps;
logos or watermarks;
card-stock regions;
laminate.

Do not simply place a full-screen holographic effect over the scanned card.

For each real card, create or support the masks required for its correct foil treatment.

For example, one card may require:

Artwork:
Cosmos foil

Frame:
Normal printed ink

Name:
Normal print

Card body:
Normal print

Laminate:
Full surface

Another may require:

Artwork:
Normal print

Card body:
Reverse holo

Type symbols:
Patterned diffraction

Text:
Protected from excessive foil

Laminate:
Full surface

Another may require:

Artwork:
Secret-style prismatic foil

Card name:
Independent metallic/prismatic foil

Frame:
Normal print

Attribute:
Normal print

Laminate:
Full surface

And a premium card may require:

Entire front:
Premium holographic substrate

Artwork:
Selective stronger diffraction

Emboss:
Independent height map

Name:
Metallic foil

Borders:
Etched foil

Special stamp:
Independent reflective mask

Laminate:
Full surface

The renderer must be capable of reproducing these distinctions.

Real Card Asset Pipeline

Build a clean card-asset pipeline capable of accepting:

high-resolution front image;
high-resolution back image;
foil coverage mask;
secondary foil mask;
metallic text mask;
emboss/height map;
roughness map;
normal map;
diffraction-direction map;
pattern mask;
stamp/watermark mask;
optional manually authored correction masks.

A real card should be describable through data rather than requiring renderer modifications.

Conceptually:

RealCardDefinition
{
    id
    franchise
    cardName
    set
    cardNumber
    dimensions

    frontTexture
    backTexture

    holoProfile

    artworkMask
    foilMask
    secondaryFoilMask
    metallicTextMask
    borderMask
    embossMap
    roughnessMap
    normalMap
    directionMap
    specialStampMask

    profileOverrides
}
Holographic Accuracy Per Card

Do not automatically assign a foil profile solely from how rare a card appears.

The actual foil technology of the specific card matters.

Where multiple printings of the same card exist, allow them to be separate card definitions.

For example, the same card artwork may exist as:

non-holo;
standard holo;
reverse holo;
promotional holo;
premium textured version;
regional printing variant.

These should not be treated as the same rendered material.

Similarly, Yu-Gi-Oh! cards may exist in several rarity printings whose foil treatments differ dramatically.

The viewer should be capable of displaying the specific printing.

Card Selection

The card-selection system should be simple and visual.

It should allow the user to select among available Pokémon and Yu-Gi-Oh! cards without turning the project into a collection-management application.

Useful organization may include:

ALL

POKÉMON
YU-GI-OH!
ORIGINAL

Then optionally:

SERIES / SET
RARITY / FOIL FAMILY

Keep this lightweight.

The purpose of selecting cards is to inspect their rendering.

Do not add:

ownership states;
prices;
trading;
inventory systems;
collection completion percentages;
pack opening;
deck construction.
Default Showcase Cards

Choose especially visually interesting cards as showcase examples for major holo profiles.

The default set should demonstrate the renderer's range.

Include examples that stress:

dark artwork;
bright artwork;
detailed artwork;
metallic names;
full-card foil;
partial artwork foil;
reverse holo;
heavy texture;
gold foil;
extremely fine prismatic foil;
Ghost-style foil;
strong Cosmos structures;
large cracked-ice structures;
etched/embossed premium cards.

Do not choose cards only because they are famous.

Choose examples that clearly demonstrate the associated optical technology.

Physical Dimensions

Respect the physical dimensions and proportions of each card family.

Pokémon and Yu-Gi-Oh! cards should not be forced onto one identical card mesh if their real proportions differ.

The 3D object should automatically use the correct physical aspect ratio and dimension preset.

The camera should compensate so either format still fills the viewport appropriately.

Original Cards

The original-card category remains supported.

Original cards should use the curated premium holographic treatments defined elsewhere in this goal.

They should not replace Pokémon or Yu-Gi-Oh! examples.

They exist as an additional showcase for holographic treatments designed specifically for this renderer.

Core Requirement

When viewing a Pokémon or Yu-Gi-Oh! card, the goal should be:

"This looks like that actual physical card exists inside the screen."

The source card design should remain faithful.

The 3D construction, lighting, laminate, emboss, metallic response and holographic foil should provide the physical realism that a flat card image cannot.

# 201. UI ART DIRECTION — 95% BLACK / 5% GOLD

The final presentation UI must use a strict premium black-and-gold design system.

The visual balance should be approximately:

```text
95% BLACK / DARK NEUTRALS
5% GOLD
```

This ratio should remain consistent across the application.

The UI must be extremely minimal.

Do not add tutorial text, control hints, decorative labels, instructional overlays, filler copy, status messages, or unnecessary interface elements.

Do not display things such as:

```text
DRAG TO ROTATE
SCROLL TO ZOOM
F TO FLIP
```

The interaction should be intuitive enough that permanent hints are unnecessary.

The card must remain the dominant visual element at all times.

## Overall Direction

The interface should feel like a luxury product viewer, not:

* a game HUD;
* a trading-card game menu;
* an admin dashboard;
* a generic website;
* a sci-fi cockpit;
* an arcade interface;
* a mobile-game UI.

The design should be extremely restrained.

Most of the screen should contain:

```text
dark environment
+
3D card
```

Everything else should exist only when required to control the viewer.

## Black Foundation

Use black and extremely dark neutral surfaces for almost the entire application.

Recommended conceptual range:

```text
Main Background:
#040404 – #070707

Secondary Surface:
#090909 – #0D0D0D

Elevated Surface:
#101010 – #151515

Subtle Divider:
#1A1A1A – #202020
```

These are starting references rather than mandatory values.

The result should clearly read as black.

Do not drift toward:

* medium grey;
* blue-black;
* purple-black;
* colored gradients.

The card itself supplies the color.

## Gold Accent

Gold should account for approximately 5% or less of the interface.

Use it only where it communicates:

* selection;
* focus;
* active state;
* premium hierarchy;
* a small important control.

Suitable conceptual colors:

```text
Primary Gold:
#C8A45B

Bright Gold:
#E2C27A

Dark Gold:
#7D6230
```

Tune these visually.

The gold should feel like refined metal rather than yellow UI paint.

Avoid:

* neon yellow;
* orange;
* highly saturated gold;
* glowing gold;
* casino aesthetics.

## Gold Usage Rule

Gold should mostly appear as:

* thin strokes;
* selected text;
* small indicators;
* active icons;
* tiny separators;
* selected-card borders;
* active-profile markers.

Do not use:

* large gold panels;
* full-width gold bars;
* large gold buttons;
* gold page backgrounds;
* large gold gradients;
* gold around every element.

If too many elements use gold, reduce it.

## Typography

Use clean modern typography.

Primary information:

* soft white;
* very light neutral grey.

Secondary information:

* muted grey.

Gold text:

* selected state;
* active value;
* occasional high-priority label.

Do not make every heading gold.

Do not use ornate fantasy fonts.

Do not use decorative trading-card typography for application controls.

The UI should feel precise and expensive.

## Controls

Only expose controls that are actually useful.

Primary presentation controls should be limited to things such as:

* card selection;
* holo selection;
* lighting selection if needed;
* reset;
* fullscreen.

Do not add controls simply because the underlying renderer has parameters.

Shader tuning belongs in the developer interface.

The normal viewer should not expose technical settings.

## No Persistent Help UI

Do not include:

* keyboard cheat sheets;
* control instructions;
* tooltip clutter;
* tutorial cards;
* onboarding panels;
* "how to use" overlays;
* decorative captions describing obvious functionality.

Keyboard and pointer controls should simply work.

If accessibility requires a discoverable control, make it available through the relevant actual control rather than permanently displaying instructions.

## Card Selector

Card selection should remain compact.

The card browser may use:

* thumbnails;
* names;
* simple category filtering.

Do not make the browser dominate the viewport.

When closed or inactive, it should consume almost no visual attention.

Card thumbnails themselves provide color.

The surrounding browser remains black.

The selected card may use a very thin gold border or similarly small gold state.

## Hologram Selector

The holo selector should be compact and direct.

Its purpose is simply to choose the active foil treatment.

Use:

* dark background;
* light text;
* gold selected state.

Do not surround profile names with unnecessary descriptions in the main presentation UI.

Detailed technical descriptions belong in development tools or secondary information views.

## Pokémon / Yu-Gi-Oh! / Original Categories

If categories are exposed, use simple filtering.

For example:

```text
ALL
POKÉMON
YU-GI-OH!
ORIGINAL
```

Inactive categories:

* muted neutral.

Active category:

* gold.

Do not recolor the application shell based on franchise.

Do not introduce Pokémon blue/red or Yu-Gi-Oh! purple into the interface.

The displayed cards provide enough franchise-specific color.

## Buttons

Buttons should be predominantly black.

Default:

```text
dark surface
light neutral label
very subtle border
```

Hover:

```text
slightly brighter dark surface
small gold response
```

Active:

```text
dark surface
gold label, icon, or thin border
```

Pressed:

```text
small tonal change
```

Avoid large solid-gold buttons.

## Icons

Use simple monochrome icons.

Default:

* white/grey.

Active:

* gold.

Avoid multicolor icons.

Avoid decorative icon frames.

Avoid icon animation unless it directly communicates state.

## Borders

Most elements should not need visible borders.

When a border is useful:

* use a very dark neutral line;
* keep it thin.

Selected elements may use a thin gold stroke.

Do not outline every panel.

Do not use double borders or ornamental corners.

## Panels

Avoid panels unless they solve a real layout problem.

When panels are needed:

* use near-black;
* use very small tonal separation from the background;
* keep padding clean;
* avoid heavy shadows;
* avoid glassmorphism.

Do not cover large portions of the viewport with translucent black rectangles.

## Layout

The 3D card should occupy the visual center of the application.

Controls should live at the edges of the composition.

The center should remain visually clean.

Do not place UI directly over important parts of the card unless unavoidable.

The composition should feel intentionally empty around the card.

Negative space is part of the premium presentation.

## Viewport Integration

Do not make the experience look like a webpage containing a rectangular 3D canvas.

The 3D environment and the UI should appear to be one continuous visual surface.

The dark background of the scene and application shell should blend together.

Avoid obvious viewport frames.

Avoid browser-dashboard composition.

## Animation

UI motion should be minimal.

Use:

* short fades;
* small opacity changes;
* restrained position transitions;
* subtle hover transitions.

Avoid:

* bounce;
* springy motion;
* exaggerated scaling;
* spinning icons;
* sliding panels across the entire screen;
* unnecessary animated decoration.

The card is the animated centerpiece.

## Hover States

Hover states should be noticeable enough to communicate interaction without becoming visually loud.

Prefer:

* slight brightness change;
* subtle gold text/icon transition;
* thin gold edge.

Do not create strong glows.

## Gold Rendering

Gold UI should normally remain flat or nearly flat.

If a metallic gradient is used, it must be extremely subtle.

Do not attempt to make every UI element look physically metallic.

The actual holographic card should retain the most sophisticated materials in the scene.

## No UI Glow

The interface should not use significant bloom.

Gold does not need emission.

White text does not need bloom.

The only visually intense glow/highlight behavior should primarily come from the card.

## No Decorative Noise

Do not add:

* grids;
* scanning lines;
* particles;
* fake holographic interface effects;
* corner decorations;
* random technical numbers;
* fake telemetry;
* animated lines;
* decorative charts;
* card-game flourishes.

Every visible UI element must have a purpose.

## Information Density

Prefer showing fewer things.

If information can remain hidden until the user opens a selector, hide it.

The default viewing state should contain almost nothing except:

* card;
* minimal active controls if necessary.

Avoid permanent labels for information the user already knows from their selection.

## Fullscreen Presentation

Fullscreen should reduce the interface even further.

The ideal fullscreen state is nearly:

```text
BLACK BACKGROUND
3D CARD
```

with only essential controls available when needed.

## Responsive Behavior

On smaller displays:

* collapse controls;
* keep the card large;
* do not stack numerous permanent interface panels;
* prioritize the card over metadata.

On larger displays:

* do not fill empty space with more UI merely because space exists.

Use the extra space as negative space.

## Developer UI

The developer/material-lab UI is exempt from the extreme minimalism requirement when controls are necessary for tuning.

However, its chrome should still broadly use the same:

```text
black
grey
gold
```

design system.

Technical debug visualization colors may differ when necessary.

The developer UI must remain completely separate from the polished presentation UI.

## Final Visual Hierarchy

The application should follow this hierarchy:

```text
1. HOLOGRAPHIC CARD
2. ACTIVE SELECTION / GOLD ACCENT
3. ESSENTIAL WHITE/GREY UI
4. EVERYTHING ELSE
```

The application color hierarchy should be:

```text
BLACK:
environment and interface

WHITE / GREY:
functional information

GOLD:
active state and premium accent

FULL SPECTRUM:
holographic card only
```

## Final UI Quality Check

Before considering the UI finished, verify:

1. The card is immediately the first thing the eye notices.
2. Roughly 95% of the application shell reads as black/dark neutral.
3. Gold usage is sparse.
4. There are no permanent interaction hints.
5. There is no filler copy.
6. There are no decorative UI elements without function.
7. The application does not look like a dashboard.
8. Controls do not compete with the card.
9. Fullscreen presentation can become almost entirely card and darkness.
10. The holographic card remains by far the most colorful and visually complex object.

The final design principle is:

```text
95% BLACK
5% GOLD
ZERO CLUTTER
CARD FIRST
```
