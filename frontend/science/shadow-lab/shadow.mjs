import { MATERIALS, ROOM, shadowAt } from './model.mjs';

const get = id => document.getElementById(id);
const attr = (id, key, value) => get(id).setAttribute(key, value);
const range = get('distance');
const track = get('track');
const buttons = [...document.querySelectorAll('[data-material]')];
const center = 56.5;
let material = 'cardboard';
let on = true;
let pointer = null;
let grabOffset = 0;

function draw() {
  const { x, scale, wallHalfHeight } = shadowAt(range.valueAsNumber);
  const sample = MATERIALS[material];
  attr('torch', 'transform', `translate(${x} 0)`);
  attr('handle', 'cx', x);
  attr('silhouette', 'transform', `translate(241 137) scale(${(scale * .54).toFixed(3)})`);
  attr('projected', 'opacity', on ? .94 * (1 - sample.transmission) : 0);
  attr('softness', 'stdDeviation', sample.blur);
  attr('glow', 'opacity', on ? 1 : 0);
  attr('light', 'visibility', on ? 'visible' : 'hidden');
  attr('bulb', 'stroke', on ? '#ffe2a2' : '#77868d');
  const top = center - wallHalfHeight;
  const bottom = center + wallHalfHeight;
  attr('cone', 'd', `M${x} ${center}L${ROOM.wall} 6V111Z`);
  attr('blocked', 'd', `M${ROOM.object} ${center-ROOM.halfHeight}L${ROOM.wall} ${top}V${bottom}L${ROOM.object} ${center+ROOM.halfHeight}Z`);
  attr('blocked', 'opacity', 1 - sample.transmission);
  attr('rays', 'd', `M${x} ${center}L${ROOM.wall} ${top}M${x} ${center}L${ROOM.wall} ${bottom}`);
  attr('panel', 'stroke', { cardboard:'#dc985d', tracing:'#ead4b8', clear:'#9fd5d9' }[material]);
  attr('panel', 'stroke-opacity', material === 'clear' ? .55 : 1);
}

function announce() {
  get('kind').textContent = on ? MATERIALS[material].kind : 'Torch off';
  get('note').textContent = on ? MATERIALS[material].note : 'Without the torch beam, there’s no rabbit shadow on this wall.';
}

range.addEventListener('input', draw);
const svgX = (event) => {
  const point = track.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(track.getScreenCTM().inverse()).x;
};
function move(event) {
  range.value = Math.round(shadowAt(svgX(event) - grabOffset).x);
  draw();
}
track.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || pointer !== null) return;
  pointer = event.pointerId;
  const x = svgX(event);
  grabOffset = (event.target.closest('#torch') || event.target.id === 'handle') ? x - range.valueAsNumber : 0;
  track.setPointerCapture(pointer);
  move(event);
});
track.addEventListener('pointermove', event => { if (event.pointerId === pointer) move(event); });
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  track.addEventListener(type, event => { if (event.pointerId === pointer) pointer = null; });
}
for (const button of buttons) button.addEventListener('click', () => {
  material = button.dataset.material;
  for (const b of buttons) b.setAttribute('aria-pressed', b === button);
  draw();
  announce();
});
get('power').addEventListener('click', event => {
  on = !on;
  event.currentTarget.textContent = on ? 'Torch on' : 'Torch off';
  event.currentTarget.setAttribute('aria-pressed', on);
  draw();
  announce();
});
draw();
