# nms.fyi: working notes for Claude

The user's personal/professional site at **nms.fyi**. When it opens, the visitor walks
(first person, scripted, no controls) into a 1980s retro-futurist **command room**
toward a desk at a glass wall overlooking a dark **server room**. A monitor drops
from the ceiling while the server room powers up around a central **supercomputer**.
The monitor boots "LAMPLIGHT OS", and pressing **E** focuses it full screen to use a
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
3. A **command desk** at front-center with a **keyboard** (NO side wings / button sets: the user
   asked to remove the Apollo-style left and right button decks on 2026-11-09): a **standard QWERTY layout with a numpad**
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
   **with a flame coming out of the spout** (part of the logo, needn't animate), drawn
   **simple, like 1980s computer graphics, NOT a modern render** (user feedback: we use
   low-res pixel art, a limited flat palette, a 1 px outline, no gradients),
   with **serif** text beneath: "LAMPLIGHT OS" (renamed from "NMS FYI OS" by the user), with "Version 1.0" on its own line below,
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
| 3 | Server-room power-up on the monitor clock: breaker 1 core (spots, ring, climbing bands, core LEDs), breaker 2 ~1.15 s later room (surge dip, fluorescent row strikes, bank/rack LED cascades) | ✅ 2026-11-09 |
| 4 | Procedural Web Audio sound (audio/sound.js): footsteps, room tone, hatch + arm motor + arrival, CRT power-on, two breakers, tube strikes, transformer hum, faint fans behind glass; mute button | ✅ 2026-11-09 (not yet heard by the user) |
| 5 | Boot screen on the monitor: 1980s pixel-art bronze oil lamp with a lit flame (lamp.js), serif title, progress bar | ✅ 2026-11-09 (the boot to OS hand-off comes in stage 6) |
| 6 | LAMPLIGHT OS shell: boot to desktop 2 s after the monitor lands (+ startup chime), HTML desktop (XP-reminiscent, original), lamp launcher + Exit, window manager, E / click / tap focus with camera glide, 3D pause while open | ✅ shell 2026-11-09. **Content: placeholders; waiting on the user** |
| 6b | Full/Light chooser + lazy 3D, mobile spin, Security Cameras app, LED signs (change round 6) | ✅ 2026-11-09 |
| 7 | Polish: film grain, fluorescent flicker, mobile/low-GPU fallback, accessibility (skip intro, reduced motion), loading screen | todo |
| 8 | Deploy to Infomaniak Node.js hosting | upload bundle prepared 2026-11-10 (see Deploy); user uploads via FileZilla |

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
- `?full`, `?light`, `?mobile`: force a version (skip the chooser / mobile detection).
- `?skip`: skip to the end state: at the desk, server room powered, terminal down and booted, wall CRTs live.
  `?skip&up` keeps the terminal in the ceiling; `?skip&dark` keeps the room unpowered (and the terminal up).
- `?lit`: server room fully powered (preview the layout).
- `?os`: skip straight into the desktop (development).
- `/dev/os-preview.html` (dev server only): the HTML desktop alone, no WebGL needed (handy for phone-size checks in
  the built-in browser pane, which has no WebGL).
- `?debug`: orbit camera + HUD (fps, draw calls, camera position).
- Sound is silent until the first user gesture (browser rule). Visitor keys (3D view): **E** use the terminal, **Q** raise/lower
  the monitor (only after exiting the desktop), **F** look around with the mouse, **Tab** hotkey menu. Dev keys (only
  `npm run dev` or `?debug`; never for visitors): **L** toggles server power, **R** replays the whole intro from the corridor, **M** replays the terminal drop + boot (wall CRTs wake),
  **P** replays the power-up, **O** orbit cam, **H** HUD.
- In dev, `window.scene/camera/renderer/walk/setLit/leds/monitor/reveal` are exposed.
- Deterministic reveal stepping (screenshots stall rAF): replace `reveal.update` and `leds.update` with no-ops
  driven by your own clock, `reveal.start(0)`, then call the original `update(T)` in small increments.
- Screenshots stall rAF in the Claude-in-Chrome tab, so wall-clock timing checks are unreliable there.
  Freeze and step instead: set `walk.state='idle'`, call `walk.apply(t)`, and `monitor.state='frozen'; monitor.apply(t)`.

## Code map

```
index.html            canvas + click-to-enter gate (needed so audio can start) + debug HUD
server.js             Express production server (static dist/, SPA fallback, /healthz)
src/main.js           tiny loader: mobile detection, Full/Light chooser, then lazy-imports full.js or desktopOnly.js
src/full.js           (separate chunk, loaded only for Full) renderer, scene assembly, glass env capture, power levels, bloom, loop
src/desktopOnly.js    Light version / mobile spin: LAMPLIGHT OS alone, no three.js
src/os/clock.js       taskbar clock text (kept out of scene/ so the desktop never imports three)
src/scene/cctv.js     CctvSystem: 4 corner CCTV cameras (bracket, pan head, tilt platform, housing), servo motion, patrol, lens cameras
src/apps/cameras.js   Security Cameras app (full only): renders the CCTV views into the window, mouse pan, arrows switch, grain/OSD (cameras.css)
src/scene/ledSign.js  amber LED dot-matrix board texture (5x7 font, dot lamp, two gears) for the door signs
tools/favicon/make_favicon.py  builds the favicon (32x32 pixel oil lamp in the lamp.js palette) -> public/favicon.svg,
                      favicon-32.png, favicon.ico, apple-touch-icon.png (pure Python; rerun after editing the art)
src/scene/deskNote.js handwritten operator note on the desk (Q and F), Caveat font from @fontsource/caveat (OFL)
src/debug.js          URL flags, orbit camera, HUD, keys
src/style.css
src/camera/walk.js    scripted first-person walk: speed profile, head bob/sway/roll, 'step' events
src/scene/layout.js   ALL world dimensions/positions (edit here first)
src/scene/palette.js  colors (surfaces, light colors, LED colors)
src/scene/materials.js shared materials + procedural canvas textures (grain, floor tiles, mat ribs)
src/scene/builder.js  Builder: merges primitives per material -> few draw calls (box/span/rbox/add)
src/scene/leds.js     LedField: every indicator LED as one InstancedMesh; groups, cascades, blink
src/scene/commandRoom.js  room geometry + command-room lights
src/scene/desk.js     command desk (no side wings), indicator row; places the keyboard
src/scene/keyboard.js full-size Model M-style QWERTY + nav cluster + numpad (layout table -> keycaps + one legend decal)
src/scene/serverRoom.js   hall shell, window surround, trusses, fixtures, catwalks, data banks, racks, room lights
src/scene/monitor.js  MonitorRig: hatch doors, shaft, telescoping arm, loads public/models/monitor.glb, descent timeline
src/scene/screen.js   MonitorScreen: canvas -> emissive CanvasTexture (off / CRT warm-up / boot screen; stage 6 adds the OS)
src/scene/lamp.js     boot logo + getLampSprite(variant) recolors (bronze/phosphor/amber/cyan/rose): lamp drawn at 112×76 px, palette-quantized, scaled up nearest-neighbor (static, cached)
tools/blender/check_monitor.py  imports the .glb and reports parts poking through the housing shell + corner renders
tools/blender/monitor.py  Blender script that builds + exports the monitor (and renders previews)
public/models/monitor.glb generated, committed (~0.55 MB) so the repo deploys as-is
src/audio/sound.js    SoundDesign: all sounds synthesized with Web Audio (no files); room / server (glass) / fx buses
src/scene/mouse.js    late-80s two-button mouse (unbranded, PS/2-era style), pad, cable into a desk grommet
src/ui/hotkeys.js     HotkeyPanel: bottom "TAB Open Hotkey Menu" button + the hotkey menu (top-left), dims inapplicable keys
src/scene/door.js     entrance door (Alien: Isolation-style per the user's reference): octagonal panel with a see-through hex window, chamfered riveted frame, status LEDs, "Command Room / Lamplight Mainframe" sign
src/sequence/intro.js DoorIntro: corridor door sequence (DOOR_TIMING: chirps + green flashes, hiss, slide up), starts the walk, closes the door behind
src/sequence/lookAround.js LookAround (F): turn your head with the mouse from the desk (pointer lock; drag fallback)
src/sequence/focus.js TerminalFocus: E / monitor click / prompt tap -> camera glide into the screen -> DesktopOS; Exit reverses
src/os/desktopModel.js  the desktop apps + text (PLACEHOLDERS): single source for the HTML desktop and the monitor drawing
src/os/art.js         wallpaper (original desert dusk) + 32 px pixel icons, drawn in code, also as data URLs
src/os/layout.js      shared desktop proportions (768 px reference height)
src/os/os.js          DesktopOS: HTML desktop, icons, taskbar, lamp launcher menu with Exit, window manager
src/os/os.css         XP-reminiscent styling (original; no Microsoft assets) + the 3D "use the terminal" prompt
dev/os-preview.html   dev-only standalone desktop page
src/sequence/reveal.js Reveal: power-up timeline (REVEAL timings, fluorescentStrike/lampStrike curves, events)
src/scene/wallCrt.js  WallCRTs: side-wall CRT screens with the pixel lamp bouncing DVD-style (color changes on each wall hit)
src/scene/supercomputer.js original supercomputer (dais, C-ring cabinets, bench, lathe core, bands, face panel) + core lights
docs/references.md    written notes on the reference videos (timeline, style)
reference/            (gitignored) extracted frames, contact sheets, spectrogram
```

### World layout (meters, see layout.js)
- +x right, +y up, camera looks toward -z.
- Command room: x -5..5, z 0..8, height 3.2. Glass wall at front: bottom edge y 0.95 at z 0,
  top edge y 3.2 at z -0.6 (tilts outward). Mullions at x ±1.8 keep the center pane clear.
- Corridor behind the back-wall door: z 8.2..12, ceiling 3.5 (taller than the room so the sign has breathing room).
  Entrance door: 1.3 × 2.1 m octagonal panel at z 8.1 in a 1.9 × 2.42 m chamfered frame (`DOOR` in layout.js); the
  back-wall opening is only as wide as the panel. The walk starts at z 11.2 facing it, looking slightly up so the sign is in view.
- Server room: floor y -4.5, ceiling y 9, x -16..16, z -28..-0.6. Catwalks at y -1.0.
- Supercomputer center (0, -14). Desk center z 1.15, top 0.78. Ceiling hatch for the monitor
  at (0, 3.2, 1.05), 1.3 × 1.0.
- Walk ends at (0, 1.65, 2.55) looking ~9° down: keyboard at the bottom edge,
  monitor drop zone mid-low, supercomputer above it. Speed 1.0 m/s: duration ~9.9 s.

## Lighting rules (learned the hard way)

- **Point lights shadow too** (fill + corridor, `pointShadow()` in commandRoom.js): without shadows the fill lit the
  corridor side of the closed door (user saw glows behind the door). All opaque standard materials use
  `shadowSide = FrontSide` (materials.js): with the default back-face shadows, light leaked through wall corners where
  another wall starts at the occluder's far face. Point shadows cost nothing visible (still 180 fps here).
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
- Server-room power is owned by `Reveal` (sequence/reveal.js). `apply(core, row(r), dip, band(i))` sets
  core spots + ring + per-band emissives, per-row fixture materials (`m.serverFixtureRows[0..3]`, 0 =
  nearest the window) with the room RectAreaLights tagged by `row`, and the command-room surge dip
  (lights + panel emissives scaled from their base). LED groups: `cmd`, `desk` (on from start), `core`,
  `banks`, `racks` (off until the reveal). `leds.setGroup(name, on, time, cascade)` cascades by each LED's `delay`.
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
- Monitor modeling lessons (user caught clashes at the top corners):
  * Shells use `pillow()`: a 2-segment support bevel, Catmull-Clark subdivision, then a gentle cast. Casting onto a
    many-segment bevel folded the corners into stair-step bands.
  * The rear hood must pass through the body's FLAT back area (|x|<0.195, |z|<0.145); a wider hood poked out the corners.
  * Raised parts on domed surfaces stick out at their ends: cut real slots (boolean) instead.
  * Never paint faces by x/z position alone (it also hit the back panel); recess color comes from `BezelPlate`.
  * Coincident outer faces flicker (yoke bar vs arms): offset them.
  * Run `check_monitor.py` after every model change. Expected flags are only surface-mounted parts
    (knobs, LED, hubs, screen in the recess, chin vents).
- Sounds: currently 100 % synthesized (audio/sound.js). If CC0 recordings are ever added, record sources
  and licenses in `docs/assets.md`. **Never rip audio from the reference videos.**
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

## Deploy (Infomaniak Node.js hosting)
- Runtime needs only **Express** (`dependencies`); three.js, the Caveat font and Vite are `devDependencies` because Vite
  bundles them into `dist/` at build time.
- **Prebuilt upload (what we use):** `npx vite build`, then assemble `deploy/nms.fyi/` (gitignored) =
  `dist/ server.js package.json package-lock.json`. The user drags those four into `sites/nms.fyi` over SFTP in
  FileZilla (Claude can't type their password, and computer use is off, so Claude prepares and they transfer).
  On the host: install `npm ci --omit=dev` (no build step), start `npm start`, port = `$PORT` or 3000. Check
  `https://nms.fyi/healthz` -> "ok". Tested locally from a fresh copy (all routes 200).
- **Build-on-server alternative** (GitHub link): install `npm ci` (WITH dev deps), build `npm run build`, start `npm start`.
- Never upload `node_modules/`. To update: rebuild, re-assemble `deploy/`, re-upload (overwrite), restart the app.
- Host details known so far: SSH host `57-112638.ssh.hosting-ik.com`, folder `sites/nms.fyi`; the temporary SSH user
  rejected Claude's key (`~/.ssh/id_ed25519_infomaniak`).

## Monitor timing (monitor.js MONITOR)
Starts when `walk.t >= walk.duration - MONITOR.total` (5.1 s into the 9.9 s walk), so it arrives as the walk
ends. Doors open 0 to 0.9 s, the arm descends 0.6 to 4.8 s (stowed attach y 4.08 to final 1.81, screen center
~1.40 m), screen power-on at 1.4 s, tilt to -0.17 rad over the last 40% of the drop, then a damped spring/sway. The server-room
power-up runs on this same clock. (Timeline was spread out on 2026-11-09 because too many sounds landed
together around footsteps 9 to 10; keep the major sound events about a second apart.)

## Sound (audio/sound.js)
- **All procedural** (Web Audio): no audio files, so nothing to license. Never rip audio from the references.
- The AudioContext starts inside the Enter click (`startSound()` in main.js). With `?skip`/`?debug` (no gate),
  the first pointer or key press unlocks it. All hooks are no-ops until `sound.ready`.
- Buses: `room` (dry + 0.9 s synthetic reverb), `server` (1.4 kHz "glass" low-pass, then quiet dry + 3 s reverb),
  `fx` (breakers: dry + big reverb) -> master -> compressor (note: Web Audio's compressor adds automatic
  makeup gain) -> analyser -> out.
- Hooks: `walk 'step'` -> footstep; `monitor 'start'` -> `monitorSequence(MONITOR)` schedules hatch latch,
  pneumatic hiss, door stops, arm motor (pitch/level follow the eased descent speed via setValueCurveAtTime),
  arrival clunk + spring, CRT degauss/crackle/15.7 kHz whine; `reveal 'breaker'` -> breaker(strength)
  (breaker 2 adds a sub boom + transformer hum); `reveal 'row'` -> tube strike (same stutter as
  fluorescentStrike) then hum; `reveal 'fans'` -> fans fade in over 3.5 s. Room tone (120 Hz buzz + air)
  from the start. Skip mode uses `serverAmbience()`.
- Mute button `#mute` (bottom-right) persists in localStorage key `nms-muted`.
- Verified levels (offline renders, peak): footstep 0.51, latch 0.37, doors 0.46, CRT 0.39, motor 0.16,
  arrival 0.31, breaker1 0.66, breaker2 0.81; fans steady RMS ~0.03 ("faint" per brief). No clipping.
- **Gotcha:** a GainNode sits at 1.0 until its first automation event. `env()` sets `param.value = 0.0001`
  first, otherwise any source started before its envelope blasts at full volume (this bit the spring and breaker buzz).
- **Testing without ears:** in dev, `new sound.constructor()` + `start(new OfflineAudioContext(...))`, schedule
  sounds at known times, `startRendering()`, then measure peak/RMS per window and Goertzel band energy.
  Live: `sound.level()` reads the analyser RMS. Claude can't hear: the user must judge the actual sound.

## Power-up timing (sequence/reveal.js REVEAL; seconds on the monitor clock)
Starts with the monitor (5.1 s into the walk). CRT power-on 1.4 s. Breaker 1 at 2.3 s: core spots `lampStrike`
(fast flutter, then climb), ring light, bands climb (0.12 s + 0.11 s × i), core LEDs cascade over 0.9 s.
Breaker 2 at 3.4 s: command room dips 40 % for 0.24 s, fixture rows `fluorescentStrike` 0.4 s apart
nearest-first (tube sounds at 100/60/40 % per row), back wash +0.3 s, fans fade in over 5 s, monitor lands 4.8 s, banks cascade over 1.9 s, racks +0.25 s over 1.3 s. Events: `breaker` {index, strength}, `fans`
(stage-4 audio hooks). State becomes `lit` 4 s after breaker 2.

## Open design questions (for the user's change-request round)
- **Desktop contents (next up):** which apps/icons, what's in each (bio, projects with images, résumé + PDF,
  contact: email link vs. a form, which needs a Node endpoint), the user's display name and tagline, links.
- ~~Composition (monitor hiding the core)~~: solved in round 7 (the terminal no longer drops on its own; the core moved
  into the north bay).
- CRT glass glare: the desk spot makes a bright highlight in the middle of the screen. Consider moving the desk light,
  a rougher screen, or a glass-reflection map so the boot logo stays clean.
- The monitor first emerges above the frame (you're looking ahead). Possibly a scripted glance up as it drops.
- Fluorescent warmth/greenness, bloom strength, walk speed (8.1 s).

## LAMPLIGHT OS (stage 6)
- **Architecture:** the usable desktop is real HTML (`DesktopOS`): crisp text, accessible, indexable, normal links
  and forms. The 3D monitor shows a *drawing* of the same desktop (`MonitorScreen.drawDesktop()`) made from the
  same art (`os/art.js`), app list (`os/desktopModel.js`) and proportions (`os/layout.js`), so they match.
  Keep the two in sync when the desktop changes (icons, taskbar).
- **Boot hand-off:** monitor clock `MONITOR.desktopAt = total + 2.0` (6.8 s): the screen goes 0.25 s black, then the
  desktop fades in; monitor emits `desktop` -> `focus.enable()` + `sound.startupChime()` (original Eb arpeggio + pad).
  The boot progress bar fills over `MonitorScreen.BOOT_SECONDS = 4.1`, so it completes just before.
- **Focus:** `TerminalFocus` (sequence/focus.js). Triggers: **E**, clicking the monitor (raycast), or the
  `#terminal-prompt` button ("Tap to use the terminal" on coarse pointers). The camera glides 1.15 s (easeInOutCubic,
  position lerp + quaternion slerp) to a pose that frames the screen glass (0.44 × 0.335 m; fits height or width
  depending on aspect), then `os.show()` fades the desktop in. While open, the render loop skips all 3D work
  (`focus.paused3D`) and `sound.duck(true)` drops the master to 35 %. **Exit** (launcher menu) does
  `os.hide()`, then glides back to `walk.apply(walk.duration)` and restores `walk.state = 'arrived'`.
  Escape closes the menu or the active window; it does NOT exit (the brief says Exit lives in the launcher).
- **Scaling:** the desktop root gets CSS `zoom = clamp(innerHeight / 768, 1, 2)` so it looks like a full-size XP screen
  on any monitor and matches the monitor drawing. Window dragging divides pointer deltas by `os.zoom`.
- **Gotcha:** the page uses `color-scheme: dark` (for the 3D view), which makes button text white by default.
  `.os` sets `color-scheme: light`; give buttons explicit colors.
- Phones (<700 px): windows fill the desktop, no dragging, no maximize button, taskbar labels hidden.
- Desktop icons: double-click with a mouse; single tap on touch; Enter from the keyboard.
- Original artwork only: desert-at-dusk wallpaper (not XP's hill photo), our own pixel icons, a green "pill"
  launcher containing the pixel lamp.

## Door intro, look-around, keys (change round 3, 2026-11-09)
- **Door intro** (`sequence/intro.js`, DOOR_TIMING; seconds after Enter). The user supplied a reference (Alien:
  Isolation's Sevastopol doors) and asked for that style, NOT heavy blast doors: the green LED on the door flashes with
  three rising affirmative chirps (0.15 / 0.32 / 0.49), then it's steady green, a brief hiss (0.64), and the panel slides UP into the
  wall/ceiling cavity (0.66 to 1.21); the walk starts at 0.95. When the walk distance reaches 3.35 m (~0.25 m past the
  doorway) it slides down (0.5 s) with a brief hiss and a soft thud, and the LED turns red. Sounds: `sound.doorOpen(D)` /
  `doorClose(D)` (chirps, `hiss()` helper; fx bus). Peaks: chirps ~0.24, hiss 0.36, closing thud 0.35. The user didn't
  say which way these doors open; "up" was my call (offer sideways if asked).
- **Door model** (door.js): octagonal panel (chamfer 0.3) with a hexagonal window that is a real hole with tinted glass
  (`m.doorGlass`; you can see into the room), raised border/central plates, a status housing with green + red LEDs, three
  rounded slots at the bottom. Frame = a **uniform 0.3 m band**: the door octagon offset outward on every side by
  `offsetOct()` (a diagonal offset needs chamfer c + e(2 - √2)), continuing below the floor so the bottom corners match
  the top. Trim (user: symmetric, retro; no rivets, no side indicator buttons): two pinstripe rings, mirrored vent slots
  on both sides, three slots centered on top. Palette: panel beigeLight, plates beige, frame taupe.
  Gotcha: never put a shape hole inside another hole (the border ring had the window cutout inside its inner hole: odd
  triangulation, a pale blob on the panel).
- **Back wall band/rail** stop at x = ±0.70, i.e. behind the door frame, so they meet its outline at every height.
- **Sign** (superseded in round 6 by the LED boards): monotone lamp logo (`getLampSprite('mono')`: all palette entries,
  flame included, mapped to one warm off-white's tones), "Command Room", and "Lamplight Mainframe" smaller (user renamed it
  from "Lamplight Data Center"), on a softly backlit dark panel, ~0.35 m clear of the frame and ~0.3 m below the ceiling.
- **Timeline after the door** (walk times): door slam 4.41, monitor hatch latch 5.10, breaker 1 7.4, breaker 2 8.5,
  monitor lands 9.9 = walk end. Keep big sound moments at least ~0.6 s apart (the user complained about overlap before).
- **F = look around** (`sequence/lookAround.js`): stays at the desk; pointer lock, mouse turns the head (yaw unlimited,
  pitch ±69°); drag fallback; F or Esc turns back (0.7 s slerp). The user explicitly did NOT want a moving freecam.
  While looking, clicks don't focus the monitor; E still works (glides into the screen from the current view).
- **Q** raises/lowers the monitor (moved from F).
- Developer keys (R/L/M/P/O/H) are only active in `npm run dev` or with `?debug`.

## Change round 4 (2026-11-09)
- **Ceiling lights:** 8 identical fixtures (2.0 × 0.9 m) on an even grid aligned with the wall panels: front row z 1.25
  (x ±3, the status-light panels; no center, because the monitor hatch is there), middle row z 4.05 (x -3/0/3, the center CRTs),
  rear row z 6.85 (x -3/0/3, the rear status-light panels).
- **Matte materials:** the grain roughnessMap was mid-gray, and roughnessMap *multiplies* roughness, so every material
  was about half as rough as written (glossy). The grain is now near-white, and every non-metal standard material is
  clamped to roughness >= 0.86 (materials.js). Steel and glass keep their sheen. Keycaps are 0.84. Keep new materials matte
  unless they're metal.
- **Server room ceiling** lowered from 9 to 5.5 (10 m hall). The core profile was refit (shaft 5.2 to H-1.6) and the six
  bands are spaced 0.48 m from base+5.25.
- **Window top rail removed** (the user found the beam across the top of the window awkward).

## Change round 5 (2026-11-09)
- **Baseboard all around:** the dark taupe baseboard (0.1 m) now runs along the back wall too (stops at x = ±0.70, behind
  the door frame, like the wainscot band) and along the foot of the front window ledge (z 0.5..0.53), so it meets the
  side-wall baseboards at every corner.
- **Sign z-fight fixed:** the command-room ceiling slab used to end at z 8.2, exactly the corridor face of the back wall,
  and flickered against it above the sign. It now ends inside the wall (zBack + 0.1). Never end a slab on another face.
- **Window top rail back** (the user re-requested it, suspecting the old angle was off): it's now rotated with the glass
  tilt (`[-tilt, 0, 0]`) and centered on the glass top edge, so it reads as the glass's own head rail, not a level beam.

## Change round 10 (2026-11-10)
- **One window frame:** the straight frame behind the tilted one was the server room's old vertical window posts
  (removed). The command-room side walls and the front ceiling strip now run out to the server-room wall
  (`SERVER.frontWallZ` -0.95); they used to stop at the glass top (z -0.6), leaving a slot at each window end.
- **Door frame side grilles removed** (both faces; the catwalk doors share `HydraulicDoor`, so theirs went too). The
  three short slots on top remain.
- **Accounts on the logon screen:** superseded in round 10 (one account, Noah Schafrath).
  **Exit account selection** (full site only, bottom left of the logon screen, door icon): back to the room without
  logging on (`onLeaveLogon` -> `focus.exit()`); the monitor keeps showing the logon screen. Lite/mobile have no room,
  so no button there.
  Portrait (now `public/os/user-portrait.png`), made from the user's headshot (not committed) with ffmpeg: crop
  228×228+30+6, lanczos to 80×80, unsharp, contrast 1.1, saturation 1.22, warm colorbalance, 28-color palettegen,
  paletteuse Bayer dither scale 3 (16 colors lost the eyes).
- **Desk phones removed** (user: not enough of an aesthetic addition for the effort). `scene/phones.js` was deleted;
  the last version (curved handset with earpiece/mouthpiece blocks) is in commit 96ed0b6 if they ever come back.

## Change round 10 (2026-11-10): one account, logon scanlines
- **One account:** the visitor "You" account and the unavailable admin account were merged into a single account,
  `USER_NAME` "Noah Schafrath" / `USER_TAGLINE` "Mainframe Administrator" with `USER_PORTRAIT`
  `/os/user-portrait.png` (the 80s-dithered headshot, renamed from admin-portrait.png). `ADMIN`, the unavailable notice and
  its CSS are gone. The launcher header shows the portrait (white border) instead of the lamp.
- **"To begin, click your user name" removed** (HTML and monitor drawing). Monitor drawing re-measured against the HTML at
  1024×768: lamp top `H/2 - 70s`, OS name baseline `H/2 + 59s`, the card `H/2 - 32s` (centered).
- **Scanlines on the logon screen:** `.os-crt` now has `z-index: 60` (logon is 50), so the same faint scanlines as the
  desktop cover it. `.os-windows` got `isolation: isolate` so window z-indexes (which grow on every focus) can never
  climb over the menu, logon or scanlines.
- **Log out returns to account selection and stays there** in every mode (full no longer calls `focus.exit()`; the
  "Exit account selection" button is the way back to the room).

## Change round 9 (2026-11-10)
- **Version:** the OS is now **Version 3.2** (user: estimate a realistic version), `OS_EDITION` "Server Edition",
  `OS_BUILD` "Build 1987.4127" (desktopModel.js). The terminal boot, the wall-CRT boot screens and the launcher footer
  all read OS_VERSION.
- **Logon screen:** the lamp is 96 px and centered over "LAMPLIGHT OS" (`.logon-mark`); the bottom-right note was
  replaced by build info ("LAMPLIGHT OS Server Edition / Version 3.2 · Build 1987.4127"), on the monitor drawing too.
- **Phone handsets** (from the user's two reference photos of a modern office handset; the bases are unchanged): one
  smooth swept mesh each (`handsetGeometry()` / `handsetAt(u)`, u = -1 mouthpiece .. +1 earpiece): a slim curved handle
  (16 mm sag) whose section steps out on the face side, over a short sloped wall, into raised flat-faced blocks at both
  ends (earpiece slightly larger). Squarish superellipse section (exponent 4.4), blocky rounded end caps. The earpiece
  face has a speaker hole pattern and the mouthpiece face mic holes (alpha-tested decals), and the coiled cord plugs
  into a jack in the mouthpiece end. It lies face-down with the two blocks resting on the cradle horns (seated at the
  horns' x). Rejected on the way: cup-ended handsets that floated above the horns, and a featureless slab ("you have
  to have a speaker and receiver").
- **Hatch sealed:** the doors meet at the center, run 1 cm past the opening front and back, have 3 mm edges instead of
  8 mm, and the left door carries a seal strip over the seam (it swings away with that door).

## Change round 8 (2026-11-10): logon, phones, arm, waves
- **Logon screen + Log out** (all modes): DesktopOS starts at an original XP-reminiscent welcome screen (dark bands, blue
  middle, "LAMPLIGHT OS / To begin, click your user name" left, the USER account tile right; `.os-logon`). Click USER ->
  "Loading your settings…" -> desktop (`onLogin`). The launcher's Exit became **Log out** with a door-opening pixel icon
  (`logout` in art.js; user: you aren't powering the machine off), in full AND lite/mobile. Log out closes every window,
  shows "Logging off…", returns to the logon screen, then `onLogout` (full: `monitor.screen.showLogon(true)`; since
  round 10 it stays at the terminal on account selection instead of `focus.exit()`). The 3D monitor draws the same logon layout (`MonitorScreen.drawLogon()`, state `logon`) after the boot
  (`desktopAt`) and in `setDown()`, so the glide into the terminal lands on a matching picture. Mobile stacks it vertically.
- **Desk note** now reads "Note to Mainframe Operators: / Press Q to control / the terminal. / Press F to look / around
  the room." (Q and F circled). Paper 0.30 × 0.24 m.
- **Desk phones** (`scene/phones.js`): the same early-80s model twice at the back left of the desk: beige operator phone
  with a 12-key numbered keypad (decal legends on 3D keys), and a dark red receive-only phone with a blank plate and an
  unlit call lamp (no numbers). Wedge body (extruded profile, beveled), cradle horns, handset (handle + cups), coiled cord
  (`CoilCurve` helix around a guide curve). Gotchas: the bevel puffs the sloped face out ~16 mm (mount plates on the real
  surface), and the face tilt is `+SLOPE` (front edge down).
- **Server fixture frames:** light grey (`m.fixtureFrame`, 0xc4c3bf) rings around every hall fixture and the bay strips,
  standing just proud of the diffuser (user: grey, not beige, to contrast the ceiling).
- **Monitor yoke** (monitor.py): one swept U (`sweep()` of a rounded-rect section along a path with 75 mm bends) instead
  of a bar on two arms, with round bosses at the hub ends (8 mm wider than the arm: flush faces flickered dark).
  `check_monitor.py` flags only the usual surface parts. **Telescoping arm** (monitor.js): lathe-turned stages, 64
  sides, rounded lips; smoother collars.
- **Pedestal overlap fixed** (user CCTV screenshot): the wall-section pilasters moved from 65°/115° (they cut into the
  lower step) to 60°/120° (`SUPER_HALF_A` 30°), and each tower stands on the lowest surface under its footprint (upper
  step / lower step / floor). Bay banks and catwalks now stop at 52° and the bay strips at 50°/130° to keep a gap.
- **Flowing light waves** on the supercomputer once `lit` (eases in): `leds.setWave('core', fn)` modulates every core LED
  by a rolling cosine across x/y whose phase swings back and forth (`7 sin(0.32 t)`), and the six shaft rings get a wave
  flowing up and down (`updateCoreWaves()` in full.js). The reveal owns those lights until `lit`.

## Change round 7 (2026-11-09): north bay, new sequence, living wall CRTs
- **Sequence (final, user-tuned):** the power-up keeps its ORIGINAL timing (everything comes online a couple of steps
  before the visitor stops): `reveal.start()` fires when `walk.t >= walk.duration - MONITOR.total` (walk 5.1 s; breaker
  1 at 7.4, breaker 2 at 8.5, walk ends 9.9). The reveal emits `lit` 4 s after breaker 2; **2 s later the terminal
  descends on its own** (`AUTO_DESCEND_AFTER_LIT`, via `lowerMonitor()`, once per intro run), so visitors who don't
  treat it like a game still get the terminal. Q raises/lowers it afterwards (the handwritten desk note explains Q).
  **Free look is NOT on by default**: F toggles the original pointer-lock look-around (drag fallback), as in round 3.
  Rejected along the way: a cursor-position "glance" mode, free look switched on automatically after the walk, and the
  power-up waiting until the visitor stopped.
- **Wall CRTs** (wallCrt.js, rewritten): asleep = the bouncing-lamp screensaver (user confirmed: keep the screensaver as
  the sleep state, not dark screens). Monitor emits `screenOn` -> they warm up one by one and show the LAMPLIGHT OS boot screen
  (+ NODE number); `desktop` -> live: each alternates on its own timer (6 to 12 s) between a monochrome CCTV feed (OSD:
  camera, time, REC) and made-up readouts (green LAMPLIGHT MAINFRAME: CPU, core temp, banks, I/O, jobs, uptime; amber
  LAMPLIGHT FACILITY: power buses, coolant, humidity, CCTV, catwalk doors, fire suppression), static burst at each switch.
  Never the desktop. `raise` -> collapse to a dot, dark, back to the screensaver. Screens are a ShaderMaterial (canvas +
  feed, scanlines, vignette, static; linear output for the composer). Feeds: 4 HalfFloat 256×192 render targets, one
  camera rendered per frame round-robin, only while a screen shows a feed; the CRT group is hidden during those renders.
- **North bay:** the back wall is now a half circle (radius 16, centered on z -28, back at z -44; `SERVER.apseR/zBack`).
  One floor/ceiling covers hall + bay. Wall = chord boxes (`arcStrip`). CAM 1/2 stay on the side walls at z -27.25.
  Fog lowered to 0.009 (the core is ~43 m from the desk).
- **Supercomputer** moved to `CORE (0, -40.5)`, back half set into the bay wall, plus `buildWallSection()`: memory towers
  built into the wall (90° ± 25° of the arc, LEDs in the `core` group), pilasters, a fascia, five conduits from the core's
  ceiling collar and two bus ducts from the cabinet ring into the wall, and two wash spots that ramp with the core.
  Clearly visible from the desk now.
- **Banks and catwalks** wrap around the bay from both sides and stop at 55° (`APSE.END_A`): several feet clear of the
  supercomputer section and dais. Catwalk rails follow the curve with an end rail. The old back catwalk and back-wall
  banks are gone.
- **Freestanding rack rows removed** (user): the two rows at x ±10.2 in the middle of the hall are gone; only the banks
  along the walls and around the bay remain. The reveal still cascades the (now empty) `racks` LED group, harmlessly.
- **Catwalk supports** (user: they didn't touch the catwalks): the bay's columns stood at r 13.6, outside decks that start
  at r 13.8. Now every open deck edge has a steel stringer beam underneath (`STRINGER_Y0`), and the columns stand under
  the stringers (r 14.0 in the bay, 0.2 m in from the edge on the straight runs and landings).
- **Catwalk doors** moved onto **landings** (4.6 × 2.65 m, railed) at the near ends of the side catwalks, door centers
  3.3 m from the side walls, so they're well clear of the wall banks.
- **Server lighting:** hall fixtures on an even grid (x -12/-6/0/6/12 × z -4.6/-11.4/-18.2/-25.0), trusses over each
  row and midway (3.4 m), prismatic diffuser texture (rotated, tubes along z), max 1.3 instead of flat 2.4. The light
  comes from where the fixtures are: one RectAreaLight (25 × 3) under each row, striking with it. The bay has NO
  rectangular panels (the user found them out of place): a curved strip fixture under a ring beam over each side's
  catwalk (5° to 54°, r 13.4, `m.serverBayStrip`) with a chord-aligned RectAreaLight each, striking with the last row.
  The supercomputer section has only its own lights (ring light, collar downlights, key spot, wall washes). The ring
  beam no longer spans the whole bay (it used to run through the core's ceiling collar).

## Change round 6 (2026-11-09): versions, cameras, LED signs
- **Version chooser** (`src/main.js`, `#chooser` in index.html): Full experience vs Light version. The user's GPU sat at
  ~60 % on the old start page, which renders the corridor behind the gate. Now nothing 3D loads until Full is picked:
  three.js and the scene live in `full.js`, a separate Vite chunk fetched by `import()` (entry ~4 kB, desktop ~17 kB,
  full ~1 MB). No canvas / WebGL context exists before that. Full then shows the old Enter gate (needed for audio).
  The last choice is remembered in localStorage `nms-mode` (only pre-focuses the button; the chooser always shows).
  If full.js fails (no WebGL2), the gate offers "Open the light version".
- **Chooser text** (user, later): tiles read "Full Site" / "Lite Site" with "Best for systems with / without dedicated
  graphics."; no subtitle under NMS FYI. In code the modes are still 'full' / 'light'.
- **Light version** (`desktopOnly.js`): the desktop at once; no canvas, no sound, no mute button.
- **Mobile spin**: touch-first devices (UA mobile, iPadOS, or coarse pointer with no fine pointer) skip the chooser and
  get `DesktopOS({ mode: 'mobile' })`: zoom 1, home-screen icon grid, single tap opens, apps full screen with 40 px
  title buttons, no maximize/drag, taller taskbar, launcher as a bottom sheet (`.os-mobile` in os.css).
- **3D-only features are absent outside Full** (user rule): Exit in the launcher (replaced by a version label), apps
  with `requires3D` (the cameras), the hotkey bar/menu, terminal prompt, E/F/Q keys (all created by full.js only).
- **Security Cameras app** (full only): 4 CCTV cameras in the server room's upper corners (`CCTV_CAMERAS`, clockwise
  NW, NE, SE, SW; ← / → walk around). Model: wall plate + arm + gusset, pan drum, tilt uprights and axle, platform,
  long enamel housing, sun hood with skirts, bezel/lens, rear cap with cable gland, red tally light (bright on the
  watched camera). The camera sits ON TOP of the head: a hanging yoke collided when tilting. Mouse over the picture
  steers the watched camera (±46° pan, tilt -58° to -3°), rate-limited like a servo, with a motor whir
  (`sound.cctvMotor`); the others slowly patrol. Switching: static burst + roll + relay clack (`sound.cctvSwitch`).
  Rendering while the desktop is open: full.js's paused loop calls `cameraApp.render()`, which draws the lens camera
  into a 384×288 corner of the main canvas (hidden behind the desktop), `drawImage`s it into the app canvas in the same
  task, at 30 fps, with `shadowMap.autoUpdate` off. Look: CSS grayscale/contrast/blur, cycled noise frames (overlay),
  scanlines, vignette, hum bar, Courier OSD (camera, date, time, blinking REC).
  The corner cameras sit above the light fixtures, so they're dark in the 3D view (realistic; add a wash if asked).
- **Catwalk doors**: two closed props of the entry door (`HydraulicDoor(m, { signs: false })`) on the server-room face
  of the glass wall at the near ends of the side catwalks (x ±14.9, catwalk height), with landing plinths hiding the
  frame band below the deck. Side catwalk decks now run to that wall. The user asked for them on the glass wall
  (not in the command room, not on the back wall), as long as nothing intersects.
- **Signs**: both sides of the entry door now carry the same lit amber LED dot-matrix board (`ledSign.js`, 210×28
  dots): dot lamp (with flame) left, "COMMAND ROOM" double-size, "LAMPLIGHT MAINFRAME" single-size, two overlapping
  gears right (small gear in front with a one-dot gap). Unlit dots stay faintly visible. Corridor side y 2.97, room side
  y 2.8 (between the frame top and the ceiling). Face color 1.35 so the lit dots bloom.
- **Ceiling hot spot fixed** (user screenshot): the bright blob on the ceiling between the fixtures was the fill
  PointLight (0, 2.8, 5), 0.4 m under the ceiling with decay 1.2. It's now at y 1.9 with **decay 0** and intensity 1.7: even
  light inside its 8.5 m range (three's smooth cutoff still keeps it off the server floor), same overall brightness.
  Keep fill lights at decay 0; a falling-off fill always hot-spots the nearest surface.
- **Ceiling lights softened**: panels went from flat 1.5× white to 1.08× (corridor 0.95×) with a prismatic diffuser
  texture (tube bands, diamond prisms, darker edges). Only the panels' look changed; the actual lights are unchanged.

## Desk, controls & monitor stowing (change round 2, 2026-11-09)
- **Mouse:** `scene/mouse.js`: an unbranded two-button mouse in the spirit of IBM's PS/2-era mouse (to go with the
  Model M): boxy, pale gray, top sloping toward the hand, buttons split by a groove, on a dark pad right of the keyboard.
  The cable runs a short tidy path into a **round desk grommet** behind the pad. The user rejected the cable trailing
  off the back of the desk as messy, so keep cable management clean.
- **Click sound:** `sound.uiClick('press' | 'release')` on every pointer down/up inside the desktop (`DesktopOS` onClick).
  It plays on a separate `ui` bus straight into the compressor, so it is NOT ducked while the desktop is open; it still
  follows mute. Peaks: press ~0.23, release ~0.12.
- **Q key** (was F; the user moved it): after exiting the desktop (`focus.state === 'ready'`, monitor 'down'), F calls `monitor.raise()`:
  RAISE timeline (monitor.js) = CRT collapse-to-dot power-off (`screen.shutdown()`, 0.6 s), housing levels
  (0.3 to 1.0 s), arm retracts (0.7 to 4.1 s), doors close (4.15 to 4.95 s), then 'stowed'. Sound: `sound.monitorRaise(RAISE)`
  (zap, servo blip, motor at 1.12x pitch, hiss, door thump, latch). Q again runs `monitor.start()`: full descent + boot
  to the desktop, which re-enables E. Descent and raise share `applyPose()`. Keyboard only (no F on touch).
  Bonus: with the monitor stowed, the supercomputer is fully visible.
- **Controls UI:** a persistent "**TAB** Open Hotkey Menu" button at the bottom (keyboard devices, 3D view only; reads
  "Close" while open; hidden inside the desktop). Tab or clicking it toggles the hotkey menu (`ui/hotkeys.js`, **top-left**
  per the user). Inapplicable keys are dimmed and it live-refreshes on monitor/look events. Tab is only captured in the 3D view (gate gone, desktop
  closed); inside the desktop Tab keeps normal focus navigation. Touch devices keep the "Tap to use the terminal" button.

## Command room details (change round 1, 2026-11-09)
- Walkway mat ends in a rounded tip at z 2.1 (ExtrudeGeometry stadium end). The trim is straight side strips plus a half RingGeometry.
- Wall bands: side/back wainscot top and rail = the window-ledge cap height (`RAIL_Y0 = sill - 0.04`,
  `RAIL_Y1 = sill + 0.01`, beigeLight) so they run continuously into the front ledge. Keep these tied to `sill`.
- Side wall panels: 5 columns x 2 rows per side (the user thought six; told them it's ten), rounded-corner
  slabs (`roundedSlab()`). The middle three columns (z 2.65, 4.05, 5.45; top + bottom) = 12 wall CRTs
  (`crtSlots` -> WallCRTs), symmetric per wall: lights, CRT, CRT, CRT, lights. The outer columns carry
  blinking status lights (warm/amber/green/red, ~55 % blinking).
- Keyboard legends are printed onto the keycaps: one atlas texture (cap color + darker legend per key) with
  per-key UVs on top faces and a plain swatch on the sides (`keycapAtlas()` in keyboard.js). No decal.
- Desk: the pedestal "kick plates" (black strips at the base) were removed at the user's request.

## Known rough edges
- A faint reflection glow stays on the center pane in the dark state.
- No mobile/low-end fallback yet. WebGL2-missing shows a message on the gate.
- Supercomputer face panel sits low and is partly hidden behind the window sill from the desk.
