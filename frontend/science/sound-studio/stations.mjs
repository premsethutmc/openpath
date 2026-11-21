import { bottleNote, drumNote, bellNote, pumpOnce, stringNote, compareNotes, wavePath, perSecond,
  LISTENERS, HEAR_MIN, HEAR_MAX, sliderToHz, hears, kind, FRETS } from './model.mjs';
import { playBottle, playDrum, playBell, playTone, playString } from './audio.mjs';
import { report, onLeave, onConcert, toast } from './journey.mjs';

const get = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const still = matchMedia('(prefers-reduced-motion: reduce)');
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const wiggle = (el, frames, ms) => { if (!still.matches && el.animate) el.animate(frames, { duration: ms, easing: 'ease-out' }); };

/* ---------- Bottle band ---------- */
const shelf = get('shelf');
const water = [45, 10, 70, 25, 55];
const BOTTLE = 'M24 6h12v26q0 8 9 15t9 22v57q0 6-6 6H12q-6 0-6-6V69q0-15 9-22t9-15Z';
let lastBottle, busy = false;
const bottles = water.map((w, i) => {
  const col = document.createElement('div');
  col.className = 'bottle-col';
  const btn = document.createElement('button');
  btn.className = 'bottle';
  btn.setAttribute('aria-label', `Blow bottle ${i + 1}`);
  const svg = svgEl('svg', { viewBox: '0 0 60 140', 'aria-hidden': 'true' });
  const clip = svgEl('clipPath', { id: `bottle-${i}` });
  clip.append(svgEl('path', { d: BOTTLE }));
  const liquid = svgEl('rect', { x: 0, width: 60, height: 140, fill: '#4aa3d8', 'clip-path': `url(#bottle-${i})` });
  const breath = svgEl('path', { class: 'breath', d: 'M14 2q8-6 16 0t16 0', fill: 'none', stroke: '#cfeefa', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  svg.append(clip, svgEl('path', { d: BOTTLE, fill: '#cfeefa', 'fill-opacity': '.12' }), liquid,
    svgEl('path', { d: BOTTLE, fill: 'none', stroke: '#cfeefa', 'stroke-width': 2.5 }), breath);
  btn.append(svg);
  const range = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 85, step: 5, value: w });
  range.setAttribute('aria-label', `Water in bottle ${i + 1}`);
  col.append(btn, range);
  shelf.append(col);
  const fill = () => {
    const v = range.valueAsNumber;
    liquid.setAttribute('y', (132 - 126 * v / 100).toFixed(1));
    range.setAttribute('aria-valuetext', v ? `${v}% water` : 'Empty');
  };
  range.addEventListener('input', fill);
  fill();
  btn.addEventListener('click', () => { if (!busy) blow(i); });
  return { btn, range, fill };
});

function blow(i, quiet) {
  const b = bottles[i], note = bottleNote(b.range.valueAsNumber / 100);
  playBottle(note);
  b.btn.classList.remove('sing'); void b.btn.offsetWidth; b.btn.classList.add('sing');
  get('b-wave').setAttribute('d', wavePath(note.hz, note.amplitude, .006));
  get('b-hz').textContent = `Bottle ${i + 1}: ${perSecond(note.hz)} shakes a second`;
  if (!quiet) {
    get('b-notice').textContent = lastBottle ? compareNotes(lastBottle, note) : 'Hear the air hum? Now try a bottle with more water.';
    report({ station: 'bottles', type: 'blow', note });
  }
  lastBottle = note;
  return note;
}

get('blow-all').addEventListener('click', () => {
  if (busy) return;
  busy = true;
  const notes = [];
  bottles.forEach((_, i) => setTimeout(() => {
    notes.push(blow(i, true));
    if (i < bottles.length - 1) return;
    busy = false;
    const up = notes.every((n, k) => !k || n.hz > notes[k - 1].hz + 1);
    get('b-notice').textContent = up ? 'Up and up, like Sa Ri Ga Ma Pa!' : 'Not climbing yet. Which bottle sounds too low?';
    report({ station: 'bottles', type: 'scale', notes });
  }, i * 380));
});
get('empty-all').addEventListener('click', () => {
  bottles.forEach(b => { b.range.value = 0; b.fill(); });
  get('b-notice').textContent = 'All empty. Every bottle now sounds the same.';
});

