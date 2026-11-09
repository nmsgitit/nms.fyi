// nms.fyi color palette.
// Brief: sterile white light. Surfaces are white, light gray, and 1980s
// computer-beige/taupe. Saturated color only comes from LEDs and screens.
import * as THREE from 'three';

export const PALETTE = {
  // architecture
  ceiling: 0xeceae4,
  wallUpper: 0xdcd9d1, // warm light gray
  wallLower: 0xc4b8a2, // taupe wainscot
  panelInset: 0xd2cec4,
  trim: 0xf1efe9, // off-white trim / edge lines
  floor: 0xa7a39a,
  floorMat: 0x7a746a, // ribbed walkway mat
  // equipment plastics
  beige: 0xd9cfb9, // classic computer beige
  beigeLight: 0xe6dfcf,
  taupe: 0xb5a891,
  taupeDark: 0x8f8573,
  grille: 0x2b2926, // vent slots, recessed fronts
  screenOff: 0x0e1110,
  steel: 0xa3a19c,
  // light
  lightWhite: 0xf4f7ff, // ~6500 K cool white: supercomputer spots only (stands out)
  fluorescent: 0xf9efcd, // aged fluorescent tubes (~3800 K, faint green cast): room lighting
  fluorescentPanel: 0xfaf6dc, // what the diffuser panels themselves look like
  // indicator colors
  ledWarm: 0xfff1cf,
  ledCool: 0xcdeeff,
  ledCyan: 0x62f2ff,
  ledAmber: 0xffb04a,
  ledRed: 0xff5a4a,
  ledGreen: 0x7dffa0,
  phosphor: 0x5dff8a,
};

export const color = (hex) => new THREE.Color(hex);
