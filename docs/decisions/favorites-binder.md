# Favorites binder construction and input

Accepted from the user's correction round on 2026-10-05.

## Decisions

- One binder contains 20 physical double-sided sheets: 40 faces, 480 positions.
- Open at the first interior spread, with 24 positions visible.
- Pages emerge from a common curved binding region and settle onto the left/right stacks.
- Pressing anywhere on a visible page establishes a potential grab. Movement beyond the click threshold turns the page. A plain card click opens the existing card viewer.
- Hover changes only the cursor; it never lifts or turns a page.
- Rotation requires a press outside all binder geometry. Starting on the shell, spine or pocket cannot rotate the binder.
- Framing remains fixed during turns and wheel input. Responsive viewport fitting is retained.
- Keep the dark reference palette, lifted to charcoal so weave, film and hardware remain readable.
- Straight perimeter segments and fixed padding boundaries replace deformed silhouette edges.
- Zipper teeth use staggered interlocking shapes and a restrained metal finish; tape and slider remain separate materials/geometry.

## Glossary

Sheet: one physical double-sided leaf.
Face: one side of a sheet, with twelve pockets.
Spread: the two faces exposed at an opening; the cover openings expose one pocket face.
Grab: a pointer gesture started on a page, activated by movement beyond the click threshold.
Orbit: rotation gesture whose initial press misses every part of the binder.
Separator: the dark backing inside a sheet, beneath the transparent pocket film.
Weld: the sealed channel between pockets, including recessed perforation impressions.

The user invoked grill-with-docs. Its grilling dependency was read and the user
confirmed the open interaction/color decisions. Its domain-modeling dependency was
not available locally; this ADR and glossary record the confirmed design directly.
