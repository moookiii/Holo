# Ascended Heroes original TCGL reverse resources

The original TCGL resources have been recovered. Entei 025/217 has a genuine
Quick Ball whiteplate, and all 140 `_ph2` special reverses have different native
geometry from their `_ph` Energy-symbol counterparts. No rendering code or
existing Holo fronts, masks, shaders or registrations were changed.

The integration staging directory is
[`public/cards/pokemon/tcgl-ascended-original`](../public/cards/pokemon/tcgl-ascended-original/manifest.json).
Its manifest maps all 318 reverse printings to their exact original card ID,
long-form ID, material manifest, texture name, Unity object ID, catalog entry,
CDN URL, dimensions, sampling settings and hashes. There are 140 Energy-symbol
reverses, 140 Ball/R reverses and 38 plain Trainer/Special Energy reverses.

| Native special pattern | Cards | Reviewed reference |
| --- | ---: | --- |
| Poké Ball | 34 | Erika's Oddish 001 |
| Friend Ball | 23 | Chikorita 008 |
| Love Ball | 25 | Wurmple 011 |
| Quick Ball | 22 | Entei 025 |
| Team Rocket R | 10 | Team Rocket's Tarountula 018 |
| Dusk Ball | 26 | Groudon 108 |

## Starting from the installed client