/* ---------- Drum ---------- */
const tight = get('tight'), skin = get('skin'), rice = get('rice'), straps = get('straps');
let lastHit;
for (let k = 0; k < 13; k++) {
  const x = 116 + k * 20.7, sag = Math.sin(Math.PI * (x - 110) / 260) * 30;
  straps.append(svgEl('path', { d: `M${x.toFixed(1)} ${(92 + sag).toFixed(1)}L${(x + 3).toFixed(1)} ${(170 + sag).toFixed(1)}` }));
}
const grains = [[200,88],[226,104],[262,80],[284,98],[180,100],[308,90],[244,73],[214,78],[270,108]].map(([x, y], k) => {
  const g = svgEl('g');
  g.append(svgEl('ellipse', { cx: x, cy: y, rx: 6.5, ry: 3.2, transform: `rotate(${(k * 47) % 180} ${x} ${y})` }));
  rice.append(g);
  return g;
});
function strap() {
  const t = tight.valueAsNumber;
  straps.setAttribute('stroke-width', (1.5 + t / 50).toFixed(1));
  tight.setAttribute('aria-valuetext', t < 90 ? 'Loose' : t > 110 ? 'Tight' : 'Middle');
}
tight.addEventListener('input', strap);
strap();
function hit(strength) {
  const note = drumNote(tight.valueAsNumber, strength);
  playDrum(note);
  wiggle(skin, [{ transform: `scaleY(${1 - note.amplitude * .18})` }, { transform: `scaleY(${1 + note.amplitude * .1})` }, { transform: 'scaleY(1)' }], 380);
  grains.forEach((g, k) => wiggle(g, [{ transform: 'translateY(0)' }, { transform: `translateY(${-note.jump * (.7 + (k % 3) * .2)}px)` }, { transform: 'translateY(0)' }], 300 + note.amplitude * 260));
  if (lastHit) get('d-prev').setAttribute('d', wavePath(lastHit.hz, lastHit.amplitude, .03));
  get('d-wave').setAttribute('d', wavePath(note.hz, note.amplitude, .03));
  get('d-hz').textContent = `${perSecond(note.hz)} shakes a second`;
  get('d-notice').textContent = (lastHit ? compareNotes(lastHit, note) + ' ' : '') + `The rice jumped ${note.jump < 14 ? 'a little' : note.jump < 26 ? 'up' : 'high'}.`;
  report({ station: 'drum', type: 'hit', note, prev: lastHit });
  lastHit = note;
}
get('hit-zone').addEventListener('pointerdown', e => { if (e.isPrimary) hit(.55); });
get('tap-soft').addEventListener('click', () => hit(.3));
get('tap-strong').addEventListener('click', () => hit(.9));

/* ---------- Bell in a jar ---------- */
let air = 1, timer;
const dots = get('air'), bell = get('bell'), waves = get('waves');
for (let k = 0; k < 44; k++) {
  const a = (k * 137.5) % 360 * Math.PI / 180, r = 18 + (k * 53 % 82);
  dots.append(svgEl('circle', { cx: (180 + Math.cos(a) * r).toFixed(1), cy: (118 + Math.sin(a) * r * .72).toFixed(1), r: 2.2 }));
}
bell.style.transformOrigin = '180px 58px';
function jar() {
  const n = Math.round(44 * air);
  [...dots.children].forEach((d, k) => d.setAttribute('opacity', k < n ? '.55' : '0'));
  waves.setAttribute('opacity', timer ? (air * .9).toFixed(2) : '0');
  get('air-left').textContent = `${Math.round(air * 100)}%`;
  get('j-notice').textContent = !timer ? (air < .1 ? 'Almost no air left. Ring the bell now.' : 'Ring the bell. Then pump the air out while it rings.')
    : air >= .9 ? 'Ding! Loud and clear.' : air >= .4 ? 'Quieter now.' : air >= .1 ? 'Very faint, but the bell is still shaking.' : 'Almost silent. Look: the hammer still hits the bell!';
}
function ding() {
  playBell(bellNote(air));
  wiggle(bell, [{ transform: 'rotate(0)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(0)' }], 400);
}
function ring(on) {
  clearInterval(timer); timer = null;
  if (on) { ding(); timer = setInterval(ding, 450); }
  get('ring').setAttribute('aria-pressed', String(on));
  get('ring').textContent = on ? 'Stop the bell' : 'Ring the bell';
  jar();
  if (on) report({ station: 'bell', type: 'ring', air });
}
get('ring').addEventListener('click', () => ring(!timer));
get('pump').addEventListener('click', () => {
  air = pumpOnce(air);
  wiggle(get('pump-handle'), [{ transform: 'translateY(0)' }, { transform: 'translateY(34px)' }, { transform: 'translateY(0)' }], 420);
  jar();
  if (timer) report({ station: 'bell', type: 'ring', air });
});
get('let-in').addEventListener('click', () => { air = 1; jar(); if (!timer) get('j-notice').textContent = 'Air rushes back into the jar.'; });
onLeave(from => { if (from === 'bell' && timer) ring(false); });
jar();

