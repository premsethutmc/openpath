// One small Web Audio voice box for every instrument. Nothing plays until the learner acts.
const toggle = document.getElementById('audio');
let ctx, master, voice, noise;

function open() {
  if (!toggle.checked) return null;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) { toggle.checked = false; return null; }
  if (!ctx) {
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = .8;
    master.connect(ctx.destination);
  }
  ctx.resume().catch(() => { toggle.checked = false; });
  return ctx;
}

toggle.addEventListener('change', () => {
  if (!ctx) return;
  master.gain.setTargetAtTime(toggle.checked ? .8 : 0, ctx.currentTime, .008);
  if (!toggle.checked && voice) voice.gain.setTargetAtTime(0, ctx.currentTime, .008);
});

// partials: [multiple of hz, level, decay seconds]; bend: pitch at the end as a fraction.
function strike(gain, hz, partials, { attack = .008, bend = 1, replace = true } = {}) {
  try {
    const a = open();
    if (!a) return;
    const now = a.currentTime;
    if (replace && voice) voice.gain.setTargetAtTime(0, now, .012);
    const v = a.createGain();
    v.gain.value = gain;
    v.connect(master);
    if (replace) voice = v;
    let left = partials.length;
    for (const [multiple, level, decay] of partials) {
      const wave = a.createOscillator(), env = a.createGain();
      wave.frequency.value = hz * multiple;
      if (bend !== 1) wave.frequency.exponentialRampToValueAtTime(hz * multiple * bend, now + decay * .6);
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(level, now + attack);
      env.gain.exponentialRampToValueAtTime(.0001, now + decay);
      wave.connect(env); env.connect(v);
      wave.onended = () => { wave.disconnect(); env.disconnect(); if (!--left) { v.disconnect(); if (voice === v) voice = null; } };
      wave.start(now); wave.stop(now + decay + .02);
    }
    return { ctx: a, now, out: v };
  } catch { toggle.checked = false; }
}

// A short bright attack, then the higher partials decay faster.
export const playString = n => strike(n.gain, n.hz, [[1,.84,.9],[2,.28,.77],[3,.12,.64],[4,.07,.51]]);
export const playDrum = n => strike(n.gain, n.hz, [[1,.9,.7],[1.5,.35,.35],[2.3,.15,.2]], { attack: .004, bend: .86, replace: false });
export const playBell = n => strike(n.gain, n.hz, [[1,.7,1.3],[2.76,.25,.8],[5.4,.1,.45]], { attack: .003, replace: false });
export const playTone = hz => strike(.05, hz, [[1,1,1.1]], { attack: .05 });

export function playBottle(n) {
  const made = strike(n.gain, n.hz, [[1,.8,.75],[2,.08,.5]], { attack: .07 });
  if (!made) return;
  try { // a breath of air across the mouth of the bottle
    const { ctx: a, now, out } = made;
    if (!noise) {
      noise = a.createBuffer(1, a.sampleRate * .8, a.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = a.createBufferSource(), band = a.createBiquadFilter(), env = a.createGain();
    src.buffer = noise; band.type = 'bandpass'; band.frequency.value = n.hz; band.Q.value = 3;
    env.gain.setValueAtTime(.0001, now);
    env.gain.exponentialRampToValueAtTime(.25, now + .06);
    env.gain.exponentialRampToValueAtTime(.0001, now + .7);
    src.connect(band); band.connect(env); env.connect(out);
    src.onended = () => { src.disconnect(); band.disconnect(); env.disconnect(); };
    src.start(now); src.stop(now + .72);
  } catch {}
}
