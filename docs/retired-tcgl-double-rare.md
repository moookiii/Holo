# Retired lower 151 Double Rare profile

## Corrected routing (2026-10-08)

The blanket Illustration Rare redirect below was too broad. Exact TCGL variant
IDs now route 217 smooth SUN_PILLAR Double Rare printings (including 47 promos)
to the surviving `pokemon151_ex_holo` (`151 · Double Rare`) material. Forty
SV_ULTRA etched Double Rares instead use `prismatic_sir_texture` with their
existing exact-card normals and Sylveon/Espeon finish overrides. No etch
conversion or mask regeneration was performed.

The remaining 20 historical registrations are not Double Rare source variants
and retain the Illustration Rare alias. Actual Illustration Rare cards,
including ex promos SVP 27 and 29, retain their illustration treatment.
`repair_sv_double_rare.py` applies the source-variant audit to manifests and
generated registrations; both import paths preserve these choices on rebuild.
Fronts, PNG maps, source evidence, 151, Prismatic and unrelated cards are
unchanged. Automated routing checks do not establish physical-copy calibration;
no new physical-photo or live appearance review was performed for these cards.

Validation: nine SV additions/Double Rare tests passed, the three affected
routing tests passed again after final routing, and TypeScript/Vite production
build passed. Diff inspection verified all 257 changed printings alter only
profile labels in their manifests and generated registrations.

## Historical redirect

At the user's request, the lower duplicate `151 · Double Rare` profile (`sv_tcgl_ex_holo`) was removed from the material picker. Its legacy identifier now resolves to `sv_tcgl_illustration_holo`, preserving saved card/profile references. All 277 existing registrations using that identifier now resolve to Illustration Rare, including SV alternate printings. The upper entry (`pokemon151_ex_holo`) remains Double Rare.

The importer now chooses Illustration Rare for smooth SUN_PILLAR additions so regenerated records follow this choice. Exact card fronts, masks and normals were not modified. Existing etched cards retain their authored normal maps and required finish overrides. Smooth redirected cards no longer receive the Double Rare optical override.

Validation: five SV additions regression tests and TypeScript checking passed. Live picker inspection confirmed only the upper Double Rare entry remains. Alternate Charmander (`svalt-32:holo`) was checked in the lab with Illustration Rare selected.
