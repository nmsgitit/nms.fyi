// Procedural sound design (Web Audio API). No audio files: everything is synthesized,
// so there are no licensing issues and nothing to download.
//
// Routing:
//   room bus   (command room: footsteps, hatch, motor, CRT, hum) -> dry + short reverb
//   server bus (beyond the glass: fans, tube buzz, transformer hum) -> glass low-pass
//              -> quiet dry + long reverb, so it reads as muffled and far away
//   fx bus     (building-wide breaker clunks) -> dry + long reverb
//   all -> master gain -> compressor -> analyser -> speakers
//
// The engine accepts any BaseAudioContext, so sounds can be rendered offline
// (OfflineAudioContext) for automated level checks.

const rand = (a, b) => a + Math.random() * (b - a);

function noiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function pinkBuffer(ctx, seconds) {
  // Paul Kellet's pink-noise filter: a natural, airy hiss for fans and room tone.
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function impulse(ctx, seconds, decay) {
  // Synthetic reverb tail: stereo noise with an exponential decay.
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export class SoundDesign {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.85;
    this.loops = { room: [], server: [] }; // sustained sources we may need to stop
    this.flags = {};
  }

  get ready() { return !!this.ctx; }
  now() { return this.ctx.currentTime; }

  /** Create (or resume) the audio context. Call from a user gesture in the browser. */
  async start(ctx) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && this.ctx.resume) await this.ctx.resume();
      return;
    }
    this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    this.build();
    if (!(this.ctx instanceof OfflineAudioContext) && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  build() {
    const c = this.ctx;
    this.noise = noiseBuffer(c, 3);
    this.pink = pinkBuffer(c, 6);

    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(comp).connect(this.analyser).connect(c.destination);

    const smallVerb = c.createConvolver(); smallVerb.buffer = impulse(c, 0.9, 3.2);
    const bigVerb = c.createConvolver(); bigVerb.buffer = impulse(c, 3.0, 2.2);
    smallVerb.connect(this.master);
    bigVerb.connect(this.master);

    // Command room.
    this.room = c.createGain();
    this.room.connect(this.master);
    const roomSend = c.createGain(); roomSend.gain.value = 0.22;
    this.room.connect(roomSend).connect(smallVerb);

    // Beyond the glass.
    this.server = c.createGain();
    const glass = c.createBiquadFilter(); glass.type = 'lowpass'; glass.frequency.value = 1400; glass.Q.value = 0.5;
    const serverDry = c.createGain(); serverDry.gain.value = 0.55;
    const serverSend = c.createGain(); serverSend.gain.value = 0.6;
    this.server.connect(glass);
    glass.connect(serverDry).connect(this.master);
    glass.connect(serverSend).connect(bigVerb);

    // Building-wide effects (breakers).
    this.fx = c.createGain();
    this.fx.connect(this.master);
    const fxSend = c.createGain(); fxSend.gain.value = 0.4;
    this.fx.connect(fxSend).connect(bigVerb);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const g = this.master.gain;
    g.cancelScheduledValues(this.now());
    g.setTargetAtTime(muted ? 0 : this.volume, this.now(), 0.05);
  }

  /** Current output level (RMS, 0..1). For metering and tests. */
  level() {
    if (!this.analyser) return 0;
    const a = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(a);
    let s = 0;
    for (const v of a) s += v * v;
    return Math.sqrt(s / a.length);
  }

  // ------------------------------------------------------------------ primitives
  env(param, t, attack, peak, decay) {
    // A gain node sits at 1.0 until its first automation event, so a source started even a
    // few ms before `t` would blast at full volume. Hold it silent from right now.
    param.value = 0.0001;
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Filtered noise burst. */
  burst(t, { dur, type = 'bandpass', freq, Q = 1, peak, attack = 0.002, decay, dest }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q;
    const g = c.createGain();
    this.env(g.gain, t, attack, peak, decay ?? dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, rand(0, 2));
    src.stop(t + dur + 0.05);
  }

  /** Pitched thump: sine (or other wave) with an exponential pitch drop. */
  thump(t, { f0, f1, dur, peak, attack = 0.003, dest, type = 'sine' }) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    this.env(g.gain, t, attack, peak, dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }

  /** Sustained tone that fades in; returns a handle for stopping. */
  tone(t, { type = 'sine', freq, gain, fadeIn = 0.5, dest, filter }) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + fadeIn);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = filter.type; f.frequency.value = filter.freq; f.Q.value = filter.Q ?? 1; node = node.connect(f); }
    node.connect(g).connect(dest);
    o.start(t);
    return { src: o, gain: g };
  }

  stopLoops(bus, fade = 0.3) {
    const t = this.now();
    for (const h of this.loops[bus]) {
      h.gain.gain.cancelScheduledValues(t);
      h.gain.gain.setTargetAtTime(0.0001, t, fade / 3);
      h.src.stop(t + fade + 0.1);
    }
    this.loops[bus] = [];
  }

  // ------------------------------------------------------------------ the sounds

  /** One footfall on the rubber walkway mat. e = { intensity, foot } from walk.js. */
  footstep(e = {}, t = this.now()) {
    const k = (e.intensity ?? 1) * rand(0.85, 1.12);
    const p = rand(0.9, 1.1);
    // heel: soft low thump + damped scuff
    this.thump(t, { f0: 115 * p, f1: 48, dur: 0.12, peak: 0.42 * k, dest: this.room });
    this.burst(t, { dur: 0.09, freq: 720 * p, Q: 1.1, peak: 0.26 * k, decay: 0.07, dest: this.room });
    // toe: lighter, a moment later
    const t2 = t + rand(0.045, 0.065);
    this.burst(t2, { dur: 0.06, freq: 1250 * p, Q: 1.4, peak: 0.11 * k, decay: 0.05, dest: this.room });
  }

  /** Room tone from the start: an old fluorescent fixture's 120 Hz buzz and soft air. */
  ambience(t = this.now()) {
    if (this.flags.ambience) return;
    this.flags.ambience = true;
    const c = this.ctx;
    this.tone(t, { freq: 120, gain: 0.006, fadeIn: 1.5, dest: this.room });
    this.tone(t, { type: 'triangle', freq: 240, gain: 0.0025, fadeIn: 1.5, dest: this.room });
    const air = c.createBufferSource(); air.buffer = this.pink; air.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 2);
    air.connect(lp).connect(g).connect(this.room);
    air.start(t);
  }

  /**
   * The whole monitor sequence, scheduled up front from monitor.js's MONITOR timings:
   * hatch latch + pneumatic hiss + door stop, the arm motor whose pitch follows the
   * descent speed, the arrival clunk + spring, and the CRT power-on.
   */
  monitorSequence(M, t0 = this.now()) {
    const c = this.ctx, room = this.room;
    // Hatch latch.
    this.burst(t0, { dur: 0.05, freq: 2300, Q: 3, peak: 0.35, decay: 0.04, dest: room });
    this.thump(t0, { f0: 95, f1: 50, dur: 0.16, peak: 0.3, dest: room });
    // Pneumatic hiss while the doors swing.
    {
      const src = c.createBufferSource(); src.buffer = this.noise;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2800;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.07, t0 + 0.08);
      g.gain.setValueAtTime(0.06, t0 + M.doorsOpen * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + M.doorsOpen + 0.15);
      src.connect(hp).connect(g).connect(room);
      src.start(t0, rand(0, 1)); src.stop(t0 + M.doorsOpen + 0.3);
    }
    // Doors hit their stops.
    const td = t0 + M.doorsOpen;
    this.thump(td, { f0: 72, f1: 40, dur: 0.2, peak: 0.32, dest: room });
    this.burst(td, { dur: 0.12, freq: 480, Q: 1.2, peak: 0.14, decay: 0.11, dest: room });

    // Arm motor: a geared servo whine; pitch and level track the eased descent speed.
    const ts = t0 + M.descentStart, dur = M.descentDur, te = ts + dur;
    const N = 64;
    const speed = (k) => (k < 0.5 ? 12 * k * k : 3 * Math.pow(2 - 2 * k, 2)) / 3; // d/dk easeInOutCubic, 0..1
    const fA = new Float32Array(N), fB = new Float32Array(N), gA = new Float32Array(N), rA = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), v = speed(k);
      const edge = Math.min(1, k / 0.06, (1 - k) / 0.06); // soft start/stop
      fA[i] = 62 + 125 * v;
      fB[i] = fA[i] * 1.503;
      gA[i] = Math.max(0.0001, 0.075 * (0.25 + 0.75 * v) * edge);
      rA[i] = Math.max(0.0001, 0.025 * v * edge);
    }
    const saw = c.createOscillator(); saw.type = 'sawtooth';
    const sq = c.createOscillator(); sq.type = 'square';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 2;
    const mg = c.createGain(); mg.gain.value = 0.0001;
    const sqg = c.createGain(); sqg.gain.value = 0.35;
    saw.connect(lp); sq.connect(sqg).connect(lp); lp.connect(mg).connect(room);
    saw.frequency.setValueCurveAtTime(fA, ts, dur);
    sq.frequency.setValueCurveAtTime(fB, ts, dur);
    mg.gain.setValueCurveAtTime(gA, ts, dur);
    saw.start(ts); sq.start(ts); saw.stop(te + 0.05); sq.stop(te + 0.05);
    // Gear rattle riding on the whine.
    {
      const src = c.createBufferSource(); src.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 4;
      const g = c.createGain(); g.gain.value = 0.0001;
      src.connect(bp).connect(g).connect(room);
      g.gain.setValueCurveAtTime(rA, ts, dur);
      src.start(ts, rand(0, 1)); src.stop(te + 0.05);
    }
    // Arrival: clunk, then a little spring twang from the sway.
    this.thump(te, { f0: 82, f1: 44, dur: 0.26, peak: 0.22, dest: room });
    this.burst(te, { dur: 0.08, freq: 900, Q: 1.5, peak: 0.08, decay: 0.08, dest: room });
    {
      const o = c.createOscillator(); o.frequency.value = 205;
      const vib = c.createOscillator(); vib.frequency.value = 7;
      const vg = c.createGain(); vg.gain.value = 6;
      vib.connect(vg).connect(o.frequency);
      const g = c.createGain();
      this.env(g.gain, te + 0.02, 0.01, 0.035, 0.7);
      o.connect(g).connect(room);
      o.start(te); vib.start(te); o.stop(te + 0.9); vib.stop(te + 0.9);
    }
    // CRT power-on.
    this.crtOn(t0 + M.screenOn);
  }

  /** CRT power-on: degauss "bwoom", static crackle, then a faint flyback whine. */
  crtOn(t = this.now()) {
    const c = this.ctx, room = this.room;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = c.createGain();
    this.env(g.gain, t, 0.012, 0.16, 0.85);
    o.connect(lp).connect(g).connect(room);
    o.start(t); o.stop(t + 1);
    this.thump(t, { f0: 120, f1: 60, dur: 0.6, peak: 0.08, dest: room });
    for (let i = 0; i < 14; i++) {
      this.burst(t + rand(0, 0.4), { dur: 0.012, type: 'highpass', freq: 3500, peak: rand(0.04, 0.12), decay: 0.01, dest: room });
    }
    // Flyback transformer whine (~15.7 kHz), kept very quiet.
    const whine = this.tone(t + 0.2, { freq: 15700, gain: 0.0035, fadeIn: 0.6, dest: room });
    this.loops.room.push(whine);
  }

  /** Main breaker throw. strength 0..1 (breaker 2 is heavier and adds a low boom). */
  breaker(strength = 1, t = this.now()) {
    const s = strength, fx = this.fx, c = this.ctx;
    // Metallic clack (two quick contacts).
    this.burst(t, { dur: 0.06, freq: 2600, Q: 2.5, peak: 0.75 * s, decay: 0.05, dest: fx });
    this.burst(t + 0.014, { dur: 0.05, freq: 4200, Q: 3, peak: 0.32 * s, decay: 0.04, dest: fx });
    // Heavy body thud.
    this.thump(t, { f0: 58, f1: 34, dur: 0.5, peak: 0.85 * s, dest: fx });
    // Electrical buzz as the load comes on.
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = c.createGain();
    this.env(g.gain, t + 0.01, 0.01, 0.22 * s, 0.55);
    o.connect(lp).connect(g).connect(fx);
    o.start(t); o.stop(t + 0.7);
    if (s >= 1) {
      // Sub boom for the big one, then the transformer hum settles in behind the glass.
      this.thump(t + 0.01, { f0: 40, f1: 26, dur: 1.4, peak: 0.7, dest: fx });
      if (!this.flags.transformer) {
        this.flags.transformer = true;
        this.loops.server.push(this.tone(t + 0.1, { freq: 60, gain: 0.05, fadeIn: 1.5, dest: this.server }));
        this.loops.server.push(this.tone(t + 0.1, { freq: 180, gain: 0.018, fadeIn: 1.5, dest: this.server }));
        this.loops.server.push(this.tone(t + 0.1, { type: 'triangle', freq: 300, gain: 0.008, fadeIn: 1.5, dest: this.server }));
      }
    }
  }

  /** A row of fluorescent tubes striking behind the glass: tink + stuttering buzz, then a steady hum. */
  tubeStrike(row = 0, t = this.now()) {
    const c = this.ctx, dest = this.server;
    this.thump(t, { f0: 2200 + row * 260, f1: 1800, dur: 0.05, peak: 0.07, dest });
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 120;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
    const g = c.createGain();
    // Same stutter as reveal.js fluorescentStrike(), then settle to a quiet hum.
    const pat = [[0, 0.85], [0.05, 0], [0.1, 0.6], [0.14, 0.04], [0.25, 1], [0.3, 0.3], [0.35, 0.8]];
    g.gain.setValueAtTime(0.0001, t);
    for (const [dt, v] of pat) g.gain.setValueAtTime(Math.max(0.0001, v * 0.05), t + dt);
    g.gain.setTargetAtTime(0.009, t + 0.4, 0.4);
    o.connect(bp).connect(g).connect(dest);
    o.start(t);
    this.loops.server.push({ src: o, gain: g });
  }

  /** Server fans spin up behind the glass: airy roar + a few blade tones, fading in. */
  fans(t = this.now()) {
    if (this.flags.fans) return;
    this.flags.fans = true;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.pink; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000;
    const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 230; pk.Q.value = 3; pk.gain.value = 6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.17, t + 3.5); // "faint" per the brief: well under the footsteps
    src.connect(lp).connect(pk).connect(g).connect(this.server);
    src.start(t);
    this.loops.server.push({ src, gain: g });
    for (const [f, a] of [[147, 0.011], [196, 0.009], [233, 0.007]]) {
      const h = this.tone(t, { freq: f, gain: a, fadeIn: 3.5, dest: this.server });
      // Slow beating so the blades don't sound like a test tone.
      const lfo = c.createOscillator(); lfo.frequency.value = rand(0.15, 0.4);
      const lg = c.createGain(); lg.gain.value = rand(1.5, 3);
      lfo.connect(lg).connect(h.src.frequency);
      lfo.start(t);
      this.loops.server.push(h);
    }
  }

  /** Steady powered-room sound without the power-up events (skip-intro). */
  serverAmbience(t = this.now()) {
    this.fans(t);
    if (!this.flags.transformer) {
      this.flags.transformer = true;
      this.loops.server.push(this.tone(t, { freq: 60, gain: 0.05, fadeIn: 1.5, dest: this.server }));
      this.loops.server.push(this.tone(t, { freq: 180, gain: 0.018, fadeIn: 1.5, dest: this.server }));
    }
    const o = this.tone(t, { type: 'square', freq: 120, gain: 0.02, fadeIn: 1.5, dest: this.server, filter: { type: 'bandpass', freq: 900, Q: 2 } });
    this.loops.server.push(o);
  }

  /** Server room back to silent (replays/debug). */
  resetServer() {
    if (!this.ctx) return;
    this.stopLoops('server');
    this.flags.fans = false;
    this.flags.transformer = false;
  }

  /** Monitor back to off (replays/debug). */
  resetMonitor() {
    if (!this.ctx) return;
    this.stopLoops('room', 0.1);
  }
}
