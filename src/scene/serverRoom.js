// The server room beyond the glass: a tall hall with tiers of data banks along the
// walls (lower tier on the floor, upper tier on a catwalk), freestanding rack rows,
// ceiling trusses with light fixtures, and the supercomputer at the center.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { SERVER, ROOM } from './layout.js';
import { PALETTE } from './palette.js';

const F = SERVER.floorY;
const C = SERVER.ceilY;
const CATWALK_Y = -1.0;

const ledColor = (r) => (r < 0.07 ? PALETTE.ledAmber : r < 0.1 ? PALETTE.ledRed : r < 0.55 ? PALETTE.ledCool : PALETTE.ledCyan);
const ledBlink = (r) => (r < 0.25 ? 0.4 + r * 6 : 0);

/** One data-bank module: rounded beige shell, recessed dark face, grid of round lights. */
function bank(b, m, leds, x, y, z, facing, group, delayBase) {
  // facing: unit vector [fx, 0, fz] the front faces
  const [fx, , fz] = facing;
  const w = 1.15, h = 2.9, d = 0.9;
  const rotY = Math.atan2(fx, fz);
  b.rbox(m.beige, w, h, d, 0.08, x, y + h / 2, z, [0, rotY, 0]);
  // recessed face
  const fxp = x + fx * (d / 2 + 0.001), fzp = z + fz * (d / 2 + 0.001);
  b.box(m.grille, w - 0.22, h - 0.5, 0.02, fxp, y + h / 2 + 0.05, fzp, [0, rotY, 0]);
  // vent band near the base
  b.box(m.taupeDark, w - 0.22, 0.16, 0.02, fxp, y + 0.2, fzp, [0, rotY, 0]);
  const right = [fz, 0, -fx];
  leds.grid([fxp + fx * 0.012, y + h / 2 + 0.1, fzp + fz * 0.012], right, [0, 1, 0], facing, 3, 6, 0.24, 0.32,
    { size: 0.045, color: ledColor, blink: ledBlink, group, delay: delayBase, intensity: 1.5 }, 0.85);
}

function rack(b, m, leds, x, z, group, delayBase) {
  // Freestanding double-sided rack running along z; fronts face ±x.
  const w = 1.0, h = 2.3, d = 0.8;
  b.rbox(m.taupe, d * 2, h, w, 0.05, x, F + h / 2, z);
  b.rbox(m.beigeLight, d * 2 + 0.06, 0.08, w + 0.06, 0.03, x, F + h + 0.04, z);
  for (const s of [-1, 1]) {
    const fx = x + s * (d + 0.001);
    b.box(m.grille, 0.02, h - 0.4, w - 0.16, fx, F + h / 2, z);
    leds.grid([fx + s * 0.012, F + h / 2, z], [0, 0, 1], [0, 1, 0], [s, 0, 0], 3, 5, 0.22, 0.3,
      { size: 0.035, color: ledColor, blink: ledBlink, group, delay: delayBase, intensity: 1.3 }, 0.8);
  }
}

