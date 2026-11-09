// The LAMPLIGHT OS boot logo: a bronze oil lamp with a lit flame, in a 1980s
// computer-graphics style. A simple silhouette with flat banded shading is drawn small
// (SPRITE_W px wide), quantized to a limited palette (5 bronze tones + 4 flame colors,
// no gradients or soft edges), then scaled up with nearest-neighbor into chunky pixels.
// An original design in the classic "genie lamp" archetype. The logo is static.
// Lamp units: x from -0.5 to 0.5 across, y down (canvas convention).

const SPRITE_W = 112;
const SPRITE_H = 76;

export const LAMP_PALETTE = {
  outline: '#2a1405',
  dark: '#6e3c12',
  mid: '#a8652a',
  light: '#d9994a',
  shine: '#f6d48e',
  flameRed: '#cf3a12',
  flameOrange: '#ff8a1e',
  flameYellow: '#ffd640',
  flameCore: '#fff7cf',
};
const PALETTE_RGB = Object.values(LAMP_PALETTE).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

let sprite = null;

function buildSprite() {
  const c = document.createElement('canvas');
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const ctx = c.getContext('2d');
  const P = LAMP_PALETTE;
  // Lamp units -> sprite pixels: centered, with room above the spout for the flame.
  ctx.translate(SPRITE_W / 2, SPRITE_H * 0.62);
  ctx.scale(SPRITE_W * 0.92, SPRITE_W * 0.92);
  const px = 1 / (SPRITE_W * 0.92); // one sprite pixel in lamp units

  const shape = (path, fill, shading) => {
    ctx.fillStyle = fill;
    ctx.fill(path);
    if (shading) {
      ctx.save();
      ctx.clip(path);
      shading();
      ctx.restore();
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.outline;
    ctx.lineWidth = px * 1.4;
    ctx.stroke(path);
  };
  const ellipse = (x, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  // Handle: a chunky C loop (outline, body, highlight strokes).
  const handle = new Path2D();
  handle.moveTo(-0.24, -0.04);
  handle.bezierCurveTo(-0.40, -0.15, -0.53, -0.04, -0.46, 0.04);
  handle.bezierCurveTo(-0.41, 0.09, -0.33, 0.08, -0.27, 0.05);
  ctx.lineCap = 'round';
  ctx.strokeStyle = P.outline; ctx.lineWidth = 0.056; ctx.stroke(handle);
  ctx.strokeStyle = P.mid; ctx.lineWidth = 0.034; ctx.stroke(handle);
  ctx.save(); ctx.translate(0.004, -0.008);
  ctx.strokeStyle = P.light; ctx.lineWidth = 0.012; ctx.stroke(handle);
  ctx.restore();

  // Foot.
  const foot = new Path2D();
  foot.moveTo(-0.09, 0.10);
  foot.lineTo(-0.15, 0.175);
  foot.lineTo(0.07, 0.175);
  foot.lineTo(0.02, 0.10);
  foot.closePath();
  shape(foot, P.dark, () => { ctx.fillStyle = P.mid; ctx.fillRect(-0.15, 0.10, 0.07, 0.08); });

  // Spout: one clean upswept taper.
  const spout = new Path2D();
  spout.moveTo(0.05, -0.01);
  spout.bezierCurveTo(0.25, 0.05, 0.39, -0.06, 0.50, -0.215);
  spout.lineTo(0.485, -0.228);
  spout.bezierCurveTo(0.37, -0.10, 0.24, -0.055, 0.11, -0.075);
  spout.closePath();
  shape(spout, P.mid, () => {
    ctx.fillStyle = P.dark;
    ctx.beginPath(); ctx.moveTo(0.05, 0.0); ctx.bezierCurveTo(0.25, 0.07, 0.40, -0.04, 0.52, -0.20); ctx.lineTo(0.52, 0.1); ctx.lineTo(0.05, 0.1); ctx.fill();
    ctx.fillStyle = P.light;
    ctx.beginPath(); ctx.moveTo(0.11, -0.085); ctx.bezierCurveTo(0.24, -0.065, 0.37, -0.11, 0.49, -0.24); ctx.lineTo(0.48, -0.205); ctx.bezierCurveTo(0.36, -0.08, 0.24, -0.045, 0.11, -0.06); ctx.fill();
  });

  // Bowl: low boat shape with three flat bands (shadow, base, highlight).
  const bowl = new Path2D();
  bowl.moveTo(-0.29, -0.03);
  bowl.bezierCurveTo(-0.31, 0.10, -0.12, 0.15, 0.02, 0.125);
  bowl.bezierCurveTo(0.14, 0.105, 0.22, 0.05, 0.24, -0.01);
  bowl.bezierCurveTo(0.14, -0.075, -0.16, -0.085, -0.29, -0.03);
  bowl.closePath();
  shape(bowl, P.mid, () => {
    ellipse(0.0, 0.135, 0.33, 0.075, P.dark); // shadow underneath
    ellipse(-0.05, -0.045, 0.24, 0.035, P.light); // lit shoulder
    ellipse(-0.15, -0.035, 0.06, 0.012, P.shine); // single hard glint
  });
  // One engraved band line (a classic flat-art detail).
  ctx.beginPath();
  ctx.moveTo(-0.265, 0.01);
  ctx.bezierCurveTo(-0.14, -0.03, 0.10, -0.03, 0.215, 0.015);
  ctx.strokeStyle = P.dark;
  ctx.lineWidth = px * 1.2;
  ctx.stroke();

  // Lid: collar + dome + knob.
  const collar = new Path2D();
  collar.ellipse(-0.04, -0.072, 0.115, 0.022, 0, 0, Math.PI * 2);
  shape(collar, P.dark);
  const dome = new Path2D();
  dome.moveTo(-0.13, -0.08);
  dome.bezierCurveTo(-0.125, -0.185, 0.045, -0.185, 0.05, -0.08);
  dome.closePath();
  shape(dome, P.mid, () => {
    ellipse(-0.075, -0.13, 0.05, 0.035, P.light);
    ellipse(-0.088, -0.142, 0.016, 0.01, P.shine);
  });
  const knob = new Path2D();
  knob.arc(-0.04, -0.2, 0.024, 0, Math.PI * 2);
  shape(knob, P.mid, () => ellipse(-0.048, -0.208, 0.01, 0.008, P.shine));

  // Flame at the spout tip: flat nested teardrops.
  const flame = (w, h, yOff) => {
    const bx = 0.495, by = -0.236 - yOff;
    const p = new Path2D();
    p.moveTo(bx, by);
    p.bezierCurveTo(bx - w, by - h * 0.08, bx - w * 0.8, by - h * 0.6, bx + 0.01, by - h);
    p.bezierCurveTo(bx + w * 0.75, by - h * 0.6, bx + w, by - h * 0.08, bx, by);
    p.closePath();
    return p;
  };
  ctx.fillStyle = P.flameRed; ctx.fill(flame(0.062, 0.23, 0));
  ctx.fillStyle = P.flameOrange; ctx.fill(flame(0.047, 0.18, 0.004));
  ctx.fillStyle = P.flameYellow; ctx.fill(flame(0.031, 0.12, 0.006));
  ctx.fillStyle = P.flameCore; ctx.fill(flame(0.015, 0.06, 0.008));

  // Quantize to the palette with hard alpha, so it's true limited-color pixel art.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, SPRITE_W, SPRITE_H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    let best = 0, bestD = Infinity;
    for (let k = 0; k < PALETTE_RGB.length; k++) {
      const [r, g, b] = PALETTE_RGB[k];
      const dd = (d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2;
      if (dd < bestD) { bestD = dd; best = k; }
    }
    [d[i], d[i + 1], d[i + 2]] = PALETTE_RGB[best];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Recolored lamp bodies (the flame keeps its colors) for the wall CRTs' bouncing logo,
// which changes color at each wall hit like the old DVD screensaver.
// Order matches the five bronze entries: outline, dark, mid, light, shine.
const VARIANTS = {
  bronze: null,
  phosphor: ['#0a2a0f', '#1f6b2a', '#3fae4a', '#79e07c', '#c8ffc4'],
  amber: ['#2a1600', '#7a4500', '#c97a00', '#ffb22e', '#ffe2a0'],
  cyan: ['#062330', '#0f5a75', '#2a9fc4', '#6fdcff', '#d2f6ff'],
  rose: ['#2b0a1a', '#7a1f4c', '#c24b84', '#f08cbd', '#ffd6ea'],
};
export const LAMP_VARIANTS = Object.keys(VARIANTS);
// Monotone (no color) version for signage: every palette entry, flame included, mapped to
// tones of one warm off-white. The outline matches the dark sign background so it disappears.
const MONO = ['#1d1b18', '#8a857a', '#bdb6a7', '#dfd9cb', '#f8f5ec', '#9f998c', '#cdc6b7', '#ebe5d8', '#ffffff'];
const variantCache = new Map();
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** The lamp sprite (SPRITE_W x SPRITE_H canvas) in a color variant. */
export function getLampSprite(variant = 'bronze') {
  sprite ||= buildSprite();
  const map = variant === 'mono' ? MONO : VARIANTS[variant];
  if (!map) return sprite;
  if (variantCache.has(variant)) return variantCache.get(variant);
  const c = document.createElement('canvas');
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const ctx = c.getContext('2d');
  ctx.drawImage(sprite, 0, 0);
  const img = ctx.getImageData(0, 0, SPRITE_W, SPRITE_H);
  const d = img.data;
  const to = map.map(hexRgb);
  const from = PALETTE_RGB.slice(0, to.length);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const k = from.findIndex(([r, g, b]) => r === d[i] && g === d[i + 1] && b === d[i + 2]);
    if (k >= 0) [d[i], d[i + 1], d[i + 2]] = to[k];
  }
  ctx.putImageData(img, 0, 0);
  variantCache.set(variant, c);
  return c;
}

/** Draw the logo centered at (cx, cy), `size` px wide, with chunky nearest-neighbor pixels. */
export function drawLamp(ctx, cx, cy, size) {
  sprite ||= buildSprite();
  const scale = Math.max(1, Math.round(size / SPRITE_W)); // whole-pixel scaling keeps pixels square
  const w = SPRITE_W * scale, h = SPRITE_H * scale;
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(cx - w / 2), Math.round(cy - h * 0.62), w, h);
  ctx.imageSmoothingEnabled = smoothing;
}
