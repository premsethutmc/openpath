const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function stringNote(tension, pull) {
  if (![tension, pull].every(Number.isFinite)) throw new TypeError('Expected numeric tension and pull');
  const ratio = clamp(tension, 50, 200) / 100;
  const amplitude = clamp(pull, 0, 1);
  return { hz:220*Math.sqrt(ratio), amplitude, gain:.14*amplitude };
}
export function compareNotes(last, next) {
  if (!last) return 'Try pulling farther or turning the peg.';
  const samePitch = Math.abs(last.hz - next.hz) < 1;
  const sameVolume = Math.abs(last.amplitude - next.amplitude) < .09;
  if (samePitch && sameVolume) return 'Same pitch. About the same loudness.';
  if (samePitch) return next.amplitude > last.amplitude ? 'Louder, same pitch.' : 'Softer, same pitch.';
  const pitch = next.hz > last.hz ? 'Higher pitch' : 'Lower pitch';
  return sameVolume ? pitch + ', about as loud.' : pitch + (next.amplitude > last.amplitude ? ' and louder.' : ' and softer.');
}
