// Command desk at the glass: a soft-edged 1980s console in beige and taupe
// with a keyboard and a row of indicator buttons (no side wings or button sets).
import * as THREE from 'three';
import { Builder } from './builder.js';
import { DESK } from './layout.js';
import { PALETTE } from './palette.js';
import { buildKeyboard, LOCK_LED_COLOR } from './keyboard.js';

function deskTopShape(w, d, r) {
  // Rounded rectangle with a gently bowed back edge (toward the user).
  const s = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.quadraticCurveTo(0, y1 + 0.16, x0 + r, y1); // bowed user-facing edge
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

export function buildDesk(m, leds) {
  const b = new Builder();
  const z = DESK.z;
  const top = DESK.top;
  const W = DESK.width;
  const D = 0.78;

  // Desk top slab: extruded, beveled, rotated so the extrusion runs along +y.
  const slab = new THREE.ExtrudeGeometry(deskTopShape(W, D, 0.12), {
    depth: 0.045, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 3, curveSegments: 16,
  });
  // Rotating +90° about x maps shape +y to world +z (toward the user) and the
  // extrusion direction to world -y. With the bevel, the slab spans y in
  // [pos + 0.018, pos - 0.063], so pos = top - 0.018 puts its upper face at `top`.
  b.add(slab, m.beigeLight, [0, top - 0.018, z], [Math.PI / 2, 0, 0]);

  // Body: two pedestals plus a modesty panel, slightly inset from the top.
  for (const s of [-1, 1]) b.rbox(m.taupe, 0.62, top - 0.08, D - 0.12, 0.05, s * (W / 2 - 0.4), (top - 0.08) / 2, z);
  b.rbox(m.taupeDark, W - 1.4, top - 0.2, 0.06, 0.02, 0, (top - 0.2) / 2 + 0.08, z - D / 2 + 0.12);
  // kick plates
  for (const s of [-1, 1]) b.span(m.grille, s * (W / 2 - 0.4) - 0.28, s * (W / 2 - 0.4) + 0.28, 0, 0.06, z + D / 2 - 0.08, z + D / 2 - 0.05);

  // (No side wings or button sets: removed at the user's request on 2026-11-09. They
  // echoed the Apollo Core desk too closely.)

  // Row of round indicator buttons across the back of the deck.
  for (let i = 0; i < 14; i++) {
    const x = -0.62 + i * (1.24 / 13);
    b.add(new THREE.CylinderGeometry(0.016, 0.018, 0.012, 14), m.beigeLight, [x, top + 0.006, z - 0.2]);
    leds.add([x, top + 0.0135, z - 0.2], [0, 1, 0], {
      size: 0.011, color: i === 12 ? PALETTE.ledCyan : PALETTE.ledWarm, group: 'desk', delay: i / 13, intensity: i === 12 ? 2.2 : 1.1,
      blink: i % 5 === 2 ? 0.7 : 0,
    });
  }

  // ---- keyboard: full-size Model M-style QWERTY with numpad (see keyboard.js)
  const kb = buildKeyboard(m);
  const kz = z + 0.19;
  const kTilt = 0.09; // back edge raised (rotation about +x lifts the -z side)
  kb.group.position.set(0, top, kz);
  kb.group.rotation.x = kTilt;
  // Lock lights: transform local positions into world space for the LED field.
  const kbMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(0, top, kz), new THREE.Quaternion().setFromEuler(new THREE.Euler(kTilt, 0, 0)), new THREE.Vector3(1, 1, 1));
  const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), kTilt);
  kb.localLeds.forEach((p, i) => {
    const wp = new THREE.Vector3(...p).applyMatrix4(kbMatrix);
    leds.add(wp.toArray(), up.toArray(), { size: 0.0028, color: LOCK_LED_COLOR, group: 'desk', intensity: i === 0 ? 1.8 : 0.0 });
  });

  const desk = b.build({ name: 'desk', castShadow: true, receiveShadow: true });
  desk.add(kb.group);
  return desk;
}
