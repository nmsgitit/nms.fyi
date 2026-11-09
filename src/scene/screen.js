// The monitor's screen: a canvas drawn in 2D and used as an emissive CanvasTexture.
// Power states: off -> CRT warm-up -> boot screen (bronze oil lamp, serif title,
// progress bar). Stage 6 adds the OS desktop after the boot.
import * as THREE from 'three';
import { drawLamp } from './lamp.js';

export class MonitorScreen {
  static BOOT_SECONDS = 4.5; // progress bar fill time (from boot-screen start)

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

  /** Boot screen: 1980s pixel-art oil lamp (lamp.js), serif title, progress bar. */
  drawBoot(t) {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    const fade = Math.min(1, t / 0.6);
    const bg = `rgba(10,8,6,${fade})`; // flat near-black: no soft modern gradients
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    drawLamp(ctx, W / 2, H * 0.37, W * 0.46);
    ctx.fillStyle = '#ead9b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(H * 0.085)}px Georgia, "Times New Roman", serif`;
    ctx.fillText('NMS FYI OS', W / 2, H * 0.66);
    ctx.font = `${Math.round(H * 0.05)}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#c9b792';
    ctx.fillText('Version 1.0', W / 2, H * 0.75);

    // Boot progress: a slim segmented bar that fills over BOOT_SECONDS.
    const segs = 24, bw = W * 0.34, bh = H * 0.018, bx = W / 2 - bw / 2, by = H * 0.84;
    const filled = Math.floor(segs * Math.min(1, t / MonitorScreen.BOOT_SECONDS));
    ctx.strokeStyle = 'rgba(201,183,146,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);
    for (let i = 0; i < filled; i++) {
      ctx.fillStyle = i === filled - 1 && filled < segs ? '#f3dfaa' : '#c9a55e';
      ctx.fillRect(bx + (i * bw) / segs + 1, by, bw / segs - 3, bh);
    }
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
