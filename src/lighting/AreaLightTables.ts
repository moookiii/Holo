import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';

// Keep the shared LTC tables alive across lighting-rig edits and replacements.
export const areaLightTables = RectAreaLightTexturesLib.init();
