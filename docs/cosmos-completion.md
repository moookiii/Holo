# Shared promo Cosmos completion

The user explicitly approved the existing shared Cosmos treatment for unfinished
promo printings. All 148 Sword & Shield Cosmos printings (84 Black Star Promos,
64 alternate product printings) and 19 MEP Cosmos promos now use `svp-cosmos`.
The formerly empty SWSH motif binding and the MEP print-only deferral are removed.
Shared positions are an optical approximation, not a match to a particular
physical copy. No material shader or profile settings were changed.

Every card retains its exact TCGL front, foil coverage, protection and other
authored maps. No masks were regenerated. A comparison against the preceding
Git state verified only these 167 printing definitions changed; all other
printings and catalog records stayed identical. Existing registered vintage
Cosmos cards and SVP materials are unchanged. Import scripts preserve the shared
sheet choice on regeneration. Source/variant identities and the approved
placement choice are recorded in each printing's evidence. SWSH map hashes are
listed in `public/cards/pokemon/tcgl-swsh/cosmos-completion.json`.

Validation: TypeScript and seven targeted tests passed, covering all printing
identities, map hashes, resolved Cosmos materials, MEP etch settings, and 500
collation seeds per SWSH booster. Run:

```
node --experimental-strip-types --experimental-loader ./tests/support/ts-extension-loader.mjs --test tests/swsh-integration.test.ts tests/mep-promos.test.ts
npx tsc --noEmit
```

Live WebGPU review sampled Cryogonal `swshalt-153`, Grookey `swshalt-1`,
Gossifleur `swshbsp-10`, and Drifloon `mep-005`: front, left/right tilt, strong
specular, grazing, dark, two moving-light phases, and 13 pose-sweep frames each.
All four resolved `svp-cosmos`; the final pass reported no runtime errors.
Representative captures and the final report are in `docs/cosmos-review/`.
Full captures remain in `artifacts/swsh-materials/live/`. Development hot reload
interrupted earlier attempts; the completed pass used an isolated preview with
hot reload disabled.

The samples show foil confined to each source's coverage; Cryogonal's rules
area stays opaque. Drifloon's source includes the silver border. Strong specular
lighting can wash out print through the existing laminate response. This pass
does not certify per-card physical calibration or perform visual inspection of
all 167 cards. Stamped optics, Classic Collection frosting and other non-Cosmos
finish work remain separate from this completion.
