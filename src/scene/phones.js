// Two retro desk telephones on the left of the command desk (user request), the same early-80s
// model twice:
//   * the operator's line in the room's beige, with a 12-key numbered keypad on the sloped face
//   * a dark red one with NO keypad (a blank plate and an unlit call lamp): the implication is that
//     it only receives calls, emergency line style
// Body: a wedge (low at the front, high at the back) with soft edges; the handset rests across
// the top in two cradle horns; a coiled cord runs from the handset down to the body's side.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { DESK } from './layout.js';

const BW = 0.2, BD = 0.2; // body width (x) and depth (z)

function bodyShape() {
  // Side profile: shape x = depth (z, front = +), shape y = height.
  const s = new THREE.Shape();
  s.moveTo(-BD / 2, 0);
  s.lineTo(BD / 2, 0);
  s.lineTo(BD / 2, 0.028);
  s.lineTo(-0.025, 0.066); // sloped keypad face up to the cradle deck
  s.lineTo(-BD / 2, 0.07);
  s.closePath();
  return s;
}
const SLOPE = Math.atan2(0.066 - 0.028, BD / 2 + 0.025); // keypad face angle
const SLOPE_MID = [0, (0.028 + 0.066) / 2, (BD / 2 - 0.025) / 2]; // y, z of the face's middle (x = 0)

