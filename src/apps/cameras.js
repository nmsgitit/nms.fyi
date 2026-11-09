// Security Cameras app (full experience only): live views of the server room from the four
// CCTV cameras (scene/cctv.js), shown like a 1980s black-and-white monitoring station.
//   * Mouse over the picture: the watched camera pans/tilts toward the pointer (servo-paced).
//   * ← / → (also ↑ / ↓, 1-4): switch cameras, with a burst of static and a vertical roll.
//   * Look: monochrome, soft, grainy, scanlines, a slow hum bar, vignette, and an on-screen
//     camera label / date / time / blinking REC.
// Rendering: while the desktop is open the 3D loop is paused, so full.js calls render() each
// frame instead. It draws the camera's view into a small corner of the main WebGL canvas
// (hidden behind the desktop) and copies it straight into this app's 2D canvas. Shadow maps
// are not re-rendered for these frames (nothing in the room moves), and it runs at 30 fps.
import './cameras.css';
import { CCTV_CAMERAS } from '../scene/cctv.js';

const FEED_W = 384, FEED_H = 288; // a period-appropriate, soft 4:3 picture
const FPS = 30;
const NOISE_FRAMES = 8;

const pad = (n) => String(n).padStart(2, '0');

function makeNoise() {
  const frames = [];
  for (let f = 0; f < NOISE_FRAMES; f++) {
    const img = new ImageData(FEED_W, FEED_H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    frames.push(img);
  }
  return frames;
}

export class CameraApp {
  constructor({ renderer, scene, cctv, sound }) {
    Object.assign(this, { renderer, scene, cctv, sound });
    this.mounted = false;
    this.visible = false;
    this.index = 0;
    this.acc = 0;
    this.noise = null;
  }

  /** True while the app window is open and on screen: full.js keeps rendering it. */
  get wantsFrame() { return this.mounted && this.visible; }

  mount(body, { win }) {
    this.win = win;
    body.classList.add('cctv');
    body.innerHTML = `
      <div class="cctv-screen" aria-label="Security camera picture">
        <canvas class="cctv-feed" width="${FEED_W}" height="${FEED_H}"></canvas>
        <canvas class="cctv-noise" width="${FEED_W}" height="${FEED_H}" aria-hidden="true"></canvas>
        <div class="cctv-fx" aria-hidden="true"><div class="cctv-bar"></div></div>
        <div class="cctv-osd" aria-live="polite">
          <span class="cctv-label"></span>
          <span class="cctv-date"></span>
          <span class="cctv-rec">● REC</span>
          <span class="cctv-time"></span>
        </div>
      </div>
      <div class="cctv-controls">
        <div class="cctv-cams" role="group" aria-label="Cameras">
          ${CCTV_CAMERAS.map((c, i) => `<button type="button" class="cctv-cam" data-i="${i}">${c.label}</button>`).join('')}
        </div>
        <span class="cctv-hint">Mouse: pan the camera · <kbd>←</kbd><kbd>→</kbd> switch</span>
      </div>`;
    this.screen = body.querySelector('.cctv-screen');
    this.feed = body.querySelector('.cctv-feed').getContext('2d', { alpha: false });
    this.noiseCtx = body.querySelector('.cctv-noise').getContext('2d');
    this.labelEl = body.querySelector('.cctv-label');
    this.dateEl = body.querySelector('.cctv-date');
    this.timeEl = body.querySelector('.cctv-time');
    this.camBtns = [...body.querySelectorAll('.cctv-cam')];
    this.noise = this.noise || makeNoise();

    this.camBtns.forEach((b) => b.addEventListener('click', () => this.select(+b.dataset.i)));
    this.screen.addEventListener('pointermove', (e) => {
      const r = this.screen.getBoundingClientRect();
      this.cctv.steer(this.index, ((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    this.onKey = (e) => {
      const n = CCTV_CAMERAS.length;
      let i = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (this.index + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (this.index + n - 1) % n;
      else if (/^[1-9]$/.test(e.key) && +e.key <= n) i = +e.key - 1;
      if (i === null) return;
      e.preventDefault();
      this.select(i);
    };
    win.addEventListener('keydown', this.onKey);
    win.classList.add('win-cameras');

    this.mounted = true;
    this.visible = true;
    this.select(this.index, true);
  }

  unmount() {
    this.mounted = false;
    this.win?.removeEventListener('keydown', this.onKey);
    this.cctv.setLive(-1);
    this.sound?.ready && this.sound.cctvMotor(0);
  }

  setVisible(on) {
    this.visible = on;
    if (!on && this.sound?.ready) this.sound.cctvMotor(0);
    this.cctv.setLive(on && this.mounted ? this.index : -1);
  }

  select(i, quiet = false) {
    this.index = i;
    const cam = CCTV_CAMERAS[i];
    this.labelEl.textContent = `${cam.label}  ${cam.name}`;
    this.camBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    this.cctv.setLive(i);
    // Switching: a burst of static and a vertical roll, like a sequential switcher.
    this.screen.classList.remove('switching');
    void this.screen.offsetWidth; // restart the CSS animation
    this.screen.classList.add('switching');
    this.acc = 1; // draw the new view right away
    if (!quiet && this.sound?.ready) this.sound.cctvSwitch();
  }

  /** Called every frame by full.js while wantsFrame (the 3D loop is paused). */
  render(dt, speed = 0) {
    if (this.sound?.ready) this.sound.cctvMotor(speed);
    this.acc += dt;
    if (this.acc < 1 / FPS) return;
    this.acc = 0;

    const { renderer } = this;
    const view = this.cctv.cams[this.index].view;
    const pr = renderer.getPixelRatio();
    const canvas = renderer.domElement;
    const autoShadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false; // shadow maps from the last 3D frame are still valid
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, FEED_W / pr, FEED_H / pr);
    renderer.setScissor(0, 0, FEED_W / pr, FEED_H / pr);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, view);
    // Same task as the render, so the drawing buffer is still intact.
    this.feed.drawImage(canvas, 0, canvas.height - FEED_H, FEED_W, FEED_H, 0, 0, FEED_W, FEED_H);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, canvas.width / pr, canvas.height / pr);
    renderer.shadowMap.autoUpdate = autoShadows;

    this.noiseCtx.putImageData(this.noise[(Math.random() * NOISE_FRAMES) | 0], 0, 0);

    const d = new Date();
    this.dateEl.textContent = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${String(d.getFullYear()).slice(2)}`;
    this.timeEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
}