The installed game is under
`C:/Users/jpall/The Pokémon Company International/Pokémon Trading Card Game Live/`.
`Pokemon TCG Live_Data/resources.assets` contains `GameVersion`, identifying
client **1.43.0**, build **20260923_0452**, and production content origin
`https://cdn.studio-prod.pokemon.com/`. `GameSettingsEndpointSettings` has no
version/path override. Its installed implementation derives the original
[GameSettings endpoint](https://cdn.studio-prod.pokemon.com/rainier/GameSettings/1.43.0/GameSettings.json).
That document supplies the Windows content base.

The local game configuration is in
`C:/Users/jpall/AppData/LocalLow/pokemon/Pokemon TCG Live/config-cache/`.
The original binary `card-database-me2-5_0_en_0.0.json` contains 613 printings,
including all 318 reverse entries. `asset-bundle-manifest_0.0.json` supplies
14 dated catalog buckets, from `10101_0000` through `20261006_1700`.
The client constructs `manifest_en_<bucket>` inside each bucket and applies
the buckets in their listed order. Original Unity catalog files already
preserved locally were reused; the extraction does not fetch Malie exports.

`CardDataRowExtensions.GetImageAssetBundleName` uses the card's set, language
and collector number, without appending a printing suffix. All of a card's
variants occupy one full-card bundle. `CardBasicGraphicLoader` passes its
`ParallelHoloVariant` and `VariantSuffix` to `MaterialManifestNameResolver`.
Regular parallel holo uses `_ph`; suffix `2` selects `_ph2`. The client's
separate `_sph`/`_mph` mapping for other Poké Ball/Master Ball printings does
not apply to Ascended Heroes: its second reverses are regular parallel holo
with suffix `2`.

## Entei: complete original reference chain

- Card ID: `me2-5_25_ph2`.
- Long-form ID: `Entei_me2-5_25_ph2_Rare_FlatSilver_Reverse`.
- `variant=1`, `Variant Suffix="2"`, `Foil Effect="FlatSilver"`,
  `Foil Mask="Reverse"`.
- Original bundle: `me2-5_en_025`, catalog Unity hash
  `86a962cc3b079334f35d03a6607d5bd2`, CRC `2959511121`, no bundle dependencies.
- Original URL:
  [Entei full-card bundle](https://cdn.studio-prod.pokemon.com/rainier/Content/StandaloneWindows64/1.43.0/10101_0000/me2-5_en_025).
- Exact manifest: `MaterialManifest_ph2`, object ID `-1771682368149300310`.
- `_w="me2-5_wp_ph2_en_025"`, texture object ID `6313059017818152380`.
- Original container:
  `assets/cards/fullcard/me2-5/en/025/me2-5_wp_ph2_en_025.png`.
- `_c="me2-5_en_025"`, `_s="TPCi/Cards3D/HoloFoil/FlatSilver"`, `_f="FlatSilver"`,
  `_options=0`; `_e`, `_cf` and `_cc` are empty.
- The ordinary reverse instead uses `MaterialManifest_ph` and
  `me2-5_wp_ph_en_025`, object ID `1939099695564777437`, with the Fire symbol.

The recovered special texture visibly contains the Quick Ball's segmented
outer ring. Its ordinary counterpart contains the flame-shaped Fire Energy
symbol. These are different objects and different decoded pixels inside the
same original bundle, not renamed copies of the ordinary reverse.

## Texture and material organization

The symbols are **card-specific whiteplate textures**, not missing standalone
foil PNGs, shared Ball overlays or runtime-generated geometry. Each native
reverse whiteplate is **512×512 RGBA**, Unity format **12 (DXT5/BC3)**.
The per-card diffuse texture is **1024×1024 RGBA**. The game packs the card
inside a square texture; extraction preserves that whole UV domain. PNGs
retain the decoder's native orientation, with no additional flip, crop,
offset, resize, threshold or channel substitution. The alpha channel is
preserved, even when all its pixels are opaque. Raw original bundles and
serialized texture objects preserve compressed source data and mip levels.

There are **317 unique reverse whiteplate PNGs** for 318 assignments. Native
216 and 217 use identical decoded whiteplate pixels; their separate original
texture identities and source bundles remain in the manifest while the PNG
is stored once. The 140 special whiteplates are all distinct from their paired
ordinary reverse. Incidental normal-holo whiteplates stay in research.

`MaterialManager` binds the manifest's `_w` to `_CardWhitePlateMask` and
`_c` to `_CardColorDiffuse`. It loads shared material
`MAT_Cards3D_FlatSilver` and shader `TPCi/Cards3D/HoloFoil/FlatSilver` from
`shadersbundle`. The active shared texture references are:

| Material property | Original texture | Native resolution |
| --- | --- | --- |
| `_Tex_Shine` | `T_Holofoil_Mask_Bar_Wide_Single` | 1024×1024 RGBA |
| `_Tex_Spectrum` | `FX_T_Spectrum_FlatSilver` | 256×32 RGB |

The material JSON preserves all original floats, colors, texture scales,
offsets, keywords and shader metadata, plus `CardMaterialProperties.Default()`
runtime overrides. Associated Cast-and-Cure spectrum/glitter resources are
retained once and explicitly marked inactive: every ASC reverse has empty
`_cc`, and the runtime sets `_UseCCFoil=0`. The shared `TEX_SVPokeBall` and
`TEX_SVMasterBall` resources in the shader bundle are not referenced by these
variants. Coin and sleeve catalog entries containing Ball names are not
their card-pattern sources.

Original bundles, database documents, catalog snapshots, serialized objects,
fronts and installed-assembly evidence are preserved under
`research/tcgl/ascended-original/`. The shader inspection export is diagnostic
text, not a compilable replacement shader. The raw shader object and original
shader bundle retain the actual compiled resource.

## Verification and relationship to existing Holo assets

The six source symbols were visually reviewed. Every special texture was
classified directly against these native shapes in its original pixel
coordinates, including the darker native symbol levels on Darkness/Metal
cards. All 140 results independently agree with the previous per-card physical
checklist. That checklist names the pattern family; it never supplies pixels
to this extraction. Hash checks verify PNG/serialized/bundle integrity,
exact manifest-to-texture references and unchanged Holo fronts/runtime maps.

After recovering the originals, the verifier compares decoded pixels with the
previously preserved exports. The per-printing results are in
[`ascended-original-evidence.json`](ascended-original-evidence.json).
This supersedes the earlier claim that authentic special geometry could not
be recovered: the original client contains it. The prior export-only audit
remains historical evidence of duplicate processed outputs.

Review captures are saved in `artifacts/ascended-original/`:
`six-native-families-versus-energy.png` shows the six full native pairs;
`all-140-native-symbols.png` shows every extracted special symbol at its
original inspection-region resolution. Inspection crops are review artifacts,
not replacement pattern masks.

Reproduce using a Python environment with UnityPy 1.25.0, Pillow, requests and
NumPy:

```powershell
& 'C:/Users/jpall/miniconda3/python.exe' scripts/tcgl/extract_ascended_original.py --probe
# Inspect the native Entei pair, then extract the full reverse inventory.
& 'C:/Users/jpall/miniconda3/python.exe' scripts/tcgl/extract_ascended_original.py --all
& 'C:/Users/jpall/miniconda3/python.exe' scripts/tcgl/verify_ascended_original.py
```

Validated downloads are reused. The assets are staged for subsequent Holo
integration; no source has been replaced in the active foil pipeline.
Native TCGL uses a large central symbol, which may differ from physical foil
repetition. Source recovery and assignments are verified; live angular optics
and Holo integration remain outside this extraction task.
