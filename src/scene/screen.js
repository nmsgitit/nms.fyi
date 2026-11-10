// The monitor's screen: a canvas drawn in 2D and used as an emissive CanvasTexture.
// Power states: off -> CRT warm-up -> boot screen (pixel oil lamp, serif title, progress
// bar) -> desktop (a drawn copy of the HTML desktop in os/, from the same art and app list).
import * as THREE from 'three';
import { drawLamp } from './lamp.js';
import { getWallpaper, getIcon } from '../os/art.js';
import { APPS, OS_NAME, OS_VERSION, OS_EDITION, OS_BUILD, USER_NAME } from '../os/desktopModel.js';
import { TASKBAR_H, ICON_GRID } from '../os/layout.js';
import { clockText } from '../os/clock.js';

export class MonitorScreen {
  static BOOT_SECONDS = 4.1; // progress bar fill time, so it completes just before the desktop (6.8 s)

  constructor(width = 1024, height = 780) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.flipY = false; // glTF UV convention (the screen mesh comes from Blender)
    this.state = 'off'; // off | warmup | boot | logon | desktop | shutdown
    this.stateT = 0;
    this._accum = 0;
    this._lastClock = '';
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

  /** Jump straight to the steady boot image. */
  forceBoot() {
    this.state = 'boot';
    this.stateT = 10;
    this.draw(this.stateT);
  }

  /** CRT power-off: the picture collapses to a bright horizontal line, then a dot, then dark. */
  shutdown() {
    if (this.state === 'off') return;
    // Keep a copy of the current picture to squash.
    this.lastFrame ||= document.createElement('canvas');
    this.lastFrame.width = this.canvas.width;
    this.lastFrame.height = this.canvas.height;
    this.lastFrame.getContext('2d').drawImage(this.canvas, 0, 0);
    this.state = 'shutdown';
    this.stateT = 0;
  }

  /** The boot hands off to the logon screen (brief blank as the mode switches, then a fade-in). */
  showLogon(instant = false) {
    this.state = 'logon';
    this.stateT = instant ? 10 : 0;
    this.draw(this.stateT);
  }

  /** Logged on: the desktop (brief blank, then a fade-in, unless instant). */
  showDesktop(instant = false) {
    this.state = 'desktop';
    this.stateT = instant ? 10 : 0;
    this.draw(this.stateT);
  }

