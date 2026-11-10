// Overhead monitor rig: a ceiling hatch (two hinged doors) over a dark shaft, a
// three-stage telescoping arm, and the Blender-made bulbous CRT terminal on a tilting yoke.
//
// Sequence (seconds after start()):
//   0.00 to 0.90  doors swing open (slight overshoot)
//   0.55 to 3.95  arm telescopes down (ease in/out), then a small spring settle
//   1.10          screen powers on (CRT warm-up -> boot card), status LED lights
//   ~2.4 to 3.95  housing tilts from level to face the viewer
//   arrival       small damped sway
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Builder } from './builder.js';
import { HATCH, ROOM } from './layout.js';
import { PALETTE } from './palette.js';
import { MonitorScreen } from './screen.js';

export const MONITOR = {
  attachStored: 4.08, // yoke attachment height when stowed (whole unit above the ceiling)
  attachFinal: 1.81, // puts the screen center at ~1.40 m, 34 cm above the desk
  anchor: 4.75, // top of the fixed sleeve
  tilt: -0.17, // radians: screen angled up toward the standing viewer (~10°)
  doorsOpen: 0.9,
  descentStart: 0.6,
  descentDur: 4.2, // slow descent; with the door intro, timed so door slam, hatch and breakers stay apart
  screenOn: 1.4,
};
MONITOR.total = MONITOR.descentStart + MONITOR.descentDur; // 4.8 s: starts ~5.1 s into the 9.9 s walk
MONITOR.desktopAt = MONITOR.total + 2.0; // "a couple seconds" after it is fully down, the boot gives way to the desktop

// Raising back into the ceiling (F key). Seconds after raise().
export const RAISE = {
  ledOff: 0.35, // status LED goes out with the CRT collapse
  levelStart: 0.3, levelDur: 0.7, // housing tilts back to level
  ascentStart: 0.7, ascentDur: 3.4, // arm retracts (a bit quicker than the 5 s descent)
  doorsStart: 4.15, doorsDur: 0.8, // doors swing shut behind it
};
RAISE.total = RAISE.doorsStart + RAISE.doorsDur; // 4.95 s