function keypadLegends(ink) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px Helvetica, Arial, sans-serif';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  keys.forEach((k, i) => ctx.fillText(k, 64 + (i % 3) * 128, 64 + Math.floor(i / 3) * 128 + 4));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A coiled cord: a helix wound around a guide curve. */
class CoilCurve extends THREE.Curve {
  constructor(guide, radius, turns) {
    super();
    Object.assign(this, { guide, radius, turns });
    this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  getPoint(u, out = new THREE.Vector3()) {
    const p = this.guide.getPoint(u);
    const t = this.guide.getTangent(u, this._t);
    const ref = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const n = this._n.crossVectors(t, ref).normalize();
    const b = this._b.crossVectors(t, n).normalize();
    const a = u * this.turns * Math.PI * 2;
    return out.copy(p).addScaledVector(n, Math.cos(a) * this.radius).addScaledVector(b, Math.sin(a) * this.radius);
  }
}

// Handset (user reference photos of a modern office handset): a slim curved handle with a raised,
// flat-faced block at each end on the face side: the earpiece (speaker, a circle of holes) and the
// mouthpiece (microphone holes, cord jack in its end). It lies face-down with those two blocks
// resting on the cradle horns (horn tops at y 0.095, centers x ±0.068).
// u runs -1 (mouthpiece) .. +1 (earpiece) along the length.
const HANDSET = { L: 0.21, sag: 0.016, hornX: 0.068, hornTop: 0.095 };
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Centerline, frame and section at u: top/bottom half-heights (back / face side) and half-width. */
function handsetAt(u) {
  const { L, sag } = HANDSET;
  const pad = smoothstep(0.46, 0.62, Math.abs(u)); // 0 handle .. 1 end block (a short sloped wall)
  const ear = u > 0;
  const tx = L / 2, ty = -2 * sag * u, tl = Math.hypot(tx, ty);
  return {
    c: [(u * L) / 2, -sag * u * u],
    t: [tx / tl, ty / tl],
    n: [-ty / tl, tx / tl], // toward the back (up, as it lies)
    ht: 0.0105 + 0.0025 * pad,
    hb: 0.0105 + pad * (ear ? 0.0175 : 0.0155), // face side: the blocks step out here
    hz: 0.0165 + pad * (ear ? 0.0095 : 0.0075),
  };
}

/** One continuous smooth surface swept along the handset (squarish section, rounded edges). */
function handsetGeometry() {
  const NS = 120, NU = 48, P = 4.4;
  const sp = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / P);
  const rings = [];
  for (let i = 0; i <= NS; i++) rings.push({ ...handsetAt((i / NS) * 2 - 1), f: 1 });
  // Short, blocky rounded end caps.
  const cap = [[0.0018, 0.96], [0.0034, 0.84], [0.0045, 0.62], [0.0051, 0.34], [0.0053, 0]];
  const end = rings[NS], start = rings[0];
  for (const [d, f] of cap) rings.push({ ...end, c: [end.c[0] + end.t[0] * d, end.c[1] + end.t[1] * d], f });
  for (const [d, f] of cap) rings.unshift({ ...start, c: [start.c[0] - start.t[0] * d, start.c[1] - start.t[1] * d], f });
  const pos = [];
  for (const r of rings) {
    // Shrink the caps toward the middle of the (asymmetric) section, not the centerline.
    const mid = (r.ht - r.hb) / 2 * (1 - r.f);
    for (let j = 0; j < NU; j++) {
      const a = (j / NU) * Math.PI * 2;
      const sa = Math.sin(a);
      const zz = sp(Math.cos(a)) * r.hz * r.f;
      const nn = sp(sa) * (sa >= 0 ? r.ht : r.hb) * r.f + mid;
      pos.push(r.c[0] + r.n[0] * nn, r.c[1] + r.n[1] * nn, zz);
    }
  }
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < NU; j++) {
      const a = i * NU + j, b = i * NU + ((j + 1) % NU), c2 = (i + 1) * NU + j, d = (i + 1) * NU + ((j + 1) % NU);
      idx.push(a, c2, b, b, c2, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Hole patterns for the earpiece (speaker) and mouthpiece (mic): dark dots on transparent. */
function holesTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#100c09';
  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  if (kind === 'ear') {
    dot(64, 64, 6);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; dot(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22, 5); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.26; dot(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44, 5); }
  } else {
    for (const [x, y] of [[64, 64], [44, 64], [84, 64], [64, 44], [64, 84]]) dot(x, y, 7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const HOLE_TEX = {};

/** Handset group: the swept body + speaker/mic hole plates + cord jack. Origin = centerline middle. */
function buildHandset(body, trim) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(handsetGeometry(), body);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  for (const [kind, u, r] of [['ear', 0.82, 0.016], ['mic', -0.84, 0.0085]]) {
    const at = handsetAt(u);
    HOLE_TEX[kind] ||= holesTexture(kind);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(r, 32),
      new THREE.MeshStandardMaterial({ map: HOLE_TEX[kind], transparent: true, alphaTest: 0.4, roughness: 0.9 }));
    // On the block's flat face, facing out of the face side (-n).
    plate.position.set(at.c[0] - at.n[0] * (at.hb + 0.0004), at.c[1] - at.n[1] * (at.hb + 0.0004), 0);
    plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-at.n[0], -at.n[1], 0));
    group.add(plate);
  }
  // Cord jack in the mouthpiece end.
  const e = handsetAt(-1);
  const jack = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.007, 0.011), trim);
  jack.position.set(e.c[0] - 0.0035, e.c[1] - e.hb * 0.45, 0);
  group.add(jack);
  group.userData.jack = jack.position.clone();
  return group;
}