export function buildServerRoom(m) {
  const b = new Builder();
  const { xMin, xMax, zMin, zMax } = SERVER;

  // ---- shell
  const floorGeom = new THREE.PlaneGeometry(xMax - xMin, zMax - zMin);
  b.add(floorGeom, m.serverFloor, [(xMin + xMax) / 2, F, (zMin + zMax) / 2], [-Math.PI / 2, 0, 0]);
  b.span(m.ceiling, xMin, xMax, C, C + 0.3, zMin, zMax);
  b.span(m.wallUpper, xMin, xMax, F, C, zMin - 0.3, zMin); // back
  b.span(m.wallUpper, xMin - 0.3, xMin, F, C, zMin, zMax); // left
  b.span(m.wallUpper, xMax, xMax + 0.3, F, C, zMin, zMax); // right
  b.span(m.wallLower, xMin, xMax, F, F + 0.6, zMin, zMin + 0.03);

  // ---- front wall (server-room side), with the command-room window opening
  const wz0 = -0.95, wz1 = ROOM.glassTopZ; // wall slab just outside the glass
  const ox0 = ROOM.xMin - 0.2, ox1 = ROOM.xMax + 0.2;
  b.span(m.wallUpper, xMin, ox0, F, C, wz0, wz1);
  b.span(m.wallUpper, ox1, xMax, F, C, wz0, wz1);
  b.span(m.wallUpper, ox0, ox1, ROOM.height + 0.1, C, wz0, wz1);
  b.span(m.wallUpper, ox0, ox1, F, ROOM.sill - 0.05, wz0, 0); // below the sill (solid)
  // Window surround seen from the server room: a chunky beige frame and exterior ledge.
  b.rbox(m.beige, ox1 - ox0 + 0.5, 0.3, 0.5, 0.08, 0, ROOM.sill - 0.17, wz0 - 0.1);
  b.rbox(m.beige, ox1 - ox0 + 0.5, 0.3, 0.4, 0.08, 0, ROOM.height + 0.25, wz0 - 0.05);
  for (const s of [-1, 1]) b.rbox(m.beige, 0.3, ROOM.height - ROOM.sill + 0.6, 0.4, 0.08, s * (ox1 + 0.1), (ROOM.sill + ROOM.height) / 2, wz0 - 0.05);

  // ---- ceiling trusses and light fixtures
  for (let z = zMax - 2.5; z > zMin + 1; z -= 3.6) {
    b.span(m.taupeDark, xMin, xMax, C - 0.75, C, z - 0.18, z + 0.18);
  }
  const fixtures = [];
  for (const x of [-11, -5.5, 5.5, 11]) {
    for (let z = zMax - 4.3; z > zMin + 2; z -= 7.2) fixtures.push([x, z]);
  }
  for (const [x, z] of fixtures) {
    b.span(m.taupe, x - 0.5, x + 0.5, C - 0.95, C - 0.75, z - 1.5, z + 1.5);
    b.span(m.serverFixture, x - 0.42, x + 0.42, C - 0.97, C - 0.95, z - 1.42, z + 1.42);
  }

  // ---- catwalks along the side walls and back wall
  const cwDepth = 2.2;
  b.span(m.taupeDark, xMin, xMin + cwDepth, CATWALK_Y - 0.12, CATWALK_Y, zMin, zMax - 0.5);
  b.span(m.taupeDark, xMax - cwDepth, xMax, CATWALK_Y - 0.12, CATWALK_Y, zMin, zMax - 0.5);
  b.span(m.taupeDark, xMin, xMax, CATWALK_Y - 0.12, CATWALK_Y, zMin, zMin + cwDepth);
  // railings
  const rail = (x0, x1, z0, z1) => {
    b.span(m.beigeLight, x0, x1, CATWALK_Y + 1.02, CATWALK_Y + 1.08, z0, z1);
    b.span(m.beigeLight, x0, x1, CATWALK_Y + 0.5, CATWALK_Y + 0.54, z0, z1);
  };
  rail(xMin + cwDepth - 0.05, xMin + cwDepth, zMin + cwDepth, zMax - 0.5);
  rail(xMax - cwDepth, xMax - cwDepth + 0.05, zMin + cwDepth, zMax - 0.5);
  rail(xMin + cwDepth, xMax - cwDepth, zMin + cwDepth - 0.05, zMin + cwDepth);
  for (let z = zMax - 0.5; z > zMin + cwDepth; z -= 1.8) {
    b.span(m.beigeLight, xMin + cwDepth - 0.05, xMin + cwDepth, CATWALK_Y, CATWALK_Y + 1.08, z - 0.03, z + 0.03);
    b.span(m.beigeLight, xMax - cwDepth, xMax - cwDepth + 0.05, CATWALK_Y, CATWALK_Y + 1.08, z - 0.03, z + 0.03);
  }
  // catwalk support columns
  for (let z = zMax - 2; z > zMin + cwDepth; z -= 5.4) {
    for (const x of [xMin + cwDepth - 0.2, xMax - cwDepth + 0.2]) b.span(m.steel, x - 0.08, x + 0.08, F, CATWALK_Y - 0.12, z - 0.08, z + 0.08);
  }

  return { builder: b };
}

export function populateServerRoom(b, m, leds) {
  const { xMin, xMax, zMin, zMax } = SERVER;
  // Data banks, two tiers. Delay values drive the cascade order in the reveal:
  // near banks first, sweeping toward the back.
  for (const tierY of [F, CATWALK_Y]) {
    const tierDelay = tierY === F ? 0 : 0.12;
    for (let z = zMax - 2.2; z > zMin + 1.6; z -= 1.25) {
      const k = (zMax - z) / (zMax - zMin);
      bank(b, m, leds, xMin + 0.5, tierY, z, [1, 0, 0], 'banks', k * 0.8 + tierDelay);
      bank(b, m, leds, xMax - 0.5, tierY, z, [-1, 0, 0], 'banks', k * 0.8 + tierDelay + 0.03);
    }
    for (let x = xMin + 2.6; x < xMax - 2.5; x += 1.25) {
      bank(b, m, leds, x, tierY, zMin + 0.5, [0, 0, 1], 'banks', 0.85 + Math.abs(x) / 60 + tierDelay);
    }
  }
  // Freestanding rack rows on the floor.
  for (const x of [-10.2, 10.2]) {
    for (let z = -5.5; z > -24; z -= 1.1) rack(b, m, leds, x, z, 'racks', (-5.5 - z) / 20);
  }
}

/** Server-room lights. All start at 0. The reveal (stage 2) raises them; debug can force them. */
export function buildServerLights(m) {
  const group = new THREE.Group();
  group.name = 'serverLights';
  const room = [];
  const white = PALETTE.fluorescent;
  for (const x of [-8.25, 8.25]) {
    for (const z of [-7.5, -20]) {
      const r = new THREE.RectAreaLight(white, 0, 6, 10);
      r.position.set(x, C - 1, z);
      r.rotation.x = -Math.PI / 2;
      group.add(r);
      room.push({ light: r, max: 2.2 });
    }
  }
  // Back-wall wash so the far data banks read.
  const back = new THREE.RectAreaLight(white, 0, 26, 3);
  back.position.set(0, C - 1.5, SERVER.zMin + 6);
  back.lookAt(0, -1, SERVER.zMin);
  group.add(back);
  room.push({ light: back, max: 1.2 });

  return { group, room, fixtures: [{ mat: m.serverFixture, max: new THREE.Color(white).multiplyScalar(2.4) }] };
}
