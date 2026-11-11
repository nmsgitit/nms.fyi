// World layout (meters). +x right, +y up, the camera looks toward -z.
// The command room spans z 0..8. The glass wall is at its front (z ~ 0), tilted outward
// at the top. The server room lies beyond the glass with its floor well below the
// command room, so the command room overlooks it.

export const ROOM = {
  xMin: -5, xMax: 5,
  zFront: 0, zBack: 8,
  height: 3.2,
  sill: 0.95, // bottom edge of the glass
  glassTopZ: -0.6, // the glass leans outward 0.6 m at the top
};

// Corridor is as tall as the room so the sign fits above the (lower) hydraulic door.
export const CORRIDOR = { halfW: 1.2, height: 3.5, zStart: 8.2, zEnd: 12 };
// Entrance door (door.js, Alien: Isolation-style octagonal panel in a chamfered frame) in the back wall at z 8.1.
export const DOOR = { halfW: 0.65, height: 2.1, z: 8.1, chamfer: 0.3, frameHalfW: 0.95, frameHeight: 2.4 }; // frame band 0.3 m all round

// Server-room face of the wall under the command-room window: flush with the front of the glass's bottom rail.
export const WINDOW_FOOT_Z = -0.09;
export const SERVER = {
  floorY: -4.5,
  ceilY: 5.5, // lowered from 9 at the user's request (10 m tall hall)
  xMin: -16, xMax: 16,
  zMin: -28, zMax: ROOM.glassTopZ, // rectangular hall
  // Server-room face of the wall above and beside the window = the glass's top edge (ROOM.glassTopZ), so the sloped glass
  // runs from the recessed wall under it (at its foot, WINDOW_FOOT_Z) up to this wall (at its head): a sloped window bay.
  frontWallZ: -0.6,
  // The north end is a half-circle bay (user request): centered on the hall's back line, as wide
  // as the hall, so it reaches 16 m further north. The supercomputer is set into its far wall.
  apseR: 16,
  zBack: -44, // zMin - apseR
};

export const DESK = { z: 1.15, top: 0.78, width: 2.8 };
export const HATCH = { x: 0, z: 1.05, w: 1.3, d: 1.0 }; // ceiling hatch the monitor will drop from (stage 2)

export const CORE = { x: 0, z: -36.8 }; // supercomputer center: moved forward so its pedestal (r 6.1) clears the wall towers (fronts at z -43.2) by 0.3 m

export const EYE_HEIGHT = 1.65;

// Camera walk: from the corridor, through the door, to the desk.
export const WALK = {
  start: [0, EYE_HEIGHT, 11.2], // back in the corridor, facing the hydraulic door and its sign
  end: [0, EYE_HEIGHT, 2.55],
  lookStart: [0, 2.0, 5], // slightly up, so the sign above the door is in view
  lookEnd: [0, 0.85, -2.5], // ~9° down: keyboard at the bottom edge, monitor drop zone mid-low, core above
  speed: 1.0, // m/s cruising, slow deliberate walk (timed so the door slam, hatch and breakers stay apart)
  stepLength: 0.72,
};
