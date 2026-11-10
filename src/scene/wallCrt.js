// Wall CRTs: the twelve screens in the side walls' middle panel columns follow the terminal.
//   * asleep (terminal up in the ceiling): the pixel oil lamp floats around like the old DVD
//     screensaver, changing color at each wall hit
//   * when the terminal is lowered and powers on, they wake (CRT warm-up) one after another and
//     show the LAMPLIGHT OS boot screen with it
//   * once the terminal reaches the desktop they go "live": each one alternates, on its own
//     schedule, between a panning security-camera feed (the four CCTV cameras in the server room)
//     and made-up status readouts for the Lamplight Mainframe or the Lamplight Facility, with a
//     burst of static at each switch. They never mirror the desktop.
//   * when the terminal is raised again they collapse to a dot and fall back asleep.
// Camera feeds: the CCTV views render into four small render targets, one camera per frame
// (round robin), only while some screen shows a feed. The screens are hidden during those renders
// (a screen showing a feed must not sample the target being drawn).
import * as THREE from 'three';
import { getLampSprite, LAMP_VARIANTS, drawLamp } from './lamp.js';
import { CCTV_CAMERAS } from './cctv.js';
import { OS_VERSION } from '../os/desktopModel.js';

const W = 320, H = 224; // canvas per screen (screensaver, boot, readouts, feed overlay)
const FEED_W = 256, FEED_H = 192;
const SCREEN_W = 0.94, SCREEN_H = 0.66;
const BULGE = 0.012; // convex CRT glass
const WARM = 0.6, COLLAPSE = 0.45, DARK_AFTER_COLLAPSE = 0.5;
const BOOT_SECONDS = 4.1; // same fill time as the terminal's own boot bar
const pad = (n, l = 2) => String(n).padStart(l, '0');

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Linear output (the composer's OutputPass tone-maps). Feed: monochrome, contrasty, grainy,
// with the canvas drawn over it as an on-screen overlay. All modes: scanlines, vignette, static.
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform sampler2D feed;
uniform float mode, glow, stat, time, seed;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec4 c = texture2D(map, vUv);
  vec3 col = c.rgb;
  if (mode > 0.5) {
    vec3 f = texture2D(feed, vUv).rgb;
    float l = dot(f, vec3(0.2126, 0.7152, 0.0722));
    float p = pow(clamp(l * 1.8, 0.0, 1.0), 1.0 / 2.2);
    p = clamp((p - 0.5) * 1.3 + 0.52 + (hash(floor(vUv * vec2(${W}.0, ${H}.0)) + fract(time * 7.13) * 91.0 + seed) - 0.5) * 0.24, 0.0, 1.0);
    vec3 g = vec3(pow(p, 2.2)) * vec3(0.9, 1.0, 0.95);
    col = mix(g, c.rgb, c.a);
  }
  float n = hash(floor(vUv * vec2(${W}.0, ${H}.0)) + fract(time * 11.7) * 57.0 + seed);
  col = mix(col, vec3(n * n * 0.8), stat);
  float scan = 0.8 + 0.2 * sin(vUv.y * ${H}.0 * 3.14159);
  vec2 d = vUv - 0.5;
  float vig = clamp(1.0 - dot(d, d) * 1.7, 0.0, 1.0);
  gl_FragColor = vec4(col * scan * vig * glow, 1.0);
}`;

export class WallCRTs {
  /** slots: [{ x, y, z, s }] from buildCommandRoom (x = surface the screen sits on, s = wall side). */
  constructor(slots, { cctv = null } = {}) {
    this.cctv = cctv;
    this.group = new THREE.Group();
    this.group.name = 'wallCrts';
    this.t = 0;
    this.feeds = null; // lazily created render targets, one per CCTV camera
    this.feedTurn = 0;
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;
    const geom = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 16, 12);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / (SCREEN_W / 2), v = pos.getY(i) / (SCREEN_H / 2);
      pos.setZ(i, BULGE * (1 - u * u) * (1 - v * v));
    }
    geom.computeVertexNormals();

    this.screens = slots.map((slot, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        uniforms: {
          map: { value: tex }, feed: { value: this.black }, mode: { value: 0 },
          glow: { value: 1.15 }, stat: { value: 0 }, time: { value: 0 }, seed: { value: i * 13.7 },
        },
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.y = -slot.s * Math.PI / 2; // face into the room
      mesh.position.set(slot.x - slot.s * 0.002, slot.y, slot.z);
      this.group.add(mesh);
      const sprite = getLampSprite();
      // Different start positions, speeds and colors so the screens never move in step.
      return {
        i, canvas, ctx: canvas.getContext('2d'), tex, mat,
        state: 'sleep', st: 0, delay: 0, // state time and pending start delay
        x: 20 + ((i * 67) % (W - sprite.width - 40)),
        y: 16 + ((i * 41) % (H - sprite.height - 32)),
        vx: (i % 2 ? -1 : 1) * (58 + i * 7),
        vy: (i % 3 ? 1 : -1) * (44 + i * 5),
        variant: i % LAMP_VARIANTS.length,
        seg: null, // live segment: { mode: 'feed' | 'readout', cam, kind, left }
        redraw: 0,
        stat: 0,
        vals: null,
      };
    });
    this.screens.forEach((sc) => this.drawSleep(sc));
  }

  // ------------------------------------------------------------------ control
  /** The terminal powered on: wake one after another and show the boot screen. */
  wake() {
    for (const sc of this.screens) this.to(sc, 'warm', sc.i * 0.06 + Math.random() * 0.35);
  }

  /** The terminal reached its desktop: start the feed / readout rotation, staggered. */
  goLive() {
    for (const sc of this.screens) this.to(sc, 'live', 0.2 + Math.random() * 1.1);
  }

  /** The terminal is being raised: collapse and fall asleep. */
  sleep() {
    for (const sc of this.screens) {
      if (sc.state === 'sleep' || sc.state === 'collapse') continue;
      this.to(sc, 'collapse', 0.1 + Math.random() * 0.4);
    }
  }

  /** Jump straight to live (skip flags) / asleep (replays). */
  setLiveNow() { for (const sc of this.screens) this.to(sc, 'live', 0); }
  sleepNow() { for (const sc of this.screens) this.to(sc, 'sleep', 0); }

  to(sc, state, delay) {
    sc.next = state;
    sc.delay = delay;
    if (delay <= 0) this.enter(sc);
  }

  enter(sc) {
    sc.state = sc.next;
    sc.next = null;
    sc.st = 0;
    sc.redraw = 0;
    sc.mat.uniforms.mode.value = 0;
    if (sc.state === 'live') this.nextSegment(sc, true);
  }

  nextSegment(sc, first = false) {
    const prev = sc.seg;
    const feed = first ? sc.i % 2 === 0 : prev?.mode !== 'feed';
    sc.seg = feed
      ? { mode: 'feed', cam: (sc.i + (prev?.cam ?? 0) + 1) % CCTV_CAMERAS.length, left: 7 + Math.random() * 5 }
      : { mode: 'readout', kind: (sc.i + (prev?.n ?? 0)) % 2 ? 'facility' : 'mainframe', n: (prev?.n ?? 0) + 1, left: 6 + Math.random() * 5 };
    if (!first) sc.stat = 1; // burst of static at the switch
    sc.redraw = 0;
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    this.t += dt;
    for (const sc of this.screens) {
      const u = sc.mat.uniforms;
      u.time.value = this.t;
      if (sc.next) {
        sc.delay -= dt;
        if (sc.delay <= 0) this.enter(sc);
      }
      sc.st += dt;
      sc.redraw -= dt;
      sc.stat = Math.max(0, sc.stat - dt * 3.2);
      u.stat.value = sc.stat;
      u.glow.value = 1.15;
      switch (sc.state) {
        case 'sleep': this.stepBounce(sc, dt); if (sc.redraw <= 0) { sc.redraw = 1 / 24; this.drawSleep(sc); } break;
        case 'warm':
          this.drawWarm(sc, Math.min(1, sc.st / WARM));
          if (sc.st >= WARM) { sc.state = 'boot'; sc.st = 0; }
          break;
        case 'boot': if (sc.redraw <= 0) { sc.redraw = 1 / 12; this.drawBoot(sc); } break;
        case 'live': this.stepLive(sc, dt); break;
        case 'collapse':
          this.drawCollapse(sc, Math.min(1, sc.st / COLLAPSE));
          if (sc.st >= COLLAPSE) { sc.state = 'dark'; sc.st = 0; this.clear(sc); }
          break;
        case 'dark': if (sc.st >= DARK_AFTER_COLLAPSE) { sc.state = 'sleep'; sc.st = 0; } break;
        default: break;
      }
    }
  }

  stepBounce(sc, dt) {
    const sp = getLampSprite(LAMP_VARIANTS[sc.variant]);
    sc.x += sc.vx * dt;
    sc.y += sc.vy * dt;
    let hit = false;
    if (sc.x < 0) { sc.x = 0; sc.vx = Math.abs(sc.vx); hit = true; }
    if (sc.x > W - sp.width) { sc.x = W - sp.width; sc.vx = -Math.abs(sc.vx); hit = true; }
    if (sc.y < 0) { sc.y = 0; sc.vy = Math.abs(sc.vy); hit = true; }
    if (sc.y > H - sp.height) { sc.y = H - sp.height; sc.vy = -Math.abs(sc.vy); hit = true; }
    if (hit) sc.variant = (sc.variant + 1) % LAMP_VARIANTS.length;
  }

  stepLive(sc, dt) {
    sc.seg.left -= dt;
    if (sc.seg.left <= 0) this.nextSegment(sc);
    const u = sc.mat.uniforms;
    if (sc.seg.mode === 'feed' && this.feeds) {
      u.mode.value = 1;
      u.feed.value = this.feeds[sc.seg.cam].texture;
      if (sc.redraw <= 0) { sc.redraw = 0.5; this.drawFeedOverlay(sc); }
    } else {
      u.mode.value = 0;
      if (sc.seg.mode === 'feed') { if (sc.redraw <= 0) { sc.redraw = 0.5; this.drawFeedOverlay(sc, true); } }
      else if (sc.redraw <= 0) { sc.redraw = 0.25; this.drawReadout(sc); }
    }
  }

  /** Render the CCTV views the live screens need (one camera per call). */
  renderFeeds(renderer, scene) {
    if (!this.cctv) return;
    const wanted = new Set();
    for (const sc of this.screens) if (sc.state === 'live' && sc.seg?.mode === 'feed') wanted.add(sc.seg.cam);
    if (!wanted.size) return;
    if (!this.feeds) {
      this.feeds = CCTV_CAMERAS.map(() => new THREE.WebGLRenderTarget(FEED_W, FEED_H, { type: THREE.HalfFloatType }));
    }
    const list = [...wanted];
    const cam = list[this.feedTurn++ % list.length];
    const view = this.cctv.cams[cam].view;
    const prevTarget = renderer.getRenderTarget();
    const autoShadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false; // the room's shadows don't change between frames
    this.group.visible = false;
    view.aspect = FEED_W / FEED_H;
    view.updateProjectionMatrix();
    renderer.setRenderTarget(this.feeds[cam]);
    renderer.render(scene, view);
    renderer.setRenderTarget(prevTarget);
    this.group.visible = true;
    renderer.shadowMap.autoUpdate = autoShadows;
  }

  // ------------------------------------------------------------------ drawing
  clear(sc) {
    sc.ctx.fillStyle = '#000';
    sc.ctx.fillRect(0, 0, W, H);
    sc.tex.needsUpdate = true;
  }

  drawSleep(sc) {
    const { ctx } = sc;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#050706';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(getLampSprite(LAMP_VARIANTS[sc.variant]), Math.round(sc.x), Math.round(sc.y));
    sc.tex.needsUpdate = true;
  }

  /** CRT warm-up: a bright line opens vertically into a white flash that fades. */
  drawWarm(sc, k) {
    const { ctx } = sc;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (k > 0.05) {
      const h = Math.max(2, H * Math.pow(Math.min(1, (k - 0.05) / 0.55), 2));
      const a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      ctx.fillStyle = `rgba(235,245,240,${a})`;
      ctx.fillRect(0, (H - h) / 2, W, h);
    }
    sc.tex.needsUpdate = true;
  }

  /** CRT power-off: the picture squeezes into a line, then a dot that fades. */
  drawCollapse(sc, k) {
    const { ctx } = sc;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#eef6f0';
    if (k < 0.45) {
      const h = Math.max(2, H * (1 - k / 0.45));
      ctx.fillRect(0, (H - h) / 2, W, h);
    } else if (k < 0.75) {
      const w = Math.max(3, W * (1 - (k - 0.45) / 0.3));
      ctx.fillRect((W - w) / 2, H / 2 - 1, w, 2);
    } else {
      const a = 1 - (k - 0.75) / 0.25;
      ctx.fillStyle = `rgba(238,246,240,${a})`;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    sc.tex.needsUpdate = true;
  }

  /** The LAMPLIGHT OS boot screen (as on the terminal), with this node's number. */
  drawBoot(sc) {
    const { ctx } = sc;
    ctx.fillStyle = '#0b0906';
    ctx.fillRect(0, 0, W, H);
    drawLamp(ctx, W / 2, 80, 112);
    ctx.fillStyle = '#e9dcc0';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
    ctx.fillText('LAMPLIGHT OS', W / 2, 138);
    ctx.font = '13px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#b9ab8f';
    ctx.fillText(OS_VERSION, W / 2, 156);
    const segs = 16, bw = 160, x0 = (W - bw) / 2, y0 = 172;
    const filled = Math.floor(segs * Math.min(1, sc.st / BOOT_SECONDS));
    ctx.strokeStyle = '#7d6d52';
    ctx.strokeRect(x0 - 2.5, y0 - 2.5, bw + 5, 13);
    ctx.fillStyle = '#d9a25a';
    for (let i = 0; i < filled; i++) ctx.fillRect(x0 + i * (bw / segs) + 1, y0, bw / segs - 2, 8);
    ctx.textAlign = 'left';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#7d6d52';
    ctx.fillText(`NODE ${pad(sc.i + 1)}`, 8, H - 8);
    sc.tex.needsUpdate = true;
  }

  /** Overlay drawn over a camera feed: camera label, time, blinking REC. Transparent elsewhere. */
  drawFeedOverlay(sc, noSignal = false) {
    const { ctx } = sc;
    ctx.clearRect(0, 0, W, H);
    if (noSignal) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    const cam = CCTV_CAMERAS[sc.seg.cam];
    const d = new Date();
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#f2f2ea';
    ctx.textAlign = 'left';
    ctx.fillText(`${cam.label} ${cam.name.replace('SERVER ', '')}`, 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, W - 10, H - 12);
    if (d.getSeconds() % 2 === 0) { ctx.textAlign = 'left'; ctx.fillText('● REC', 10, H - 12); }
    if (noSignal) { ctx.textAlign = 'center'; ctx.fillText('NO SIGNAL', W / 2, H / 2); }
    sc.tex.needsUpdate = true;
  }

  /** Made-up status screens: random-walking numbers, bars and a short log. */
  drawReadout(sc) {
    const { ctx } = sc;
    const mainframe = sc.seg.kind === 'mainframe';
    const ink = mainframe ? '#7dffa6' : '#ffbf5e', dim = mainframe ? '#2f7a4a' : '#8a5c22';
    const v = (sc.vals ||= {
      cpu: 60 + Math.random() * 20, temp: 40 + Math.random() * 3, io: 3200 + Math.random() * 600, jobs: 14,
      busA: 410, busB: 398, flow: 228, cool: 18.4, hum: 41, job: 4400 + sc.i * 37, up: 4 * 3600 + sc.i * 517,
    });
    const walk = (k, s, lo, hi) => { v[k] = Math.min(hi, Math.max(lo, v[k] + (Math.random() - 0.5) * s)); };
    walk('cpu', 6, 35, 97); walk('temp', 0.3, 38, 46); walk('io', 140, 2400, 4800); walk('busA', 3, 395, 430);
    walk('busB', 3, 385, 420); walk('flow', 2, 215, 240); walk('cool', 0.1, 17.6, 19.4); walk('hum', 0.4, 38, 45);
    v.up += 0.25;
    if (Math.random() < 0.08) { v.job++; v.jobs = Math.max(3, v.jobs + (Math.random() < 0.5 ? -1 : 1)); }

    ctx.fillStyle = mainframe ? '#020603' : '#060402';
    ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    const d = new Date();
    ctx.fillText(mainframe ? 'LAMPLIGHT MAINFRAME' : 'LAMPLIGHT FACILITY', 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, W - 10, 20);
    ctx.fillStyle = dim;
    ctx.fillRect(10, 27, W - 20, 1);
    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", monospace';
    const row = (y, label, value, bar) => {
      ctx.fillStyle = ink;
      ctx.fillText(label, 10, y);
      ctx.textAlign = 'right';
      ctx.fillText(value, W - 10, y);
      ctx.textAlign = 'left';
      if (bar !== undefined) {
        ctx.fillStyle = dim;
        ctx.fillRect(120, y - 9, 110, 9);
        ctx.fillStyle = ink;
        ctx.fillRect(120, y - 9, 110 * bar, 9);
      }
    };
    const h = Math.floor(v.up / 3600), mi = Math.floor((v.up % 3600) / 60), s = Math.floor(v.up % 60);
    if (mainframe) {
      row(46, 'STATUS', 'NOMINAL');
      row(64, 'CPU LOAD', `${v.cpu.toFixed(0)}%`, v.cpu / 100);
      row(82, 'CORE TEMP', `${v.temp.toFixed(1)} C`, (v.temp - 30) / 20);
      row(100, 'MEM BANKS', '128/128 ONLINE');
      row(118, 'I/O', `${Math.round(v.io).toLocaleString('en-US')} OPS/S`, v.io / 5000);
      row(136, 'JOB QUEUE', String(v.jobs));
      row(154, 'UPTIME', `${pad(h, 4)}:${pad(mi)}:${pad(s)}`);
      ctx.fillStyle = dim;
      ctx.fillText(`> JOB ${v.job - 1} COMPLETE`, 10, 180);
      ctx.fillStyle = ink;
      ctx.fillText(`> JOB ${v.job} RUNNING${Math.floor(this.t * 2) % 2 ? '_' : ''}`, 10, 198);
    } else {
      row(46, 'POWER BUS A', `${v.busA.toFixed(1)} KW`, v.busA / 500);
      row(64, 'POWER BUS B', `${v.busB.toFixed(1)} KW`, v.busB / 500);
      row(82, 'COOLANT FLOW', `${v.flow.toFixed(0)} L/MIN`, v.flow / 300);
      row(100, 'COOLANT TEMP', `${v.cool.toFixed(1)} C`);
      row(118, 'HUMIDITY', `${v.hum.toFixed(0)}%`, v.hum / 100);
      row(136, 'CCTV', `${CCTV_CAMERAS.length}/${CCTV_CAMERAS.length} ONLINE`);
      row(154, 'CATWALK DOORS', 'SEALED');
      row(172, 'FIRE SUPPRESSION', 'ARMED');
      ctx.fillStyle = ink;
      ctx.fillText(`> HVAC ZONES 1-4 OK${Math.floor(this.t * 2) % 2 ? '_' : ''}`, 10, 198);
    }
    sc.tex.needsUpdate = true;
  }
}
