// LAMPLIGHT OS artwork, drawn in code and cached: the desktop wallpaper (an original
// desert-at-dusk scene to fit the oil-lamp theme; deliberately nothing like XP's hill photo)
// and 32×32 pixel icons. The same canvases feed the 3D monitor and the HTML desktop
// (as data URLs), so both always look identical.
import { getLampSprite } from '../scene/lamp.js';

let wallpaper = null;
const icons = new Map();
const urls = new Map();

/** Seeded random so the stars land in the same place every time. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function getWallpaper() {
  if (wallpaper) return wallpaper;
  const W = 1920, H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // Dusk sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0, '#16233f');
  sky.addColorStop(0.45, '#3d4f7a');
  sky.addColorStop(0.78, '#c98a6a');
  sky.addColorStop(1, '#f2c38a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars in the upper sky.
  const r = rng(11);
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * H * 0.38;
    const a = 0.25 + r() * 0.6;
    ctx.fillStyle = `rgba(255,248,230,${a * (1 - y / (H * 0.42))})`;
    ctx.fillRect(x, y, r() < 0.1 ? 3 : 2, r() < 0.1 ? 3 : 2);
  }
  // Crescent moon.
  ctx.fillStyle = '#f6ecd2';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.17, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#23325a';
  ctx.beginPath();
  ctx.arc(W * 0.78 + 20, H * 0.17 - 10, 42, 0, Math.PI * 2);
  ctx.fill();
  // Low sun glow on the horizon.
  const sun = ctx.createRadialGradient(W * 0.3, H * 0.7, 10, W * 0.3, H * 0.7, H * 0.5);
  sun.addColorStop(0, 'rgba(255,214,150,0.9)');
  sun.addColorStop(0.25, 'rgba(255,180,110,0.35)');
  sun.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  // Three dune layers, far (light, hazy) to near (darker, richer).
  const dune = (base, amp, waves, phase, top, bottom) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const u = x / W;
      let y = base;
      waves.forEach(([f, a], i) => { y -= Math.sin(u * Math.PI * 2 * f + phase + i) * a * amp; });
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp * 1.5, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();
  };
  dune(H * 0.72, 40, [[1.3, 1], [3.1, 0.35]], 0.4, '#d9a676', '#b98457');
  dune(H * 0.8, 55, [[0.9, 1], [2.4, 0.4]], 2.1, '#b97a46', '#8f5a31');
  dune(H * 0.9, 60, [[0.7, 1], [1.9, 0.5]], 4.0, '#8a5530', '#5c3519');
  wallpaper = c;
  return wallpaper;
}

// ---------------------------------------------------------------- pixel icons (32×32)
const P = {
  ol: '#1d1a16', beige: '#e3d9c3', beigeD: '#b9ab8f', screen: '#123a2c', glow: '#5ee08f',
  yel: '#f2c955', yelD: '#c9962a', yelL: '#fbe49a', white: '#fbfaf5', gray: '#b5b2aa', grayD: '#7d7a73',
  red: '#d24a3a', blue: '#4f7bd6',
};

function pix(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }; // whole pixels only
  draw(r, ctx);
  return c;
}

const DRAW = {
  computer: (r) => {
    r(4, 3, 24, 19, P.ol); r(5, 4, 22, 17, P.beige); r(7, 6, 18, 12, P.ol); r(8, 7, 16, 10, P.screen);
    r(9, 8, 6, 1, P.glow); r(9, 10, 9, 1, P.glow); r(9, 12, 5, 1, P.glow);
    r(22, 19, 3, 1, P.glow); // status light
    r(12, 22, 8, 2, P.ol); r(13, 22, 6, 1, P.beigeD);
    r(6, 24, 20, 5, P.ol); r(7, 25, 18, 3, P.beige);
    for (let i = 0; i < 8; i++) r(8 + i * 2, 26, 1, 1, P.beigeD);
  },
  folder: (r) => {
    r(3, 7, 11, 4, P.ol); r(4, 8, 9, 3, P.yelD);
    r(3, 10, 26, 18, P.ol); r(4, 11, 24, 16, P.yel); r(4, 11, 24, 2, P.yelL); r(4, 25, 24, 2, P.yelD);
  },
  document: (r) => {
    r(7, 3, 16, 26, P.ol); r(8, 4, 14, 24, P.white); r(19, 3, 4, 4, P.gray); r(18, 4, 1, 3, P.ol); r(19, 7, 3, 1, P.ol);
    for (let i = 0; i < 7; i++) r(10, 10 + i * 2.6, i % 3 === 2 ? 6 : 10, 1, P.grayD);
  },
  mail: (r) => {
    r(3, 8, 26, 17, P.ol); r(4, 9, 24, 15, P.white);
    for (let i = 0; i < 12; i++) { r(4 + i, 9 + i * 0.6, 1, 1, P.grayD); r(27 - i, 9 + i * 0.6, 1, 1, P.grayD); }
    r(22, 11, 4, 4, P.red);
  },
  camera: (r) => {
    // 1980s CCTV camera on a wall bracket: long housing under a sun hood, lens to the left.
    r(26, 6, 4, 20, P.ol); r(27, 7, 2, 18, P.gray); // wall plate
    r(19, 16, 8, 3, P.ol); r(20, 17, 7, 1, P.grayD); // arm
    r(18, 13, 4, 6, P.ol); r(19, 14, 2, 4, P.grayD); // pan-tilt head
    r(3, 6, 22, 3, P.ol); r(4, 7, 20, 1, P.beigeD); // sun hood
    r(5, 8, 18, 7, P.ol); r(6, 9, 16, 5, P.beige); r(6, 13, 16, 1, P.beigeD); // housing
    r(2, 9, 4, 5, P.ol); r(3, 10, 2, 3, P.screen); r(3, 10, 1, 1, P.glow); // lens window
    r(20, 10, 1, 1, P.red); // tally light
  },
  user: (r) => {
    // Logon-screen avatar: a lamp-bronze tile with a simple head-and-shoulders figure.
    r(2, 2, 28, 28, P.ol); r(3, 3, 26, 26, '#a8652a'); r(3, 3, 26, 4, '#c27a36');
    r(12, 7, 8, 9, P.ol); r(13, 8, 6, 7, '#f6d48e'); // head
    r(7, 18, 18, 11, P.ol); r(8, 19, 16, 10, '#f6d48e'); r(8, 19, 16, 2, '#fff1c8'); // shoulders
  },
  logout: (r) => {
    // Log out: a door swung open in its frame, with an arrow stepping out through it.
    r(5, 3, 16, 26, P.ol); r(6, 4, 14, 24, '#20242e'); // frame + dark doorway
    r(6, 4, 3, 24, P.ol); // hinge side jamb
    for (let i = 0; i < 9; i++) r(9 + i, 5 + Math.floor(i / 3), 1, 22 - 2 * Math.floor(i / 3), i < 7 ? '#c9962a' : P.ol); // door panel, open toward us
    r(15, 15, 2, 2, P.ol); // knob
    r(19, 14, 8, 4, P.ol); r(19, 15, 7, 2, '#5fd17a'); // arrow shaft
    for (let i = 0; i < 4; i++) { r(26 + i, 12 + i, 1, 8 - 2 * i, i < 3 ? '#5fd17a' : P.ol); } // arrow head
    r(26, 11, 1, 1, P.ol); r(26, 20, 1, 1, P.ol);
  },
  bin: (r) => {
    r(8, 6, 16, 3, P.ol); r(9, 7, 14, 1, P.gray); r(13, 4, 6, 2, P.ol);
    r(9, 9, 14, 19, P.ol); r(10, 9, 12, 18, P.gray);
    for (let i = 0; i < 4; i++) r(11 + i * 3, 11, 1, 14, P.grayD);
  },
};

/** A 32×32 icon canvas. 'lamp' is the pixel oil lamp scaled to fit. */
export function getIcon(name) {
  if (icons.has(name)) return icons.get(name);
  let c;
  if (name === 'lamp') {
    c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const s = getLampSprite();
    const scale = 32 / s.width; // the sprite is 112 px wide
    ctx.drawImage(s, 0, 16 - (s.height * scale) / 2 - 2, 32, s.height * scale);
  } else {
    c = pix(DRAW[name] || DRAW.document);
  }
  icons.set(name, c);
  return c;
}

/** Data URL for use in HTML (cached). */
export function iconURL(name) {
  if (!urls.has(name)) urls.set(name, getIcon(name).toDataURL());
  return urls.get(name);
}

export function wallpaperURL() {
  if (!urls.has('__wall')) urls.set('__wall', getWallpaper().toDataURL('image/jpeg', 0.9));
  return urls.get('__wall');
}
