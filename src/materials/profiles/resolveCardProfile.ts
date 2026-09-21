import type { CardDefinition } from '../../card/CardDefinition';
import type { FoilLayer, FoilOverrides, HolographicProfile } from '../HolographicProfile';
import { getProfile } from './index';

function overrideLayer(base: FoilLayer, changes: FoilOverrides = {}): FoilLayer {
  return {
    ...(base.enabled !== undefined ? { enabled: base.enabled } : {}),
    ...(base.disabledMechanisms ? { disabledMechanisms: [...base.disabledMechanisms] } : {}),
    diffraction: { ...base.diffraction, ...changes.diffraction },
    structure: { ...base.structure, ...changes.structure },
    glints: { ...base.glints, ...changes.glints },
    surface: { ...base.surface, ...changes.surface },
  };
}

/** Per-print tuning never mutates a shared profile or bleeds into another card. */
export function resolveCardProfile(card: CardDefinition, id = card.profile): HolographicProfile {
  const base = getProfile(id), changes = id === card.profile ? card.profileOverrides : undefined;
  if (!changes) return base;
  const secondary = changes.secondaryProfile ? getProfile(changes.secondaryProfile) : base.secondary;
  const stamp = changes.stampProfile ? getProfile(changes.stampProfile) : base.stamp;
  return {
    ...base, ...overrideLayer(base, changes),
    secondary: secondary ? overrideLayer(secondary, changes.secondary) : undefined,
    stamp: stamp ? overrideLayer(stamp, changes.stamp) : undefined,
    metallicInk: changes.metallicInk ?? base.metallicInk,
  };
}
