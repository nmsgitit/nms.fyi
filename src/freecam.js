// Developer freecam (C, `npm run dev` only; never in the production build): fly anywhere to look
// at details up close. Click to capture the mouse (pointer lock), mouse to look (a full 360° both ways), WASD to move,
// Space / Z up and down, Shift = 4× faster, Alt = 4× slower, mouse wheel changes the base speed.
// While it's on, every other key and click is swallowed (so E/Q/F/Tab and the monitor click don't
// fire), the HUD shows the camera position and direction, and the near plane drops to 1 cm.
// C again puts the camera back exactly where it was.
import * as THREE from 'three';

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _x = new THREE.Vector3(1, 0, 0);
const _qa = new THREE.Quaternion();
const _camUp = new THREE.Vector3();

export class Freecam {
  constructor({ camera, canvas, isBlocked = () => false, onChange = () => {} }) {
    this.camera = camera;
    this.canvas = canvas;
    this.isBlocked = isBlocked;
    this.onChange = onChange;
    this.active = false;
    this.speed = 2; // m/s
    this.keys = new Set();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.saved = null;

    // Capture phase on window: runs before the site's own handlers, so they can be swallowed.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyC' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (this.active || !this.isBlocked()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.active ? this.exit() : this.enter();
        }
        return;
      }
      if (!this.active) return;
      if (e.ctrlKey || e.metaKey) return; // leave browser shortcuts alone
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'Tab' || e.altKey) e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (this.active) e.stopImmediatePropagation(); }, true);
    window.addEventListener('blur', () => this.keys.clear());
    for (const type of ['pointerdown', 'click', 'dblclick']) {
      window.addEventListener(type, (e) => {
        if (!this.active || e.target !== this.canvas) return;
        e.stopImmediatePropagation();
        if (type === 'pointerdown' && document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
      }, true);
    }
    document.addEventListener('mousemove', (e) => {
      if (!this.active || document.pointerLockElement !== this.canvas) return;
      // No limits in any direction (user): pitch turns about the camera's own right axis, so it can go over the
      // top or under in a full loop; yaw turns about world up, reversed while upside down so moving the mouse
      // right always swings the view right on screen.
      const q = this.camera.quaternion;
      _camUp.set(0, 1, 0).applyQuaternion(q);
      const yawSign = _camUp.y < 0 ? -1 : 1;
      q.premultiply(_qa.setFromAxisAngle(_up, -e.movementX * 0.0022 * yawSign));
      q.multiply(_qa.setFromAxisAngle(_x, -e.movementY * 0.0022));
      q.normalize();
      this.euler.setFromQuaternion(q, 'YXZ'); // for the HUD readout
    });
    window.addEventListener('wheel', (e) => {
      if (!this.active) return;
      this.speed = Math.min(40, Math.max(0.05, this.speed * (e.deltaY > 0 ? 0.8 : 1.25)));
    }, { passive: true });
  }

  enter() {
    const c = this.camera;
    this.saved = { pos: c.position.clone(), quat: c.quaternion.clone(), near: c.near };
    this.euler.setFromQuaternion(c.quaternion, 'YXZ');
    this.euler.z = 0;
    c.quaternion.setFromEuler(this.euler);
    c.near = 0.01;
    c.updateProjectionMatrix();
    this.active = true;
    this.keys.clear();
    this.onChange(true);
  }

  exit() {
    const c = this.camera;
    this.active = false;
    this.keys.clear();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    if (this.saved) {
      c.position.copy(this.saved.pos);
      c.quaternion.copy(this.saved.quat);
      c.near = this.saved.near;
      c.updateProjectionMatrix();
    }
    this.onChange(false);
  }

  update(dt) {
    if (!this.active) return;
    const k = this.keys;
    _fwd.set(0, 0, -1).applyQuaternion(this.camera.quaternion); // fly where you look
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion); // the camera's own right: fine looking straight up or upside down
    _move.set(0, 0, 0);
    if (k.has('KeyW')) _move.add(_fwd);
    if (k.has('KeyS')) _move.sub(_fwd);
    if (k.has('KeyD')) _move.add(_right);
    if (k.has('KeyA')) _move.sub(_right);
    if (k.has('Space')) _move.y += 1;
    if (k.has('KeyZ')) _move.y -= 1;
    if (_move.lengthSq() === 0) return;
    let v = this.speed;
    if (k.has('ShiftLeft') || k.has('ShiftRight')) v *= 4;
    if (k.has('AltLeft') || k.has('AltRight')) v /= 4;
    this.camera.position.addScaledVector(_move.normalize(), v * dt);
  }

  /** HUD lines: position, heading/pitch in degrees, speed. */
  status() {
    const p = this.camera.position;
    const yaw = ((THREE.MathUtils.radToDeg(this.euler.y) % 360) + 360) % 360;
    const pitch = THREE.MathUtils.radToDeg(this.euler.x);
    return `FREECAM  pos ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}  yaw ${yaw.toFixed(0)}°  pitch ${pitch.toFixed(0)}°  speed ${this.speed.toFixed(2)} m/s\n` +
      'click: capture mouse · WASD move · Space/Z up/down · Shift fast · Alt slow · wheel speed · C exit';
  }
}