const easeInOutCubic =(k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOutBack = (k, s = 1.25) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export class MonitorRig {
  constructor(m) {
    this.m = m;
    this.group = new THREE.Group();
    this.group.name = 'monitorRig';
    this.group.position.set(HATCH.x, 0, HATCH.z);
    this.screen = new MonitorScreen();
    this.state = 'stowed'; // stowed | running | down
    this.t = 0;
    this.tiltNode = null;
    this.ledMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    this.screenMat = new THREE.MeshStandardMaterial({
      color: 0x050706,
      roughness: 0.32,
      metalness: 0,
      emissive: 0xffffff,
      emissiveMap: this.screen.texture,
      emissiveIntensity: 1.15,
    });
    this.buildShaftAndDoors();
    this.buildArm();
    this.holder = new THREE.Group(); // origin = yoke attachment point
    this.group.add(this.holder);
    this.apply(0);
  }

  buildShaftAndDoors() {
    const { m } = this;
    const H = ROOM.height;
    const hw = HATCH.w / 2, hd = HATCH.d / 2;
    const b = new Builder();
    const top = 5.0;
    // Dark shaft lining above the opening.
    b.span(m.grille, -hw - 0.05, -hw, H + 0.1, top, -hd, hd);
    b.span(m.grille, hw, hw + 0.05, H + 0.1, top, -hd, hd);
    b.span(m.grille, -hw, hw, H + 0.1, top, -hd - 0.05, -hd);
    b.span(m.grille, -hw, hw, H + 0.1, top, hd, hd + 0.05);
    b.span(m.grille, -hw - 0.05, hw + 0.05, top, top + 0.05, -hd - 0.05, hd + 0.05);
    // Inner lip of the ceiling slab (the cut edge).
    b.span(m.ceiling, -hw - 0.05, -hw, H, H + 0.1, -hd, hd);
    b.span(m.ceiling, hw, hw + 0.05, H, H + 0.1, -hd, hd);
    b.span(m.ceiling, -hw, hw, H, H + 0.1, -hd - 0.05, -hd);
    b.span(m.ceiling, -hw, hw, H, H + 0.1, hd, hd + 0.05);
    this.group.add(b.build({ name: 'hatchShaft', castShadow: false, receiveShadow: true }));

    // Two doors hinged at the left and right edges, meeting in the middle.
    this.doors = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * hw, H, 0);
      const db = new Builder();
      // Closed, the hatch must look sealed (user: you shouldn't see into the shaft): the doors
      // meet at the center, run 1 cm past the opening front and back, have tight 3 mm edges,
      // and the left door carries a seal strip under the center seam.
      const w = hw, t = 0.028;
      db.rbox(m.taupe, w, t, HATCH.d + 0.02, 0.003, -s * w / 2, -t / 2, 0);
      if (s < 0) db.box(m.taupeDark, 0.06, 0.004, HATCH.d + 0.02, w, -t - 0.002, 0); // seal strip over the seam
      const gx0 = -s * (w - 0.06), gx1 = -s * 0.06; // grip strip along the door (span needs min < max)
      db.span(m.taupeDark, Math.min(gx0, gx1), Math.max(gx0, gx1), -t - 0.002, -t, -0.2, 0.2);
      const mesh = db.build({ name: 'hatchDoor', castShadow: true, receiveShadow: true });
      pivot.add(mesh);
      this.group.add(pivot);
      return { pivot, s };
    });
  }

  buildArm() {
    const { m } = this;
    // Each telescoping stage is a lathe-turned tube: smooth (64 sides) with rounded lips at both
    // ends, instead of a plain low-poly cylinder (user: better resolution for the arm and piston).
    const tube = (r, len) => {
      const h = len / 2, e = Math.min(0.012, r * 0.25);
      const prof = [[0, -h], [r - e, -h]];
      for (let i = 1; i <= 6; i++) { const a = (Math.PI / 2) * (i / 6); prof.push([r - e + e * Math.sin(a), -h + e - e * Math.cos(a)]); }
      for (let i = 0; i <= 6; i++) { const a = (Math.PI / 2) * (i / 6); prof.push([r - e + e * Math.cos(a), h - e + e * Math.sin(a)]); }
      prof.push([0, h]);
      return new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64);
    };
    const mk = (r, len, mat) => {
      const mesh = new THREE.Mesh(tube(r, len), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      return { mesh, len };
    };
    this.sleeve = mk(0.078, 1.0, m.beigeLight);
    // Brushed, fairly rough steel: the desk spot sits right beside the arm and a polished
    // tube turns into a blinding streak.
    const armSteel = new THREE.MeshStandardMaterial({ color: 0x9c9a95, roughness: 0.55, metalness: 0.35 });
    this.mid = mk(0.061, 1.12, armSteel);
    this.inner = mk(0.047, 1.12, armSteel);
    // Collar rings at each stage's bottom lip.
    this.midCollar = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 14, 64), m.beige);
    this.innerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 14, 64), m.beige);
    this.midCollar.rotation.x = this.innerCollar.rotation.x = Math.PI / 2;
    this.group.add(this.midCollar, this.innerCollar);
    this.sleeve.mesh.position.y = MONITOR.anchor - this.sleeve.len / 2;
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;
    const { m } = this;
    const remap = {
      housing: m.beige, bezel: m.taupeDark, grille: m.grille, yoke: m.beigeLight, steel: m.steel, knob: m.taupe,
      led: this.ledMat, screen: this.screenMat,
    };
    root.traverse((o) => {
      if (o.isMesh) {
        o.material = remap[o.material.name] || o.material;
        o.castShadow = true;
        o.receiveShadow = true;
      }
      if (o.name === 'Tilt') this.tiltNode = o;
      if (o.isMesh && o.material === this.screenMat) this.screenMesh = o; // the focus camera frames this
    });
    this.holder.add(root);
    this.apply(this.state === 'down' ? 999 : this.t);
    return this;
  }

  on(evt, fn) {
    this.listeners ||= {};
    (this.listeners[evt] ||= []).push(fn);
  }
  emit(evt, data) { (this.listeners?.[evt] || []).forEach((fn) => fn(data)); }

  start() {
    this.state = 'running';
    this.t = 0;
    this.screen.powerOff();
    this.emit('start'); // audio schedules the whole hatch/motor/CRT soundtrack from MONITOR timings
  }

  reset() {
    this.state = 'stowed';
    this.t = 0;
    this.screen.powerOff();
    this.ledMat.color.setRGB(0, 0, 0);
    this.apply(0);
  }

  setDown() {
    this.state = 'down';
    this.t = 999;
    this.screen.showLogon(true);
    this.ledMat.color.set(PALETTE.ledCyan).multiplyScalar(2);
    this.apply(999);
  }

  /**
   * Raise the monitor back into the ceiling (F key, only after the visitor has exited the
   * desktop). Timeline in RAISE: the screen shuts off (CRT collapse), the housing tilts level,
   * the arm retracts, the doors close. Ends 'stowed', ready to start() again.
   */
  raise() {
    if (this.state !== 'down') return false;
    this.state = 'raising';
    this.t = 0;
    this.screen.shutdown();
    this.emit('raise');
    return true;
  }

  update(dt) {
    if (this.state === 'running') {
      this.t += dt;
      if (this.t >= MONITOR.screenOn && this.screen.state === 'off') {
        this.screen.powerOn();
        this.ledMat.color.set(PALETTE.ledCyan).multiplyScalar(2);
        this.emit('screenOn'); // the wall CRTs wake and boot along with it
      }
      if (this.t >= MONITOR.desktopAt && this.screen.state === 'boot') {
        this.screen.showLogon(); // boot done: the logon screen (the visitor logs on after pressing E)
        this.emit('desktop'); // startup chime, enables focusing the terminal
      }
      if (this.t > MONITOR.desktopAt + 0.5) this.state = 'down';
      this.apply(this.t);
    } else if (this.state === 'raising') {
      this.t += dt;
      const R = RAISE;
      if (this.t >= R.ledOff) this.ledMat.color.setRGB(0, 0, 0);
      const tiltK = 1 - easeInOutCubic(clamp01((this.t - R.levelStart) / R.levelDur));
      const d = 1 - easeInOutCubic(clamp01((this.t - R.ascentStart) / R.ascentDur));
      const open = 1 - easeInOutCubic(clamp01((this.t - R.doorsStart) / R.doorsDur));
      this.applyPose(open, d, tiltK, 0, 0);
      if (this.t >= R.total) {
        this.state = 'stowed';
        this.t = 0;
        this.screen.powerOff();
        this.emit('stowed');
      }
    }
    this.screen.update(dt);
  }

  /** Pose for time t of the descent sequence (MONITOR timings). */
  apply(t) {
    const dk = clamp01(t / MONITOR.doorsOpen);
    const open = t <= 0 ? 0 : easeOutBack(dk, 1.1);
    const d = clamp01((t - MONITOR.descentStart) / MONITOR.descentDur);
    // Small spring settle and sway after arrival.
    const after = t - MONITOR.total;
    let bounce = 0, sway = 0;
    if (after > 0 && after < 3) {
      bounce = -0.012 * Math.exp(-4 * after) * Math.sin(after * 14);
      sway = 0.05 * Math.exp(-2.2 * after) * Math.sin(after * 6.5);
    }
    // Housing tilt: level during the drop, then motors toward the viewer.
    const tiltK = easeInOutCubic(clamp01((d - 0.6) / 0.4));
    this.applyPose(open, easeInOutCubic(d), tiltK, sway, bounce);
  }

  /**
   * open: doors 0..1 (may overshoot), down: 0 = stowed .. 1 = fully lowered (already eased),
   * tiltK: 0 = level .. 1 = angled toward the viewer, sway (rad) and bounce (m): settle wobble.
   */
  applyPose(open, down, tiltK, sway, bounce) {
    for (const { pivot, s } of this.doors) pivot.rotation.z = s * open * THREE.MathUtils.degToRad(93);
    const A = THREE.MathUtils.lerp(MONITOR.attachStored, MONITOR.attachFinal, down) + bounce;
    this.holder.position.y = A;
    // Telescoping stages.
    const sleeveBottom = MONITOR.anchor - this.sleeve.len;
    const midBottom = (sleeveBottom + A) / 2;
    this.mid.mesh.position.y = midBottom + this.mid.len / 2;
    this.inner.mesh.position.y = A + this.inner.len / 2;
    this.midCollar.position.y = midBottom + 0.01;
    this.innerCollar.position.y = A + 0.01;
    if (this.tiltNode) this.tiltNode.rotation.x = MONITOR.tilt * tiltK + sway;
  }
}
