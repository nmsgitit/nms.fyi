// Indicator-light system.
// Every small LED in the scene is one instance of a single InstancedMesh (one draw call).
// LEDs belong to named groups, so the reveal sequence can power groups on with
// cascades and flicker, and running LEDs can blink to suggest activity.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
const _c = new THREE.Color();

export class LedField {
  constructor(capacity = 6000) {
    this.capacity = capacity;
    this.items = []; // {pos, normal, size, color: Color, group, blink, phase, delay}
    this.groups = new Map(); // name -> {level, onAt, cascade}
    this.mesh = null;
    this._seed = 7;
  }

  rand() {
    this._seed = (this._seed * 16807) % 2147483647;
    return (this._seed - 1) / 2147483646;
  }

  /**
   * Add one LED.
   * @param pos    [x,y,z] world position
   * @param normal [x,y,z] facing direction
   * @param opts   { size, color (hex), group, blink (0 = steady, else Hz), delay (s offset within group cascade) }
   */
  add(pos, normal, { size = 0.025, color = 0xffffff, group = 'default', blink = 0, delay = 0, intensity = 1 } = {}) {
    if (this.items.length >= this.capacity) return;
    this.items.push({
      pos: new THREE.Vector3(...pos),
      normal: new THREE.Vector3(...normal).normalize(),
      size,
      color: new THREE.Color(color).multiplyScalar(intensity),
      group,
      blink,
      phase: this.rand() * Math.PI * 2,
      delay,
    });
    if (!this.groups.has(group)) this.groups.set(group, { level: 0, target: 0, onAt: Infinity, cascade: 0 });
  }

  /** A rectangular grid of LEDs on a plane. origin = center of grid. right/up = in-plane axes. */
  grid(origin, right, up, normal, cols, rows, pitchX, pitchY, opts = {}, fill = 1) {
    const o = new THREE.Vector3(...origin);
    const r = new THREE.Vector3(...right);
    const u = new THREE.Vector3(...up);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (this.rand() > fill) continue;
        const p = o.clone()
          .addScaledVector(r, (i - (cols - 1) / 2) * pitchX)
          .addScaledVector(u, (j - (rows - 1) / 2) * pitchY);
        const pick = typeof opts.color === 'function' ? opts.color(this.rand()) : opts.color;
        const blink = typeof opts.blink === 'function' ? opts.blink(this.rand()) : opts.blink;
        this.add([p.x, p.y, p.z], normal, { ...opts, color: pick, blink });
      }
    }
  }

  build() {
    const geom = new THREE.CircleGeometry(1, 10);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const mesh = new THREE.InstancedMesh(geom, mat, this.items.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.items.forEach((it, i) => {
      _q.setFromUnitVectors(_z, it.normal);
      _p.copy(it.pos).addScaledVector(it.normal, 0.004); // sit just proud of the surface
      _s.setScalar(it.size);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _c.setRGB(0, 0, 0));
    });
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.mesh = mesh;
    return mesh;
  }

  /** Power a group on/off. cascade = seconds over which LEDs come on in sequence (by their delay). */
  setGroup(name, on, time, cascade = 0) {
    const g = this.groups.get(name);
    if (!g) return;
    g.target = on ? 1 : 0;
    g.onAt = on ? time : Infinity;
    g.cascade = cascade;
    if (!on) g.level = 0;
  }

  /** Instantly set a group fully on or off (debug, or skip-intro). */
  forceGroup(name, on) {
    const g = this.groups.get(name);
    if (!g) return;
    g.target = g.level = on ? 1 : 0;
    g.onAt = on ? -Infinity : Infinity;
    g.cascade = 0;
  }

  update(time) {
    if (!this.mesh) return;
    const col = this.mesh.instanceColor.array;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const g = this.groups.get(it.group);
      let k = 0;
      if (g.target > 0) {
        const t = time - g.onAt - it.delay * g.cascade;
        if (t > 0) {
          // A brief power-on flicker, then steady.
          k = t < 0.12 ? (Math.sin(t * 160) > 0 ? 1 : 0.15) : 1;
          if (it.blink > 0) k *= 0.55 + 0.45 * (Math.sin(time * it.blink * 6.283 + it.phase) > -0.2 ? 1 : 0.1);
        }
      }
      col[i * 3] = it.color.r * k;
      col[i * 3 + 1] = it.color.g * k;
      col[i * 3 + 2] = it.color.b * k;
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
}
