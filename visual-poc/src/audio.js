// Sound for the scene: Amma's placeholder voice (pre-rendered) and small effects made on the spot.
// Every effect is triggered by the animation that causes it, so sound and movement stay together.

const b64 = (uri) => { const s = atob(uri.slice(uri.indexOf(",") + 1)); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a.buffer; };

export class Sound {
  constructor(voices, url) { this.voices = voices; this.url = url; this.on = true; this.ctx = null; this.buffers = {}; this.playing = null; this.birdTimer = 0; this.offline = false; this.sceneTime = 0; }
  /** The moment sounds are scheduled against: the audio clock, or the scene clock when recording. */
  get t() { return this.offline ? this.sceneTime : this.ctx.currentTime; }

  /** Must be called from a tap: browsers only allow sound after one. */
  async unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(this.ctx.destination);
      this.fx = this.ctx.createGain(); this.fx.gain.value = 5; this.fx.connect(this.master);
      if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
      await Promise.all(Object.entries(this.voices).map(async ([id, v]) => {
        const src = this.url(v.file);
        const data = src.startsWith("data:") ? b64(src) : await (await fetch(src)).arrayBuffer();
        this.buffers[id] = await new Promise((res, rej) => this.ctx.decodeAudioData(data, res, rej));
      }));
    } catch (e) { console.warn("sound unavailable", e); }
  }
  /** Recording: build the soundtrack off-line, scheduled against the scene clock, so it lines up with the frames. */
  async unlockOffline(seconds) {
    this.offline = true; this.sceneTime = 0;
    this.ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.fx = this.ctx.createGain(); this.fx.gain.value = 5; this.fx.connect(this.master);
    await Promise.all(Object.entries(this.voices).map(async ([id, v]) => {
      const src = this.url(v.file);
      const data = src.startsWith("data:") ? b64(src) : await (await fetch(src)).arrayBuffer();
      this.buffers[id] = await new Promise((res, rej) => this.ctx.decodeAudioData(data, res, rej));
    }));
  }
  async renderOffline() {
    const buf = await this.ctx.startRendering(), f = buf.getChannelData(0), pcm = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 32767;
    let bin = ""; const u8 = new Uint8Array(pcm.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.03); }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  /** Start a voice line. Returns the line's data; `voiceTime()` then reports how far into it we are. */
  say(id) {
    const v = this.voices[id];
    this.stopVoice();
    const line = { id, v, t0: null, wall: performance.now() };
    if (this.ctx && this.buffers[id]) {
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = this.buffers[id]; g.gain.value = 0.9; src.connect(g).connect(this.master);
      line.t0 = this.t + 0.03; src.start(line.t0); line.src = src;
    }
    this.playing = line;
    return v;
  }
  stopVoice() { if (this.playing && this.playing.src) { try { this.playing.src.stop(); } catch (e) {} } this.playing = null; }
  /** Seconds into the current line, from the audio clock when there is one. */
  voiceTime(fallback) {
    const l = this.playing; if (!l) return -1;
    return l.t0 !== null && !this.offline && this.ctx.state === "running" ? this.ctx.currentTime - l.t0 : fallback;
  }
  /** Mouth shape for a moment in a line: [shape, openness, loudness]. */
  mouthAt(v, t) {
    if (t < 0 || t > v.dur) return ["rest", 0, 0];
    let cur = v.mouth[0];
    for (const k of v.mouth) { if (k[0] <= t + 0.03) cur = k; else break; }  // lips lead the sound slightly
    return [cur[1], cur[2], v.env[Math.min(v.env.length - 1, Math.floor(t * 50))] || 0];
  }

  tone(f, f2, t, g, type = "sine", at = 0, pan = 0) {
    const a = this.ctx; if (!a || !this.on) return;
    const o = a.createOscillator(), v = a.createGain(), t0 = this.t + at;
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + t);
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + 0.006); v.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    let out = v;
    if (pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; v.connect(p); out = p; }
    o.connect(v); out.connect(this.fx); o.start(t0); o.stop(t0 + t + 0.05);
  }
  noise(t, g, f, f2, q = 1, type = "bandpass", at = 0) {
    const a = this.ctx; if (!a || !this.on) return;
    const n = Math.floor(a.sampleRate * t), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), v = a.createGain(), t0 = this.t + at;
    s.buffer = buf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + t);
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + 0.015); v.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(fl).connect(v).connect(this.fx); s.start(t0);
  }

  /** One footfall: a soft pat on the floor and her anklet answering it. `near` is 0..1 as she approaches. */
  step(near) {
    const g = 0.25 + near * 0.75;
    this.noise(0.07, 0.05 * g, 220, 120, 0.8, "lowpass");
    for (let i = 0; i < 4; i++) this.tone(4300 + Math.random() * 2600, null, 0.05 + Math.random() * 0.06, 0.016 * g, "sine", 0.01 + i * 0.022 + Math.random() * 0.012);
  }
  bangles() { for (let i = 0; i < 3; i++) this.tone(3100 + Math.random() * 1500, null, 0.09, 0.02, "sine", i * 0.03 + Math.random() * 0.02); }
  rustle() { this.noise(0.26, 0.03, 1400, 600, 0.7); }
  paper() { this.noise(0.05, 0.035, 4200, 3000, 1.2, "highpass"); this.noise(0.07, 0.03, 3600, 2400, 1.2, "highpass", 0.07); }
  pop() { this.tone(520, 940, 0.07, 0.06); }
  chime() { [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, null, 0.5, 0.011, "sine", i * 0.07)); }
  giggle() { [620, 700, 640, 560].forEach((f, i) => { this.tone(f, f * 0.82, 0.09, 0.05, "triangle", i * 0.115); this.tone(f * 2, f * 1.7, 0.07, 0.012, "sine", i * 0.115); }); }
  whoosh() { this.noise(0.5, 0.02, 500, 1500, 0.7); }
  chirp() {
    const base = 2600 + Math.random() * 1500, pan = Math.random() * 1.4 - 0.7, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.tone(base * (1 + Math.random() * 0.1), base * (1.25 + Math.random() * 0.2), 0.07, 0.012, "sine", i * 0.1, pan);
  }
  /** Morning outside the window: a bird now and then. */
  ambient(dt) { this.birdTimer -= dt; if (this.birdTimer <= 0) { this.birdTimer = 1.6 + Math.random() * 3.4; this.chirp(); } }
}
