// Entrance door between the corridor and the command room, modeled on the user's reference
// (Alien: Isolation's Sevastopol doors), in the room's beige/taupe palette:
//   * a single octagonal panel (chamfered corners) with a small hexagonal window you can
//     actually see through, raised panel plates, a status light (green + red LEDs), and three
//     rounded slots near the bottom (indented, with dark inserts)
//   * a uniform-width chamfered octagonal frame with symmetric retro trim (pinstripes, vent slots)
// It slides UP into the wall/ceiling cavity. Not a heavy blast door: green light flashes with
// three chirps, a brief hiss as it opens; a brief hiss and soft thud when it closes.
// The signs over it (both sides): lit amber LED boards (ledSign.js): lamp, "COMMAND ROOM",
// "LAMPLIGHT MAINFRAME", two gears.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { DOOR } from './layout.js';
import { ledBoardTexture, LED_BOARD_ASPECT } from './ledSign.js';

const PANEL_T = 0.08;
const FRAME_W = DOOR.frameHalfW - DOOR.halfW; // frame band width (0.3 m)
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

/**
 * The door's octagon (w × h from y = 0, chamfer c) offset outward by e on every side, including
 * the bottom (below the floor) and the diagonals: an offset diagonal needs chamfer c + e(2 - √2).
 */
function offsetOct(w, h, c, e, path) {
  return octagon(w + 2 * e, h + 2 * e, c + e * (2 - Math.SQRT2), -e, path);
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

export class HydraulicDoor {
  /** signs: false for the prop doors in the server room (scene/serverRoom.js addCatwalkDoors). */
  constructor(m, { signs = true } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'entranceDoor';
    this.group.position.set(0, 0, DOOR.z);
    const W = DOOR.halfW * 2, H = DOOR.height, C = DOOR.chamfer;

    // ---- frame: a uniform-width chamfered octagon band around the opening. The outline is the
    // door's octagon offset outward by FRAME_W on every side (diagonals included), so the bottom
    // corners match the top ones; the bottom part continues below the floor line.
    {
      const b = new Builder();
      const ring = (e1, e2) => {
        const outer = offsetOct(W, H, C, e2);
        outer.holes.push(offsetOct(W, H, C, e1, new THREE.Path()));
        return outer;
      };
      const g = new THREE.ExtrudeGeometry(ring(0.005, FRAME_W), {
        depth: FRAME_T - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 3, curveSegments: 4,
      });
      g.translate(0, 0, -(FRAME_T - 0.06) / 2);
      b.add(g, m.taupe);
      // Symmetric retro trim on both faces: two pinstripes following the octagon. (The black vent grilles on the
      // left and right bands and the three slots on top were removed at the user's request; this class also builds
      // the catwalk doors, so they lost them too.)
      for (const face of [-1, 1]) {
        const z = face * (FRAME_T / 2);
        plate(b, m.taupeDark, ring(0.07, 0.1), 0.005, z, face);
        plate(b, m.beigeLight, ring(0.18, 0.2), 0.005, z, face);
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
      // Three rounded slots near the bottom, INDENTED like the monitor's chin vents (user): real holes in the panel
      // (the extrusion gives them beveled beige walls) with a dark insert at the panel's middle, seen from both faces.
      const slot = (x, path) => {
        path.moveTo(x - 0.045, 0.2);
        path.lineTo(x + 0.045, 0.2);
        path.lineTo(x + 0.045, 0.395);
        path.absarc(x, 0.395, 0.045, 0, Math.PI, false);
        path.closePath();
        return path;
      };
      for (const x of [-0.2, 0, 0.2]) {
        shape.holes.push(slot(x, new THREE.Path()));
        b.add(new THREE.ExtrudeGeometry(slot(x, new THREE.Shape()), { depth: 0.012, bevelEnabled: false, curveSegments: 8 }),
          m.grille, [0, 0, -0.006]);
      }
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
        plate(b, m.beige, border, 0.006, z, face);
        // Window bezel.
        const bezel = hexagon(win.cx, win.cy, win.w + 0.09, win.h + 0.07);
        bezel.holes.push(hexagon(win.cx, win.cy, win.w, win.h, new THREE.Path()));
        plate(b, m.taupeDark, bezel, 0.012, z, face);
        // Central plate with the status light housing.
        plate(b, m.beige, octagon(0.84, 0.6, 0.12, H * 0.37), 0.01, z, face);
        b.rbox(m.grille, 0.17, 0.065, 0.02, 0.01, 0, H * 0.37 + 0.44, z + face * 0.012);
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

    // ---- the lit LED message board above the door, on BOTH sides of the wall (identical signs).
    // Corridor side: higher (the corridor is taller), with breathing room above the frame.
    // Room side: centered between the frame top (2.4) and the room ceiling (3.2).
    if (signs) {
      this.addSign(m, DOOR.frameHeight + 0.57, 0.1, 1); // corridor face of the back wall (z 8.2)
      this.addSign(m, 2.8, -0.1, -1); // room face of the back wall (z 8.0)
    }

    this.setOpen(0);
    this.setStatus('locked');
  }

  /** One LED board in its housing, mounted on the wall face at local z = zWall, facing dir (±1 z). */
  addSign(m, y, zWall, dir) {
    const faceW = 1.8, faceH = faceW / LED_BOARD_ASPECT;
    const sign = new THREE.Group();
    sign.position.set(0, y, zWall);
    if (dir < 0) sign.rotation.y = Math.PI;
    const b = new Builder();
    b.rbox(m.taupeDark, faceW + 0.12, faceH + 0.12, 0.07, 0.015, 0, 0, 0.035); // housing
    b.box(m.grille, faceW + 0.02, faceH + 0.02, 0.01, 0, 0, 0.068); // dark bezel recess behind the dots
    for (const sx of [-1, 1]) b.rbox(m.beige, 0.05, faceH + 0.16, 0.02, 0.006, sx * (faceW / 2 + 0.045), 0, 0.076); // end caps
    sign.add(b.build({ name: 'ledSignHousing', receiveShadow: true }));
    if (!this.signMat) {
      this.signMat = new THREE.MeshBasicMaterial({ map: ledBoardTexture(), toneMapped: false });
      this.signMat.color.setScalar(1.35); // the brightest dot centers push into bloom
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(faceW, faceH), this.signMat);
    face.position.z = 0.0745;
    face.name = 'ledSignFace';
    sign.add(face);
    this.group.add(sign);
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
