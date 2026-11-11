// Shared materials. Keep this list short: every material is one draw call per batch.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

function noiseTexture(size = 256, strength = 18, seed = 1) {
  // Subtle fine grain so large flat surfaces don't look like flat CG.
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < size * size; i++) {
    // Centered near white: a roughnessMap MULTIPLIES roughness, so the old mid-gray grain
    // (128) silently halved every material's roughness and made everything glossy.
    const v = Math.min(255, 238 + (rnd() - 0.5) * strength * 2);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function diffuserTexture(w = 512, h = 232, { rotate = false } = {}) {
  // Prismatic acrylic diffuser of a 1980s fluorescent troffer: soft brighter bands where the tubes
  // sit behind it, a fine diamond prism texture, and darker edges toward the metal frame. Makes the
  // panels read as fixtures instead of flat blown-out white rectangles (user: "not as harsh").
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const cell = 7;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    // Three tube bands along the length, on a dimmer base.
    let tube = 0;
    for (const tv of [0.22, 0.5, 0.78]) tube += Math.exp(-(((v - tv) / 0.085) ** 2));
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const edge = Math.min(u, 1 - u, v * (h / w), (1 - v) * (h / w)) * w; // px to the nearest edge
      const falloff = Math.min(1, 0.55 + edge / 40);
      const endFade = 0.82 + 0.18 * Math.sin(Math.PI * u); // tube ends are dimmer
      const cx = x % cell, cy = y % cell;
      const prism = (Math.abs(cx - cell / 2) + Math.abs(cy - cell / 2) < cell / 2 ? 1.04 : 0.95);
      const k = (0.66 + 0.3 * Math.min(1, tube)) * falloff * endFade * prism;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, k * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  let out = c;
  if (rotate) { // tubes along the texture's v axis (fixtures that run along z)
    out = document.createElement('canvas');
    out.width = h;
    out.height = w;
    const o = out.getContext('2d');
    o.translate(h / 2, w / 2);
    o.rotate(Math.PI / 2);
    o.drawImage(c, -w / 2, -h / 2);
  }
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function tileTexture(size = 512, seams = '#6f6b64', base = '#b3afa6') {
  // Raised-floor tiles for the server room.
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = seams;
  ctx.lineWidth = size * 0.012;
  ctx.strokeRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = size * 0.004;
  ctx.strokeRect(size * 0.012, size * 0.012, size * 0.976, size * 0.976);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function ribTexture(size = 256) {
  // Ribbed rubber walkway mat.
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  for (let x = 0; x < size; x++) {
    const v = 110 + 40 * Math.sin((x / size) * Math.PI * 2 * 16);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A neutral matcap (grey sphere lit softly from above-front): shading without lights. */
function shadeMatcap() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const L = new THREE.Vector3(0, 0.5, 0.86).normalize();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5) / N * 2 - 1, ny = 1 - (y + 0.5) / N * 2;
      const r2 = nx * nx + ny * ny;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      const v = Math.round(255 * Math.min(1, 0.6 + 0.4 * Math.max(0, nx * L.x + ny * L.y + nz * L.z)));
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createMaterials(maxAnisotropy = 4) {
  const grain = noiseTexture();
  grain.repeat.set(6, 6);
  const tiles = tileTexture();
  tiles.anisotropy = maxAnisotropy;
  const ribs = ribTexture();
  ribs.anisotropy = maxAnisotropy;

  const std = (hex, roughness = 0.65, metalness = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, roughnessMap: grain, ...extra });

  const m = {
    ceiling: std(PALETTE.ceiling, 0.8),
    wallUpper: std(PALETTE.wallUpper, 0.7),
    wallLower: std(PALETTE.wallLower, 0.6),
    panelInset: std(PALETTE.panelInset, 0.72),
    trim: std(PALETTE.trim, 0.5),
    floor: std(PALETTE.floor, 0.85),
    floorMat: new THREE.MeshStandardMaterial({ color: PALETTE.floorMat, roughness: 0.95, bumpMap: ribs, bumpScale: 1.5 }),
    serverFloor: new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.7, roughnessMap: grain }),
    beige: std(PALETTE.beige, 0.5),
    beigeLight: std(PALETTE.beigeLight, 0.45),
    taupe: std(PALETTE.taupe, 0.55),
    taupeDark: std(PALETTE.taupeDark, 0.6),
    grille: std(PALETTE.grille, 0.8),
    steel: std(PALETTE.steel, 0.4, 0.6),
    coreShell: std(0xe9e7e1, 0.32, 0.05),
    screenOff: new THREE.MeshStandardMaterial({ color: PALETTE.screenOff, roughness: 0.15, metalness: 0.1 }),
    // Ceiling light panels: pure emissive so they read as light sources and feed the bloom.
    // Toned down from 1.5x / 1.2x flat white (too harsh): a diffuser texture, peaks only just into bloom.
    lightPanel: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.fluorescentPanel).multiplyScalar(1.08), map: diffuserTexture(), toneMapped: false }),
    corridorPanel: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.fluorescentPanel).multiplyScalar(0.95), map: diffuserTexture(512, 290), toneMapped: false }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xdfe8ec,
      roughness: 0.14,
      metalness: 0,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      envMapIntensity: 0.3,
    }),
  };
  m.keycap = std(0xe4dccb, 0.5); // alphanumeric caps: light beige
  m.keycapMod = std(0x9d9484, 0.5); // modifier/function caps: darker taupe-gray (Model M two-tone)
  m.doorIndicator = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfe9ff).multiplyScalar(1.3), toneMapped: false });
  m.doorGlass = new THREE.MeshStandardMaterial({ color: 0x23302d, roughness: 0.08, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  m.mouseBody = std(0xdcd8cf, 0.45); // pale warm gray, like late-80s mice
  m.mouseButton = std(0xcfcac0, 0.4);
  m.mouseBase = std(0xa9a397, 0.5); // the darker lower shell and strain relief
  m.mousePad = std(0x3a3a40, 0.9);
  m.cable = std(0x9c978d, 0.6);
  m.amberKey = std(0xd8893a, 0.45);
  m.cyanKey = std(0x6fb8c0, 0.45);
  // Small idle wall displays: faint phosphor glow.
  m.screenGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x0f2a22), toneMapped: false });
  // Server-room fixture lenses: start dark and are brightened by the reveal.
  // One material per fixture row (0 = nearest the window) so rows can strike in sequence.
  // Server-room fixtures get the same prismatic diffuser as the command room (tubes run along z).
  const serverDiffuser = diffuserTexture(512, 152, { rotate: true });
  m.serverFixtureRows = [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: 0x000000, map: serverDiffuser, toneMapped: false }));
  // Curved strip fixtures around the north bay (chord pieces whose long axis is the texture's u).
  // Light grey frames around the server-room fixtures: a slight contrast with that ceiling (user).
  // Lightened a couple of shades of grey (was 0xc4c3bf; user). Server room only: the command room's frames are beige.
  // No light reaches the frames' faces either, so they used to look dark; matcap-shaded like the beams, brought up to
  // 0xdcdbd7 by the reveal (serverRoom.js).
  m.fixtureFrame = new THREE.MeshMatcapMaterial({ color: 0x000000, matcap: shadeMatcap() });
  m.fixtureFrame.toneMapped = false;
  // Server-room ceiling: unlit (black) until the reveal brings it up to anthracite with the first row.
  m.serverCeiling = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  // Beams + fixture housings: no light reaches them either, but flat color hid their shape (the housings' coves into
  // the beams were invisible), so they use a matcap: soft shading from the surface's angle alone, no lights needed.
  // A face looking straight at the viewer comes out at ~95 % of the color (the user's #1A1A1A), grazing faces darker.
  m.serverBeam = new THREE.MeshMatcapMaterial({ color: 0x000000, matcap: shadeMatcap() });
  m.serverBeam.toneMapped = false;

  m.serverBayStrip = new THREE.MeshBasicMaterial({ color: 0x000000, map: diffuserTexture(512, 110), toneMapped: false });
  m.coreFixture = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  // One material per light band on the core column (0 = lowest) so they climb in sequence.
  m.coreBands = [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
  // Shadow maps record FRONT faces. The default (back faces) put each wall's shadow at its far
  // side, so in corners where another wall starts exactly there (corridor walls vs. the back
  // wall) light slipped through within the shadow bias and the fill light glowed behind the door.
  for (const mat of Object.values(m)) {
    if (mat?.isMeshStandardMaterial && !mat.transparent) mat.shadowSide = THREE.FrontSide;
    // Matte everything that isn't metal (user: no glossy reflections, carpet included).
    // Metals (steel) and the screen glass keep their sheen.
    if (mat?.isMeshStandardMaterial && mat.metalness < 0.3 && mat !== m.screenOff && !mat.transparent) {
      mat.roughness = Math.max(mat.roughness, 0.86);
    }
  }
  return m;
}
