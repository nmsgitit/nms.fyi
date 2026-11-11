// The server room beyond the glass: a tall hall with tiers of data banks along the walls (lower
// tier on the floor, upper tier on a catwalk), ceiling trusses with light fixtures. The north end is a half-circle bay (apse) whose far wall holds the supercomputer
// (supercomputer.js); the banks and catwalks follow the curve and stop short of it.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { SERVER, ROOM, WINDOW_FOOT_Z } from './layout.js';
import { PALETTE } from './palette.js';

const F = SERVER.floorY;
const C = SERVER.ceilY;
const CATWALK_Y = -1.0;
const FRONT_WALL_Z0 = SERVER.frontWallZ; // server-room face of the wall that holds the command-room glass
const CW = 2.2; // catwalk depth
const STRINGER_Y0 = CATWALK_Y - 0.34; // underside of the steel beams carrying the catwalk decks
const LANDING_W = 4.6, LANDING_D = 2.65; // door landings at the near ends of the side catwalks
const DEG = Math.PI / 180;
// The bay: angle a from the east (+x) side, 0..180°. Point at radius r: (r cos a, zMin - r sin a).
// The banks and catwalks wrap from each side up to END_A (and 180 - END_A), which leaves several
// feet of clear wall either side of the supercomputer's wall section (90 ± SUPER_HALF_A).
export const APSE = { END_A: 52 * DEG, SUPER_HALF_A: 30 * DEG };
const AZ = SERVER.zMin;
const R = SERVER.apseR;
const arcPt = (r, a) => [r * Math.cos(a), AZ - r * Math.sin(a)];

const ledColor = (r) => (r < 0.07 ? PALETTE.ledAmber : r < 0.1 ? PALETTE.ledRed : r < 0.55 ? PALETTE.ledCool : PALETTE.ledCyan);
const ledBlink = (r) => (r < 0.25 ? 0.4 + r * 6 : 0);

/** Annular sector (r0..r1, angles a0..a1) as a horizontal slab, top at yTop. */
function ringSlab(b, mat, r0, r1, a0, a1, yTop, thick) {
  const sh = new THREE.Shape();
  const N = Math.max(6, Math.ceil(((a1 - a0) / DEG) / 3));
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    i === 0 ? sh.moveTo(r1 * Math.cos(a), r1 * Math.sin(a)) : sh.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
  }
  for (let i = N; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / N;
    sh.lineTo(r0 * Math.cos(a), r0 * Math.sin(a));
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
  // Shape y -> world -z, extrusion -> world +y.
  b.add(g, mat, [0, yTop - thick, AZ], [-Math.PI / 2, 0, 0]);
}

/** Thin piece following the arc at radius r (chord boxes), from a0 to a1. */
function arcStrip(b, mat, r, a0, a1, y0, y1, depth, segDeg = 3.75) {
  const n = Math.max(1, Math.ceil((a1 - a0) / (segDeg * DEG)));
  const da = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const a = a0 + da * (i + 0.5);
    const [x, z] = arcPt(r, a);
    const len = 2 * r * Math.sin(da / 2) + 0.02;
    b.box(mat, len, y1 - y0, depth, x, (y0 + y1) / 2, z, [0, a - Math.PI / 2, 0]); // local x along the tangent
  }
}

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
  // Every bank has the same even grid (4 × 8, equal spacing both ways); about one in six positions is a
  // dead indicator that never lights (its lens still shows), for realism.
  leds.grid([fxp + fx * 0.012, y + h / 2 + 0.1, fzp + fz * 0.012], right, [0, 1, 0], facing, 4, 8, 0.2, 0.2,
    { size: 0.04, color: ledColor, blink: ledBlink, group, delay: delayBase, intensity: 1.5, dead: 'lens' }, 0.84);
}

