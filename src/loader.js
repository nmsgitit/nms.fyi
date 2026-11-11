// Full-site loading screen (user request: replaces the click-to-enter gate and the old "Loading the command room"
// text). Styled like the terminal's LAMPLIGHT OS boot screen (screen.js drawBoot): flat near-black, the pixel-art
// bronze lamp, a serif title ("NMS FYI"), a smaller line ("Loading experience") and a segmented progress bar.
// The bar follows a minimum time (a few seconds, a little shorter than the terminal's boot) and only completes once
// the 3D site has actually loaded; then the screen fades away and the caller starts the experience.
// No three.js here: this runs in the small entry chunk before full.js is fetched.
import { drawLamp } from './scene/lamp.js';

const MIN_SECONDS = 2.6; // the terminal boot takes 4.1 s; the user asked for slightly shorter
const HOLD_SECONDS = 0.35; // a beat on the full bar before fading
const FADE_MS = 700;

export class LoadingScreen {
  constructor(el = document.getElementById('loader')) {
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.loaded = false;
    this.failed = false;
    this.t0 = 0;
    this.fullAt = 0;
    this._resolve = null;
    this.finished = new Promise((r) => { this._resolve = r; });
    this._onResize = () => this.resize();
  }

  show() {
    this.el.hidden = false;
    this.resize();
    window.addEventListener('resize', this._onResize);
    this.t0 = performance.now();
    const tick = (now) => {
      if (this.failed) return;
      const t = (now - this.t0) / 1000;
      // Progress: time-based up to 90 % until the site has loaded, then on to full.
      let p = Math.min(1, t / MIN_SECONDS);
      if (!this.loaded) p = Math.min(p, 0.9);
      this.draw(t, p);
      if (p >= 1) {
        this.fullAt ||= now;
        if (now - this.fullAt >= HOLD_SECONDS * 1000) { this.fadeOut(); return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** The 3D site has loaded (full.js imported and built). */
  setLoaded() { this.loaded = true; }

  fadeOut() {
    this._resolve(); // the caller starts the experience as the screen fades
    this.el.classList.add('fade');
    setTimeout(() => {
      this.el.hidden = true;
      this.el.classList.remove('fade');
      window.removeEventListener('resize', this._onResize);
    }, FADE_MS);
  }

  /** Loading failed: show the reason and a way to the Lite Site instead. */
  fail(message, onLite) {
    this.failed = true;
    this.el.hidden = false;
    this.el.classList.remove('fade');
    this.resize();
    this.draw(1, 0, true);
    const box = this.el.querySelector('.loader-error');
    box.querySelector('p').textContent = message;
    box.hidden = false;
    const btn = box.querySelector('button');
    btn.addEventListener('click', onLite, { once: true });
    btn.focus();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
  }

  /** Same layout as the terminal's boot screen, in a 4:3 frame centered on the page. */
  draw(t, p, noBar = false) {
    const { ctx, canvas: c } = this;
    const W = c.width, H = c.height;
    ctx.fillStyle = '#0a0806'; // flat near-black, like the boot screen
    ctx.fillRect(0, 0, W, H);
    const fw = Math.min(W, (H * 4) / 3) * 0.78, fh = fw * 0.75;
    const oy = (H - fh) / 2;
    ctx.globalAlpha = Math.min(1, t / 0.45);
    drawLamp(ctx, W / 2, oy + fh * 0.37, fw * 0.46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ead9b0';
    ctx.font = `${Math.round(fh * 0.085)}px Georgia, "Times New Roman", serif`;
    ctx.fillText('NMS FYI', W / 2, oy + fh * 0.66);
    ctx.fillStyle = '#c9b792';
    ctx.font = `${Math.round(fh * 0.05)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(noBar ? '' : 'Loading experience', W / 2, oy + fh * 0.75);
    if (!noBar) {
      const segs = 24, bw = fw * 0.34, bh = fh * 0.018, bx = W / 2 - bw / 2, by = oy + fh * 0.84;
      const filled = Math.floor(segs * p);
      ctx.strokeStyle = 'rgba(201,183,146,0.6)';
      ctx.lineWidth = Math.max(1, fh * 0.0035);
      const pad = fh * 0.007;
      ctx.strokeRect(bx - pad, by - pad, bw + pad * 2, bh + pad * 2);
      for (let i = 0; i < filled; i++) {
        ctx.fillStyle = i === filled - 1 && filled < segs ? '#f3dfaa' : '#c9a55e';
        ctx.fillRect(bx + (i * bw) / segs + 1, by, bw / segs - Math.max(2, fh * 0.005), bh);
      }
    }
    ctx.globalAlpha = 1;
  }
}
