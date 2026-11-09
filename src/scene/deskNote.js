// A handwritten note on the command desk, left of the keyboard (user request): it tells the
// visitor how to bring the terminal down, now that it no longer drops on its own.
// A torn notebook page: faint blue rules, a red margin line, ballpoint-blue handwriting in
// Caveat (OFL-1.1, bundled from @fontsource/caveat, so it looks the same on every machine).
import * as THREE from 'three';
import caveatUrl from '@fontsource/caveat/files/caveat-latin-600-normal.woff2?url';
import { DESK } from './layout.js';

const PAPER_W = 0.3, PAPER_H = 0.2;
const TW = 1024, TH = Math.round((TW * PAPER_H) / PAPER_W);
const LINES = [
  { text: 'Note to Mainframe Operators:', size: 104, underline: true },
  { text: 'For terminal control,', size: 112 },
  { text: 'press Q on the keyboard.', size: 112, circleQ: true },
];

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function draw(canvas, fontReady) {
  const ctx = canvas.getContext('2d');
  const rnd = seeded(7);
  // Paper with a little tone variation and a soft crease.
  ctx.fillStyle = '#f3eedf';
  ctx.fillRect(0, 0, TW, TH);
  const tone = ctx.createLinearGradient(0, 0, TW, TH);
  tone.addColorStop(0, 'rgba(255,255,255,0.35)');
  tone.addColorStop(1, 'rgba(180,165,130,0.18)');
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = 'rgba(120,100,70,0.06)';
  ctx.fillRect(TW * 0.55, 0, 3, TH); // fold crease
  // Rules and margin.
  ctx.strokeStyle = 'rgba(90,130,190,0.35)';
  ctx.lineWidth = 2;
  for (let y = 170; y < TH - 20; y += 160) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TW, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200,70,70,0.45)';
  ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(96, TH); ctx.stroke();
  // Torn top edge (perforation stubs from a spiral pad).
  ctx.fillStyle = '#d9d2c0';
  for (let x = 0; x < TW; x += 6) ctx.fillRect(x, 0, 6, 4 + rnd() * 9);

  // Handwriting.
  const family = fontReady ? '"Caveat Note"' : 'cursive';
  ctx.fillStyle = '#1f3a8a';
  ctx.strokeStyle = '#1f3a8a';
  ctx.textBaseline = 'alphabetic';
  let y = 154;
  for (let line of LINES) {
    ctx.save();
    const x = 120 + rnd() * 14;
    ctx.translate(x, y);
    ctx.rotate((rnd() - 0.5) * 0.035);
    // Shrink to fit the page width if this machine's fallback font runs wide.
    let size = line.size;
    ctx.font = `600 ${size}px ${family}, cursive`;
    const room = TW - x - 36;
    if (ctx.measureText(line.text).width > room) {
      size = Math.floor((size * room) / ctx.measureText(line.text).width);
      ctx.font = `600 ${size}px ${family}, cursive`;
    }
    line = { ...line, size };
    ctx.fillText(line.text, 0, 0);
    const w = ctx.measureText(line.text).width;
    if (line.underline) { // a quick, slightly wavy underline
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-4, 14);
      ctx.bezierCurveTo(w * 0.3, 8, w * 0.7, 22, w + 6, 12);
      ctx.stroke();
    }
    if (line.circleQ) { // circle the Q
      const pre = ctx.measureText('press ').width;
      const qw = ctx.measureText('Q').width;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(pre + qw / 2, -line.size * 0.3, qw * 0.95, line.size * 0.5, -0.12, 0.2, Math.PI * 2.1);
      ctx.stroke();
    }
    ctx.restore();
    y += 160;
  }
}

export function buildDeskNote() {
  const canvas = document.createElement('canvas');
  canvas.width = TW;
  canvas.height = TH;
  draw(canvas, false);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
  mat.shadowSide = THREE.FrontSide;
  // A very slight curl so it doesn't look like a decal.
  const geom = new THREE.PlaneGeometry(PAPER_W, PAPER_H, 12, 6);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (PAPER_W / 2);
    const v = pos.getY(i) / (PAPER_H / 2);
    pos.setZ(i, 0.0025 * (u * u) + 0.0015 * Math.max(0, v) ** 2);
  }
  geom.computeVertexNormals();
  const note = new THREE.Mesh(geom, mat);
  note.name = 'deskNote';
  note.rotation.set(-Math.PI / 2, 0, 0.13); // flat on the desk, turned a little
  note.position.set(-0.6, DESK.top + 0.0015, DESK.z + 0.22);
  note.receiveShadow = true;

  // Redraw once the bundled handwriting font is ready.
  const face = new FontFace('Caveat Note', `url(${caveatUrl})`, { weight: '600' });
  face.load().then((f) => {
    document.fonts.add(f);
    draw(canvas, true);
    tex.needsUpdate = true;
  }).catch(() => { /* keep the generic cursive fallback */ });
  return note;
}
