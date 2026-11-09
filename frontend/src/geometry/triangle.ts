/** Euclidean triangle with fixed A=(0,0), B=(6,0); measure every angle independently. */
export type Point = readonly [number, number];
export const A: Point = [0, 0], B: Point = [6, 0];
export const INITIAL_C: Point = [6, 6 * Math.tan(30 * Math.PI / 180)];
export function clampC(x: number, y: number): Point {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return INITIAL_C;
  return [Math.max(0, Math.min(6, x)), Math.max(0, Math.min(5.5, y))];
}
export function angleAt(p: Point, v: Point, q: Point): number {
  const u = [p[0]-v[0], p[1]-v[1]], w = [q[0]-v[0], q[1]-v[1]];
  return Math.atan2(Math.abs(u[0]*w[1]-u[1]*w[0]), u[0]*w[0]+u[1]*w[1]) * 180 / Math.PI;
}
export function triangleAngles(c: Point): readonly [number, number, number] | null {
  if (!c.every(Number.isFinite) || c[0] < 0 || c[0] > 6 || c[1] <= 0.05 || c[1] > 5.5) return null;
  return [angleAt(B,A,c), angleAt(c,B,A), angleAt(A,c,B)];
}
