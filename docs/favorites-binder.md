# Favorites binder

Favorites now opens a physical Three.js binder inside the existing gallery session.
The reference photo governs the four-column, three-row layout: the user resolved
the contradictory nine-card instruction in favor of **12 cards per page / 24 per
spread**. Card and pocket measurements remain in Holo's centimetre coordinate system.

`GalleryFavorites`, its storage key, canonical IDs, Shift + click interaction, and
catalog ordering are unchanged. The binder displays the full favorite collection
in that order. Gallery filters and scroll position are retained for exit. Inspection
uses the existing viewer transition; opening Gallery again returns to the same
binder spread. Removing favorites clamps an out-of-range spread to the last spread.

## Rendering and lifetime

- `BinderScene` builds a rounded padded cover, zipper piping, stitches, spine,
  five separated backing layers on each side, and individually welded sleeve film.
- Every occupied pocket holds a real `CardInstance`, realized through the existing
  `CardCpuPreparation` and `CardFactory`. Card geometry, fronts, profiles, masks,
  normals, etching, foil, and stock/edge materials are preserved. No card snapshots
  or substitute card shaders are used. No etched-card assets or registrations change.
- Separate thin, slightly rippled physical film sits above each card. Alpha blending
  provides restrained transparent plastic without a glass transmission pass.
  Bump grain on the black cover is an authored PNG in `public/binder/`.
- The existing StudioLighting rig is temporarily enlarged for the binder's physical
  scale, then restored for gallery/viewer use. The same preset controls remain available.
- Only the visible spread and one neighbor can hold live card instances: **48 cards
  maximum**, independent of collection size. Foreground cards prepare first; a neighbor
  prepares sequentially afterward. Uploads yield between textures, shader programs
  use the existing factory cache/compile infrastructure, and inspection cancels neighbor
  work before entering the viewer. CPU cancellation does not wait on an unrelated
  asset decode; an active GPU compilation unwinds before the viewer begins.
- Departed pages dispose their card instances and sheet geometries. The factory's
  existing 32 MiB idle texture cache bounds released GPU texture retention. Hiding
  Favorites disposes the binder factory. Shared CPU preparation remains under Holo's
  existing cache ownership; the binder does not retain a separate full-collection cache.

## Motion and input

Page motion integrates a traveling tangent field across a subdivided sheet.
Unoccupied weld channels carry the curvature while rigid card stock follows each
pocket's tangent. Front and reverse page contents share the moving sheet; the next
stationary page remains underneath. Smooth easing, a restrained relaxation term,
and a temporary camera pullback keep the raised page legible while crossing the spine.
Input is locked during preparation/turning. Reduced-motion mode uses a short turn.

Page-edge clicks, arrow buttons, and arrow keys turn spreads. Dragging tilts the binder
within a small range; wheel zoom is bounded. Projected card bounds support pointer
inspection and Shift + click removal. Keyboard-focusable card buttons also support
Enter and Shift + Enter. The sheet is a deterministic deformation, not cloth simulation;
card stock stays rigid. Plastic is an approximation of thin sleeve film rather than
measured optical data.

## Verification

`tests/binder-layout.test.ts` checks pocket counts, incomplete pages through 10,000
entries, locked rapid input, repeated forward/back navigation, clamp behavior,
curvature, and landing registration. Existing favorites and indexed-query tests
verify unchanged persistence and ordering.

`scripts/binder-check.mjs` exercises 0, 1, 9, 10, 12, 13, 18, 19, 24, 25, 49, and
1,000 favorites in the live renderer; captures the turn midpoint, incomplete spreads,
viewer return, tilt, lighting, and desktop sizes; verifies authored Espeon/Sylveon
materials; and tests removal plus the gallery's original star mechanism. Captures
and a JSON report are saved under `artifacts/favorites-binder/` (ignored by Git).

The existing `tests/gallery.test.ts` Base Set master-card assertion fails in the
supplied working tree (`pokemon:base1-1:holo` versus `alakazam-base-set`). The binder
does not modify that query/master-card logic or the user's pre-existing set changes.
Screenshots establish rendered appearance only; no new physical groove-depth claim
is made, and unchanged etched cards retain their existing source evidence.
