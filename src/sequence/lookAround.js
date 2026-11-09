// Look around (F): the visitor stays standing at the desk and turns their head with the mouse,
// e.g. to look behind them or at the wall CRTs. No movement (the user explicitly did not
// want a free-flying camera). The mouse is captured (pointer lock) so moving it turns the
// view; if the browser refuses pointer lock, click-and-drag works instead.
// F again, or Escape (which also releases pointer lock), turns the view back to the desk.
import * as THREE from 'three';

const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const PITCH_LIMIT = 1.2; // ~69° up/down
const SENSITIVITY = 0.0024; // radians per pixel of mouse movement

export class LookAround {
  /** isBlocked(): true when looking around must not start (desktop open, focus gliding, ...). */
  constructor({ camera, canvas, walk, isBlocked }) {
    Object.assign(this, { camera, canvas, walk, isBlocked });
    this.active = false;
    this.gliding = false;
    this.yaw = 0;
    this.pitch = 0;
    this.fromQ = new THREE.Quaternion();
    this.toQ = new THREE.Quaternion();
    this.t = 0;
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.listeners = {};

    // Pointer-locked mouse movement turns the head.
    document.addEventListener('mousemove', (e) => {
      if (!this.active || document.pointerLockElement !== canvas) return;
      this.turn(e.movementX, e.movementY);
    });
    // Escape releases pointer lock in the browser itself: treat that as "stop looking".
    document.addEventListener('pointerlockchange', () => {
      if (this.active && this.locked && document.pointerLockElement !== canvas) this.exit();
      this.locked = document.pointerLockElement === canvas;
    });
    window.addEventListener('keydown', (e) => { if (this.active && e.code === 'Escape') this.exit(); });

    // Fallback: click and drag (no pointer lock).
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active || this.locked || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.turn(e.clientX - drag.x, e.clientY - drag.y);
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt) { (this.listeners[evt] || []).forEach((fn) => fn()); }

  turn(dx, dy) {
    this.yaw -= dx * SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
  }

  canEnter() {
    return !this.active && !this.gliding && this.walk.state === 'arrived' && !this.isBlocked();
  }

  enter() {
    if (!this.canEnter()) return;
    this._e.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this._e.y;
    this.pitch = this._e.x;
    this.walk.state = 'idle'; // hold still (no breathing sway) while looking around
    this.active = true;
    try {
      const req = this.canvas.requestPointerLock?.();
      if (req?.catch) req.catch(() => {}); // refused: drag-to-look still works
    } catch { /* pointer lock unavailable: drag-to-look */ }
    this.emit('change');
  }

  /** Turn the view back to the desk. */
  exit() {
    if (!this.active) return;
    this.release();
    this.fromQ.copy(this.camera.quaternion);
    const pos = this.camera.position.clone();
    this.walk.apply(this.walk.duration);
    this.toQ.copy(this.camera.quaternion);
    this.camera.position.copy(pos);
    this.camera.quaternion.copy(this.fromQ);
    this.gliding = true;
    this.t = 0;
    this.emit('change');
  }

  /** Stop without turning back (another controller takes the camera, e.g. focusing the terminal). */
  cancel() {
    if (!this.active) return;
    this.release();
    this.emit('change');
  }

  release() {
    this.active = false;
    this.locked = false;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  update(dt) {
    if (this.gliding) {
      this.t += dt;
      const k = easeInOutCubic(Math.min(1, this.t / 0.7));
      this.camera.quaternion.slerpQuaternions(this.fromQ, this.toQ, k);
      if (this.t >= 0.7) {
        this.gliding = false;
        this.walk.state = 'arrived';
        this.emit('change');
      }
      return;
    }
    if (this.active) this.camera.quaternion.setFromEuler(this._e.set(this.pitch, this.yaw, 0, 'YXZ'));
  }
}

/**
 * Glance: once the walk ends, the visitor steers their head with the mouse, without clicking or
 * pointer lock (user request: control of the mouse while watching the power-up). The cursor's
 * position across the window sets a yaw/pitch offset from the desk view, eased so it feels like a
 * head turning. F (LookAround) still gives a full turn; Glance pauses while that or the terminal
 * glide is in control.
 */
export class Glance {
  constructor({ canvas }) {
    this.enabled = false;
    this.yaw = 0; this.pitch = 0; // current offsets (radians)
    this.ty = 0; this.tp = 0; // targets
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      const curve = (v) => Math.sign(v) * Math.pow(Math.min(1, Math.abs(v)), 1.25); // calmer near the center
      this.ty = -curve(nx) * THREE.MathUtils.degToRad(55);
      this.tp = ny < 0 ? -curve(ny) * THREE.MathUtils.degToRad(28) : -curve(ny) * THREE.MathUtils.degToRad(34);
    });
    document.addEventListener('mouseleave', () => { this.ty = 0; this.tp = 0; });
    void canvas;
  }

  /** Snap back to the plain desk view (after the terminal glide or a full look-around). */
  recenter() { this.yaw = 0; this.pitch = 0; }

  /** Apply after the walk has posed the camera for this frame. */
  update(dt, camera) {
    if (!this.enabled) return;
    const k = 1 - Math.exp(-dt * 3.2);
    this.yaw += (this.ty - this.yaw) * k;
    this.pitch += (this.tp - this.pitch) * k;
    // Yaw about world up, pitch about the camera's own right axis.
    this._e.setFromQuaternion(camera.quaternion, 'YXZ');
    this._e.y += this.yaw;
    this._e.x = THREE.MathUtils.clamp(this._e.x + this.pitch, -1.35, 1.35);
    camera.quaternion.setFromEuler(this._e);
  }
}
