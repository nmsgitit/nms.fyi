// First-person walk: moves the camera along a straight path with a natural speed
// profile (ease in, cruise, ease out) and a step-synced head bob, sway, and roll.
// Emits a 'step' event at each footfall so audio (stage 2) can play footsteps.
import * as THREE from 'three';

const smooth = (t) => t * t * (3 - 2 * t);

export class Walk {
  constructor(camera, cfg) {
    this.camera = camera;
    this.start = new THREE.Vector3(...cfg.start);
    this.end = new THREE.Vector3(...cfg.end);
    this.lookStart = new THREE.Vector3(...cfg.lookStart);
    this.lookEnd = new THREE.Vector3(...cfg.lookEnd);
    this.stepLength = cfg.stepLength;
    this.length = this.start.distanceTo(this.end);
    // Ease-in 0.9 s, ease-out 1.6 s, cruise in between at cfg.speed.
    this.accel = 0.9;
    this.decel = 1.6;
    const cruiseDist = this.length - cfg.speed * (this.accel + this.decel) / 2;
    this.speed = cfg.speed;
    this.cruise = Math.max(0, cruiseDist / cfg.speed);
    this.duration = this.accel + this.cruise + this.decel;
    this.t = 0;
    this.state = 'idle'; // idle | walking | arrived
    this.lastStep = 0;
    this.idleT = 0;
    this._look = new THREE.Vector3();
    this.listeners = {};
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach((fn) => fn(data)); }

  /** Distance travelled after time t, integrating the trapezoidal speed profile with smoothstep ramps. */
  distanceAt(t) {
    const { accel: a, cruise: c, decel: d, speed: v } = this;
    if (t <= 0) return 0;
    if (t < a) {
      // integral of v*smooth(t/a) = v*a*(u^3 - u^4/2), u = t/a
      const u = t / a;
      return v * a * (u ** 3 - u ** 4 / 2);
    }
    const dA = v * a * 0.5;
    if (t < a + c) return dA + v * (t - a);
    const dC = v * c;
    if (t < a + c + d) {
      const u = (t - a - c) / d;
      // integral of v*(1 - smooth(u)) * d du
      return dA + dC + v * d * (u - (u ** 3 - u ** 4 / 2));
    }
    return this.length;
  }

  speedAt(t) {
    const { accel: a, cruise: c, decel: d, speed: v } = this;
    if (t <= 0 || t >= a + c + d) return 0;
    if (t < a) return v * smooth(t / a);
    if (t < a + c) return v;
    return v * (1 - smooth((t - a - c) / d));
  }

  begin() {
    this.t = 0;
    this.lastStep = 0;
    this.state = 'walking';
    this.emit('start');
    this.apply(0);
  }

  jumpToEnd() {
    this.t = this.duration;
    this.state = 'arrived';
    this.apply(this.duration);
  }

  /** Place the camera without starting (shows the view from the start position). */
  placeAtStart() {
    this.state = 'idle';
    this.apply(0);
  }

  update(dt) {
    if (this.state === 'walking') {
      this.t += dt;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this.state = 'arrived';
        this.emit('arrive');
      }
      this.apply(this.t);
    } else if (this.state === 'arrived') {
      this.idleT += dt;
      this.apply(this.duration);
    }
  }

  apply(t) {
    const cam = this.camera;
    const dist = Math.min(this.distanceAt(t), this.length);
    const p = dist / this.length;
    const vk = this.speedAt(t) / this.speed; // 0..1 gait intensity

    // Step phase: one footfall every stepLength meters.
    const phase = (dist / this.stepLength) * Math.PI;
    const stepIndex = Math.floor(phase / Math.PI); // increments exactly at footfall (sin(phase) = 0)
    if (this.state === 'walking' && stepIndex > this.lastStep) {
      this.lastStep = stepIndex;
      this.emit('step', { index: stepIndex, foot: stepIndex % 2 ? 'L' : 'R', intensity: Math.max(0.35, vk) });
    }

    // Head bob: lowest at each footfall, highest mid-stride.
    const bob = (Math.abs(Math.sin(phase)) - 0.6) * 0.045 * vk;
    const sway = Math.sin(phase) * 0.018 * vk;
    const roll = Math.sin(phase) * 0.006 * vk;
    // Gentle breathing once standing still.
    const breathe = this.state === 'arrived' ? Math.sin(this.idleT * 1.3) * 0.004 : 0;

    cam.position.lerpVectors(this.start, this.end, p);
    cam.position.y += bob + breathe;
    cam.position.x += sway;

    this._look.lerpVectors(this.lookStart, this.lookEnd, smooth(p));
    this._look.y += breathe * 0.6;
    cam.lookAt(this._look);
    cam.rotateZ(roll);
  }
}
