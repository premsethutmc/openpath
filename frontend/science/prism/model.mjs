// Coordinates and angles are in screen space. Refract at both prism faces.
export const spectrum = [
  ['Red', '#ff666c', 1.514], ['Orange', '#ff9e52', 1.517],
  ['Yellow', '#ffe47a', 1.520], ['Green', '#8beb9d', 1.524],
  ['Blue', '#65bfff', 1.530], ['Violet', '#d29aff', 1.539],
];
export const vertices = [[135,33],[135,248],[257,248]];
export const origin = [30,117];
export const screen = 334;
const rad = d => d * Math.PI / 180;
const unit = a => [Math.cos(a), Math.sin(a)];
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const minus = (a,b) => [a[0]-b[0],a[1]-b[1]];
const advance = (a,v,t) => [a[0]+t*v[0],a[1]+t*v[1]];
function hit(p, v, a, b) {
  const w = minus(b,a), offset = minus(a,p);
  const t = cross(offset,w)/cross(v,w), u = cross(offset,v)/cross(v,w);
  if (t < 0 || u < 0 || u > 1 || !Number.isFinite(t)) throw new Error('Ray missed prism face');
  return advance(p,v,t);
}
const refract = (angle, normal, n1, n2) => normal + Math.asin(n1/n2 * Math.sin(angle-normal));
export function trace(aim, glass, beam) {
  if (!Number.isFinite(aim) || aim < -8 || aim > 12 || !['white','red'].includes(beam)) throw new RangeError('Invalid optics settings');
  const angle = rad(aim), v = unit(angle);
  const project = (p,a) => [screen,p[1]+(screen-p[0])*Math.tan(a)];
  if (!glass) return [{name: beam === 'white' ? 'White' : 'Red', color: beam === 'white' ? '#f7f2da' : spectrum[0][1], points:[origin,project(origin,angle)]}];
  const [tip, left, right] = vertices;
  const entrance = hit(origin, v, tip, left);
  const exitNormal = -Math.atan2(right[0]-tip[0],right[1]-tip[1]);
  return (beam === 'red' ? spectrum.slice(0,1) : spectrum).map(([name,color,n]) => {
    const inner = refract(angle,0,1,n);
    const exit = hit(entrance,unit(inner),tip,right);
    const out = refract(inner,exitNormal,n,1);
    return {name,color,points:[origin,entrance,exit,project(exit,out)],out};
  });
}
