// Full-size keyboard: standard QWERTY with function row, navigation cluster, arrows,
// and numpad, laid out after the 1985 IBM Model M (101 keys, period-correct: no
// Windows keys; bottom row Ctrl, Alt, long space, Alt, Ctrl). Keycaps are real geometry;
// legends are one transparent decal drawn from the same layout table.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Builder } from './builder.js';
import { PALETTE } from './palette.js';

export const U = 0.0205; // 1 key unit in meters (slightly chunky, 1980s board)

// Layout rows: [legend, widthU, opts]. A number entry is a gap in units.
// opts: { h: heightU (tall keys), mod: true (darker modifier cap), accent: 'amber' }
const MAIN = [
  [['Esc', 1, { mod: 1, accent: 'amber' }], 1, ['F1', 1, { mod: 1 }], ['F2', 1, { mod: 1 }], ['F3', 1, { mod: 1 }], ['F4', 1, { mod: 1 }], 0.5,
    ['F5', 1, { mod: 1 }], ['F6', 1, { mod: 1 }], ['F7', 1, { mod: 1 }], ['F8', 1, { mod: 1 }], 0.5,
    ['F9', 1, { mod: 1 }], ['F10', 1, { mod: 1 }], ['F11', 1, { mod: 1 }], ['F12', 1, { mod: 1 }]],
  null, // half-unit gap row
  [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['Backspace', 2, { mod: 1 }]],
  [['Tab', 1.5, { mod: 1 }], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['Caps Lock', 1.75, { mod: 1 }], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['Enter', 2.25, { mod: 1 }]],
  [['Shift', 2.25, { mod: 1 }], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 2.75, { mod: 1 }]],
  [['Ctrl', 1.5, { mod: 1 }], 1, ['Alt', 1.5, { mod: 1 }], ['', 7], ['Alt', 1.5, { mod: 1 }], 1, ['Ctrl', 1.5, { mod: 1 }]],
];

const NAV = [ // starts at x = 15.25
  [['Print', 1, { mod: 1 }], ['Scroll', 1, { mod: 1 }], ['Pause', 1, { mod: 1 }]],
  null,
  [['Ins', 1, { mod: 1 }], ['Home', 1, { mod: 1 }], ['PgUp', 1, { mod: 1 }]],
  [['Del', 1, { mod: 1 }], ['End', 1, { mod: 1 }], ['PgDn', 1, { mod: 1 }]],
  [],
  [1, ['↑', 1, { mod: 1 }]],
  [['←', 1, { mod: 1 }], ['↓', 1, { mod: 1 }], ['→', 1, { mod: 1 }]],
];

const PAD = [ // starts at x = 18.5
  [],
  null,
  [['Num', 1, { mod: 1 }], ['/', 1, { mod: 1 }], ['*', 1, { mod: 1 }], ['-', 1, { mod: 1 }]],
  [['7', 1], ['8', 1], ['9', 1], ['+', 1, { mod: 1, h: 2 }]],
  [['4', 1], ['5', 1], ['6', 1]],
  [['1', 1], ['2', 1], ['3', 1], ['Enter', 1, { mod: 1, h: 2 }]],
  [['0', 2], ['.', 1]],
];

const ROW_GAP = 0.5;
// Sculpted profile: per-row extra height (m) so the rows step like a Model M's.
const ROW_LIFT = [0.003, 0, 0.0025, 0.0015, 0.0005, 0.0008, 0.002];

/** Flatten a block into key records {label, x, y(row), w, h, mod, accent} in key units. */
function layoutBlock(rows, x0, keys) {
  let y = 0;
  rows.forEach((row, ri) => {
    if (row === null) { y += ROW_GAP; return; }
    let x = x0;
    for (const item of row) {
      if (typeof item === 'number') { x += item; continue; }
      const [label, w, o = {}] = item;
      keys.push({ label, x, y, w, h: o.h || 1, mod: !!o.mod, accent: o.accent, row: ri });
      x += w;
    }
    y += 1;
  });
}

