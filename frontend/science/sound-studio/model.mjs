const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const numbers = (...v) => { if (!v.every(Number.isFinite)) throw new TypeError('Expected numeric inputs'); };

// Fret stops as a fraction of the open string: Sa, Ri, Ga, Ma, Pa, upper Sa.
export const FRETS = [1, 8/9, 4/5, 3/4, 2/3, 1/2];
export const FRET_NAMES = ['Open (Sa)', 'Ri', 'Ga', 'Ma', 'Pa', 'High Sa'];

export function stringNote(tension, pull, length = 1) {
  numbers(tension, pull, length);
  const ratio = clamp(tension, 50, 200) / 100;
  const amplitude = clamp(pull, 0, 1);
  return { hz: 220 * Math.sqrt(ratio) / clamp(length, .5, 1), amplitude, gain: .14 * amplitude };
}

// A bottle you blow across: only the air above the water vibrates.
// Quarter-wave tube with a small end correction, bottle 24 cm tall.
export const BOTTLE_HEIGHT = .24;
export function bottleNote(water, blow = .6) {
  numbers(water, blow);
  const air = BOTTLE_HEIGHT * (1 - clamp(water, 0, .85));
  const amplitude = clamp(blow, 0, 1);
  return { hz: 343 / (4 * (air + .015)), air, amplitude, gain: .09 * amplitude };
}

export function drumNote(tightness, hit) {
  numbers(tightness, hit);
  const amplitude = clamp(hit, 0, 1);
  return { hz: 110 * Math.sqrt(clamp(tightness, 50, 200) / 100), amplitude, gain: .3 * amplitude, jump: Math.round(4 + 30 * amplitude) };
}

// Each stroke of the pump removes 40% of the air left. A hand pump never empties the jar.
export const AIR_FLOOR = .02;
export const pumpOnce = air => Math.max(AIR_FLOOR, clamp(air, 0, 1) * .6);
export function bellNote(air) {
  numbers(air);
  const left = clamp(air, 0, 1);
  return { hz: 880, amplitude: left, gain: .07 * left };
}

// Approximate hearing ranges in vibrations per second (Hz).
export const LISTENERS = [
  { key: 'elephant', name: 'Elephant', low: 16, high: 12000 },
  { key: 'you', name: 'You', low: 20, high: 20000 },
  { key: 'dog', name: 'Dog', low: 67, high: 45000 },
  { key: 'bat', name: 'Bat', low: 2000, high: 110000 },
];
export const HEAR_MIN = 10, HEAR_MAX = 100000;
export const sliderToHz = s => Math.round(HEAR_MIN * (HEAR_MAX / HEAR_MIN) ** (clamp(s, 0, 1000) / 1000));
export const hears = hz => LISTENERS.filter(l => hz >= l.low && hz <= l.high).map(l => l.key);
export const kind = hz => hz < 20 ? 'infrasound' : hz > 20000 ? 'ultrasound' : 'audible';

export function compareNotes(last, next) {
  if (!last) return 'Try pulling farther or turning the peg.';
  const samePitch = Math.abs(last.hz - next.hz) < 1;
  const sameVolume = Math.abs(last.amplitude - next.amplitude) < .09;
  if (samePitch && sameVolume) return 'Same pitch. About the same loudness.';
  if (samePitch) return next.amplitude > last.amplitude ? 'Louder, same pitch.' : 'Softer, same pitch.';
  const pitch = next.hz > last.hz ? 'Higher pitch' : 'Lower pitch';
  return sameVolume ? pitch + ', about as loud.' : pitch + (next.amplitude > last.amplitude ? ' and louder.' : ' and softer.');
}

export const rising = notes => notes.length > 1 && notes.every((n, i) => !i || n.hz > notes[i - 1].hz + 1);
export const perSecond = hz => Math.round(hz).toLocaleString('en-IN');

// Things to find out. Each check reads one event from the studio.
export const DISCOVERIES = [
  { id: 'peg', station: 'veena', ask: 'The singer says the veena sounds too low. Tighten the peg and pluck again.',
    found: 'A tighter string shakes faster, so the note is higher.', check: e => e.type === 'pluck' && e.prev && e.note.hz > e.prev.hz + 1 && e.tension > e.prevTension },
  { id: 'fret', station: 'veena', ask: 'Now keep the peg where it is. Press a fret and pluck. What happens?',
    found: 'A shorter string shakes faster too. Pressing a fret makes the note higher.', check: e => e.type === 'pluck' && e.length < 1 },
  { id: 'loud', station: 'veena', ask: 'The back row can’t hear. Make the same note louder.',
    found: 'Pull farther and the string swings wider. A wider swing is louder, but the note stays the same.', check: e => e.type === 'pluck' && e.prev && Math.abs(e.prev.hz - e.note.hz) < 1 && e.note.amplitude > e.prev.amplitude + .2 },
  { id: 'bottles', station: 'bottles', ask: 'Fill the bottles so the notes go up from left to right, like Sa Ri Ga Ma Pa.',
    found: 'More water leaves less air. Less air shakes faster, so the note is higher. It is the air that sings, not the glass.', check: e => e.type === 'scale' && rising(e.notes) },
  { id: 'rice', station: 'drum', ask: 'Put rice on the drum. Can you make it jump higher?',
    found: 'A harder hit makes the drum skin swing wider. You see the rice jump higher and you hear it louder.', check: e => e.type === 'hit' && e.prev && e.note.amplitude > e.prev.amplitude + .2 },
  { id: 'straps', station: 'drum', ask: 'The drummer wants a higher tone. Tighten the straps.',
    found: 'A tighter drum skin shakes faster, so the tone is higher.', check: e => e.type === 'hit' && e.prev && e.note.hz > e.prev.hz + 1 },
  { id: 'vacuum', station: 'bell', ask: 'Ring the bell, then pump the air out of the jar. Listen.',
    found: 'The bell keeps shaking, but with almost no air the sound can’t reach you. Sound needs air, water or a solid to travel through.', check: e => e.type === 'ring' && e.air < .1 },
  { id: 'ultra', station: 'hear', ask: 'Find a sound the dog can hear but you can’t.',
    found: 'Above 20,000 Hz is ultrasound. You can’t hear it, but dogs and bats can.', check: e => e.type === 'tune' && e.hz > 20000 && e.hz <= 45000 },
  { id: 'infra', station: 'hear', ask: 'Now find a sound the elephant can hear but you can’t.',
    found: 'Below 20 Hz is infrasound. Elephants can hear these very low rumbles.', check: e => e.type === 'tune' && e.hz < 20 && e.hz >= 16 },
];

export function nextAsk(station, found) {
  return DISCOVERIES.find(d => d.station === station && !found.has(d.id)) ?? null;
}
export function discover(event, found) {
  const hit = DISCOVERIES.find(d => d.station === event.station && !found.has(d.id) && d.check(event));
  return hit ?? null;
}

// Points for a scope trace: `window` seconds squeezed into 360 units.
export function wavePath(hz, amplitude, window = .019) {
  return Array.from({ length: 145 }, (_, i) => {
    const t = i / 144;
    const y = 40 - amplitude * 34 * Math.sin(2 * Math.PI * hz * window * t);
    return (i ? 'L' : 'M') + (360 * t).toFixed(2) + ' ' + y.toFixed(2);
  }).join(' ');
}
