// Wall CRTs: the top and bottom center panels on each side wall are CRT screens where the
// pixel oil lamp floats and bounces around like the old DVD screensaver logo, changing
// color at each wall hit. Visitors only glimpse them during the walk-in; it's a detail.
import * as THREE from 'three';
import { getLampSprite, LAMP_VARIANTS } from './lamp.js';

const W = 320, H = 224; // low-res canvas, scaled up with nearest-neighbor for chunky pixels
const SCREEN_W = 0.94, SCREEN_H = 0.66;
const BULGE = 0.012; // convex CRT glass

export class WallCRTs {
  /** slots: [{ x, y, z, s }] from buildCommandRoom (x = surface the screen sits on, s = wall side). */
  constructor(slots) {
    this.group = new THREE.Group();
    this.group.name = 'wallCrts';
    const geom = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 16, 12);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (SCREEN_W / 2), v = pos.getY(i) / (SCREEN_H / 2);
      pos.setZ(i, BULGE * (1 - u * u) * (1 - v * v));
    }
    geom.computeVertexNormals();

    this.screens = slots.map((slot, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      mat.color.setScalar(1.15); // a touch of glow for the bloom
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.y = -slot.s * Math.PI / 2; // face into the room
      mesh.position.set(slot.x - slot.s * 0.002, slot.y, slot.z);
      this.group.add(mesh);
      const sprite = getLampSprite();
      // Different start positions, speeds and colors so the four screens never move in step.
      return {
        canvas, ctx: canvas.getContext('2d'), tex,
        x: 20 + ((i * 67) % (W - sprite.width - 40)),
        y: 16 + ((i * 41) % (H - sprite.height - 32)),
        vx: (i % 2 ? -1 : 1) * (58 + i * 7),
        vy: (i % 3 ? 1 : -1) * (44 + i * 5),
        variant: i % LAMP_VARIANTS.length,
      };
    });
    this._accum = 0;
    this.screens.forEach((sc) => this.draw(sc));
  }

  update(dt) {
    for (const sc of this.screens) {
      const sp = getLampSprite(LAMP_VARIANTS[sc.variant]);
      sc.x += sc.vx * dt;
      sc.y += sc.vy * dt;
      let hit = false;
      if (sc.x < 0) { sc.x = 0; sc.vx = Math.abs(sc.vx); hit = true; }
      if (sc.x > W - sp.width) { sc.x = W - sp.width; sc.vx = -Math.abs(sc.vx); hit = true; }
      if (sc.y < 0) { sc.y = 0; sc.vy = Math.abs(sc.vy); hit = true; }
      if (sc.y > H - sp.height) { sc.y = H - sp.height; sc.vy = -Math.abs(sc.vy); hit = true; }
      if (hit) sc.variant = (sc.variant + 1) % LAMP_VARIANTS.length;
    }
    // Redraw at ~24 fps: plenty for a bouncing logo, and canvas uploads aren't free.
    this._accum += dt;
    if (this._accum < 1 / 24) return;
    this._accum = 0;
    this.screens.forEach((sc) => this.draw(sc));
  }

  draw(sc) {
    const { ctx } = sc;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#050706';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(getLampSprite(LAMP_VARIANTS[sc.variant]), Math.round(sc.x), Math.round(sc.y));
    // CRT scanlines + vignette.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    sc.tex.needsUpdate = true;
  }
}
