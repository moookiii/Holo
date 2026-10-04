> Current relief: exact TCGL etch converted offline with the final Sylveon/Espeon finish. Height emboss is disabled. See [TCGL migration](tcgl-etched-migration.md) for the active method and evidence. The photo-guided relief descriptions below are historical; existing foil/protection boundaries are retained.

# Leafeon ex 144/131

The original TCGdex front remains unchanged. The supplied exact-card photograph guides foliage groove flow. The second photo provides the character/foil boundary reference, registered visually against the clean front. Body contours include separate curved ear, neck-leaf and tail pieces with open background gaps between the legs. The supplied red outline defines the crown and floating gems; individual small diamonds around the gems, feet and tail are included in the same microdiamond material. The shared silver mask is registered to Leafeon's ex title mark and retains two retreat energies.

Run `python scripts/prismatic/leafeon_cutouts.py`, then `python scripts/prismatic/leafeon_maps.py`. Production masks are 1800 x 2475 PNGs. Separate foil, ink protection, continuous height, authored normals and roughness maps preserve the material boundaries. Five attack-energy discs have concentric etching with opaque center symbols. Body texture and microdiamond crystal finish are separate from the background grooves.

The foliage relief is a photo-guided reconstruction using connected curved contours. Local centers, pitch, depth and hidden continuation are estimates, not exact individual ridge traces. Photo brightness and noise never become relief. Normals are computed before clipping to the material masks. Extra shader emboss and procedural engraving remain disabled.

Boundary overlays are in `artifacts/leafeon-144`. The multi-angle Studio, Strip, Soft and Low key review is in `artifacts/leafeon-144/review`. The evidence JSON records hashes for all four references and authored maps.
