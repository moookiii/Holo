# Retired lower 151 Double Rare profile

At the user's request, the lower duplicate `151 · Double Rare` profile (`sv_tcgl_ex_holo`) was removed from the material picker. Its legacy identifier now resolves to `sv_tcgl_illustration_holo`, preserving saved card/profile references. All 277 existing registrations using that identifier now resolve to Illustration Rare, including SV alternate printings. The upper entry (`pokemon151_ex_holo`) remains Double Rare.

The importer now chooses Illustration Rare for smooth SUN_PILLAR additions so regenerated records follow this choice. Exact card fronts, masks and normals were not modified. Existing etched cards retain their authored normal maps and required finish overrides. Smooth redirected cards no longer receive the Double Rare optical override.

Validation: five SV additions regression tests and TypeScript checking passed. Live picker inspection confirmed only the upper Double Rare entry remains. Alternate Charmander (`svalt-32:holo`) was checked in the lab with Illustration Rare selected.
