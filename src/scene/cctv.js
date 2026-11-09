// Security cameras in the four upper corners of the server room, modeled on early-1980s CCTV:
// a long enamel housing under a sun hood with a round front window, on the tilt platform of a
// motorized pan/tilt head that sits on the end of an L wall bracket with a gusset strut.
// Each camera carries a PerspectiveCamera at its lens; the Security Cameras app (apps/cameras.js)
// renders those. The heads move like servo-driven units: a rate-limited ease toward a target.
// Unwatched cameras slowly patrol back and forth; the watched one follows the visitor's mouse.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { SERVER, CORE } from './layout.js';

const MOUNT_Y = 4.05; // pan pivot height: the camera sits on top (trusses' undersides are at 4.75)
const ARM = 0.46; // wall to pan axis
const PAN_RANGE = THREE.MathUtils.degToRad(46); // either side of the aim at the core
const TILT_MIN = THREE.MathUtils.degToRad(-58), TILT_MAX = THREE.MathUtils.degToRad(-3);
const TILT_RANGE = THREE.MathUtils.degToRad(24); // mouse travel, top to center
const MAX_SPEED = THREE.MathUtils.degToRad(48); // rad/s, like a period pan/tilt motor
const PATROL = THREE.MathUtils.degToRad(34);

// Clockwise around the hall from the back-left corner, so ← / → walk around the room.
// "North" is the back wall (far from the command room).
export const CCTV_CAMERAS = [
  { label: 'CAM 1', name: 'SERVER HALL NW', x: SERVER.xMin, z: SERVER.zMin + 0.75 },
  { label: 'CAM 2', name: 'SERVER HALL NE', x: SERVER.xMax, z: SERVER.zMin + 0.75 },
  { label: 'CAM 3', name: 'SERVER HALL SE', x: SERVER.xMax, z: -1.7 },
  { label: 'CAM 4', name: 'SERVER HALL SW', x: SERVER.xMin, z: -1.7 },
];

function materials() {
  const std = (color, roughness = 0.88, metalness = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mat.shadowSide = THREE.FrontSide;
    return mat;
  };
  return {
    housing: std(0xe4dccb), // off-white enamel
    hood: std(0xd3c8b2),
    head: std(0x8f8676), // pan/tilt motor housing
    bracket: std(0x5d564b),
    bezel: std(0x24221f),
    steel: std(0x9a988f, 0.5, 0.6),
    lens: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.18, metalness: 0.2 }),
    tally: new THREE.MeshBasicMaterial({ color: 0x3a0806, toneMapped: false }),
  };
}

const cyl = (r, h, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);
const X90 = [0, 0, Math.PI / 2]; // cylinder axis along x
const Z90 = [Math.PI / 2, 0, 0]; // cylinder axis along z

/** Static wall bracket (world space) for a camera on the wall at x = wallX; armDir = +1 / -1. */
function buildBracket(b, M, wallX, z, armDir) {
  const yArm = MOUNT_Y - 0.03; // the pan head sits on top of the arm's end
  b.rbox(M.bracket, 0.025, 0.3, 0.2, 0.008, wallX + armDir * 0.0125, yArm - 0.1, z); // wall plate
  for (const dy of [-0.2, 0.0]) for (const dz of [-0.065, 0.065]) {
    b.add(cyl(0.011, 0.012, 10), M.steel, [wallX + armDir * 0.027, yArm + dy, z + dz], X90); // bolt heads
  }
  b.rbox(M.bracket, ARM + 0.06, 0.05, 0.06, 0.01, wallX + armDir * ((ARM + 0.06) / 2), yArm, z); // arm
  // Gusset strut from the lower wall plate up to the arm.
  const x0 = wallX + armDir * 0.02, y0 = yArm - 0.2, x1 = wallX + armDir * 0.3, y1 = yArm - 0.02;
  b.box(M.bracket, Math.hypot(x1 - x0, y1 - y0), 0.026, 0.032, (x0 + x1) / 2, (y0 + y1) / 2, z,
    [0, 0, Math.atan2(y1 - y0, x1 - x0)]);
  b.add(cyl(0.05, 0.014, 24), M.bracket, [wallX + armDir * ARM, yArm + 0.03, z]); // mounting disc under the head
}

const TILT_Y = 0.155; // tilt axis above the pan pivot