export function buildServerRoom(m) {
  const b = new Builder();
  const { xMin, xMax, zMin, zMax, zBack } = SERVER;

  // ---- shell: one floor and ceiling over the hall and the bay (the corners outside the curved
  // wall are never seen), side walls, the curved bay wall.
  // The floor runs on into the recess under the window (to WINDOW_FOOT_Z); its UVs are stretched with it so the
  // tile size (texture repeat set for zMax - zBack) doesn't change.
  const floorZ1 = WINDOW_FOOT_Z;
  const floorGeom = new THREE.PlaneGeometry(xMax - xMin, floorZ1 - zBack);
  const uv = floorGeom.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * ((floorZ1 - zBack) / (zMax - zBack)));
  b.add(floorGeom, m.serverFloor, [(xMin + xMax) / 2, F, (zBack + floorZ1) / 2], [-Math.PI / 2, 0, 0]);
  b.span(m.serverCeiling, xMin, xMax, C, C + 0.3, zBack - 0.4, zMax); // anthracite, follows the room power (reveal)
  b.span(m.wallUpper, xMin - 0.3, xMin, F, C, zMin, zMax); // left
  b.span(m.wallUpper, xMax, xMax + 0.3, F, C, zMin, zMax); // right
  arcStrip(b, m.wallUpper, R + 0.15, 0, Math.PI, F, C, 0.3, 2.5); // the bay wall
  arcStrip(b, m.wallLower, R - 0.015, 0, Math.PI, F, F + 0.6, 0.03, 2.5); // its lower band

  // ---- front wall (server-room side) with the command-room window as a sloped bay (user: an angled pane should join
  // two walls in different places, not two points of one thick wall). The upper wall's face is at the glass's head
  // (z -0.6); the wall under the window is set back to its foot (WINDOW_FOOT_Z), leaving a recess below the glass; the
  // command room's side walls close the bay as wedge-shaped cheeks and, below its floor, as the recess's sides.
  const wz0 = FRONT_WALL_Z0, wz1 = wz0 + 0.35; // wall slab behind the face
  const ox0 = ROOM.xMin - 0.2, ox1 = ROOM.xMax + 0.2; // the command room's outer shell
  b.span(m.wallUpper, xMin, ox0, F, C, wz0, wz1);
  b.span(m.wallUpper, ox1, xMax, F, C, wz0, wz1);
  b.span(m.wallUpper, ox0, ox1, ROOM.height + 0.1, C, wz0, wz1); // above the command room's ceiling slab
  b.span(m.wallUpper, ox0, ox1, F, ROOM.sill - 0.03, WINDOW_FOOT_Z, 0.02); // under the glass (its rail sits on top)
  for (const [x0, x1] of [[ox0, ROOM.xMin], [ROOM.xMax, ox1]]) b.span(m.wallUpper, x0, x1, F, 0, wz0, WINDOW_FOOT_Z); // recess sides

  // ---- ceiling trusses (evenly spaced, one over each fixture row and one between) and fixtures
  // Beams (user: lights crossing under beams made no sense): one running the length of the hall over each column of
  // fixtures, so every fixture hangs under its beam running the same way, plus cross beams only BETWEEN fixture rows
  // and an edge beam where the hall meets the bay (the bay's radial beams start on it).
  for (const x of FIX_X) b.span(m.serverBeam, x - 0.18, x + 0.18, C - 0.75, C, zMin - 0.18, wz0);
  for (const z of CROSS_Z) b.span(m.serverBeam, xMin, xMax, C - 0.75, C, z - 0.18, z + 0.18);
  // The bay: radial beams, and on each side a ring beam over the catwalk carrying a curved strip
  // fixture. Both stop at the 58° radial beam, short of the supercomputer, which has its own
  // lights (ceiling ring light, collar downlights, key spot, wall washes) and no fluorescents.
  // (The old full-circle ring beam also ran straight through the core's ceiling collar.)
  for (const a of [28, 58, 122, 152]) {
    const [x, z] = arcPt(R / 2, a * DEG);
    b.box(m.serverBeam, R, 0.75, 0.3, x, C - 0.375, z, [0, a * DEG, 0]); // local x along the radius
  }
  for (const [a0, a1] of BAY_STRIPS) {
    arcStrip(b, m.serverBeam, BAY_RING_R, a0 - 2 * DEG, a1 + 2 * DEG, C - 0.75, C, 0.36, 3);
    arcStrip(b, m.serverBeam, BAY_RING_R, a0, a1, C - 0.95, C - 0.75, 0.5, 3);
    arcStrip(b, m.serverBayStrip, BAY_RING_R, a0 + 0.3 * DEG, a1 - 0.3 * DEG, C - 0.97, C - 0.95, 0.42, 3);
    // Light grey frame around the strip: both long edges and end caps, overlapping the diffuser by 3 cm and hanging
    // below the light plane (see FRAME_* below).
    for (const dr of [-0.23, 0.23]) arcStrip(b, m.fixtureFrame, BAY_RING_R + dr, a0, a1, FRAME_Y0, FRAME_Y1, 0.1, 3);
    for (const a of [a0, a1]) {
      const [x, z] = arcPt(BAY_RING_R, a);
      b.box(m.fixtureFrame, 0.56, FRAME_Y1 - FRAME_Y0, 0.1, x, (FRAME_Y0 + FRAME_Y1) / 2, z, [0, a, 0]); // local x along the radius
    }
  }
  for (const [x, z, row] of FIXTURES) {
    b.add(HOUSING, m.serverBeam, [x, C - 0.95, z]); // housing, flowing up into its beam
    b.span(m.serverFixtureRows[row], x - 0.42, x + 0.42, C - 0.97, C - 0.95, z - 1.42, z + 1.42);
    // Light grey frame ring around the diffuser: overlaps it by 3 cm, overhangs the housing by 3 cm, and hangs below the
    // area light's plane, so no lit sliver shows outside it (user: light looked like it spilled past the frames).
    const i = 0.39, o = 0.53, zi = 1.39, zo = 1.53;
    b.span(m.fixtureFrame, x - o, x + o, FRAME_Y0, FRAME_Y1, z - zo, z - zi);
    b.span(m.fixtureFrame, x - o, x + o, FRAME_Y0, FRAME_Y1, z + zi, z + zo);
    b.span(m.fixtureFrame, x - o, x - i, FRAME_Y0, FRAME_Y1, z - zi, z + zi);
    b.span(m.fixtureFrame, x + i, x + o, FRAME_Y0, FRAME_Y1, z - zi, z + zi);
  }

  // ---- catwalks: along both side walls, around the bay (stopping short of the supercomputer),
  // and widening into a landing at the near end of each side, where the catwalk doors are.
  const deck = m.taupeDark;
  const rail = m.beigeLight;
  const post = (x, z) => b.span(rail, x - 0.03, x + 0.03, CATWALK_Y, CATWALK_Y + 1.08, z - 0.03, z + 0.03);
  const railX = (x, z0, z1) => { // rails running along z at x
    b.span(rail, x - 0.025, x + 0.025, CATWALK_Y + 1.02, CATWALK_Y + 1.08, z0, z1);
    b.span(rail, x - 0.02, x + 0.02, CATWALK_Y + 0.5, CATWALK_Y + 0.54, z0, z1);
    const n = Math.max(1, Math.round((z1 - z0) / 1.8));
    for (let i = 0; i <= n; i++) post(x, z0 + ((z1 - z0) * i) / n);
  };
  const railZ = (z, x0, x1) => { // rails running along x at z
    b.span(rail, x0, x1, CATWALK_Y + 1.02, CATWALK_Y + 1.08, z - 0.025, z + 0.025);
    b.span(rail, x0, x1, CATWALK_Y + 0.5, CATWALK_Y + 0.54, z - 0.02, z + 0.02);
    post(x0, z); post(x1, z);
  };
  const landZ = wz0 - LANDING_D;
  for (const s of [-1, 1]) {
    const wall = s < 0 ? xMin : xMax;
    const inner = wall - s * CW, outer = wall - s * LANDING_W;
    const [ax0, ax1] = [Math.min(wall, inner), Math.max(wall, inner)];
    b.span(deck, ax0, ax1, CATWALK_Y - 0.12, CATWALK_Y, zMin, landZ); // side run
    const [lx0, lx1] = [Math.min(wall, outer), Math.max(wall, outer)];
    b.span(deck, lx0, lx1, CATWALK_Y - 0.12, CATWALK_Y, landZ, wz0); // landing
    railX(inner, zMin, landZ);
    railX(outer, landZ, wz0);
    railZ(landZ, Math.min(inner, outer), Math.max(inner, outer));
    // Supports: a steel stringer beam under each open edge, carried by columns standing under it
    // (columns run from the floor up into the beam, so they visibly hold the deck).
    const sx = inner + s * 0.2, ox = outer + s * 0.2;
    b.span(m.steel, sx - 0.1, sx + 0.1, STRINGER_Y0, CATWALK_Y - 0.12, zMin, landZ + 0.1); // side run
    b.span(m.steel, ox - 0.1, ox + 0.1, STRINGER_Y0, CATWALK_Y - 0.12, landZ + 0.1, wz0); // landing edge
    b.span(m.steel, Math.min(sx, ox) - 0.1, Math.max(sx, ox) + 0.1, STRINGER_Y0, CATWALK_Y - 0.12, landZ + 0.1, landZ + 0.3); // landing back
    for (let z = landZ - 1.5; z > zMin; z -= 5.4) b.span(m.steel, sx - 0.08, sx + 0.08, F, STRINGER_Y0, z - 0.08, z + 0.08);
    b.span(m.steel, ox - 0.08, ox + 0.08, F, STRINGER_Y0, landZ + 0.12, landZ + 0.28);
  }
  // Around the bay, both sides.
  for (const [a0, a1] of [[0, APSE.END_A], [Math.PI - APSE.END_A, Math.PI]]) {
    ringSlab(b, deck, R - CW, R, a0, a1, CATWALK_Y, 0.12);
    arcStrip(b, rail, R - CW + 0.025, a0, a1, CATWALK_Y + 1.02, CATWALK_Y + 1.08, 0.05);
    arcStrip(b, rail, R - CW + 0.025, a0, a1, CATWALK_Y + 0.5, CATWALK_Y + 0.54, 0.04);
    const n = Math.round(((a1 - a0) * (R - CW)) / 1.8);
    for (let i = 0; i <= n; i++) post(...arcPt(R - CW + 0.025, a0 + ((a1 - a0) * i) / n));
    // End rail across the catwalk where it stops.
    const aEnd = a0 === 0 ? a1 : a0;
    const [x0, z0] = arcPt(R - CW, aEnd), [x1, z1] = arcPt(R, aEnd);
    for (const y of [1.05, 0.52]) b.box(rail, CW, 0.05, 0.05, (x0 + x1) / 2, CATWALK_Y + y, (z0 + z1) / 2, [0, aEnd, 0]);
    // Stringer under the inner edge and columns under it (inside the deck: it starts at R - CW;
    // the columns used to stand 0.2 m outside it, holding nothing).
    arcStrip(b, m.steel, R - CW + 0.2, a0, a1, STRINGER_Y0, CATWALK_Y - 0.12, 0.2, 3);
    for (let i = 1; i < 5; i++) {
      const [sx, sz] = arcPt(R - CW + 0.2, a0 + ((a1 - a0) * i) / 5);
      b.span(m.steel, sx - 0.08, sx + 0.08, F, STRINGER_Y0, sz - 0.08, sz + 0.08);
    }
  }

  return { builder: b };
}

