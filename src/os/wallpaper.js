// LAMPLIGHT OS wallpaper: an animated pixel-art desert that follows the visitor's own clock
// (user request). It is the old dusk scene's descendant (same three dune layers and sand
// colors), now drawn into a small pixel buffer and scaled up crisp:
// - the sky, the light on the dunes and the star field follow the local time of day;
// - the sun crosses the sky 06:00 to 18:00 and the moon 18:30 to 07:00, on an hourly clock
//   (positions come from the current minute, so they creep along while you watch);
// - the dunes creep a little over the day, their lit faces turn with the sun, and wind lifts
//   sand off different crests every hour (crossfading between hours);
// - at night and in the early morning the stars twinkle.
// No three.js here: the Lite and mobile desktops use this too.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const STEP = 9; // color quantization step per channel (ordered dither between steps)

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const frac = (v) => v - Math.floor(v);

/** Interpolate keyframes [[hour, ...values]] around a 24 h loop. Values are [r,g,b] arrays or numbers. */
function keyed(frames, h) {
  for (let i = 0; i < frames.length; i++) {
    const a = frames[i], b = frames[(i + 1) % frames.length];
    const h0 = a[0], h1 = b[0] + (i === frames.length - 1 ? 24 : 0);
    const hh = h < h0 ? h + 24 : h;
    if (hh >= h0 && hh < h1) {
      const k = smooth((hh - h0) / (h1 - h0));
      return a.slice(1).map((v, j) => (typeof v === 'number' ? v + (b[j + 1] - v) * k : mix(v, b[j + 1], k)));
    }
  }
  return frames[0].slice(1);
}

// Sky: top color, horizon color, by hour.
const SKY = [
  [0, '#060a1c', '#131b3c'],
  [4.6, '#070b20', '#1b2248'],
  [5.4, '#1b2252', '#80587a'],
  [6.1, '#34488a', '#eea072'],
  [7.2, '#5689cc', '#f2d2a8'],
  [9.0, '#4b8bd6', '#cbe3f0'],
  [15.0, '#4886d0', '#d6e4e8'],
  [17.0, '#4767a6', '#f0c690'],
  [18.0, '#2b3b70', '#f0a070'],
  [18.8, '#16233f', '#c98a6a'],
  [19.8, '#0b1230', '#3a3460'],
  [21.0, '#060a1c', '#131b3c'],
].map(([h, a, b]) => [h, hex(a), hex(b)]);

// Light on the sand (multiplies the dune colors) and how strongly sunlit faces stand out.
const LIGHT = [
  [0, [0.3, 0.34, 0.52], 0.12],
  [4.8, [0.3, 0.34, 0.52], 0.12],
  [5.8, [0.6, 0.5, 0.58], 0.2],
  [6.6, [0.98, 0.78, 0.64], 0.5],
  [8.0, [1.08, 1.0, 0.9], 0.4],
  [13.0, [1.14, 1.08, 0.98], 0.18],
  [16.5, [1.08, 0.98, 0.84], 0.4],
  [18.0, [1.0, 0.74, 0.56], 0.55],
  [19.0, [0.6, 0.48, 0.56], 0.25],
  [20.3, [0.3, 0.34, 0.52], 0.12],
];

// Dune layers, far to near: base height (fraction of H), amplitude (fraction of H), waves, colors, crawl.
const LAYERS = [
  { base: 0.72, amp: 0.037, waves: [[1.3, 1], [3.1, 0.35]], phase: 0.4, top: hex('#d9a676'), bottom: hex('#b98457'), crawl: 0.012 },
  { base: 0.8, amp: 0.051, waves: [[0.9, 1], [2.4, 0.4]], phase: 2.1, top: hex('#b97a46'), bottom: hex('#8f5a31'), crawl: 0.02 },
  { base: 0.9, amp: 0.056, waves: [[0.7, 1], [1.9, 0.5]], phase: 4.0, top: hex('#8a5530'), bottom: hex('#5c3519'), crawl: 0.03, ripples: true },
];