/* ---------- Who can hear it? ---------- */
const pitch = get('pitch'), chart = get('ranges');
const X = hz => 30 + 320 * Math.log10(hz / HEAR_MIN) / Math.log10(HEAR_MAX / HEAR_MIN);
const ROW = k => 30 + k * 32;
chart.append(svgEl('rect', { x: X(20), y: 8, width: X(20000) - X(20), height: 132, fill: '#ffd898', opacity: .08 }));
for (const [hz, label] of [[10, '10'], [100, '100'], [1000, '1k'], [10000, '10k'], [100000, '100k']]) {
  chart.append(svgEl('path', { d: `M${X(hz)} 8V140`, stroke: '#80546f', opacity: .5 }));
  const t = svgEl('text', { x: X(hz), y: 158, 'text-anchor': hz === HEAR_MAX ? 'end' : hz === HEAR_MIN ? 'start' : 'middle' }); t.textContent = label; chart.append(t);
}
const bars = LISTENERS.map((l, k) => {
  const t = svgEl('text', { x: X(l.low), y: ROW(k) - 4 }); t.textContent = l.name;
  const bar = svgEl('rect', { x: X(l.low), y: ROW(k), width: X(l.high) - X(l.low), height: 11, rx: 5.5 });
  chart.append(t, bar);
  return bar;
});
const cursor = svgEl('path', { stroke: '#fff0b1', 'stroke-width': 2.5 });
chart.append(cursor);
const people = LISTENERS.map(l => { const li = document.createElement('li'); get('listeners').append(li); return li; });
function tune() {
  const hz = sliderToHz(pitch.valueAsNumber), who = hears(hz), k = kind(hz);
  pitch.setAttribute('aria-valuetext', `${perSecond(hz)} Hz`);
  get('hz-read').textContent = `${perSecond(hz)} Hz`;
  get('hz-kind').textContent = k === 'audible' ? 'You can hear this' : k === 'ultrasound' ? 'Ultrasound: too high for you' : 'Infrasound: too low for you';
  cursor.setAttribute('d', `M${X(hz).toFixed(1)} 6V142`);
  LISTENERS.forEach((l, i) => {
    const on = who.includes(l.key);
    bars[i].setAttribute('class', on ? 'on' : '');
    people[i].className = on ? 'on' : '';
    people[i].textContent = `${l.name}: ${on ? 'hears it' : 'can’t hear it'}`;
  });
  chart.setAttribute('aria-label', `Hearing ranges. ${perSecond(hz)} Hz is heard by: ${who.length ? who.join(', ') : 'nobody here'}.`);
  return hz;
}
pitch.addEventListener('input', () => { const hz = tune(); report({ station: 'hear', type: 'tune', hz }); });
tune();
get('play-tone').addEventListener('click', () => {
  const hz = sliderToHz(pitch.valueAsNumber);
  if (kind(hz) === 'audible') { playTone(hz); get('h-notice').textContent = `${perSecond(hz)} shakes every second.`; }
  else get('h-notice').textContent = hz > 20000 ? 'Silence for you, but a dog or a bat could hear it.' : 'Silence for you, but an elephant could feel this rumble.';
});
get('to-human').addEventListener('click', () => { pitch.value = 500; tune(); });

/* ---------- The concert ---------- */
onConcert(() => {
  [0, 1, 2, 3, 4, 5, 4, 2, 0].forEach((f, k) => setTimeout(() => {
    playString(stringNote(100, .7, FRETS[f]));
    if (k % 2 === 0) playDrum(drumNote(120, .5));
  }, k * 330));
  toast('The concert begins', 'The lamps are lit. Every note you hear tonight is something shaking.');
});
