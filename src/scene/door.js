// Hydraulic door between the corridor and the command room: two thick leaves with an
// interlocking stepped seam that slide apart into pockets in the wall (an original design in
// the heavy, chunky spirit of Alien: Isolation's doors), a status light bar above the doorway
// on each side, and the sign over the door on the corridor side:
//   [monotone lamp logo] / "Command Room" / "Lamplight Data Center" (smaller)
import * as THREE from 'three';
import { Builder } from './builder.js';
import { DOOR } from './layout.js';
import { getLampSprite } from './lamp.js';

const T = 0.16; // leaf thickness
const SLIDE = DOOR.halfW + 0.1; // how far each leaf travels into its wall pocket
const STATUS = { locked: 0xff3b2a, unlocking: 0xffa632, open: 0x52ff7a };

/** The stepped seam: x of the meeting edge as a function of height (as polygon points, bottom to top). */
const SEAM = [[0.06, 0], [0.06, 0.66], [-0.06, 0.86], [-0.06, 1.44], [0.06, 1.64], [0.06, DOOR.height]];

function leafShape(side) {
  // side -1 = left leaf (x from -halfW to the seam), +1 = right leaf (seam to +halfW).
  const s = new THREE.Shape();
  const H = DOOR.height, W = DOOR.halfW;
  if (side < 0) {
    s.moveTo(-W, 0);
    for (const [x, y] of SEAM) s.lineTo(x, y);
    s.lineTo(-W, H);
  } else {
    s.moveTo(W, 0);
    s.lineTo(W, H);
    for (const [x, y] of [...SEAM].reverse()) s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function signTexture() {
  const W = 1024, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d1b18';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(232,226,212,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  // Monotone lamp logo, pixel-crisp.
  const lamp = getLampSprite('mono');
  ctx.imageSmoothingEnabled = false;
  const lw = 112, lh = (lamp.height / lamp.width) * lw;
  ctx.drawImage(lamp, (W - lw) / 2, 18, lw, lh);
  ctx.fillStyle = '#ece6d8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.font = 'bold 58px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillText('Command Room', W / 2, 160);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  ctx.font = '34px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#bfb8a8';
  ctx.fillText('Lamplight Data Center', W / 2, 214);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class HydraulicDoor {
  constructor(m) {
    this.group = new THREE.Group();
    this.group.name = 'hydraulicDoor';
    this.group.position.set(0, 0, DOOR.z);

    // ---- leaves
    this.leaves = [-1, 1].map((side) => {
      const b = new Builder();
      const geom = new THREE.ExtrudeGeometry(leafShape(side), {
        depth: T - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2,
      });
      geom.translate(0, 0, -(T - 0.02) / 2);
      b.add(geom, m.beige);
      // Detailing on both faces: horizontal ribs, a vent panel, and bolt heads along the seam.
      const x0 = side < 0 ? -DOOR.halfW + 0.1 : 0.2, x1 = side < 0 ? -0.2 : DOOR.halfW - 0.1;
      const cx = (x0 + x1) / 2, w = x1 - x0;
      for (const face of [-1, 1]) {
        const z = face * (T / 2 + 0.006);
        for (const y of [0.32, 1.15, 1.98]) b.rbox(m.taupeDark, w, 0.07, 0.02, 0.008, cx, y, z);
        b.rbox(m.taupe, w * 0.7, 0.42, 0.016, 0.02, cx, 0.62 + 0.13, z);
        for (let i = 0; i < 6; i++) b.box(m.grille, w * 0.6, 0.018, 0.012, cx, 0.6 + i * 0.05, z + face * 0.006);
        const bx = side < 0 ? -0.14 : 0.14;
        for (const y of [0.4, 1.15, 1.9]) {
          b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), m.steel, [bx, y, z], [Math.PI / 2, 0, 0]);
        }
      }
      const leaf = b.build({ name: `doorLeaf${side < 0 ? 'L' : 'R'}`, castShadow: true, receiveShadow: true });
      this.group.add(leaf);
      return { leaf, side };
    });

    // ---- status light bars on the header, both faces
    this.statusMat = new THREE.MeshBasicMaterial({ color: STATUS.locked, toneMapped: false });
    const sb = new Builder();
    const headerZ = 0.275 + 0.004; // header rbox (commandRoom.js) is 0.55 deep, centered on the wall
    for (const face of [-1, 1]) sb.box(this.statusMat, 0.56, 0.05, 0.01, 0, DOOR.height + 0.17, face * headerZ);
    this.group.add(sb.build({ name: 'doorStatus', receiveShadow: false }));

    // ---- the sign above the door (corridor side)
    const sign = new Builder();
    const sy = DOOR.height + 0.62, sz = 0.1 + 0.004; // on the corridor face of the back wall (z 8.2)
    sign.rbox(m.taupeDark, 1.78, 0.5, 0.04, 0.02, 0, sy, sz + 0.02);
    this.group.add(sign.build({ name: 'signFrame', receiveShadow: true }));
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.425),
      new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }),
    );
    face.material.color.setScalar(0.92); // softly backlit
    face.position.set(0, sy, sz + 0.042);
    this.group.add(face);

    this.setOpen(0);
    this.setStatus('locked');
  }

  /** 0 = closed, 1 = fully open (leaves inside the wall pockets). */
  setOpen(k) {
    this.openAmount = k;
    for (const { leaf, side } of this.leaves) leaf.position.x = side * SLIDE * k;
  }

  setStatus(state) {
    this.status = state;
    this.statusMat.color.setHex(STATUS[state]);
  }

  /** Blink the status bar (used while unlocking). */
  blink(time) {
    if (this.status !== 'unlocking') return;
    this.statusMat.color.setHex(Math.sin(time * 18) > 0 ? STATUS.unlocking : 0x3a2208);
  }
}

