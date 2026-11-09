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
| 3 | Server-room power-up on the monitor clock: breaker 1 core (spots, ring, climbing bands, core LEDs), breaker 2 ~1.15 s later room (surge dip, fluorescent row strikes, bank/rack LED cascades) | ✅ 2026-11-09 |
| 4 | Procedural Web Audio sound (audio/sound.js): footsteps, room tone, hatch + arm motor + arrival, CRT power-on, two breakers, tube strikes, transformer hum, faint fans behind glass; mute button | ✅ 2026-11-09 (not yet heard by the user) |
| 5 | Boot screen on the monitor: 1980s pixel-art bronze oil lamp with a lit flame (lamp.js), serif title, progress bar | ✅ 2026-11-09 (the boot to OS hand-off comes in stage 6) |
| 6 | NMS FYI OS shell: boot to desktop 2 s after the monitor lands (+ startup chime), HTML desktop (XP-reminiscent, original), lamp launcher + Exit, window manager, E / click / tap focus with camera glide, 3D pause while open | ✅ shell 2026-11-09. **Content: placeholders; waiting on the user** |
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
- `?skip`: skip the intro: at the desk, monitor down, server room powered. Add `?dark` to keep it unpowered.
- `?lit`: server room fully powered (preview the layout).
- `?os`: skip straight into the desktop (development).
- `/dev/os-preview.html` (dev server only): the HTML desktop alone, no WebGL needed (handy for phone-size checks in
  the built-in browser pane, which has no WebGL).
- `?debug`: orbit camera + HUD (fps, draw calls, camera position).
- Sound is silent until the first user gesture (browser rule). Visitor keys (3D view): **E** use the terminal, **F** raise/lower
  the monitor (only after exiting the desktop), **Tab** show/hide the controls panel. Dev keys: **L** toggles server power, **R** restarts the walk, **M** replays monitor drop + power-up together,
  **P** replays just the power-up, **O** orbit cam, **H** HUD.
- In dev, `window.scene/camera/renderer/walk/setLit/leds/monitor/reveal` are exposed.
- Deterministic reveal stepping (screenshots stall rAF): replace `reveal.update` and `leds.update` with no-ops
  driven by your own clock, `reveal.start(0)`, then call the original `update(T)` in small increments.
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
src/ui/hotkeys.js     HotkeyPanel: Tab shows/hides the controls list; one-time "Tab Controls" hint
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

## Monitor timing (monitor.js MONITOR)
Starts when `walk.t >= walk.duration - MONITOR.total` (~2.5 s into the 8.1 s walk, as the visitor comes
through the door and can see the hatch open), so it arrives as the walk ends. Doors open 0 to 0.9 s, the arm
descends 0.6 to 5.6 s (slow: stowed attach y 4.08 to final 1.81, screen center ~1.40 m), screen power-on
at 1.4 s, tilt to -0.17 rad over the last 40% of the drop, then a damped spring/sway. The server-room
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
Starts with the monitor (~2.5 s into the walk). CRT power-on 1.4 s. Breaker 1 at 2.5 s: core spots `lampStrike`
(fast flutter, then climb), ring light, bands climb (0.12 s + 0.11 s × i), core LEDs cascade over 0.9 s.
Breaker 2 at 3.75 s: command room dips 40 % for 0.24 s, fixture rows `fluorescentStrike` 0.4 s apart
nearest-first (tube sounds at 100/60/40 % per row), back wash +0.3 s, fans fade in over 5 s, monitor lands 5.6 s, banks cascade over 1.9 s, racks +0.25 s over 1.3 s. Events: `breaker` {index, strength}, `fans`
(stage-4 audio hooks). State becomes `lit` 4 s after breaker 2.

## Open design questions (for the user's change-request round)
- **Desktop contents (next up):** which apps/icons, what's in each (bio, projects with images, résumé + PDF,
  contact: email link vs. a form, which needs a Node endpoint), the user's display name and tagline, links.
- **Composition:** from the standing position the monitor arm lines up exactly with the supercomputer
  core column, so the monitor plus arm hide the core's center. Options: offset hatch/monitor sideways,
  shift the camera end point, lower the monitor, or redesign the core silhouette (wider top).
- CRT glass glare: the desk spot makes a bright highlight in the middle of the screen. Consider moving the desk light,
  a rougher screen, or a glass-reflection map so the boot logo stays clean.
- The monitor first emerges above the frame (you're looking ahead). Possibly a scripted glance up as it drops.
- Fluorescent warmth/greenness, bloom strength, walk speed (8.1 s).

## NMS FYI OS (stage 6)
- **Architecture:** the usable desktop is real HTML (`DesktopOS`): crisp text, accessible, indexable, normal links
  and forms. The 3D monitor shows a *drawing* of the same desktop (`MonitorScreen.drawDesktop()`) made from the
  same art (`os/art.js`), app list (`os/desktopModel.js`) and proportions (`os/layout.js`), so they match.
  Keep the two in sync when the desktop changes (icons, taskbar).
- **Boot hand-off:** monitor clock `MONITOR.desktopAt = total + 2.0` (7.6 s): the screen goes 0.25 s black, then the
  desktop fades in; monitor emits `desktop` -> `focus.enable()` + `sound.startupChime()` (original Eb arpeggio + pad).
  The boot progress bar fills over `MonitorScreen.BOOT_SECONDS = 4.9`, so it completes just before.
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

## Desk, controls & monitor stowing (change round 2, 2026-11-09)
- **Mouse:** `scene/mouse.js`: an unbranded two-button mouse in the spirit of IBM's PS/2-era mouse (to go with the
  Model M): boxy, pale gray, top sloping toward the hand, buttons split by a groove, on a dark pad right of the keyboard.
  The cable runs a short tidy path into a **round desk grommet** behind the pad. The user rejected the cable trailing
  off the back of the desk as messy, so keep cable management clean.
- **Click sound:** `sound.uiClick('press' | 'release')` on every pointer down/up inside the desktop (`DesktopOS` onClick).
  It plays on a separate `ui` bus straight into the compressor, so it is NOT ducked while the desktop is open; it still
  follows mute. Peaks: press ~0.23, release ~0.12.
- **F key:** after exiting the desktop (`focus.state === 'ready'`, monitor 'down'), F calls `monitor.raise()`:
  RAISE timeline (monitor.js) = CRT collapse-to-dot power-off (`screen.shutdown()`, 0.6 s), housing levels
  (0.3 to 1.0 s), arm retracts (0.7 to 4.1 s), doors close (4.15 to 4.95 s), then 'stowed'. Sound: `sound.monitorRaise(RAISE)`
  (zap, servo blip, motor at 1.12x pitch, hiss, door thump, latch). F again runs `monitor.start()`: full descent + boot
  to the desktop, which re-enables E. Descent and raise share `applyPose()`. Keyboard only (no F on touch).
  Bonus: with the monitor stowed, the supercomputer is fully visible.
- **Controls UI:** no persistent key prompts on keyboard devices (user: cleaner). **Tab** toggles the controls panel
  (`ui/hotkeys.js`, right side). Inapplicable keys are dimmed and it live-refreshes on monitor events. A small "Tab Controls" hint
  fades in once, the first time the terminal becomes usable. Tab is only captured in the 3D view (gate gone, desktop
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
