# Steam Siege split-type reverse holos

Shiftry 11 (Grass/Darkness), Volcarona 15 (Grass/Fire), Galvantula 42
(Lightning/Grass), Bisharp 64 (Darkness/Metal), and Azumarill 77 (Fairy/Water)
now use their exact TCGL reverse whiteplates with the existing smooth silver
`swsh-reverse-energy` material. Types above are listed left/right as printed.

The earlier claim that these sources contain only one type was incorrect.
Both repeating type patterns and their diagonal split are already in each
original foil image. No substitute symbols, guessed divider, procedural relief,
normal, or height map is needed. Original fronts and sources remain unchanged.

`scripts/tcgl/prepare_steam_siege.py` registers the entire source domain using
the established Unity horizontal bleed removal [145/1024, 878/1024], full height,
bilinear interpolation, and no vertical flip. Outputs are 733x1024 PNGs plus
constant 0.30 roughness. Each evidence JSON records the exact printing, original
hashes, output hashes, transformation, and visible left/right type pair.

`SteamSiegeSurfaces.ts` overrides only these five reverse identities after
import, clearing the pending label. Acquisition-era generated pending lists
remain historical; the runtime override is authoritative and survives reimport.
No unrelated card or material profile changes. Physical angular calibration
remains approximate; source geometry establishes placement, not measured optics.