/** Pan head (in the pan group) and the camera on its tilt platform (in the tilt group). */
function buildHead(M) {
  const pan = new Builder();
  pan.add(cyl(0.078, 0.1, 28), M.head, [0, 0.055, 0]); // pan motor drum
  pan.add(cyl(0.083, 0.012, 28), M.bracket, [0, 0.006, 0]); // bottom flange
  pan.add(cyl(0.083, 0.012, 28), M.bracket, [0, 0.105, 0]); // top flange
  for (const s of [-1, 1]) pan.rbox(M.bracket, 0.012, 0.075, 0.06, 0.004, s * 0.066, 0.145, 0); // tilt uprights
  pan.add(cyl(0.03, 0.04, 20), M.head, [0.092, TILT_Y, 0], X90); // tilt motor
  pan.add(cyl(0.012, 0.13, 12), M.steel, [0, TILT_Y, 0], X90); // tilt axle
  const tilt = new Builder();
  tilt.add(cyl(0.024, 0.11, 18), M.bracket, [0, 0, 0], X90); // knuckle on the axle
  tilt.box(M.bracket, 0.04, 0.03, 0.03, 0, 0.018, 0); // neck
  tilt.rbox(M.bracket, 0.11, 0.012, 0.22, 0.004, 0, 0.035, 0.02); // tilt platform
  // Housing: long rounded box, lens toward -z.
  const hy = 0.106;
  tilt.rbox(M.housing, 0.17, 0.13, 0.48, 0.02, 0, hy, 0.03);
  tilt.rbox(M.bracket, 0.172, 0.016, 0.484, 0.006, 0, hy - 0.045, 0.03); // seam band
  // Sun hood: overhangs the front, with short side skirts.
  tilt.rbox(M.hood, 0.205, 0.012, 0.6, 0.004, 0, hy + 0.074, -0.02);
  for (const s of [-1, 1]) tilt.box(M.hood, 0.008, 0.05, 0.56, s * 0.1, hy + 0.05, -0.02);
  // Front: bezel ring, lens window, trim ring.
  tilt.add(cyl(0.058, 0.026, 32), M.bezel, [0, hy, -0.218], Z90);
  tilt.add(cyl(0.046, 0.006, 32), M.lens, [0, hy, -0.232], Z90);
  tilt.add(new THREE.TorusGeometry(0.052, 0.005, 8, 32), M.steel, [0, hy, -0.232]);
  // Rear end cap and cable gland with a short cable stub.
  tilt.rbox(M.bezel, 0.16, 0.12, 0.03, 0.01, 0, hy, 0.275);
  tilt.add(cyl(0.017, 0.045, 14), M.steel, [0.04, hy - 0.02, 0.305], Z90);
  tilt.add(cyl(0.009, 0.09, 10), M.bezel, [0.04, hy - 0.02, 0.36], Z90);
  // Side badge plates.
  for (const s of [-1, 1]) tilt.box(M.bezel, 0.002, 0.03, 0.09, s * 0.086, hy + 0.012, 0.1);
  return { pan, tilt, hy };
}

export class CctvSystem {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cctv';
    const M = (this.M = materials());
    const bracket = new Builder();
    this.cams = CCTV_CAMERAS.map((def, i) => {
      const armDir = def.x < 0 ? 1 : -1;
      buildBracket(bracket, M, def.x, def.z, armDir);
      const pivot = new THREE.Vector3(def.x + armDir * ARM, MOUNT_Y, def.z);
      const { pan, tilt, hy } = buildHead(M);
      const panG = pan.build({ name: `cctvPan${i + 1}`, castShadow: false });
      panG.position.copy(pivot);
      const tiltG = tilt.build({ name: `cctvTilt${i + 1}`, castShadow: false });
      tiltG.position.set(0, TILT_Y, 0);
      panG.add(tiltG);
      // Tally light on the rear cap (its own material per camera so one can be "live").
      const tallyMat = M.tally.clone();
      const tally = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), tallyMat);
      tally.position.set(-0.045, hy + 0.03, 0.292);
      tiltG.add(tally);
      // The view: at the lens, looking down -z like the housing.
      const view = new THREE.PerspectiveCamera(50, 4 / 3, 0.05, 90);
      view.position.set(0, hy, -0.24);
      tiltG.add(view);
      this.group.add(panG);

      // Aim at the supercomputer, about mid-height.
      const dx = CORE.x - pivot.x, dz = CORE.z - pivot.z;
      const yaw0 = Math.atan2(-dx, -dz);
      const tilt0 = Math.atan2(-0.5 - pivot.y, Math.hypot(dx, dz));
      const cam = {
        ...def, panG, tiltG, view, tallyMat, yaw0, tilt0,
        pan: 0, tilt: tilt0, targetPan: 0, targetTilt: tilt0,
        phase: i * 1.7, watched: false,
      };
      this.apply(cam);
      return cam;
    });
    this.group.add(bracket.build({ name: 'cctvBrackets', castShadow: false }));
    this.t = 0;
    this.setLive(-1);
  }

  /** Which camera is being watched (-1: none). Its tally light glows; the others idle dim. */
  setLive(i) {
    this.cams.forEach((c, k) => {
      c.watched = k === i;
      c.tallyMat.color.setHex(k === i ? 0xff2a1a : 0x4a0a07);
    });
  }

  /** Steer the watched camera: nx, ny in -1..1 across the picture (right / down positive). */
  steer(i, nx, ny) {
    const c = this.cams[i];
    if (!c) return;
    c.targetPan = THREE.MathUtils.clamp(-nx, -1, 1) * PAN_RANGE;
    c.targetTilt = THREE.MathUtils.clamp(c.tilt0 - ny * TILT_RANGE, TILT_MIN, TILT_MAX);
  }

  apply(c) {
    c.panG.rotation.y = c.yaw0 + c.pan;
    c.tiltG.rotation.x = c.tilt;
  }

  /** Returns how fast (rad/s) the watched camera is turning, for the motor sound. */
  update(dt) {
    this.t += dt;
    let watchedSpeed = 0;
    for (const c of this.cams) {
      if (!c.watched) { // slow patrol sweep
        c.targetPan = Math.sin(this.t * 0.11 + c.phase) * PATROL;
        c.targetTilt = c.tilt0;
      }
      const vp = THREE.MathUtils.clamp((c.targetPan - c.pan) * 3.5, -MAX_SPEED, MAX_SPEED);
      const vt = THREE.MathUtils.clamp((c.targetTilt - c.tilt) * 3.5, -MAX_SPEED, MAX_SPEED);
      c.pan += vp * dt;
      c.tilt += vt * dt;
      if (c.watched) watchedSpeed = Math.hypot(vp, vt);
      this.apply(c);
    }
    return watchedSpeed;
  }
}