// Hall fixtures on an even grid: 5 columns 6 m apart, 4 rows 6.8 m apart (row index = reveal
// order, nearest the window first). Trusses run over each row and midway. The bay gets curved
// strips over its catwalks instead of rectangular panels (they didn't fit the round end).
const ROW_Z = [-4.6, -11.4, -18.2, -25.0];
const FIX_X = [-12, -6, 0, 6, 12]; // fixture columns = the lengthwise beams
// Fixture frames run from the housing's underside (C - 0.95) to C - 1.01; the area lights sit just below them (C - 1.02).
// (The lights used to sit at C - 0.98, inside the frames' height, which lit a bright sliver on the frames' outer sides.)
const FRAME_Y0 = C - 1.01, FRAME_Y1 = C - 0.95, LIGHT_Y = C - 1.02;
const CROSS_Z = [-8.0, -14.8, -21.6, SERVER.zMin]; // cross beams midway between rows, and the hall/bay edge beam
const FIXTURES = ROW_Z.flatMap((z, row) => FIX_X.map((x) => [x, z, row]));
// Fixture housing cross-section (user: the frames didn't attach to the beams convincingly): a 1 m wide, 8 cm deep body
// whose sides sweep up in concave coves (r 0.32) into the 0.36 m beam's sides, meeting them 0.2 m above its bottom.
// Extruded along the fixture (3 m, along z). Origin: bottom center.
const HOUSING = (() => {
  const W = 0.5, BW = 0.18, LIP = 0.08, R = W - BW;
  const s = new THREE.Shape();
  s.moveTo(-W, 0);
  s.lineTo(W, 0);
  s.lineTo(W, LIP);
  s.absarc(W, LIP + R, R, -Math.PI / 2, -Math.PI, true); // concave cove up to the beam's right side
  s.lineTo(-BW, LIP + R);
  s.absarc(-W, LIP + R, R, 0, -Math.PI / 2, true); // and the left
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 3.0, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -1.5);
  return g;
})();
const BAY_RING_R = 13.4; // over the catwalks' inner edge
const BAY_STRIPS = [[5 * DEG, 50 * DEG], [130 * DEG, 175 * DEG]];