/** One telephone. keypad: true for the numbered beige one. */
function buildPhone({ body, trim, keyMat, legendInk, keypad }) {
  const group = new THREE.Group();
  const b = new Builder();
  // Body wedge, extruded across its width with soft beveled edges.
  const g = new THREE.ExtrudeGeometry(bodyShape(), {
    depth: BW - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 4,
  });
  g.rotateY(-Math.PI / 2); // shape x -> world z, extrusion -> world -x
  g.translate((BW - 0.016) / 2, 0.008, 0);
  b.add(g, body);
  b.rbox(trim, BW + 0.004, 0.008, BD + 0.004, 0.003, 0, 0.004, 0); // darker base band
  // Cradle horns at the back corners of the top deck.
  for (const s of [-1, 1]) b.rbox(body, 0.036, 0.026, 0.07, 0.012, s * 0.068, 0.082, -0.058);
  // Face plate on the slope (keypad bezel, or the red phone's blank plate).
  const face = new THREE.Group();
  // The bevel puffs the body out ~8 mm and it's lifted 8 mm, so the real sloped surface sits
  // ~16 mm out along the face normal from the nominal profile: mount the plate on that.
  const off = 0.018;
  face.position.set(0, SLOPE_MID[1] + Math.cos(SLOPE) * off, SLOPE_MID[2] + Math.sin(SLOPE) * off);
  face.rotation.x = SLOPE; // front edge down, following the face as it falls toward the front
  const fb = new Builder();
  fb.rbox(trim, 0.12, 0.004, 0.105, 0.004, 0, 0, 0);
  if (keypad) {
    for (let i = 0; i < 12; i++) {
      const kx = ((i % 3) - 1) * 0.032, kz = (Math.floor(i / 3) - 1.5) * 0.023;
      fb.rbox(keyMat, 0.024, 0.008, 0.017, 0.003, kx, 0.004, kz);
    }
  } else {
    fb.rbox(body, 0.1, 0.003, 0.05, 0.003, 0, 0.003, 0.012); // blank plate, no numbers
    fb.add(new THREE.TorusGeometry(0.011, 0.0025, 8, 20), trim, [0, 0.004, -0.032], [Math.PI / 2, 0, 0]); // lamp bezel
  }
  face.add(fb.build({ name: 'phoneFace', castShadow: true, receiveShadow: true }));
  if (keypad) {
    // Legends on the key tops (one decal over the 3×4 grid).
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.096, 0.092),
      new THREE.MeshStandardMaterial({ map: keypadLegends(legendInk), transparent: true, alphaTest: 0.35, roughness: 0.9 }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = 0.0082;
    face.add(decal);
  } else {
    // Unlit call lamp above the blank plate.
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.35, emissive: 0x000000 }));
    lamp.scale.y = 0.55;
    lamp.position.set(0, 0.004, -0.032);
    face.add(lamp);
  }
  group.add(face);
  group.add(b.build({ name: 'phoneBody', castShadow: true, receiveShadow: true }));

  // Handset across the cradle, its earpiece and mouthpiece blocks resting on the horns: seated so
  // the face at each horn's x touches that horn's top (the higher of the two wins).
  const hz = -0.058;
  const hy = Math.max(...[-1, 1].map((sgn) => {
    const at = handsetAt((sgn * HANDSET.hornX) / (HANDSET.L / 2));
    return HANDSET.hornTop - (at.c[1] - at.n[1] * at.hb);
  }));
  const handset = buildHandset(body, trim);
  handset.position.set(0, hy, hz);
  handset.name = 'phoneHandset';
  group.add(handset);
  const jack = handset.userData.jack.clone().add(handset.position);

  // Coiled cord from the jack in the mouthpiece end down to the body's left side.
  const guide = new THREE.CatmullRomCurve3([
    jack, // plugged into the mouthpiece end
    new THREE.Vector3(jack.x - 0.02, jack.y - 0.015, jack.z + 0.02),
    new THREE.Vector3(-0.13, 0.07, hz + 0.05),
    new THREE.Vector3(-0.135, 0.03, 0.02),
    new THREE.Vector3(-0.108, 0.02, 0.05),
  ]);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new CoilCurve(guide, 0.006, 28), 600, 0.0019, 6), trim);
  cord.castShadow = true;
  group.add(cord);
  return group;
}

/** Both phones, placed at the back left of the desk, turned slightly toward the visitor. */
export function buildDeskPhones(m) {
  const red = new THREE.MeshStandardMaterial({ color: 0x5c1411, roughness: 0.88, metalness: 0 });
  const redDark = new THREE.MeshStandardMaterial({ color: 0x3a0c0a, roughness: 0.9, metalness: 0 });
  [red, redDark].forEach((mat) => { mat.shadowSide = THREE.FrontSide; });
  const group = new THREE.Group();
  group.name = 'deskPhones';
  const operator = buildPhone({ body: m.beige, trim: m.taupe, keyMat: m.beigeLight, legendInk: '#3a3229', keypad: true });
  operator.position.set(-1.12, DESK.top, DESK.z - 0.12);
  operator.rotation.y = 0.16;
  const emergency = buildPhone({ body: red, trim: redDark, keypad: false });
  emergency.position.set(-0.86, DESK.top, DESK.z - 0.13);
  emergency.rotation.y = 0.1;
  group.add(operator, emergency);
  return group;
}
