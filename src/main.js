// nms.fyi entry point: a tiny loader that decides how the site runs BEFORE any 3D code loads.
//   * Phones and tablets (touch-only devices): the mobile desktop, straight away. No 3D at all.
//   * Everything else: a welcome page (slideshow of facility stills, formal copy) that is also the
//     chooser between the Full Site (3D command room, sound) and the Lite Site (the desktop only).
//     three.js and the whole scene live in full.js, a separate chunk fetched only after "Full" is
//     picked, so the welcome page costs no GPU time.
// URL overrides (testing): ?full ?light ?mobile. ?skip implies full; so do the dev-build-only flags ?os ?debug ?lit.
import './style.css';
import { LoadingScreen } from './loader.js';

const params = new URLSearchParams(location.search);
if (!import.meta.env.DEV) for (const k of ['debug', 'lit', 'os']) params.delete(k); // dev-only flags (see full.js)
const chooser = document.getElementById('chooser');
const MODE_KEY = 'nms-mode';

/** Touch-first devices get the mobile desktop. Touchscreen laptops (with a mouse/trackpad) don't. */
function isMobileDevice() {
  const ua = navigator.userAgent;
  if (navigator.userAgentData?.mobile) return true;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true; // iPadOS reports itself as a Mac
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
}

// Welcome-page slideshow: stills captured from the 3D facility (public/welcome/), with captions.
// ox/oy = where each slow zoom heads, dx/dy = its drift.
const SLIDES = [
  { src: 'overlook', title: 'Command Room Overlook', text: 'Facility operations are monitored around the clock from the command room.', ox: '50%', oy: '42%', dx: '0', dy: '-1%' },
  { src: 'core', title: 'Central Processing Core', text: 'The LAMPLIGHT supercomputer, housed in the facility’s north bay.', ox: '50%', oy: '30%', dx: '0', dy: '1%' },
  { src: 'banks', title: 'Data Storage Banks', text: 'Two tiers of storage modules line the walls of the main hall.', ox: '20%', oy: '45%', dx: '1.5%', dy: '0' },
  { src: 'catwalk', title: 'Upper Maintenance Catwalks', text: 'Service access to the upper storage tier.', ox: '80%', oy: '50%', dx: '-1.5%', dy: '0' },
  { src: 'hall', title: 'Main Server Hall', text: 'Climate-controlled floor space for the facility’s storage infrastructure.', ox: '50%', oy: '45%', dx: '0', dy: '0' },
  { src: 'command', title: 'Command Room', text: 'Home of the LAMPLIGHT OS terminal.', ox: '60%', oy: '45%', dx: '-1%', dy: '0' },
];
const SLIDE_SECONDS = 7;
let slideTimer = 0;

function startSlideshow() {
  const box = chooser.querySelector('.wl-slides');
  const progress = chooser.querySelector('.wl-progress');
  const caption = chooser.querySelector('.wl-caption');
  const figs = SLIDES.map((sl, i) => {
    const fig = document.createElement('figure');
    fig.className = 'wl-slide';
    fig.style.cssText = `--ox:${sl.ox};--oy:${sl.oy};--dx:${sl.dx};--dy:${sl.dy}`;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    if (i === 0) img.src = `/welcome/${sl.src}.webp`; // the rest load once the first is in
    else img.dataset.src = `/welcome/${sl.src}.webp`;
    fig.append(img);
    box.append(fig);
    progress.append(document.createElement('i'));
    return fig;
  });
  const first = figs[0].querySelector('img');
  const loadRest = () => figs.forEach((f) => { const im = f.querySelector('img'); if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } });
  first.complete ? loadRest() : first.addEventListener('load', loadRest, { once: true });
  let cur = -1;
  const show = (i) => {
    const next = figs[i].querySelector('img');
    if (!next.complete && cur >= 0) return; // not downloaded yet: keep the current slide a bit longer
    if (cur >= 0) figs[cur].classList.remove('active');
    cur = i;
    figs[i].classList.add('active');
    [...progress.children].forEach((b, j) => b.classList.toggle('on', j === i));
    caption.querySelector('.wl-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(SLIDES.length).padStart(2, '0')}`;
    caption.querySelector('.wl-cap-title').textContent = SLIDES[i].title;
    caption.querySelector('.wl-cap-text').textContent = SLIDES[i].text;
    caption.classList.remove('swap');
    void caption.offsetWidth; // restart the caption fade
    caption.classList.add('swap');
  };
  show(0);
  slideTimer = setInterval(() => { if (!document.hidden) show((cur + 1) % figs.length); }, SLIDE_SECONDS * 1000);
}