export function populateServerRoom(b, m, leds) {
  const { xMin, xMax, zMin, zMax } = SERVER;
  // Data banks, two tiers. Delay values drive the cascade order in the reveal:
  // near banks first, sweeping toward the back.
  for (const tierY of [F, CATWALK_Y]) {
    const tierDelay = tierY === F ? 0 : 0.12;
    for (let z = zMax - 2.2; z > zMin + 0.6; z -= 1.25) {
      const k = (zMax - z) / 44;
      bank(b, m, leds, xMin + 0.5, tierY, z, [1, 0, 0], 'banks', k * 0.8 + tierDelay);
      bank(b, m, leds, xMax - 0.5, tierY, z, [-1, 0, 0], 'banks', k * 0.8 + tierDelay + 0.03);
    }
    // Around the bay, facing its center, up to a few feet short of the supercomputer.
    const step = 1.25 / (R - 0.5);
    const half = 0.6 / (R - 0.5);
    for (let a = 0.02 + half; a <= APSE.END_A - half; a += step) {
      for (const side of [1, -1]) {
        const ang = side > 0 ? a : Math.PI - a;
        const [x, z] = arcPt(R - 0.5, ang);
        const k = (zMax - z) / 44;
        bank(b, m, leds, x, tierY, z, [-Math.cos(ang), 0, Math.sin(ang)], 'banks', k * 0.8 + tierDelay + (side > 0 ? 0.03 : 0));
      }
    }
  }
  // (The two freestanding rack rows in the middle of the hall were removed at the user's request:
  // only the banks along the walls and around the bay remain.)
}

