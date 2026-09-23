# Fire and Grass correction evidence

Both existing SVG contours are **user-rejected drafts**. Their presence in the
component library and passing serialization tests do not establish accuracy.
Do not promote them into family masters until they have been retraced and
visually checked. The index now records this rejection explicitly.

Reproduce these sheets with:

```powershell
python scripts/reverse_ink/repeated_symbol_evidence.py
```

The sheets compare three occurrences on each of three photographs per family.
`regions.json` records exact card-space rectangles and normalized pixel bounds.
No contrast enhancement, thresholding, or contour fitting is applied. Magnified
pixels add no source detail. Columns have different orientation and scale.

## What changes the next tracing pass

- Grass: the unobscured Bulbasaur center and Caterpie upper-left leaf expose
  considerably thinner, tapered secondary veins than the draft cutout. The
  larger lower-left occurrence confirms the taper of the upper branches but
  cannot establish the lower branches because the divider crosses them.
  Trace the central Bulbasaur negative-space boundary again, checking branch
  widths against the Caterpie upper-left occurrence after a measured similarity
  transform. Do not globally shrink the cutout: that also changes branch tips
  and the main stem.
- Fire: Vulpix's central rules cross the internal flame. Its upper-left
  occurrence exposes the interior without rules, including the separated
  pointed lobes that were lost in the draft. Use that occurrence to constrain
  topology before fitting any curves. Charmander's central occurrence is an
  independent check; its grain makes small boundary positions uncertain.
  The lower-left occurrences establish only exposed upper-curl geometry;
  their dividers conceal the middle.

These sheets are tracing evidence, not corrected assets. The other nine
components retain their existing review status; this correction does not
establish their acceptance or complete the Step 1 master reconstruction.
