import type { Texture } from 'three/webgpu';

/** Pure resource metadata shared by CPU preparation and GPU materials. */
export const TCGL_CARD_UV = { left: 145 / 1024, width: 733 / 1024 } as const;
export const TCGL_FLAT_SILVER_PATHS = {
  shine: '/cards/pokemon/tcgl-ascended-original/shared/T_Holofoil_Mask_Bar_Wide_Single.png',
  spectrum: '/cards/pokemon/tcgl-ascended-original/shared/FX_T_Spectrum_FlatSilver.png',
} as const;
export interface FlatSilverTextures { shine: Texture; spectrum: Texture; }