/**
 * Closed prop doors in the entry door's style on the server-room face of the glass wall: one on each
 * catwalk landing and one on the floor below each of those, well clear of the data banks along the side walls and of the window
 * surround: the way people would reach the catwalks. Returns the doors (add their .group).
 */
export function addCatwalkDoors(m, b, HydraulicDoor) {
  const { xMin, xMax } = SERVER;
  const wallFace = FRONT_WALL_Z0;
  const doors = [];
  for (const s of [-1, 1]) {
    const x = s > 0 ? xMax - 3.3 : xMin + 3.3; // centered between the side-wall banks and the landing rail
    const d = new HydraulicDoor(m, { signs: false });
    d.group.position.set(x, CATWALK_Y, wallFace - 0.06); // panel just proud of the wall face
    d.group.rotation.y = Math.PI; // its front faces into the server room
    d.group.name = 'catwalkDoor';
    doors.push(d);
    // Landing plinth under the door: hides the frame's lower band below the deck.
    b.span(m.taupeDark, x - 1.0, x + 1.0, CATWALK_Y - 0.36, CATWALK_Y - 0.12, wallFace - 0.36, wallFace);
    // And a door on the floor level right below it, under the landing (user): the ground-floor way in.
    const g = new HydraulicDoor(m, { signs: false });
    g.group.position.set(x, F, wallFace - 0.06);
    g.group.rotation.y = Math.PI;
    g.group.name = 'serverFloorDoor';
    doors.push(g);
  }
  return doors;
}

