// Entrance door between the corridor and the command room, modeled on the user's reference
// (Alien: Isolation's Sevastopol doors), in the room's beige/taupe palette:
//   * a single octagonal panel (chamfered corners) with a small hexagonal window you can
//     actually see through, raised panel plates, a status light (green + red LEDs), and three
//     rounded slots near the bottom
//   * a thick chamfered octagonal frame with rivets and small lit indicator panels
// It slides UP into the wall/ceiling cavity. Not a heavy blast door: green light flashes with
// three chirps, a brief hiss as it opens; a brief hiss and soft thud when it closes.
// The sign over it (corridor side): monotone lamp logo / "Command Room" / "Lamplight Mainframe".
import * as THREE from 'three';
import { Builder } from './builder.js';
import { DOOR } from './layout.js';
import { getLampSprite } from './lamp.js';

const PANEL_T = 0.08;
const FRAME_T = 0.46;
const LIFT = DOOR.height + 0.25; // how far the panel rises when open (bottom clears the opening)

/** Octagon outline (rectangle with chamfered corners) from y = y0, centered on x = 0. */
function octagon(w, h, c, y0 = 0, path = new THREE.Shape()) {
  const x0 = -w / 2, x1 = w / 2, y1 = y0 + h;
  path.moveTo(x0 + c, y0);
  path.lineTo(x1 - c, y0);
  path.lineTo(x1, y0 + c);
  path.lineTo(x1, y1 - c);
  path.lineTo(x1 - c, y1);
  path.lineTo(x0 + c, y1);
  path.lineTo(x0, y1 - c);
  path.lineTo(x0, y0 + c);
  path.closePath();
  return path;
}

/** Hexagon wider than tall (flat top and bottom), centered at (cx, cy). */
function hexagon(cx, cy, w, h, path = new THREE.Shape()) {
  const hw = w / 2, hh = h / 2, k = w * 0.2;
  path.moveTo(cx - hw, cy);
  path.lineTo(cx - hw + k, cy - hh);
  path.lineTo(cx + hw - k, cy - hh);
  path.lineTo(cx + hw, cy);
  path.lineTo(cx + hw - k, cy + hh);
  path.lineTo(cx - hw + k, cy + hh);
  path.closePath();
  return path;
}

