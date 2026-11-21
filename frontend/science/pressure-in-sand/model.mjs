export const brickWeightN = 12;
export const faces = Object.freeze({ wide: 60, narrow: 30 });

export function pressureKPa(forceN, areaCm2) {
  if (!Number.isFinite(forceN) || forceN < 0 || !Number.isFinite(areaCm2) || areaCm2 <= 0) {
    throw new RangeError('Use a finite nonnegative force and positive contact area.');
  }
  return 10 * forceN / areaCm2;
}

export function compareBrickFace(face) {
  if (!Object.hasOwn(faces, face)) throw new RangeError('Pick the wide or narrow face.');
  const areaCm2 = faces[face];
  return { forceN: brickWeightN, areaCm2, pressureKPa: pressureKPa(brickWeightN, areaCm2) };
}

export function checkStand(foot, reason) {
  if (!['wide', 'narrow'].includes(foot) || !['weight', 'spread', 'depth'].includes(reason)) {
    return { complete: false };
  }
  const footCorrect = foot === 'wide';
  const reasonCorrect = reason === 'spread';
  return { complete: true, footCorrect, reasonCorrect, correct: footCorrect && reasonCorrect };
}