export function keyboardLayout() {
  const keys = [];
  layoutBlock(MAIN, 0, keys);
  layoutBlock(NAV, 15.25, keys);
  // The numpad's tall keys sit in rows 3 and 5 and span into the next row.
  layoutBlock(PAD, 18.5, keys);
  return { keys, widthU: 22.5, depthU: 6 + ROW_GAP };
}

function legendTexture(keys, widthU, depthU, pxPerU = 96) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(widthU * pxPerU);
  c.height = Math.ceil(depthU * pxPerU);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const k of keys) {
    if (!k.label) continue;
    const cx = (k.x + k.w / 2) * pxPerU;
    const cy = (k.y + k.h / 2) * pxPerU;
    const big = k.label.length === 1;
    ctx.fillStyle = k.mod ? 'rgba(232,226,212,0.92)' : 'rgba(52,49,44,0.95)';
    ctx.font = `${big ? 600 : 500} ${big ? pxPerU * 0.42 : pxPerU * (k.label.length > 5 ? 0.17 : 0.21)}px "Helvetica Neue", Arial, sans-serif`;
    if (big) ctx.fillText(k.label, cx - pxPerU * 0.16, cy - pxPerU * 0.14); // top-left like real caps
    else ctx.fillText(k.label, cx, cy);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Build the keyboard as a Group in local coordinates: x across, +z toward the user, y up,
 * origin at the center of the case bottom. The caller positions and tilts it.
 * Also returns `localLeds`: positions for the Num/Caps/Scroll lock lights.
 */
export function buildKeyboard(m) {
  const { keys, widthU, depthU } = keyboardLayout();
  const b = new Builder();
  const W = widthU * U, D = depthU * U;
  const margin = 0.016, topBand = 0.03; // the case has a band above the keys (lock lights)
  const caseW = W + margin * 2, caseD = D + margin * 2 + topBand;
  const caseH = 0.03;
  const zKeys0 = -caseD / 2 + margin + topBand; // z of the top edge of the key field

  // Case: beige shell plus a darker recessed key well.
  b.rbox(m.beige, caseW, caseH, caseD, 0.009, 0, caseH / 2, 0);
  b.rbox(m.taupeDark, W + 0.008, 0.006, D + 0.008, 0.003, 0, caseH + 0.0005, zKeys0 + D / 2);

  const gap = 0.0022;
  const capH = 0.0105;
  const geomCache = new Map();
  const capGeom = (w, h) => {
    const key = `${w}x${h}`;
    if (!geomCache.has(key)) geomCache.set(key, new RoundedBoxGeometry(w * U - gap, capH, h * U - gap, 2, 0.0022));
    return geomCache.get(key);
  };
  for (const k of keys) {
    if (k.w <= 0) continue;
    const x = -W / 2 + (k.x + k.w / 2) * U;
    const z = zKeys0 + (k.y + k.h / 2) * U;
    const lift = ROW_LIFT[k.row] || 0; // k.row = index into the row table (index 1 is the gap row)
    const mat = k.accent === 'amber' ? m.amberKey : k.mod ? m.keycapMod : m.keycap;
    b.add(capGeom(k.w, k.h), mat, [x, caseH + capH / 2 + 0.002 + lift, z]);
  }

  const group = b.build({ name: 'keyboard', castShadow: true, receiveShadow: true });

  // Legends: one decal just above the highest keycap tops.
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({
      map: legendTexture(keys, widthU, depthU),
      transparent: true,
      depthWrite: false,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(0, caseH + capH + 0.0025 + Math.max(...ROW_LIFT) + 0.0003, zKeys0 + D / 2);
  decal.renderOrder = 1;
  group.add(decal);

  // Lock lights sit in the top band above the numpad.
  const padCenterX = -W / 2 + (18.5 + 2) * U;
  const localLeds = [-1, 0, 1].map((i) => [padCenterX + i * U * 1.1, caseH + 0.0006, -caseD / 2 + margin + topBand * 0.45]);

  return { group, localLeds, caseW, caseD };
}

export const LOCK_LED_COLOR = PALETTE.ledGreen;
