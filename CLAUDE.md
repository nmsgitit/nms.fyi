# nms.fyi: working notes for Claude

The user's personal/professional site at **nms.fyi**. When it opens, the visitor walks
(first person, scripted, no controls) into a 1980s retro-futurist **command room**
toward a desk at a glass wall overlooking a dark **server room**. A monitor drops
from the ceiling while the server room powers up around a central **supercomputer**.
The monitor boots "NMS FYI OS", and pressing **E** focuses it full screen to use a
mock operating system with an XP-style desktop.

Read this whole file before working. Update it whenever decisions change.
`docs/references.md` holds the detailed reference breakdowns (MODUS reveal timing,
Apollo Core styling) and must be read before visual work.

---

## The user's brief (verbatim intent, condensed)

1. **Command room**, 3D rendered. One wall is a window overlooking a server room.
   Lit by **old-fluorescent white light** (the user asked for warmer than sterile
   white, "light that might come from an older fluorescent"). Surface palette:
   sterile white, light gray, and 1980s **taupe/beige** across BOTH rooms.
2. **Camera walks** (bobbing like a person, not hovering) from the command-room
   entrance to front-center at the glass, with **footstep** sounds.
3. A **command desk** at front-center with a **keyboard**: a **standard QWERTY layout with a numpad**
   (built as a 1985 IBM Model M-style 101-key board: F-row, nav cluster, arrows, numpad,
   two-tone beige/taupe caps, lock lights, no Windows keys, which suits the period).
4. As the user approaches, an **overhead data-terminal monitor lowers from the
   ceiling**. Its casing should be **more bulbous than the Apollo Core terminal**
   (which is sharp-edged).
5. **At the same time**, the dark server room comes alive. Lights first highlight the
   **supercomputer at the center**, then **about 1 s later** the rest of the room's
   lights and servers spring to life. Sound: a **breaker-flip clunk** (like MODUS)
   plus **faint server fan noise** from beyond the glass.
