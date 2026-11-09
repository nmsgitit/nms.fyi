// The supercomputer: an original design. A raised circular dais carries a C-shaped ring
// of soft-edged beige cabinets, open toward the command-room window, with a padded bench
// ring at its base. Inside the ring, a tall white bulbous core column rises to a
// ceiling collar, wrapped by light bands and cable conduits. A dark "face" panel full
// of lights looks out through the ring's opening toward the viewer.
import * as THREE from 'three';
import { SERVER, CORE } from './layout.js';
import { PALETTE } from './palette.js';

const F = SERVER.floorY;

function sectorShape(r0, r1, a0, a1) {
  // Annular sector in XY. We later map shape (x, y) -> world (x, -z), so use
  // x = r sin a, y = -r cos a to get world z = r cos a (a measured from +z).
  const s = new THREE.Shape();
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    const p = [r1 * Math.sin(a), -r1 * Math.cos(a)];
    i === 0 ? s.moveTo(...p) : s.lineTo(...p);
  }
  for (let i = N; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / N;
    s.lineTo(r0 * Math.sin(a), -r0 * Math.cos(a));
  }
  s.closePath();
  return s;
}

export function buildSupercomputer(b, m, leds) {
  const cx = CORE.x, cz = CORE.z;
  const P = (x, y, z) => [cx + x, y, cz + z];

  // ---- dais (two steps) with a light ring around its edge
  b.add(new THREE.CylinderGeometry(6.0, 6.1, 0.25, 72), m.taupe, P(0, F + 0.125, 0));
  b.add(new THREE.CylinderGeometry(5.2, 5.25, 0.25, 72), m.beigeLight, P(0, F + 0.375, 0));
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    leds.add(P(Math.sin(a) * 6.06, F + 0.13, Math.cos(a) * 6.06), [Math.sin(a), 0, Math.cos(a)],
      { size: 0.035, color: PALETTE.ledCool, group: 'core', delay: i / 96, intensity: 1.6 });
  }
  const base = F + 0.5;

  // ---- C-ring of cabinets (16 slots, 3 left open facing +z = toward the window)
  const slots = 16;
  const slotA = (Math.PI * 2) / slots;
  const ringH = 4.2;
  for (let k = 2; k <= 14; k++) {
    const a0 = (k - 0.5) * slotA + 0.012;
    const a1 = (k + 0.5) * slotA - 0.012;
    const cab = new THREE.ExtrudeGeometry(sectorShape(2.7, 4.0, a0, a1), {
      depth: ringH - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 8,
    });
    // Rotate -90° about x: shape y -> world -z, extrusion -> world +y.
    b.add(cab, m.beige, P(0, base + 0.06, 0), [-Math.PI / 2, 0, 0]);
    // Padded bench segment around the outside.
    const bench = new THREE.ExtrudeGeometry(sectorShape(4.08, 4.85, a0, a1), {
      depth: 0.36, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 8,
    });
    b.add(bench, m.taupeDark, P(0, base + 0.07, 0), [-Math.PI / 2, 0, 0]);

    // Dark vertical slat with a column of lights on each cabinet's outer face.
    const ac = k * slotA;
    const nx = Math.sin(ac), nz = Math.cos(ac);
    const r = 4.07;
    b.box(m.grille, 0.34, 3.0, 0.03, cx + nx * r, base + 2.35, cz + nz * r, [0, ac, 0]);
    leds.grid([cx + nx * (r + 0.02), base + 2.35, cz + nz * (r + 0.02)], [nz, 0, -nx], [0, 1, 0], [nx, 0, nz], 2, 12, 0.14, 0.23,
      { size: 0.03, color: (q) => (q < 0.15 ? PALETTE.ledAmber : PALETTE.ledCyan), blink: (q) => (q < 0.3 ? 0.5 + q * 4 : 0), group: 'core', delay: k / 16, intensity: 1.7 }, 0.9);
    // Taupe cap band on top of each cabinet.
    b.add(new THREE.ExtrudeGeometry(sectorShape(2.65, 4.05, a0, a1), { depth: 0.08, bevelEnabled: false, curveSegments: 8 }),
      m.taupe, P(0, base + ringH + 0.04, 0), [-Math.PI / 2, 0, 0]);
  }

  // ---- core column (lathe profile: bulbous base, waist, tall shaft, flared collar)
  const H = SERVER.ceilY - base;
  const prof = [
    [0, 0], [1.75, 0], [2.05, 0.35], [2.2, 1.1], [2.1, 2.1], [1.75, 3.1], [1.35, 3.9], [1.12, 4.8],
    [1.05, 6.0], [1.05, H - 2.2], [1.25, H - 1.4], [1.85, H - 0.7], [2.0, H - 0.25], [2.0, H],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  b.add(new THREE.LatheGeometry(prof, 64), m.coreShell, P(0, base, 0));

  // Glowing bands around the shaft (lit during the reveal).
  for (let i = 0; i < 6; i++) {
    b.add(new THREE.TorusGeometry(1.07, 0.035, 8, 64), m.coreBands, P(0, base + 5.4 + i * 1.05, 0), [Math.PI / 2, 0, 0]);
  }
  // Cable conduits rising from the cabinet ring to the collar.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.5) continue; // keep the front clear
    const x = Math.sin(a) * 1.3, z = Math.cos(a) * 1.3;
    b.add(new THREE.CylinderGeometry(0.1, 0.1, H - 6.4, 12), m.steel, P(x, base + 4.9 + (H - 6.4) / 2, z));
  }
  // Ceiling collar + ring light lens.
  b.add(new THREE.CylinderGeometry(3.2, 3.4, 0.7, 64), m.taupe, P(0, SERVER.ceilY - 0.35, 0));
  b.add(new THREE.TorusGeometry(2.75, 0.07, 10, 72), m.coreFixture, P(0, SERVER.ceilY - 0.72, 0), [Math.PI / 2, 0, 0]);

  // ---- the "face": a dark panel of lights looking out through the ring opening
  const fz = 2.02;
  b.rbox(m.beigeLight, 1.9, 2.5, 0.5, 0.18, cx, base + 2.0, cz + fz - 0.1);
  b.rbox(m.grille, 1.5, 2.0, 0.1, 0.08, cx, base + 2.05, cz + fz + 0.17);
  leds.grid([cx, base + 2.05, cz + fz + 0.225], [1, 0, 0], [0, 1, 0], [0, 0, 1], 7, 9, 0.17, 0.2,
    { size: 0.045, color: (q) => (q < 0.1 ? PALETTE.ledAmber : PALETTE.ledCyan), blink: (q) => (q < 0.45 ? 0.6 + q * 5 : 0), group: 'core', delay: 0.3, intensity: 1.9 }, 0.92);
}