  update(dt) {
    if (this.state === 'off') return;
    this.stateT += dt;
    if (this.state === 'warmup' && this.stateT > 0.9) { this.state = 'boot'; this.stateT = 0; }
    if (this.state === 'shutdown' && this.stateT > 0.6) { this.powerOff(); return; }
    if (this.state === 'logon' && this.stateT > 1.2) return; // static once faded in
    if (this.state === 'desktop' && this.stateT > 1.2) {
      // Settled desktop: only redraw when the clock changes.
      if (clockText() !== this._lastClock) this.draw(this.stateT);
      return;
    }
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
    } else if (this.state === 'shutdown') {
      // Squash the last picture into a line (0 to 0.2 s), shrink the line to a dot (to 0.4 s), fade (to 0.6 s).
      const k1 = Math.min(1, t / 0.2), k2 = Math.min(1, Math.max(0, (t - 0.2) / 0.2)), k3 = Math.max(0, (t - 0.4) / 0.2);
      const h = Math.max(2, H * (1 - k1) * (1 - k1));
      const w = Math.max(4, W * (1 - k2));
      if (k1 < 1) ctx.drawImage(this.lastFrame, 0, 0, W, H, 0, H / 2 - h / 2, W, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(240,236,220,${(0.35 + 0.65 * k1) * (1 - k3)})`;
      ctx.fillRect(W / 2 - w / 2, H / 2 - Math.max(1.5, h / 2 * 0.15), w, Math.max(3, h * 0.15));
      ctx.globalCompositeOperation = 'source-over';
    } else if (this.state === 'desktop' || this.state === 'logon') {
      // 0.25 s of black (video mode switch), then the picture fades up.
      const a = Math.min(1, Math.max(0, (t - 0.25) / 0.6));
      if (a > 0) {
        ctx.globalAlpha = a;
        if (this.state === 'logon') this.drawLogon(); else this.drawDesktop();
        ctx.globalAlpha = 1;
      }
    }
    if (this.state !== 'off') this.drawCRT();
    this.texture.needsUpdate = true;
  }

  /** Boot screen: 1980s pixel-art oil lamp (lamp.js), serif title, progress bar. */
  drawBoot(t) {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    const fade = Math.min(1, t / 0.6);
    ctx.fillStyle = `rgba(10,8,6,${fade})`; // flat near-black: no soft modern gradients
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    drawLamp(ctx, W / 2, H * 0.37, W * 0.46);
    ctx.fillStyle = '#ead9b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(H * 0.085)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(OS_NAME, W / 2, H * 0.66);
    ctx.font = `${Math.round(H * 0.05)}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#c9b792';
    ctx.fillText(OS_VERSION, W / 2, H * 0.75);

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

  /**
   * The desktop as it looks on the monitor: wallpaper, icon column, taskbar with the lamp
   * launcher and a clock. Sizes come from os/layout.js, scaled to this canvas, so it
   * matches the HTML desktop's proportions.
   */
  drawDesktop() {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    const s = H / 768; // the HTML desktop's reference height is 768 px
    const wp = getWallpaper();
    const k = Math.max(W / wp.width, H / wp.height); // cover
    ctx.drawImage(wp, (W - wp.width * k) / 2, (H - wp.height * k) / 2, wp.width * k, wp.height * k);

    // Desktop icons.
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${Math.round(13 * s)}px Tahoma, Verdana, sans-serif`;
    APPS.forEach((app, i) => {
      const x = (ICON_GRID.x + ICON_GRID.w / 2) * s;
      const y = (ICON_GRID.y + i * ICON_GRID.h) * s;
      ctx.drawImage(getIcon(app.icon), x - 24 * s, y, 48 * s, 48 * s);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(app.title, x + 1.5 * s, y + 55.5 * s);
      ctx.fillStyle = '#fff';
      ctx.fillText(app.title, x, y + 54 * s);
    });

    // Taskbar.
    const th = TASKBAR_H * s, ty = H - th;
    const bar = ctx.createLinearGradient(0, ty, 0, H);
    bar.addColorStop(0, '#3a74e0');
    bar.addColorStop(0.12, '#2a5fd1');
    bar.addColorStop(0.9, '#1d4bb5');
    bar.addColorStop(1, '#173f9c');
    ctx.fillStyle = bar;
    ctx.fillRect(0, ty, W, th);
    // Lamp launcher pill.
    const lw = 64 * s;
    const pill = ctx.createLinearGradient(0, ty, 0, H);
    pill.addColorStop(0, '#5fae4a');
    pill.addColorStop(0.5, '#3b8a2c');
    pill.addColorStop(1, '#2d6e21');
    ctx.fillStyle = pill;
    ctx.beginPath();
    ctx.roundRect(0, ty, lw, th, [0, th / 2, th / 2, 0]);
    ctx.fill();
    ctx.drawImage(getIcon('lamp'), lw / 2 - 18 * s, ty + th / 2 - 18 * s, 36 * s, 36 * s);
    ctx.imageSmoothingEnabled = true;
    // Clock tray.
    const cw = 92 * s;
    const tray = ctx.createLinearGradient(0, ty, 0, H);
    tray.addColorStop(0, '#1fa3e8');
    tray.addColorStop(1, '#127fcf');
    ctx.fillStyle = tray;
    ctx.fillRect(W - cw, ty, cw, th);
    this._lastClock = clockText();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(13 * s)}px Tahoma, Verdana, sans-serif`;
    ctx.fillText(this._lastClock, W - cw / 2, ty + th / 2);
  }

  /** The logon screen, laid out like the HTML one in os.css (.os-logon), scaled to this canvas. */
  drawLogon() {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    const s = H / 768;
    const bg = ctx.createRadialGradient(W * 0.4, H * 0.45, 0, W * 0.4, H * 0.45, W * 0.75);
    bg.addColorStop(0, '#6f93e6');
    bg.addColorStop(0.45, '#4a6fd4');
    bg.addColorStop(1, '#3a5bc0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0a2f8f';
    ctx.fillRect(0, 0, W, H * 0.12);
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.fillStyle = '#e8a64f';
    ctx.fillRect(0, H * 0.12 - 2 * s, W, 2 * s);
    ctx.fillStyle = '#7fa2ea';
    ctx.fillRect(0, H * 0.88, W, 2 * s);
    // Divider.
    const dv = ctx.createLinearGradient(0, H * 0.24, 0, H * 0.76);
    dv.addColorStop(0, 'rgba(255,255,255,0)');
    dv.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    dv.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = dv;
    ctx.fillRect(W / 2 - s, H * 0.24, 2 * s, H * 0.52);
    // Left: the lamp centered over the OS name, then the hint (right-aligned toward the divider).
    const rx = W / 2 - 40 * s;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${Math.round(34 * s)}px Georgia, "Times New Roman", serif`;
    const nameW = ctx.measureText(OS_NAME).width;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getIcon('lamp'), rx - nameW / 2 - 48 * s, H / 2 - 104 * s, 96 * s, 96 * s);
    ctx.textAlign = 'right';
    ctx.fillText(OS_NAME, rx, H / 2 + 26 * s);
    ctx.font = `${Math.round(15 * s)}px Tahoma, Verdana, sans-serif`;
    ctx.fillText('To begin, click your user name', rx, H / 2 + 52 * s);
    // Right: the USER account tile.
    const ux = W / 2 + 48 * s, uy = H / 2 - 35 * s;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(ux - 3 * s, uy - 3 * s, 70 * s, 70 * s, 6 * s);
    ctx.fill();
    ctx.drawImage(getIcon('user'), ux, uy, 64 * s, 64 * s);
    ctx.imageSmoothingEnabled = true;
    ctx.textAlign = 'left';
    ctx.font = `bold ${Math.round(22 * s)}px Tahoma, Verdana, sans-serif`;
    ctx.fillText(USER_NAME, ux + 82 * s, uy + 40 * s);
    // Build information, bottom right.
    ctx.textAlign = 'right';
    ctx.font = `${Math.round(12 * s)}px Tahoma, Verdana, sans-serif`;
    ctx.fillText(`${OS_NAME} ${OS_EDITION}`, W * 0.96, H * 0.94 - 4 * s);
    ctx.fillText(`${OS_VERSION} · ${OS_BUILD}`, W * 0.96, H * 0.94 + 13 * s);
  }

  /** Scanlines + vignette so it reads as a CRT. */
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

export { clockText };
