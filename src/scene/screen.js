// The monitor's screen: a canvas drawn in 2D and used as an emissive CanvasTexture.
// Stage 2 covers power states and a CRT warm-up with a placeholder boot card.
// Stage 5 replaces drawBoot() with the oil-lamp boot image, and stage 6 adds the OS.
import * as THREE from 'three';

export class MonitorScreen {
  constructor(width = 1024, height = 780) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.flipY = false; // glTF UV convention (the screen mesh comes from Blender)
    this.state = 'off'; // off | warmup | boot
    this.stateT = 0;
    this._accum = 0;
    this.draw(0);
  }

  powerOn() {
    if (this.state !== 'off') return;
    this.state = 'warmup';
    this.stateT = 0;
  }

  powerOff() {
    this.state = 'off';
    this.stateT = 0;
    this.draw(0);
  }

  /** Jump straight to the steady boot image (skip-intro). */
  forceBoot() {
    this.state = 'boot';
    this.stateT = 10;
    this.draw(this.stateT);
  }

  update(dt) {
    if (this.state === 'off') return;
    this.stateT += dt;
    if (this.state === 'warmup' && this.stateT > 0.9) { this.state = 'boot'; this.stateT = 0; }
    // Redraw at ~30 fps. Canvas uploads aren't free.
    this._accum += dt;
    if (this._accum < 1 / 30) return;
    this._accum = 0;
    this.draw(this.stateT);
  }

  draw(t) {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (this.state === 'warmup') {
      // Classic CRT power-on: a bright line that opens vertically, then settles.
      const k = Math.min(t / 0.9, 1);
      const open = k < 0.35 ? 0.004 : Math.min(1, (k - 0.35) / 0.65);
      const h = Math.max(3, H * open * open);
      const glow = 1 - open * 0.75;
      ctx.fillStyle = `rgba(235,230,210,${0.25 + glow * 0.75})`;
      ctx.fillRect(0, H / 2 - h / 2, W * (k < 0.35 ? k / 0.35 : 1), h);
    } else if (this.state === 'boot') {
      this.drawBoot(t);
    }
    if (this.state !== 'off') this.drawCRT();
    this.texture.needsUpdate = true;
  }

  /** Placeholder boot card. Stage 5 replaces this with the bronze oil-lamp image. */
  drawBoot(t) {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    const fade = Math.min(1, t / 0.6);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, `rgba(30,24,16,${fade})`);
    bg.addColorStop(1, `rgba(6,5,4,${fade})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    // Lamp placeholder silhouette (simple, to be replaced).
    ctx.fillStyle = '#b07a3a';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.4, W * 0.13, H * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ead9b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(H * 0.085)}px Georgia, "Times New Roman", serif`;
    ctx.fillText('NMS FYI OS', W / 2, H * 0.66);
    ctx.font = `${Math.round(H * 0.05)}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#c9b792';
    ctx.fillText('Version 1.0', W / 2, H * 0.75);
    ctx.globalAlpha = 1;
  }

  /** Scanlines + vignette so it reads as a CRT even before the shader polish stage. */
  drawCRT() {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}
