// Desk mouse: a late-1980s two-button mouse in the spirit of the one IBM paired with the
// Model M era (boxy, pale gray, top sloping down toward the hand, two front buttons split
// by a groove, cable leaving from the front). Original; detailed to match the keyboard: separate
// button caps, a darker lower shell with a parting line and feet, side
// grip grooves, a ribbed strain relief and a small LAMPLIGHT badge. It sits on a rounded dark pad.
// Local frame: +z toward the user, y up, origin on the desk surface under the mouse center.
import * as THREE from 'three';
import { Builder } from './builder.js';

const L = 0.112, Wd = 0.062; // length (front to back), width
const H_FRONT = 0.034, H_BACK = 0.022;

/** Height of the body's top surface at local z (front is -L/2). */
const topAt = (z) => H_FRONT + (H_BACK - H_FRONT) * ((z + L / 2) / L);

/** Rounded rectangle in the XY plane (centered), for plan-view outlines (base skirt, pad). */
function roundedRect(w, d, r) {
  const sh = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2, y0 = -d / 2, y1 = d / 2;
  sh.moveTo(x0 + r, y0);
  sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r);
  sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
  sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh;
}

/** A flat rounded slab lying on the desk: plan w × d, corner radius r, height h, softly beveled top edge. */
function plate(w, d, r, h, bevel) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, d - 2 * bevel, Math.max(0.001, r - bevel)), {
    depth: h - bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2); // shape XY -> world XZ, extrusion -> +y
  return g;
}

let badgeMat = null;
/** Small oval maker's badge on the palm rest (the site's own LAMPLIGHT mark, like the keyboard's printed legends). */
function badgeMaterial() {
  if (badgeMat) return badgeMat;
  const c = document.createElement('canvas');
  c.width = 336; // wide enough that the whole word sits inside the oval (user)
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#8b8273';
  g.beginPath();
  g.roundRect(4, 4, 328, 88, 44);
  g.fill();
  g.strokeStyle = '#c9c2b4';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(12, 12, 312, 72, 36);
  g.stroke();
  g.fillStyle = '#efe9dc';
  g.font = 'bold 40px Tahoma, Verdana, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('LAMPLIGHT', 168, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  badgeMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0, transparent: true, alphaTest: 0.05 });
  return badgeMat;
}

export function buildMouse(m) {
  const b = new Builder();
  const BEV = 0.005; // the body's bevel: its outline is this much bigger than the profile/extrusion

  // Upper shell: side profile (shape x = local z, shape y = height), extruded across the width.
  const s = new THREE.Shape();
  const r = 0.016; // rounded back
  s.moveTo(-L / 2, 0);
  s.lineTo(L / 2, 0); // square at the bottom: the lower shell (skirt) forms the base
  s.lineTo(L / 2, H_BACK - r * 0.5);
  s.quadraticCurveTo(L / 2, H_BACK, L / 2 - r, H_BACK);
  s.lineTo(-L / 2 + 0.008, H_FRONT);
  s.quadraticCurveTo(-L / 2, H_FRONT, -L / 2, H_FRONT - 0.008);
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, {
    depth: Wd - 2 * BEV - 0.002, bevelEnabled: true, bevelThickness: BEV + 0.001, bevelSize: BEV, bevelSegments: 6, curveSegments: 16,
  });
  body.translate(0, 0, -(Wd - 2 * BEV - 0.002) / 2);
  body.rotateY(-Math.PI / 2); // shape x -> world z; extrusion -> world x (now centered)
  b.add(body, m.mouseBody);

  // Lower shell: a darker skirt a hair wider than the body, so the parting line shows all the way round.
  const skirtW = Wd + 0.0016, skirtL = L + 2 * BEV + 0.0016;
  b.add(plate(skirtW, skirtL, 0.008, 0.0062, 0.0012), m.mouseBase, [0, -0.0004, 0]);

  // Two button caps on the front of the top, following its slope. They sit almost flush (1.2 mm proud) and are split
  // by a narrow gap: what shows in it is a dark strip set below the cap tops, so it reads as a shadowed seam, not a bar
  // (user: the old raised caps and black separator block looked wrong). A matching hairline seam where they end.
  // The caps stop where the top starts rounding over the front, so nothing overhangs.
  const slope = Math.atan2(H_FRONT - H_BACK, L);
  const top = (z) => topAt(z) + BEV; // the real top surface (the bevel grows the profile outward)
  const GAP = 0.0009, CAP_T = 0.0024, PROUD = 0.0012;
  const capL = 0.042, bz = -L / 2 + 0.006 + capL / 2;
  const capW = Wd / 2 - 0.0068;
  for (const sx of [-1, 1]) {
    b.rbox(m.mouseButton, capW, CAP_T, capL, 0.0009, sx * (capW / 2 + GAP / 2), top(bz) + PROUD - CAP_T / 2, bz, [slope, 0, 0], 3);
  }
  b.box(m.grille, GAP, 0.0018, capL - 0.0024, 0, top(bz) + PROUD - 0.0008 - 0.0009, bz, [slope, 0, 0]); // the split (short of the rounded cap corners)
  const endZ = bz + capL / 2 + 0.0004;
  b.box(m.grille, 2 * capW + GAP, 0.0014, 0.0008, 0, top(endZ) - 0.0005, endZ, [slope, 0, 0]); // the seam behind them

  // Thumb and finger grip grooves along both sides.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      b.box(m.grille, 0.0008, 0.0009, 0.044, sx * (Wd / 2 + 0.0001), 0.0105 + i * 0.0028, 0.012);
    }
  }

  // Cable strain relief: a tapered, ribbed boot where the cord leaves the front.
  const bootL = 0.014, bootZ = -L / 2 - BEV - bootL / 2 + 0.001, bootY = 0.0115;
  const boot = new THREE.CylinderGeometry(0.0026, 0.0039, bootL, 18);
  boot.rotateX(-Math.PI / 2); // narrow end toward -z (away from the mouse)
  b.add(boot, m.mouseBase, [0, bootY, bootZ]);
  for (let i = 0; i < 3; i++) {
    const k = (i + 0.5) / 3;
    const rr = 0.0039 + (0.0026 - 0.0039) * k;
    b.add(new THREE.TorusGeometry(rr + 0.0003, 0.00055, 6, 20), m.mouseBase, [0, bootY, bootZ + bootL / 2 - k * bootL]);
  }

  // Maker's badge on the palm rest, following the slope.
  const badgeZ = 0.03;
  b.add(new THREE.PlaneGeometry(0.0343, 0.0098), badgeMaterial(), [0, top(badgeZ) + 0.0003, badgeZ], [-Math.PI / 2 + slope, 0, 0]);

  const group = b.build({ name: 'mouse', castShadow: true, receiveShadow: true });
  return group;
}