/** Server-room lights. All start at 0. The reveal raises them; debug can force them. */
export function buildServerLights(m) {
  const group = new THREE.Group();
  group.name = 'serverLights';
  const room = [];
  const white = PALETTE.fluorescent;
  // The light comes from where the fixtures are: one area light under each fixture row (spanning
  // its five panels), striking with that row in the reveal...
  ROW_Z.forEach((z, row) => {
    const r = new THREE.RectAreaLight(white, 0, 25, 3);
    r.position.set(0, LIGHT_Y, z);
    r.rotation.x = -Math.PI / 2;
    group.add(r);
    room.push({ light: r, max: 1.7, row });
  });
  // ...and one under each curved bay strip, along its chord (strikes with the last row).
  for (const [a0, a1] of BAY_STRIPS) {
    const ac = (a0 + a1) / 2;
    const chord = 2 * BAY_RING_R * Math.sin((a1 - a0) / 2);
    const r = new THREE.RectAreaLight(white, 0, chord, 2.4);
    const [x, z] = arcPt(BAY_RING_R * Math.cos((a1 - a0) / 2), ac);
    r.position.set(x, LIGHT_Y, z);
    r.rotation.order = 'YXZ';
    r.rotation.set(-Math.PI / 2, ac - Math.PI / 2, 0); // face down, width along the chord
    group.add(r);
    room.push({ light: r, max: 2.4, row: 3 });
  }

  // Fixture faces: diffuser texture, so a lower level than the old flat white (2.4) reads as lit
  // without glaring (user: same treatment as the command-room panels).
  const fixtureMax = new THREE.Color(white).multiplyScalar(1.3);
  const fixtures = m.serverFixtureRows.map((mat, row) => ({ mat, max: fixtureMax, row }));
  fixtures.push({ mat: m.serverBayStrip, max: fixtureMax, row: 3 });
  // The ceiling: no light reaches it (the area lights face down), so it was pure black. It's an anthracite
  // surface that comes up with the first fixture row (user: dark gray, not total black).
  fixtures.push({ mat: m.serverCeiling, max: new THREE.Color(0x232323), row: 0 }); // #232323 (user)
  // Beams and fixture housings: a couple of shades darker than the ceiling (they were pure black too).
  fixtures.push({ mat: m.serverBeam, max: new THREE.Color(0x1a1a1a), row: 0 }); // #1A1A1A (user)
  // Fixture frames: light grey (user), shaded like the beams so they always read as light grey rather than unlit-dark.
  fixtures.push({ mat: m.fixtureFrame, max: new THREE.Color(0xdcdbd7), row: 0 });
  return { group, room, fixtures };
}
