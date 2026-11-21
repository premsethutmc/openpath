export const ROCK_N = 24;
export const LIFT_CM = 4;
export const BEAM_CM = 100;
export const MIN_PIVOT = 20;
export const MAX_PIVOT = 60;
export const DEFAULT_PIVOT = 40;

export function leverAt(pivotCm, fraction = 1) {
  if (!Number.isFinite(pivotCm) || !Number.isFinite(fraction)) throw new TypeError('Expected finite lever inputs');
  const loadArm = Math.max(MIN_PIVOT, Math.min(MAX_PIVOT, pivotCm));
  const handArm = BEAM_CM - loadArm;
  const rockRise = Math.max(0, Math.min(1, fraction)) * LIFT_CM;
  const effort = ROCK_N * loadArm / handArm;
  const handTravel = rockRise * handArm / loadArm;
  return { loadArm, handArm, rockRise, effort, handTravel, workJ: ROCK_N * rockRise / 100 };
}
