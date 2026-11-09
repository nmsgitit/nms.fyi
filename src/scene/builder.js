// Geometry batching helper.
// Static scenery is authored as many small primitives, then merged into one mesh per
// material so the whole room renders in a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

function normalize(geom) {
  // mergeGeometries needs identical attribute sets and consistent indexing.
  let g = geom.index ? geom.toNonIndexed() : geom;
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {};
  return g;
}

export class Builder {
  constructor() {
    this.buckets = new Map(); // material -> geometry[]
  }

  /** Add a geometry with an optional transform. rot = [x, y, z] radians. */
  add(geom, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    _p.set(pos[0], pos[1], pos[2]);
    _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_p, _q, _s);
    const g = normalize(geom.clone());
    g.applyMatrix4(_m);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    return this;
  }

  /** Axis-aligned box given by its center. */
  box(material, w, h, d, x, y, z, rot) {
    return this.add(new THREE.BoxGeometry(w, h, d), material, [x, y, z], rot);
  }

  /** Box given by min/max corners. Handy for architecture. */
  span(material, x0, x1, y0, y1, z0, z1) {
    return this.box(material, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }

  /** Rounded box: the soft-cornered 1980s plastic and enamel look. */
  rbox(material, w, h, d, r, x, y, z, rot, segments = 3) {
    const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    return this.add(new RoundedBoxGeometry(w, h, d, segments, rr), material, [x, y, z], rot);
  }

  /** Merge every bucket into one Mesh per material. */
  build({ castShadow = false, receiveShadow = true, name = 'batch' } = {}) {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, geoms] of this.buckets) {
      const merged = mergeGeometries(geoms, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      geoms.forEach((g) => g.dispose());
    }
    this.buckets.clear();
    return group;
  }
}