/** A flat raised piece from a shape, `t` thick, sitting on a face at z = zFace (dir ±1). */
function plate(b, mat, shape, t, zFace, dir) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 });
  if (dir < 0) g.rotateY(Math.PI); // face the other way (shapes are symmetric in x)
  g.translate(0, 0, zFace);
  b.add(g, mat);
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
  const lamp = getLampSprite('mono'); // monotone logo, pixel-crisp
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
  ctx.fillText('Lamplight Mainframe', W / 2, 214);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class HydraulicDoor {
  constructor(m) {
    this.group = new THREE.Group();
    this.group.name = 'entranceDoor';
    this.group.position.set(0, 0, DOOR.z);
    const W = DOOR.halfW * 2, H = DOOR.height, C = DOOR.chamfer;

    // ---- frame: chunky chamfered octagon ring around the opening
    {
      const b = new Builder();
      const outer = octagon(DOOR.frameHalfW * 2, DOOR.frameHeight, DOOR.chamfer + 0.12);
      outer.holes.push(octagon(W + 0.01, H + 0.005, C, 0, new THREE.Path()));
      const g = new THREE.ExtrudeGeometry(outer, {
        depth: FRAME_T - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 4,
      });
      g.translate(0, 0, -(FRAME_T - 0.06) / 2);
      b.add(g, m.taupe);
      // Rivets around the opening on both faces.
      const ring = octagon(W + 0.17, H + 0.085, C + 0.06, 0);
      const pts = ring.getSpacedPoints(34).filter((p) => p.y > 0.05);
      for (const face of [-1, 1]) {
        for (const p of pts) {
          b.add(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 10), m.steel, [p.x, p.y, face * (FRAME_T / 2 + 0.03)], [Math.PI / 2, 0, 0]);
        }
        // Small lit indicator panels on the right side of the frame.
        const x = DOOR.halfW + 0.16;
        for (const y of [1.18, 1.5]) {
          b.rbox(m.grille, 0.13, 0.17, 0.02, 0.01, x, y, face * (FRAME_T / 2 + 0.035));
          b.box(m.doorIndicator, 0.08, 0.035, 0.006, x, y + 0.035, face * (FRAME_T / 2 + 0.047));
          b.box(m.doorIndicator, 0.08, 0.035, 0.006, x, y - 0.03, face * (FRAME_T / 2 + 0.047));
        }
      }
      this.group.add(b.build({ name: 'doorFrame', castShadow: true, receiveShadow: true }));
    }

    // ---- panel: octagon with a hexagonal window hole
    this.panel = new THREE.Group();
    {
      const b = new Builder();
      const win = { cx: 0, cy: H * 0.79, w: 0.42, h: 0.28 };
      const shape = octagon(W, H, C);
      shape.holes.push(hexagon(win.cx, win.cy, win.w, win.h, new THREE.Path()));
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: PANEL_T - 0.016, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 4,
      });
      g.translate(0, 0, -(PANEL_T - 0.016) / 2);
      b.add(g, m.beigeLight);
      for (const face of [-1, 1]) {
        const z = face * (PANEL_T / 2);
        // Raised border ring just inside the edge.
        const border = octagon(W - 0.08, H - 0.08, C - 0.03, 0.04);
        border.holes.push(octagon(W - 0.2, H - 0.2, C - 0.08, 0.1, new THREE.Path()));
        border.holes.push(hexagon(win.cx, win.cy, win.w + 0.16, win.h + 0.12, new THREE.Path()));
        plate(b, m.beige, border, 0.006, z, face);
        // Window bezel.
        const bezel = hexagon(win.cx, win.cy, win.w + 0.09, win.h + 0.07);
        bezel.holes.push(hexagon(win.cx, win.cy, win.w, win.h, new THREE.Path()));
        plate(b, m.taupeDark, bezel, 0.012, z, face);
        // Central plate with the status light housing.
        plate(b, m.beige, octagon(0.84, 0.6, 0.12, H * 0.37), 0.01, z, face);
        b.rbox(m.grille, 0.17, 0.065, 0.02, 0.01, 0, H * 0.37 + 0.44, z + face * 0.012);
        // Three rounded slots near the bottom.
        for (const x of [-0.2, 0, 0.2]) {
          const s = new THREE.Shape();
          s.moveTo(x - 0.05, 0.2);
          s.lineTo(x + 0.05, 0.2);
          s.lineTo(x + 0.05, 0.46);
          s.absarc(x, 0.46, 0.05, 0, Math.PI, false);
          s.closePath();
          plate(b, m.grille, s, 0.006, z, face);
        }
      }
      this.panel.add(b.build({ name: 'doorPanel', castShadow: true, receiveShadow: true }));

      // Window glass (see-through, tinted).
      const glass = new THREE.Mesh(new THREE.ShapeGeometry(hexagon(win.cx, win.cy, win.w, win.h)), m.doorGlass);
      glass.renderOrder = 2;
      this.panel.add(glass);

      // Status LEDs on both faces: green (left) and red (right) in the housing.
      this.greenMat = new THREE.MeshBasicMaterial({ color: 0x0a1a0d, toneMapped: false });
      this.redMat = new THREE.MeshBasicMaterial({ color: 0x1a0805, toneMapped: false });
      const lb = new Builder();
      for (const face of [-1, 1]) {
        const z = face * (PANEL_T / 2 + 0.023);
        lb.box(this.greenMat, 0.045, 0.028, 0.006, -0.035, H * 0.37 + 0.44, z);
        lb.box(this.redMat, 0.045, 0.028, 0.006, 0.035, H * 0.37 + 0.44, z);
      }
      this.panel.add(lb.build({ name: 'doorLeds', receiveShadow: false }));
    }
    this.group.add(this.panel);

    // ---- the sign above the door (corridor side), with breathing room above and below
    const sy = DOOR.frameHeight + 0.57, sz = 0.1 + 0.004; // corridor face of the back wall (z 8.2)
    const sb = new Builder();
    sb.rbox(m.taupeDark, 1.78, 0.5, 0.04, 0.02, 0, sy, sz + 0.02);
    this.group.add(sb.build({ name: 'signFrame', receiveShadow: true }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.425), new THREE.MeshBasicMaterial({ map: signTexture(), toneMapped: false }));
    face.material.color.setScalar(0.92); // softly backlit
    face.position.set(0, sy, sz + 0.042);
    this.group.add(face);

    this.setOpen(0);
    this.setStatus('locked');
  }

  /** 0 = closed, 1 = fully open (panel up inside the wall/ceiling cavity). */
  setOpen(k) {
    this.openAmount = k;
    this.panel.position.y = LIFT * k;
  }

  /** 'locked' (red), 'unlocking' (green flashes via flash()), 'open' (green). */
  setStatus(state) {
    this.status = state;
    this.redMat.color.setHex(state === 'locked' ? 0xff3324 : 0x1a0805);
    this.greenMat.color.setHex(state === 'open' ? 0x44ff70 : 0x0a1a0d);
  }

  /** Green LED on/off (flashes in time with the chirps while unlocking). */
  flash(on) {
    this.greenMat.color.setHex(on ? 0x5dff84 : 0x0a1a0d);
  }
}