/** Where the cord leaves the strain relief, in the mouse's local frame. */
export const MOUSE_CORD_START = new THREE.Vector3(0, 0.0115, -L / 2 - 0.005 - 0.014);

/** Mouse pad, cable grommet and cable, built in desk coordinates. */
export function buildMouseSetup(m, { x, z, top, yaw = 0.12, deskBackZ }) {
  const group = new THREE.Group();
  group.name = 'mouseSetup';

  // Pad: rounded corners and a soft top edge (user request), like a cloth-topped rubber pad.
  const pb = new Builder();
  pb.add(plate(0.25, 0.21, 0.024, 0.003, 0.0011), m.mousePad, [x + 0.005, top, z]);
  group.add(pb.build({ name: 'mousePad', receiveShadow: true }));

  const mouse = buildMouse(m);
  mouse.position.set(x, top + 0.003, z);
  mouse.rotation.y = yaw;
  group.add(mouse);

  // Cable grommet: a dedicated round port in the desk just behind the pad (user request: no
  // cable trailing off the back). A taupe rim around a dark opening.
  const gx = x + 0.015, gz = z - 0.165;
  const gb = new Builder();
  gb.add(new THREE.CylinderGeometry(0.024, 0.025, 0.004, 32), m.taupe, [gx, top + 0.002, gz]);
  gb.add(new THREE.CylinderGeometry(0.016, 0.016, 0.0012, 28), m.grille, [gx, top + 0.0041, gz]);
  group.add(gb.build({ name: 'cableGrommet', receiveShadow: true }));

  // Cable: a short, tidy run from the mouse front straight into the grommet.
  const front = MOUSE_CORD_START.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .add(new THREE.Vector3(x, top + 0.003, z));
  const y = top + 0.003;
  const pts = [
    front,
    new THREE.Vector3(front.x - 0.003, y + 0.0025, front.z - 0.03),
    new THREE.Vector3(gx, y + 0.0035, gz + 0.04),
    new THREE.Vector3(gx, top + 0.006, gz + 0.008),
    new THREE.Vector3(gx, top - 0.01, gz),
    new THREE.Vector3(gx, top - 0.05, gz), // disappears into the desk
  ];
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0022, 8, false), m.cable);
  cable.castShadow = true;
  group.add(cable);
  return group;
}
