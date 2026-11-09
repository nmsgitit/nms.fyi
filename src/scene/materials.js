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
    lightPanel: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.fluorescentPanel).multiplyScalar(1.5), toneMapped: false }),
    corridorPanel: new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.fluorescentPanel).multiplyScalar(1.2), toneMapped: false }),
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
  m.mousePad = std(0x3a3a40, 0.9);
  m.cable = std(0x9c978d, 0.6);
  m.amberKey = std(0xd8893a, 0.45);
  m.cyanKey = std(0x6fb8c0, 0.45);
  // Small idle wall displays: faint phosphor glow.
  m.screenGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x0f2a22), toneMapped: false });
  // Server-room fixture lenses: start dark and are brightened by the reveal.
  // One material per fixture row (0 = nearest the window) so rows can strike in sequence.
  m.serverFixtureRows = [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
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
