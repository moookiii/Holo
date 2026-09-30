# Bird refinement review scope

This is a continuation of the existing hand-authored Holo bird, not a new generated factory. The user explicitly requires preserving the artifact registry, renderer, interaction, inspection, and authored explosion systems. The img2threejs references are being used for reference analysis and bounded visual review; its replacement factory, rig, collider, picking, and emission stages do not apply to this scope. No full strict skill-pipeline pass is claimed.

Primary reference: public/artifacts/robotic-bird-reference-02.png. Earlier side reference: public/artifacts/robotic-bird-reference.png. These are distinct artistic representations, not calibrated views of one measured object.

## Observations and target

- Object domain: electromechanical bird specimen. Suitability conditional: visible silhouette, acrylic, circuit boards, cable colors, and brass gears are clear; exact dimensions and hidden-side layout are not recoverable.
- Macro: rounded tapered torso, continuous neck/head transition, paired lateral wing sheets, layered tail, two narrow articulated legs, three forward toes and a rear toe on each foot.
- Meso: camera barrels, populated green circuit boards, exposed gear train, mounting cheek plates, cross-body shafts, shoulder and belly hardware, routed cable bundles.
- Micro: bevels and cut acrylic edges, screw heads, washers, board standoffs, chip pins, through-hole contacts, capacitors, header sockets, solder pads, traces, silk marks, cable clamps, toe collars and claw tips.
- Spatial relationships: side boards overlap a central frame, but must expose the main gear; cable endpoints terminate at socket coordinates; shelves and cross-shafts span the lateral dimension. Wing and body panels overlap. Axles and articulated legs share pivot centers.
- Materials: transparent dielectric shell with low roughness, slightly rougher cut edges; green dielectric PCB substrate; rough black chip encapsulation; low-roughness steel/solder; medium-roughness brass; moderately glossy pink/teal insulation. No brightness-derived relief or photo projection.
- Color/finish: clear neutral shell, dark green boards, brass gears, pink and teal wires, silver mechanisms, black optical center. Printed microscopic legends are approximated.
- Unknowns: hidden internals, depth dimensions, precise shell thickness, circuit topology, and gear ratio. Authored estimates with deliberate reverse-side asymmetry are authorized by the user.

## Quality contract for this refinement

Critical: full torso volume in frontal/rear views; acrylic panel boundaries and readable internals; dense mounted electronics at several depths; leg/toe articulation; preserved shared viewer behavior. Target is a convincing procedural browser interpretation, not a photoreal or engineering reconstruction.

Review evidence: artifacts/bird-refinement/*.png and browser-report.json. Full rotation: reference side, front three-quarter, front, opposite front three-quarter, opposite side, rear three-quarter, rear, reference rear three-quarter; also above and below. Corrections after adopting the skill are capped at three grouped passes. Current correction: support material and upper harness routing. Build, disposal, material state, resource budgets, and interaction checks are separate from visual acceptance.