function leaveWelcome() {
  clearInterval(slideTimer);
  window.removeEventListener('resize', fitWelcome);
  chooser.hidden = true;
  chooser.querySelector('.wl-slides').replaceChildren(); // free the images
}

function remember(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* storage unavailable */ }
}

async function startDesktop(mode) {
  leaveWelcome();
  document.getElementById('loader').hidden = true;
  document.getElementById('view')?.remove(); // no canvas, no WebGL context
  const { startDesktopOnly } = await import('./desktopOnly.js');
  startDesktopOnly(mode);
}

/**
 * Make an audio context inside the user's click (the Full Site button), where browsers allow sound to start. The
 * old click-to-enter gate existed only for this; full.js now gets the context and starts the sound itself.
 */
function unlockAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume?.();
    return ctx;
  } catch { return null; }
}

/**
 * The Full Site: the LAMPLIGHT-style loading screen while full.js (three.js + the scene) downloads and builds, then
 * straight into the walk-in. The dev/skip flags (?skip ?os ?debug ?lit) start at once, without the loading screen.
 */
async function startFull(audioCtx = null) {
  leaveWelcome();
  const quick = ['skip', 'os', 'debug', 'lit'].some((k) => params.has(k));
  const loader = quick ? null : new LoadingScreen();
  loader?.show();
  let mod;
  try {
    mod = await import('./full.js');
  } catch (err) {
    console.error(err);
    const msg = err?.message === 'WebGL2 unavailable'
      ? 'The Full Site needs WebGL 2, which this browser or device doesn’t provide.'
      : 'The Full Site failed to load.';
    (loader || new LoadingScreen()).fail(msg, () => startDesktop('light'));
    return;
  }
  if (loader) {
    loader.setLoaded();
    await loader.finished;
  }
  mod.enter({ audioCtx });
}

/** Scale the welcome text with screen height (like the desktop's 768 px reference), so it isn't tiny at 1440p. */
function fitWelcome() {
  const z = Math.min(1.7, Math.max(1, window.innerHeight / 820));
  chooser.querySelectorAll('.wl-top, .wl-main, .wl-foot').forEach((e) => { e.style.zoom = String(z); });
}

function showChooser() {
  chooser.hidden = false;
  fitWelcome();
  window.addEventListener('resize', fitWelcome);
  startSlideshow();
  const full = document.getElementById('choose-full');
  const light = document.getElementById('choose-light');
  if (!('WebGL2RenderingContext' in window)) {
    full.disabled = true;
    full.querySelector('.choice-desc').textContent = 'Not available: this browser doesn’t support WebGL 2.';
  }
  full.addEventListener('click', () => { remember('full'); startFull(unlockAudio()); });
  light.addEventListener('click', () => { remember('light'); startDesktop('light'); });
  let last = null;
  try { last = localStorage.getItem(MODE_KEY); } catch { /* storage unavailable */ }
  (last === 'light' || full.disabled ? light : full).focus();
}

if (params.has('mobile')) startDesktop('mobile');
else if (params.has('light')) startDesktop('light');
else if (['full', 'skip', 'os', 'debug', 'lit'].some((k) => params.has(k))) startFull();
else if (isMobileDevice()) startDesktop('mobile');
else showChooser();
