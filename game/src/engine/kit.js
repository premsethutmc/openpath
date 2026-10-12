// Small animation kit: easing, springs, cancellable scripts, bending meshes and hanging chains.
// Nothing here knows about the character; it is the part a production tool (Rive, Spine) would replace.

export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;

export const ease = {
  lin: (k) => k,
  in: (k) => k * k * k,
  out: (k) => 1 - Math.pow(1 - k, 3),
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  sine: (k) => 0.5 - Math.cos(Math.PI * k) / 2,
  outSine: (k) => Math.sin((k * Math.PI) / 2),
  // overshoots a little and settles: the default for anything with weight
  back: (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2),
  // anticipates first: dips the wrong way, then goes
  anticipate: (k) => (k < 0.22 ? -0.08 * Math.sin((k / 0.22) * Math.PI) : ease.back((k - 0.22) / 0.78)),
};

/** A damped spring that chases a target; the source of follow-through and settle. */
export class Spring {
  constructor(x = 0, k = 170, d = 20) { this.x = x; this.v = 0; this.t = x; this.k = k; this.d = d; }
  step(dt) {
    // small fixed steps keep stiff springs stable when a phone drops frames
    for (let left = dt; left > 1e-6; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120), a = -this.k * (this.x - this.t) - this.d * this.v;
      this.v += a * h; this.x += this.v * h;
    }
    return this.x;
  }
  snap(x) { this.x = this.t = x; this.v = 0; }
}

export class Cancelled extends Error {}

/**
 * Time for the scene. Scripts are async functions that await `wait` and `tween`;
 * cancelling a scope rejects whatever that script is waiting on, which ends it.
 */
export class Clock {
  constructor() { this.t = 0; this.jobs = new Set(); }
  advance(dt) {
    this.t += dt;
    for (const j of [...this.jobs]) {
      if (j.dead) { this.jobs.delete(j); continue; }
      const k = j.dur <= 0 ? 1 : clamp((this.t - j.t0) / j.dur, 0, 1);
      if (j.fn) j.fn(j.ease(k), k);
      if (k >= 1) { this.jobs.delete(j); j.resolve(); }
    }
  }
  scope() {
    const mine = new Set();
    const add = (dur, fn, e) => new Promise((resolve, reject) => {
      const j = { t0: this.t, dur, fn, ease: e || ease.lin, resolve: () => { mine.delete(j); resolve(); }, reject, dead: false };
      mine.add(j); this.jobs.add(j);
      if (fn) fn(j.ease(0), 0);
    });
    return {
      wait: (sec) => add(sec, null),
      tween: (sec, fn, e = ease.inOut) => add(sec, fn, e),
      /** Animate numeric fields of an object from where they are now. */
      to: (obj, props, sec, e = ease.inOut) => {
        const from = {};
        for (const key in props) from[key] = obj[key];
        return add(sec, (k) => { for (const key in props) obj[key] = lerp(from[key], props[key], k); }, e);
      },
      cancel: () => { for (const j of mine) { j.dead = true; j.reject(new Cancelled()); } mine.clear(); },
      get busy() { return mine.size > 0; },
    };
  }
}
export const run = (p) => p.catch((e) => { if (!(e instanceof Cancelled)) console.error(e); });

/**
 * A textured strip that follows a spine: arms, the braid, the hanging end of the saree.
 * The texture was drawn hanging straight down from its pivot, so texture rows map to
 * distance along the spine and columns to the offset across it.
 */
export class Strip {
  constructor(PIXI, texture, frame, segs = 14) {
    this.r = frame.r; this.segs = segs;
    const n = (segs + 1) * 2;
    const verts = new Float32Array(n * 2), uvs = new Float32Array(n * 2), idx = new Uint16Array(segs * 6);
    for (let i = 0; i <= segs; i++) {
      uvs[i * 4] = 0; uvs[i * 4 + 1] = i / segs; uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = i / segs;
      if (i < segs) { const a = i * 2, o = i * 6; idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2; idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2; }
    }
    this.mesh = new PIXI.Mesh(new PIXI.MeshGeometry(verts, uvs, idx), new PIXI.MeshMaterial(texture));
    this.buf = this.mesh.geometry.getBuffer("aVertexPosition");
    this.tmp = { x: 0, y: 0, nx: 1, ny: 0 };
  }
  /** spine(s, out) fills out.{x,y,nx,ny} for distance s along the strip (s may run past both ends). */
  update(spine, flip = 1) {
    const d = this.buf.data, [rx, ry, rw, rh] = this.r, o = this.tmp;
    for (let i = 0; i <= this.segs; i++) {
      spine(ry + (rh * i) / this.segs, o);
      const a = rx * flip, b = (rx + rw) * flip;
      d[i * 4] = o.x + o.nx * a; d[i * 4 + 1] = o.y + o.ny * a;
      d[i * 4 + 2] = o.x + o.nx * b; d[i * 4 + 3] = o.y + o.ny * b;
    }
    this.buf.update();
  }
}