/** Stars visible 0..1 by hour: full from 20:20 to 04:35, fading at dusk and dawn. */
function starVisibility(h) {
  if (h >= 20.3 || h < 4.6) return 1;
  if (h >= 18.8) return smooth((h - 18.8) / 1.5);
  if (h < 5.9) return 1 - smooth((h - 4.6) / 1.3);
  return 0;
}

// `?time=HH:MM` previews another time of day (handy for checking the scene; the clock still ticks on from there).
const TIME_OVERRIDE = (() => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('time') || '');
  if (!m) return null;
  const now = new Date(), at = new Date(now);
  at.setHours(+m[1] % 24, +m[2], 0, 0);
  return at - now;
})();

export class DesertWallpaper {
  constructor(width = 384, height = 216) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize(width, height);
  }

  resize(width, height) {
    width = Math.max(64, Math.round(width));
    height = Math.max(64, Math.round(height));
    if (width === this.canvas.width && height === this.canvas.height && this.img) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.img = this.ctx.createImageData(width, height);
    // Star field for this size (seeded, so it is the same every visit).
    const r = rng(11);
    const n = Math.round((width * height) / 480);
    this.stars = Array.from({ length: n }, () => ({
      x: Math.floor(r() * width),
      y: Math.floor(r() * height * 0.58),
      big: r() < 0.07,
      b: 0.35 + r() * 0.65,
      speed: 1.2 + r() * 3.2,
      phase: r() * Math.PI * 2,
      sharp: r() < 0.35, // some stars flicker hard, most shimmer
    }));
  }

  /** Hour of day (0..24, fractional) for a Date, in the visitor's local time. */
  static hourOf(date) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  }

  /** Draw the scene for `date` (time of day) at animation time `t` (seconds). */
  render(date = new Date(Date.now() + (TIME_OVERRIDE || 0)), t = performance.now() / 1000) {
    const W = this.canvas.width, H = this.canvas.height;
    const d = this.img.data;
    const h = DesertWallpaper.hourOf(date);
    const [skyTop, skyBottom] = keyed(SKY, h);
    const [tint, contrast] = keyed(LIGHT, h);
    const horizonY = H * 0.68;
    const arcTop = H * 0.12;

    // Sun (06:00 to 18:00) and moon (18:30 to 07:00) on the same left-to-right arc.
    const sunP = (h - 6) / 12;
    const moonP = (((h - 18.5) % 24) + 24) % 24 / 12.5;
    const onArc = (p) => ({ x: W * (0.06 + 0.88 * p), y: horizonY - Math.sin(Math.PI * clamp01(p)) * (horizonY - arcTop) + (p < 0 || p > 1 ? H * 0.1 : 0) });
    const sun = onArc(sunP), moon = onArc(moonP);
    const sunUp = sunP > -0.06 && sunP < 1.06;
    const moonUp = moonP > -0.06 && moonP < 1.06;
    const sunAlt = Math.sin(Math.PI * clamp01(sunP)); // 0 at the horizon, 1 at noon
    const sunCol = mix([255, 150, 80], [255, 246, 214], clamp01(sunAlt * 1.6));
    const glowCol = mix([255, 140, 70], [255, 236, 190], clamp01(sunAlt * 1.4));
    const glowR = W * (0.16 + 0.1 * (1 - sunAlt));
    const glowA = sunUp ? 0.55 * (1 - sunAlt * 0.45) : 0;
    const moonGlowR = W * 0.07;

    const put = (i, r, g, b, x, y) => {
      const th = BAYER[(y & 3) * 4 + (x & 3)];
      d[i] = Math.round(r / STEP + th) * STEP;
      d[i + 1] = Math.round(g / STEP + th) * STEP;
      d[i + 2] = Math.round(b / STEP + th) * STEP;
      d[i + 3] = 255;
    };

    // 1. Sky with the sun's glow (and a faint one around the moon).
    for (let y = 0; y < H; y++) {
      const k = Math.pow(clamp01(y / (H * 0.74)), 1.25);
      const base = mix(skyTop, skyBottom, k);
      for (let x = 0; x < W; x++) {
        let r = base[0], g = base[1], b = base[2];
        if (glowA > 0) {
          const dx = x - sun.x, dy = (y - sun.y) * 1.25;
          const f = glowA * Math.exp(-(dx * dx + dy * dy) / (glowR * glowR));
          r += (glowCol[0] - r) * f; g += (glowCol[1] - g) * f; b += (glowCol[2] - b) * f;
        }
        if (moonUp) {
          const dx = x - moon.x, dy = y - moon.y;
          const f = 0.16 * Math.exp(-(dx * dx + dy * dy) / (moonGlowR * moonGlowR));
          r += (200 - r) * f; g += (210 - g) * f; b += (235 - b) * f;
        }
        put((y * W + x) * 4, r, g, b, x, y);
      }
    }

    // 2. Stars (twinkling).
    const vis = starVisibility(h);
    if (vis > 0) {
      for (const s of this.stars) {
        let tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        tw = s.sharp ? 0.25 + 0.75 * tw * tw * tw : 0.6 + 0.4 * tw;
        let a = vis * s.b * tw * (1 - s.y / (H * 0.66));
        if (moonUp) { // the moon washes out the stars near it
          const md = Math.hypot(s.x - moon.x, s.y - moon.y);
          a *= clamp01(md / (W * 0.09));
        }
        if (a <= 0.03) continue;
        const plot = (x, y, aa) => {
          if (x < 0 || y < 0 || x >= W || y >= H) return;
          const i = (y * W + x) * 4;
          d[i] += (255 - d[i]) * aa; d[i + 1] += (250 - d[i + 1]) * aa; d[i + 2] += (232 - d[i + 2]) * aa;
        };
        plot(s.x, s.y, a);
        if (s.big) { // a little cross on the bright ones
          const aa = a * 0.45;
          plot(s.x - 1, s.y, aa); plot(s.x + 1, s.y, aa); plot(s.x, s.y - 1, aa); plot(s.x, s.y + 1, aa);
        }
      }
    }

    // 3. Moon (crescent) and sun disks. They set behind the dunes, which draw over them.
    const R = Math.max(4, Math.round(Math.min(W, H) * 0.042)); // by the shorter side, so a phone's portrait sky isn't all moon
    if (moonUp) {
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        if (x * x + y * y > R * R) continue;
        const cx = x - R * 0.45, cy = y + R * 0.2; // bite out of the upper right: a waxing crescent
        if (cx * cx + cy * cy < R * R * 0.82) continue;
        const px = Math.round(moon.x) + x, py = Math.round(moon.y) + y;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        put((py * W + px) * 4, 246, 236, 210, px, py);
      }
    }
    if (sunUp) {
      const SR = R + 1;
      for (let y = -SR; y <= SR; y++) for (let x = -SR; x <= SR; x++) {
        const rr = x * x + y * y;
        if (rr > SR * SR) continue;
        const px = Math.round(sun.x) + x, py = Math.round(sun.y) + y;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const edge = rr > (SR - 1) * (SR - 1) ? 0.9 : 1;
        put((py * W + px) * 4, sunCol[0] * edge, sunCol[1] * edge, sunCol[2] * edge, px, py);
      }
    }

    // 4. Dunes, far to near, each followed by the sand blowing off its crests.
    // Which side the light comes from: the sun by day, the (dimmer) moon by night.
    const lightX = sunUp ? (sun.x - W / 2) / (W / 2) : moonUp ? ((moon.x - W / 2) / (W / 2)) * 0.6 : 0;
    const wind = this.windSpots(h);
    const heights = new Float32Array(W + 1);
    LAYERS.forEach((L, li) => {
      const amp = L.amp * H, base = L.base * H;
      const crawl = h * L.crawl * Math.PI * 2; // the dune shapes creep over the day
      for (let x = 0; x <= W; x++) {
        const u = x / W;
        let y = base;
        L.waves.forEach(([f, a], i) => { y -= Math.sin(u * Math.PI * 2 * f + L.phase + i + crawl * (i ? -0.6 : 1)) * a * amp; });
        heights[x] = y;
      }
      const top = L.top.map((v, j) => v * tint[j]);
      const bottom = L.bottom.map((v, j) => v * tint[j]);
      const y0 = base - amp * 1.5;
      for (let x = 0; x < W; x++) {
        const yt = Math.round(heights[x]);
        const slope = heights[x + 1] - heights[x];
        // Faces turned toward the light are brighter, faces away darker.
        const shade = 1 + Math.max(-0.3, Math.min(0.3, slope * lightX * contrast * 2.2));
        for (let y = Math.max(0, yt); y < H; y++) {
          const k = clamp01((y - y0) / (H - y0));
          let f = shade * (y === yt ? 1.12 : 1); // crest highlight
          if (L.ripples && y > yt + 3) { // wind ripples on the near dune, drifting slowly
            const v = frac((x * 0.3 + y * 1.05 + Math.sin(x * 0.07 + y * 0.02) * 3 + t * 0.5) / 7.5);
            if (v < 0.13) f *= 0.9;
          }
          put((y * W + x) * 4, (top[0] + (bottom[0] - top[0]) * k) * f, (top[1] + (bottom[1] - top[1]) * k) * f,
            (top[2] + (bottom[2] - top[2]) * k) * f, x, y);
        }
      }
      // Blowing sand off this layer's crests.
      const grain = top.map((v) => Math.min(255, v * 1.3 + 30));
      for (const s of wind) {
        if (s.layer !== li || s.strength <= 0.02) continue;
        const sx = Math.round(s.x * W);
        const crest = heights[Math.max(0, Math.min(W, sx))];
        const len = W * 0.13, N = 56;
        for (let i = 0; i < N; i++) {
          const r1 = frac(Math.sin((i + 1) * 12.9898 + s.seed) * 43758.5453);
          const r2 = frac(Math.sin((i + 1) * 78.233 + s.seed) * 12543.1234);
          const ph = frac(t * (0.22 + r1 * 0.2) + r2);
          const x = Math.round(sx + s.dir * (ph * len + r2 * 5 - 2) + Math.sin(t * 3 + i) * 0.7);
          const y = Math.round(crest - 1 - Math.sin(ph * Math.PI) * (3 + r1 * 6) + ph * 3 + Math.sin(t * 2.3 + i * 1.7) * 0.6);
          const a = s.strength * (1 - ph) * Math.min(1, ph * 8);
          if (x < 0 || y < 0 || x >= W || y >= H || a < 0.05) continue;
          const j = (y * W + x) * 4;
          d[j] += (grain[0] - d[j]) * a; d[j + 1] += (grain[1] - d[j + 1]) * a; d[j + 2] += (grain[2] - d[j + 2]) * a;
          const xt = x - s.dir; // a short streak behind each grain
          if (xt >= 0 && xt < W) {
            const k = j - s.dir * 4, at = a * 0.45;
            d[k] += (grain[0] - d[k]) * at; d[k + 1] += (grain[1] - d[k + 1]) * at; d[k + 2] += (grain[2] - d[k + 2]) * at;
          }
        }
      }
    });

    this.ctx.putImageData(this.img, 0, 0);
    return this.canvas;
  }

  /**
   * Where the wind lifts sand this hour: three crests chosen per hour of the day (seeded, so 3 pm
   * always blows in the same places), crossfading into the next hour's over its last 15 minutes.
   */
  windSpots(h) {
    const slot = (n) => {
      const r = rng(((n % 24) + 24) % 24 * 7919 + 17);
      const dir = r() < 0.7 ? 1 : -1; // mostly blowing left to right
      return [0, 1, 2].map((i) => ({
        layer: i === 0 ? 0 : i === 1 ? 1 : 2,
        x: 0.08 + r() * 0.84,
        dir,
        seed: n * 31 + i * 7,
        strength: 0.6 + r() * 0.4,
      }));
    };
    const H0 = Math.floor(h);
    const k = smooth(clamp01((h - H0 - 0.75) / 0.25));
    const now = slot(H0).map((s) => ({ ...s, strength: s.strength * (1 - k) }));
    const next = k > 0 ? slot(H0 + 1).map((s) => ({ ...s, strength: s.strength * k })) : [];
    return now.concat(next);
  }
}
