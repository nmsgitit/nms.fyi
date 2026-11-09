// nms.fyi entry point: a tiny loader that decides how the site runs BEFORE any 3D code loads.
//   * Phones and tablets (touch-only devices): the mobile desktop, straight away. No 3D at all.
//   * Everything else: a chooser between the Full experience (3D command room, sound) and the
//     Light version (the desktop only). three.js and the whole scene live in full.js, which is a
//     separate chunk fetched only after "Full" is picked, so the chooser costs no GPU time.
// URL overrides (testing): ?full ?light ?mobile. The dev flags ?skip ?os ?debug ?lit imply full.
import './style.css';

const params = new URLSearchParams(location.search);
const chooser = document.getElementById('chooser');
const gate = document.getElementById('gate');
const gateStatus = document.getElementById('gate-status');
const MODE_KEY = 'nms-mode';

/** Touch-first devices get the mobile desktop. Touchscreen laptops (with a mouse/trackpad) don't. */
function isMobileDevice() {
  const ua = navigator.userAgent;
  if (navigator.userAgentData?.mobile) return true;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true; // iPadOS reports itself as a Mac
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
}

function remember(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* storage unavailable */ }
}

async function startDesktop(mode) {
  chooser.hidden = true;
  gate.hidden = true;
  document.getElementById('view')?.remove(); // no canvas, no WebGL context
  const { startDesktopOnly } = await import('./desktopOnly.js');
  startDesktopOnly(mode);
}

async function startFull() {
  chooser.hidden = true;
  gate.hidden = false;
  gateStatus.textContent = 'Loading the command room…';
  try {
    await import('./full.js');
  } catch (err) {
    console.error(err);
    gateStatus.textContent = err?.message === 'WebGL2 unavailable'
      ? 'The full experience needs WebGL 2, which this browser or device doesn’t provide.'
      : 'The full experience failed to load.';
    const light = document.getElementById('gate-light');
    light.hidden = false;
    light.addEventListener('click', () => startDesktop('light'), { once: true });
    document.getElementById('gate-enter').hidden = true;
  }
}

function showChooser() {
  chooser.hidden = false;
  const full = document.getElementById('choose-full');
  const light = document.getElementById('choose-light');
  if (!('WebGL2RenderingContext' in window)) {
    full.disabled = true;
    full.querySelector('.choice-desc').textContent = 'Not available: this browser doesn’t support WebGL 2.';
  }
  full.addEventListener('click', () => { remember('full'); startFull(); });
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