/** A textured sheet of cloth: every vertex can be pushed around each frame. */
export class Grid {
  constructor(PIXI, texture, frame, cols = 6, rows = 8) {
    this.cols = cols; this.rows = rows;
    const [rx, ry, rw, rh] = frame.r;
    const n = (cols + 1) * (rows + 1);
    this.rest = new Float32Array(n * 2);
    const verts = new Float32Array(n * 2), uvs = new Float32Array(n * 2), idx = new Uint16Array(cols * rows * 6);
    let q = 0;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = (j * (cols + 1) + i) * 2;
      this.rest[k] = rx + (rw * i) / cols; this.rest[k + 1] = ry + (rh * j) / rows;
      uvs[k] = i / cols; uvs[k + 1] = j / rows;
      if (i < cols && j < rows) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, e = c + 1; idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = e; idx[q++] = c; }
    }
    this.mesh = new PIXI.Mesh(new PIXI.MeshGeometry(verts, uvs, idx), new PIXI.MeshMaterial(texture));
    this.buf = this.mesh.geometry.getBuffer("aVertexPosition");
    this.tmp = { x: 0, y: 0 };
  }
  update(fn) {
    const d = this.buf.data, o = this.tmp;
    for (let k = 0; k < this.rest.length; k += 2) { fn(this.rest[k], this.rest[k + 1], o); d[k] = o.x; d[k + 1] = o.y; }
    this.buf.update();
  }
}

/** A hanging chain of points (verlet), pinned at the top: hair and cloth that lag behind the body. */
export class Chain {
  constructor(n, seg, { damp = 0.985, gravity = 2600, stiff = 0.05 } = {}) {
    this.n = n; this.seg = seg; this.damp = damp; this.gravity = gravity; this.stiff = stiff;
    this.p = Array.from({ length: n }, (_, i) => ({ x: 0, y: i * seg, px: 0, py: i * seg }));
    this.acc = 0; this.ready = false;
  }
  /** anchor: where it is pinned. rest(i, out): where the i-th point would hang at rest. scale: character scale. */
  step(dt, ax, ay, rest, scale = 1) {
    const p = this.p, seg = this.seg * scale, o = { x: 0, y: 0 };
    if (!this.ready) { for (let i = 0; i < this.n; i++) { rest(i, o); p[i].x = p[i].px = o.x; p[i].y = p[i].py = o.y; } this.ready = true; }
    this.acc = Math.min(this.acc + dt, 0.05);
    const h = 1 / 120;
    while (this.acc >= h) {
      this.acc -= h;
      for (let i = 1; i < this.n; i++) {
        const q = p[i], vx = (q.x - q.px) * this.damp, vy = (q.y - q.py) * this.damp;
        q.px = q.x; q.py = q.y;
        q.x += vx; q.y += vy + this.gravity * scale * h * h;
        rest(i, o); q.x += (o.x - q.x) * this.stiff; q.y += (o.y - q.y) * this.stiff;
      }
      for (let it = 0; it < 3; it++) {
        p[0].x = ax; p[0].y = ay;
        for (let i = 1; i < this.n; i++) {
          const a = p[i - 1], b = p[i]; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-6, f = (d - seg) / d;
          if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; }
        }
      }
    }
    p[0].x = ax; p[0].y = ay;
  }
}

/** Two-bone reach: given a shoulder and where the wrist should be, find the elbow. */
export function reach(sx, sy, tx, ty, l1, l2, bend, out) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1e-6;
  const max = l1 + l2 - 0.5, min = Math.abs(l1 - l2) + 0.5;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < min) { dx *= min / d; dy *= min / d; d = min; }
  const base = Math.atan2(dy, dx), a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = base + a * bend;
  out.ex = sx + Math.cos(ang) * l1; out.ey = sy + Math.sin(ang) * l1;
  out.wx = sx + dx; out.wy = sy + dy;
  return out;
}
