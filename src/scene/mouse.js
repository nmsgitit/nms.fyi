// Desk mouse: a late-1980s two-button mouse in the spirit of the one IBM paired with the
// Model M era (boxy, pale gray, top sloping down toward the hand, two front buttons split
// by a groove, cable leaving from the front). Unbranded and original. It sits on a dark pad.
// Local frame: +z toward the user, y up, origin on the desk surface under the mouse center.
import * as THREE from 'three';
import { Builder } from './builder.js';

const L = 0.112, Wd = 0.062; // length (front to back), width
const H_FRONT = 0.034, H_BACK = 0.022;

/** Height of the body's top surface at local z (front is -L/2). */
const topAt = (z) => H_FRONT + (H_BACK - H_FRONT) * ((z + L / 2) / L);

export function buildMouse(m) {
  const b = new Builder();

  // Body: side profile (shape x = local z, shape y = height), extruded across the width.
  const s = new THREE.Shape();
  const r = 0.016; // rounded back
  s.moveTo(-L / 2, 0);
  s.lineTo(L / 2 - r, 0);
  s.quadraticCurveTo(L / 2, 0, L / 2, r * 0.8);
  s.lineTo(L / 2, H_BACK - r * 0.5);
  s.quadraticCurveTo(L / 2, H_BACK, L / 2 - r, H_BACK);
  s.lineTo(-L / 2 + 0.008, H_FRONT);
  s.quadraticCurveTo(-L / 2, H_FRONT, -L / 2, H_FRONT - 0.008);
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, {
    depth: Wd - 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 4, curveSegments: 10,
  });
  body.translate(0, 0, -(Wd - 0.012) / 2);
  body.rotateY(-Math.PI / 2); // shape x -> world z; extrusion -> world x (now centered)
  b.add(body, m.mouseBody);

  // Two buttons on the front of the top, following its slope, with a dark groove between.
  const slope = Math.atan2(H_FRONT - H_BACK, L);
  const bz = -L / 2 + 0.024;
  for (const sx of [-1, 1]) {
    b.rbox(m.mouseButton, Wd / 2 - 0.006, 0.005, 0.042, 0.002, sx * (Wd / 4 - 0.0005), topAt(bz) + 0.0045, bz, [slope, 0, 0], 2);
  }
  b.box(m.grille, 0.0025, 0.004, 0.044, 0, topAt(bz) + 0.004, bz, [slope, 0, 0]);
  // Seam where the buttons end.
  b.box(m.grille, Wd - 0.01, 0.003, 0.0018, 0, topAt(bz + 0.022) + 0.0045, bz + 0.0215, [slope, 0, 0]);

  const group = b.build({ name: 'mouse', castShadow: true, receiveShadow: true });
  return group;
}

/** Mouse pad, cable grommet and cable, built in desk coordinates. */
export function buildMouseSetup(m, { x, z, top, yaw = 0.12, deskBackZ }) {
  const group = new THREE.Group();
  group.name = 'mouseSetup';

  const pb = new Builder();
  pb.rbox(m.mousePad, 0.25, 0.003, 0.21, 0.0014, x + 0.005, top + 0.0015, z);
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
  const front = new THREE.Vector3(0, 0.012, -L / 2 - 0.004).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
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
