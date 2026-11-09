// Server-room power-up, driven by the monitor's clock (it starts when the monitor
// sequence starts, so everything happens while the monitor descends).
//
// From the brief and the MODUS reference timing (docs/references.md):
//   breaker 1 -> the supercomputer is picked out first: spots strike (fast flicker,
//                then steady), the ring light comes on, the bands climb the core, and
//                the core's indicator lights cascade on
//   breaker 2 (~1.1 s later, heavier) -> the rest of the room springs to life: the
//                command-room lights dip from the surge, ceiling fixture rows strike like
//                old fluorescent tubes (nearest the window first), room light follows
//                each row, and the data-bank and rack indicators sweep on
// Emits 'breaker' {index, strength}, 'row', 'fans' (audio hooks) and 'lit' when fully powered.

export const REVEAL = {
  breaker1: 2.3, // s after the monitor starts (after the CRT degauss at 1.4 has died away)
  breaker2: 3.4, // rows strike 3.4 / 3.8 / 4.2; the monitor lands at 4.8
  rowStagger: 0.4, // fixture rows strike nearest-first
  backDelay: 0.3, // the back-wall wash after the last row
  bandDelay: 0.12, // first core band after breaker 1
  bandStagger: 0.11, // band i lights at bandDelay + i * bandStagger
  coreLedCascade: 0.9,
  bankCascade: 1.9,
  rackDelay: 0.25,
  rackCascade: 1.3,
  dipDepth: 0.4, // command-room surge dip at breaker 2
  dipDuration: 0.24,
};

/** Old fluorescent tube: a few stuttering strikes, then on with a short warm-up. */
export function fluorescentStrike(t) {
  if (t <= 0) return 0;
  const pattern = [[0.05, 0.85], [0.1, 0], [0.14, 0.6], [0.25, 0.04], [0.3, 1], [0.35, 0.3]];
  for (const [end, v] of pattern) if (t < end) return v;
  return 1 - 0.18 * Math.exp(-(t - 0.35) * 3.5);
}

/** Spotlight / arc-lamp strike: a fast flutter, then it climbs to full. */
export function lampStrike(t) {
  if (t <= 0) return 0;
  if (t < 0.16) return Math.sin(t * 120) > 0 ? 0.85 : 0.2;
  return 0.65 + 0.35 * (1 - Math.exp(-(t - 0.16) * 5));
}

export class Reveal {
  constructor({ coreLights, serverLights, commandLights, panelMats, leds }) {
    this.core = coreLights;
    this.server = serverLights;
    this.leds = leds;
    this.state = 'dark'; // dark | running | lit
    this.t0 = 0;
    this.fired = {};
    this.listeners = {};
    // Remember the command room's normal levels so the surge dip can scale them.
    this.cmdLights = [];
    commandLights.traverse((o) => { if (o.isLight) this.cmdLights.push({ light: o, base: o.intensity }); });
    this.panels = panelMats.map((mat) => ({ mat, base: mat.color.clone() }));
    this.apply(0, () => 0, 1);
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach((fn) => fn(data)); }

  start(now) {
    this.reset();
    this.state = 'running';
    this.t0 = now;
  }

  reset() {
    this.state = 'dark';
    this.fired = {};
    ['core', 'banks', 'racks'].forEach((g) => this.leds.setGroup(g, false));
    this.apply(0, () => 0, 1);
  }

  /** Everything powered (skip-intro / debug). */
  finish() {
    this.state = 'lit';
    this.fired = { b1: true, b2: true };
    ['core', 'banks', 'racks'].forEach((g) => this.leds.forceGroup(g, true));
    this.apply(1, () => 1, 1);
  }

  update(now) {
    if (this.state !== 'running') return;
    const R = REVEAL;
    const t = now - this.t0;

    if (t >= R.breaker1 && !this.fired.b1) {
      this.fired.b1 = true;
      this.emit('breaker', { index: 1, strength: 0.8 });
      this.leds.setGroup('core', true, now, R.coreLedCascade);
    }
    if (t >= R.breaker2 && !this.fired.b2) {
      this.fired.b2 = true;
      this.emit('breaker', { index: 2, strength: 1 });
      this.emit('fans');
      this.leds.setGroup('banks', true, now, R.bankCascade);
      this.leds.setGroup('racks', true, now + R.rackDelay, R.rackCascade);
    }
    // One 'row' event as each fixture row strikes (audio: tube tink + stutter buzz).
    for (let r = 0; r < 3; r++) {
      if (!this.fired['row' + r] && t >= R.breaker2 + r * R.rowStagger) {
        this.fired['row' + r] = true;
        this.emit('row', { row: r });
      }
    }

    const t1 = t - R.breaker1;
    const t2 = t - R.breaker2;
    const core = lampStrike(t1);
    const band = (i) => lampStrike(t1 - R.bandDelay - i * R.bandStagger);
    const row = (r) => fluorescentStrike(t2 - (r < 3 ? r * R.rowStagger : 2 * R.rowStagger + R.backDelay));
    let dip = 1;
    if (t2 > 0 && t2 < R.dipDuration) dip = 1 - R.dipDepth * (Math.sin(t2 * 90) > -0.3 ? 1 : 0.4);
    this.apply(core, row, dip, band);

    if (t2 > 4) {
      this.state = 'lit';
      this.emit('lit'); // fully powered (full.js lowers the terminal 2 s later)
    }
  }

  /**
   * core: supercomputer level (0..1). row(r): level of fixture row r. dip: command-room
   * multiplier. band(i): level of core band i (defaults to `core`).
   */
  apply(core, row, dip, band = () => core) {
    for (const { light, max } of this.core.lights) light.intensity = max * core;
    this.core.fixture.mat.color.copy(this.core.fixture.max).multiplyScalar(core);
    for (const { mat, max, index } of this.core.bands) mat.color.copy(max).multiplyScalar(band(index));
    for (const { light, max, row: r } of this.server.room) light.intensity = max * row(r);
    for (const { mat, max, row: r } of this.server.fixtures) mat.color.copy(max).multiplyScalar(row(r));
    for (const { light, base } of this.cmdLights) light.intensity = base * dip;
    for (const { mat, base } of this.panels) mat.color.copy(base).multiplyScalar(dip);
  }
}
