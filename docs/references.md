# Reference notes

These notes are written descriptions of the reference material the user supplied.
The frames themselves are in `reference/` (gitignored, since they're copyrighted
game footage and only for private reference). We take mood, pacing, and design
language from these sources. We do **not** copy their models, layouts, logos,
audio, or exact designs. Everything in the site has to be original.

Source files are on the user's machine:
- `~/Downloads/Fallout 76： MODUS' Introduction-xqqjKI-F2KM.mp4` (1280×720, 29.97 fps, 124.5 s)
- `~/Downloads/Apollo Core - Alien  Isolation-hBwreMMYcoU.mp4` (1280×720, 29.97 fps, 87.1 s)
- High-quality still of the Apollo Core data terminal: `reference/apollo/terminal_still.webp`

Regenerate frames with ffmpeg inside claudebox (the host's Fedora ffmpeg can't
decode H.264). The exact commands are in CLAUDE.md under "Reference material".

---

## 1. MODUS introduction (0:04–0:34, checked through 0:39): the opening sequence model

**Why it matters:** this is the model for what happens when the site opens.
The visitor walks into a lit room toward a terminal that looks out over a large
dark space through a glass wall. That space then comes to life in stages.

### Timeline (seconds in source video)
| Time | What happens |
|---|---|
| 4–7 s | First-person walk through a doorway into a dimly lit office, straight toward a terminal on a pedestal at the glass. Gentle walking head-bob. The space beyond the glass is pitch black. It takes about 3 s to cross the room. |
| 7–18 s | The player stops in front of the terminal. MODUS speaks. Beyond the glass is still completely dark. |
| **19.25 s** | **Audio transient (probable breaker clunk).** The first lights appear: clusters of small round blue-white indicator lights switch on bank by bank on the left and right walls of the server room. Some orange/red ones appear far left. |
| 19–22 s | More indicator clusters cascade on over ~3 s. The player looks up past the terminal toward the window. |
| 23–32 s | Low ambient light. The room's structure is faintly visible: window mullions, ceiling trusses, a tall dark alcove at the center. The indicators keep glowing. |
| 33 s | **The central supercomputer is lit first** by cold blue-white light from above. It's a tall, symmetrical, rounded industrial machine. |
| **34.0 s** | **Second audio transient (probable second breaker clunk).** The rest of the room brightens about 1 s after the center. Walls of server banks full of round lights become visible. |
| 34–39 s | The whole room is lit. The camera holds on the view through the glass. |

Loudness jumps (>6 dB within 0.25 s) were at 7.75 s, 19.25 s, 31.0 s, 34.0 s, and 39.25 s.
Dialogue is mixed in, so these transients are inferred, not isolated.
The light stages at 19 s and 34 s line up with transients, which is consistent
with breaker sounds. The user's brief explicitly asks for a breaker sound plus
faint server fan noise from beyond the glass.

### Pacing takeaways
- Stage 1: scattered small indicator lights wake up (sparse, cascading).
- Stage 2: the center hero object gets a top-down key light.
- Stage 3 (about 1 s later): the whole room floods with light.
- Each big power-on is marked by a heavy electrical clunk.
- The reveal is slow and confident. The camera stays still and lets the room perform.

---

## 2. Apollo Core / Alien: Isolation (0:22–0:31) plus the still: the aesthetic model

**Why it matters:** this is the styling target. The user wants late-'80s
retro-futurism for the 3D elements (the sequence itself matters less).

### Room
- An octagonal or faceted chamber with a low ceiling made of stepped, recessed
  octagonal tiers.
- Walls made of rectangular panels with recessed seams. Many panels are covered
  in **sparse grids of tiny warm-white/yellow pinpoint indicator lights**,
  like a starfield, which is a signature detail.
- Small square inset displays (dark screens with simple vector graphics: a
  globe, a dial, a schematic) set into the wall panels at eye height.
- A chunky angular doorway with thick, slab-like rounded-over jambs.
- A dark charcoal floor with ribbed rubber mats and thin white edge trim
  following the room's facets.
- Lighting is high contrast: strong key light, deep shadows, and a slightly
  warm cast in the source. **Our brief wants sterile white light instead.**
- Post-processing look: mild bloom, light film grain, slight chromatic softness.

### Data terminal (see the still)
- A beige/off-white ("computer beige", taupe) **chunky, angular** console fused
  into a pod-like seat structure with tall side wings.
- The CRT housing is a trapezoid/wedge with a deeply inset dark screen,
  horizontal vent slots under the screen, and a **cyan status LED**.
- A **row of round white indicator buttons** sits across the deck above the keyboard.
- Side panels are angled toward the user with rows of chunky square buttons,
  plus a few amber/orange ones.
- The keyboard has beige keycaps with sculpted rows, a few colored legends,
  and a separate numeric/function cluster.
- The screen is green phosphor. The boot shows a circuit-board "brain" emblem,
  then scrolling data tables.
- **Brief deviation:** our overhead monitor casing must be **more bulbous /
  rounded** than this sharp-edged design (think soft, pillowy 1980s plastic
  shells and rounded CRT bezels).

### Palette guidance for nms.fyi (from the brief, not the game)
Sterile white light. Surfaces in white, light gray, and 1980s taupe/beige.
Accents come only from indicator LEDs (cool white/cyan, a little amber) and the
screen. No saturated wall colors.