/** Lights that pick out the supercomputer first (reveal stage 2a). */
export function buildCoreLights(m) {
  const group = new THREE.Group();
  group.name = 'coreLights';
  const white = PALETTE.lightWhite;
  const lights = [];
  const target = new THREE.Object3D();
  target.position.set(CORE.x, F + 2.5, CORE.z);
  group.add(target);

  // Key: high and in front, from the ceiling between the window and the core.
  const key = new THREE.SpotLight(white, 0, 0, 0.42, 0.55, 1.6);
  key.position.set(CORE.x, SERVER.ceilY - 1.2, CORE.z + 8.5);
  key.target = target;
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.04;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 30;
  group.add(key);
  lights.push({ light: key, max: 55 });

  // Top-down downlights from the collar ring, washing the column and cabinets.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const s = new THREE.SpotLight(white, 0, 0, 0.55, 0.7, 1.6);
    s.position.set(CORE.x + Math.sin(a) * 3.0, SERVER.ceilY - 0.8, CORE.z + Math.cos(a) * 3.0);
    const t = new THREE.Object3D();
    t.position.set(CORE.x + Math.sin(a) * 3.4, F, CORE.z + Math.cos(a) * 3.4);
    s.target = t;
    group.add(s, t);
    lights.push({ light: s, max: 55 });
  }
  return {
    group,
    lights,
    emissives: [
      { mat: m.coreFixture, max: new THREE.Color(white).multiplyScalar(3) },
      { mat: m.coreBands, max: new THREE.Color(PALETTE.ledCool).multiplyScalar(2.2) },
    ],
  };
}
