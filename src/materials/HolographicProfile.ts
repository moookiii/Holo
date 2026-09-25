import type { PatternKind } from './patterns/ManufacturingField';
import type { MotifSpec } from './patterns/MotifField';
import type { CardMapPaths } from '../card/CardDefinition';

/** One optical material, independent of which printed region receives it. */
export interface FoilLayer {
  /** Authoring switches; omitted values preserve the calibrated material exactly. */
  enabled?: boolean;
  disabledMechanisms?: Array<'diffraction' | 'sparkle' | 'relief' | 'varnish' | 'laminate' | 'reflection' | 'film' | 'image'>;
  diffraction: {
    /** Grating period in micrometres; wavelength bands use the same unit. */
    period: number;
    bandwidth: number;
    strength: number;
    secondaryOrder: number;
    direction: number;
    crossWidth: number;
    /** Relative energy in a second orthogonal grating at the same surface point. */
    crossing?: number;
    /** How closely the grating follows the manufactured facet's tilted surface. */
    facetCoupling?: number;
    /** Project even a uniform sheet axis onto the card's authored etched normals. */
    followsAuthoredNormals?: boolean;
  };
  structure: { field: 'radial' | 'symbol-foil' | PatternKind; engraving: number; scale: number; relief: number; facetTilt?: number; patternRelief?: number; normalVariance?: number;
    motif?: MotifSpec;
    /** Fraction of the facet inclination used for aggregate specular; defaults to 1. Smooth optical films
     * can redirect diffraction without looking like deeply corrugated metal. */
    reflectionCoupling?: number;
    /** Angular selection of crossed groups of fixed microcuts. */
    gridStrength?: number; gridScale?: number; gridTravel?: number; gridWidth?: number;
  };
  glints: { density: number; scale: number; sharpness: number; strength: number; spread: number; ordered?: boolean;
    /** Short square microcuts with independent, fixed facet inclinations. */
    microdiamond?: boolean; };
  surface: { metalness: number; roughness: number; laminate: number; laminateRoughness: number; anisotropy?: number; foilReflectance?: number;
    /** Pattern amplitude modulates roughness independently of its color response. */
    patternRoughness?: number;
    /** Soft neutral reflection from a pearlescent/nacre layer, separate from spectral diffraction. */
    sheen?: number;
    /** Amount of foil reflection filtered by the registered printed ink colors. */
    inkTransmission?: number;
    /** Ink-colored reflection on authored etched ridges, from direct lights only. */
    etchedInkSheen?: number;
    /** Thin-film interference, independent of the etched diffraction grating. Thickness is nm. */
    iridescence?: number; filmIOR?: number; filmMin?: number; filmMax?: number; pearlBody?: number;
    /** Absorbing finish on the foil substrate; printed regions keep their color. */
    substrateDarkening?: number;
    /** Authored raised varnish changes the clearcoat normal independently of the foil below. */
    varnishRelief?: number;
    /** Extra clear varnish confined to the colored frame, excluding artwork and rules. */
    frameVarnish?: number;
    /** Opaque silver image reconstruction; depth is virtual centimetres behind the foil window. */
    imageHologram?: number; imageDepth?: number; imageContrast?: number; imageWidth?: number;
  };
}

export interface HolographicProfile extends FoilLayer {
  /** Optional assignments resolved by the existing card map loader. */
  maps?: Partial<CardMapPaths>;
  /** Optional authored-map response overrides, shared by viewer and Lab. */
  mapSettings?: { normalScale?: number; embossStrength?: number; roughnessMode?: 'profile' | 'absolute' | 'offset' };
  id: string;
  name: string;
  family: 'Original' | 'Pokémon' | 'Yu-Gi-Oh!' | 'Magic: The Gathering';
  description: string;
  status: 'development' | 'curated' | 'reference-pending';
  /** Keep visually unaccepted candidates out of the normal treatment picker. */
  labOnly?: boolean;
  /** Use the card's optional extended foil mask for parallel/full-card treatments. */
  extendedCoverage?: boolean;
  /** A separately reflected anniversary mark in the rules panel. */
  watermark?: 'quarter-century';
  /** Coverage G: independent foil, e.g. Secret Rare lettering. */
  secondary?: FoilLayer;
  /** A separately masked security mark or rarity stamp. */
  stamp?: FoilLayer;
  /** Coverage B: non-diffractive metallic ink. Color is linear RGB. */
  metallicInk?: { color?: [number, number, number]; roughness: number; metalness: number;
    /** Optional conductor-body controls. Defaults preserve existing metallic lettering. */
    environmentIntensity?: number; recess?: number; normalFiltering?: number; };
}

export interface FoilOverrides {
  diffraction?: Partial<FoilLayer['diffraction']>;
  structure?: Partial<FoilLayer['structure']>;
  glints?: Partial<FoilLayer['glints']>;
  surface?: Partial<FoilLayer['surface']>;
}
export interface CardProfileOverrides extends FoilOverrides {
  secondaryProfile?: string;
  secondary?: FoilOverrides;
  stampProfile?: string;
  stamp?: FoilOverrides;
  metallicInk?: HolographicProfile['metallicInk'];
}

export const masterPrism: HolographicProfile = {
  id: 'master-prism', name: 'Master prism', family: 'Original', status: 'development',
  description: 'Radial security engraving with selective spectral fans, silver relief and sparse microfacet flashes.',
  diffraction: { period: 1.35, bandwidth: 0.035, strength: 0.95, secondaryOrder: 0.1, direction: 0, crossWidth: 0.23 },
  structure: { field: 'radial', engraving: 0.35, scale: 240, relief: 0.12 },
  glints: { density: 0.1, scale: 310, sharpness: 280, strength: 16, spread: 0.56 },
  surface: { metalness: 0.7, roughness: 0.29, laminate: 0.62, laminateRoughness: 0.16 },
};