6. While descending, the monitor shows the **supercomputer booting**: a **boot image of
   a bronze oil lamp** (Aladdin-style genie lamp, but our own design, not Disney's)
   with **serif** text beneath: "NMS FYI OS", with "Version 1.0" on its own line below,
   slightly smaller.
7. When the monitor is fully down, after a **couple of seconds' gap**, the boot screen
   gives way to a mock OS with a **Windows XP-reminiscent desktop**.
8. Pressing **E** focuses the monitor, which takes over the full screen. An **"Exit"**
   button under the **Application Launcher** (an **oil-lamp icon**, the "start
   button") returns to the 3D view.
9. Desktop contents and apps: **to be discussed later** with the user. (They want a
   usable computer like iqbalsurya.com with professional information about them.)

Reference sites the user likes: iqbalsurya.com (usable retro desktop), hydeforce.com/museum
(Three.js 3D world). We're NOT giving movement controls like HydeForce.

**Work in stages with pauses for user feedback.** Ask before large design decisions.
The user plans a round of **change requests for sequence and design after all stages are
done**, so build each stage completely and keep a list of open design questions (below)
instead of blocking on them.

## Stage plan / status

| Stage | Content | Status |
|---|---|---|
| 0 | Reference capture, project scaffold, repo | ✅ done 2026-11-09 |
| 1 | Rough 3D version: command room, glass wall, server room, supercomputer, desk + keyboard, walking camera, palette/lighting | ✅ 2026-11-09 |
| 2 | Overhead monitor (Blender-scripted bulbous CRT .glb), ceiling hatch doors + shaft, 3-stage telescoping arm, descent synced to the walk, CRT warm-up + placeholder boot card | ✅ 2026-11-09 |
| 3 | Reveal timeline: core lights, then room ~1 s later; LED cascade; fixtures | todo (power hooks exist) |
| 4 | Sound: footsteps, breaker clunks, fan hum, monitor motor, CRT whine | todo |
| 5 | Boot screen on the monitor (oil lamp + serif title), rendered to a canvas texture | todo |
| 6 | Mock OS: XP-like desktop, lamp launcher, Exit; E to focus/fullscreen | todo; needs discussion |
| 7 | Polish: film grain, fluorescent flicker, mobile/low-GPU fallback, accessibility (skip intro, reduced motion), loading screen | todo |
| 8 | Deploy to Infomaniak Node.js hosting | todo; confirm their Node version and how they run apps |

## Tech stack

- **Three.js 0.187** (WebGLRenderer, WebGL2). Plain JS ES modules, no framework.
- **Vite 8** for dev/build. **Express 5** `server.js` serves `dist/` in production.
- Node **20.19+** (claudebox has Debian's Node 20.19.2; Vite 8 requires ^20.19 or >=22.12).
- Infomaniak hosting: Node.js app running `npm start` after `npm run build`.
  Unverified: their exact Node version and deploy flow; check before stage 8.

### Commands
```bash
npm install
npm run dev        # http://127.0.0.1:5173 (claudebox shares the host network; open in Brave)
npm run build      # -> dist/
npm start          # serves dist/ on $PORT (default 3000)
```

### URL flags (development)
- `?skip`: start at the desk, no gate, no walk.
- `?lit`: server room fully powered (preview the layout).
- `?debug`: orbit camera + HUD (fps, draw calls, camera position).
- Keys: **L** toggles server power, **R** restarts the walk, **M** replays the monitor drop, **O** orbit cam, **H** HUD.
- In dev, `window.scene/camera/renderer/walk/setLit/power/applyPower/leds/monitor` are exposed.
- Screenshots stall rAF in the Claude-in-Chrome tab, so wall-clock timing checks are unreliable there.
  Freeze and step instead: set `walk.state='idle'`, call `walk.apply(t)`, and `monitor.state='frozen'; monitor.apply(t)`.

## Code map

```
index.html            canvas + click-to-enter gate (needed so audio can start) + debug HUD
server.js             Express production server (static dist/, SPA fallback, /healthz)
src/main.js           renderer, scene assembly, glass env capture, power levels, bloom, loop
src/debug.js          URL flags, orbit camera, HUD, keys
src/style.css
src/camera/walk.js    scripted first-person walk: speed profile, head bob/sway/roll, 'step' events
src/scene/layout.js   ALL world dimensions/positions (edit here first)
src/scene/palette.js  colors (surfaces, light colors, LED colors)
src/scene/materials.js shared materials + procedural canvas textures (grain, floor tiles, mat ribs)
src/scene/builder.js  Builder: merges primitives per material -> few draw calls (box/span/rbox/add)
src/scene/leds.js     LedField: every indicator LED as one InstancedMesh; groups, cascades, blink
src/scene/commandRoom.js  room geometry + command-room lights
src/scene/desk.js     command desk, side wings, button decks, indicator row; places the keyboard
src/scene/keyboard.js full-size Model M-style QWERTY + nav cluster + numpad (layout table -> keycaps + one legend decal)
src/scene/serverRoom.js   hall shell, window surround, trusses, fixtures, catwalks, data banks, racks, room lights
src/scene/monitor.js  MonitorRig: hatch doors, shaft, telescoping arm, loads public/models/monitor.glb, descent timeline
src/scene/screen.js   MonitorScreen: canvas -> emissive CanvasTexture (off / CRT warm-up / boot card; stage 5-6 extend)
tools/blender/monitor.py  Blender script that builds + exports the monitor (and renders previews)
public/models/monitor.glb generated, committed (~0.55 MB) so the repo deploys as-is
src/scene/supercomputer.js original supercomputer (dais, C-ring cabinets, bench, lathe core, bands, face panel) + core lights
docs/references.md    written notes on the reference videos (timeline, style)
reference/            (gitignored) extracted frames, contact sheets, spectrogram
```

### World layout (meters, see layout.js)
- +x right, +y up, camera looks toward -z.
- Command room: x -5..5, z 0..8, height 3.2. Glass wall at front: bottom edge y 0.95 at z 0,
  top edge y 3.2 at z -0.6 (tilts outward). Mullions at x ±1.8 keep the center pane clear.
- Corridor behind the back-wall door: z 8.2..12. The walk starts at z 10.4.
- Server room: floor y -4.5, ceiling y 9, x -16..16, z -28..-0.6. Catwalks at y -1.0.
- Supercomputer center (0, -14). Desk center z 1.15, top 0.78. Ceiling hatch for the monitor
  at (0, 3.2, 1.05), 1.3 × 1.0.
- Walk ends at (0, 1.65, 2.55) looking ~9° down: keyboard at the bottom edge,
  monitor drop zone mid-low, supercomputer above it. Duration ~8.1 s, 10 footfalls.

## Lighting rules (learned the hard way)

- **RectAreaLights can't be occluded** in three.js. They light through walls and glass,
  so they would light the "dark" server room. Don't use them in the command room.
  The command room uses **shadow-casting SpotLights** whose cones are aimed and sized
  so no ray leaves through the glass (geometry is noted inline in commandRoom.js),
  plus **range-limited PointLights** (distance cutoff before the server floor ~9 m away).
- **No scene-wide environment map / hemisphere / ambient light**: they'd light the dark room.
  Only the glass gets an env map: a **CubeCamera capture of the real command room** taken
  once at load from the standing position, with HDR panels clamped during capture
  (otherwise PMREM makes a hot dot over the supercomputer). A soft glow remains low on
  the center pane; refine later (possibly a screen-space reflection or a hand-made env).
- Light colors: `PALETTE.fluorescent` (aged tube, faint green cast) for room lighting in both
  rooms, `PALETTE.lightWhite` (cool) only for the supercomputer spots so it stands out.
- Emissives that are "off" must be pure black (any small floor value shows as glowing outlines).
- Server-room power: `power.core` and `power.room` (0..1), applied by `applyPower()` in
  main.js to the light intensities (`max` values in serverRoom.js/supercomputer.js) and
  fixture/band emissive colors. LED groups: `cmd`, `desk` (on from start), `core`, `banks`,
  `racks` (off until the reveal). `leds.setGroup(name, on, time, cascade)` cascades
  by each LED's `delay`.
- Bloom: UnrealBloom strength 0.38, radius 0.5, threshold 0.95. Tone mapping is ACES via OutputPass.

## Performance baseline
2026-11-09, user's machine in Brave (WebGL2, no WebGPU): **180 fps at 2560×1223**, pixel ratio 1,
41 geometries, 29 textures, 3,305 LEDs in one instanced draw. Bundle is ~270 kB gzip (mostly three.js).
Pixel ratio is capped at 1.5.

## Asset policy
- Procedural geometry lives in code (committed).
- For bulbous/high-poly pieces use **Blender driven by Python scripts** (user approved).
  Commit the scripts (`tools/blender/*.py`). Commit small generated `.glb`s (< ~2 MB) to
  `public/models/` so the site deploys from the repo. Keep big sources, previews and `.blend`
  files in `assets-src/` (gitignored).
- **Blender 5.2.2 is RPM-layered on the host** (the user wants to inspect models themselves).
  Run it from claudebox:
  ```bash
  distrobox-host-exec blender -b --factory-startup -P "$PWD/tools/blender/monitor.py" -- \
      --out "$PWD/public/models/monitor.glb" --preview "$PWD/assets-src/previews/monitor"
  ```
  Fedora packaging bug: Blender's OCIO config (v2.5) is newer than Fedora's OpenColorIO (2.4),
  so only the "Standard" view transform exists (no AgX/Filmic). Scripts must fall back. Exports are unaffected.
  `distrobox-host-exec` does NOT forward stdin (no heredocs into host commands).
- Monitor model contract: origin = arm attachment; the `Tilt` empty sits at the hub axis (the site
  rotates `Tilt.x`); material names `housing, bezel, grille, screen, led, yoke, steel, knob` are remapped to
  site materials in monitor.js; the `Screen` mesh has 0..1 UVs (canvas texture needs `flipY = false`).
  Gotcha: `bmesh.ops.create_grid(calc_uvs=True)` only writes UVs if a UV layer exists first.
- Sounds: synthesize with Web Audio or use CC0 sources. **Never rip audio from the
  reference videos.** Record sources and licenses in `docs/assets.md` when added.
- Original designs only: take mood/pacing from references, never copy their models,
  logos, or layouts. The oil lamp must be our own design (not Disney's Aladdin lamp).

## Environment notes
- Claude runs in the `claudebox` distrobox (Debian 13) on a Fedora Kinoite host.
  claudebox has node/npm/git/ffmpeg (installed via apt 2026-11-09). The host's ffmpeg
  is Fedora's and can't decode H.264, so use claudebox ffmpeg for reference frames.
- View the site in the user's **Brave** with the Claude extension (Personal profile).
  It has WebGL2 (the built-in browser pane has no WebGL). Stay in Claude's own tab group.
- Git identity for this repo (local config): `nmsgitit <338382383+nmsgitit@users.noreply.github.com>`.
- GitHub: private repo `nmsgitit/nms.fyi`. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Reference material
Regenerate frames (from repo root, inside claudebox):
```bash
M="$HOME/Downloads/Fallout 76： MODUS' Introduction-xqqjKI-F2KM.mp4"
ffmpeg -ss 4 -i "$M" -t 30.5 -vf fps=1 -q:v 2 reference/modus/frames/modus_%02d.jpg
A="$HOME/Downloads/Apollo Core - Alien  Isolation-hBwreMMYcoU.mp4"
ffmpeg -ss 22 -i "$A" -t 9.5 -vf fps=2 -q:v 2 reference/apollo/frames/apollo_%02d.jpg
```
Contact sheets with timestamps are in `reference/*/sheet_*.jpg`. The terminal still is
`reference/apollo/terminal_still.webp`.

## Monitor timing (monitor.js MONITOR)
Starts when `walk.t >= walk.duration - MONITOR.total` (~4.1 s into the 8.1 s walk), so it arrives as
the walk ends. Doors open 0 to 0.9 s, the arm descends 0.55 to 3.95 s (stowed attach y 4.08 to final 1.81:
screen center ~1.40 m), screen power-on at 1.1 s, tilt to -0.17 rad over the last 40% of the drop,
then a damped spring/sway. Stage 3 will tie the server-room reveal to this same clock.

## Open design questions (for the user's change-request round)
- **Composition:** from the standing position the monitor arm lines up exactly with the supercomputer
  core column, so the monitor plus arm hide the core's center. Options: offset hatch/monitor sideways,
  shift the camera end point, lower the monitor, or redesign the core silhouette (wider top).
- The monitor first emerges above the frame (you're looking ahead). Possibly a scripted glance up as it drops.
- Fluorescent warmth/greenness, bloom strength, walk speed (8.1 s).

## Known rough edges
- A faint reflection glow stays on the center pane in the dark state.
- No sound yet (footstep events are already emitted by walk.js).
- No mobile/low-end fallback yet. WebGL2-missing shows a message on the gate.
- Supercomputer face panel sits low and is partly hidden behind the window sill from the desk.
