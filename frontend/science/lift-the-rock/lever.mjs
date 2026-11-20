import { DEFAULT_PIVOT, LIFT_CM, leverAt } from './model.mjs';

const get = id => document.getElementById(id);
const set = (id, k, v) => get(id).setAttribute(k, v);
const position = get('position');
const scene = get('scene');
const status = get('status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const loadX = 74, gripX = 424, beamY = 164, pxPerCm = 3.5;
let fraction = 0, lastPivot = null, comparing = null, gesture = null, anim = 0;

function say(text) { status.textContent = text; }
function show() {
  const full = leverAt(position.valueAsNumber);
  const now = leverAt(full.loadArm, fraction);
  const downY = beamY + now.handTravel * pxPerCm;
  const upY = beamY - now.rockRise * pxPerCm;
  const x = loadX + full.loadArm * pxPerCm;
  set('pivot', 'transform', `translate(${x} 0)`);
  set('beam', 'd', `M${loadX} ${upY} L${gripX} ${downY}`);
  set('beam-grain', 'd', `M${loadX} ${upY-2} L${gripX - 12} ${downY-2}`);
  set('rock', 'transform', `translate(0 ${upY-beamY})`);
  set('rock-shadow', 'opacity', .45-fraction*.2);
  set('grip', 'transform', `translate(${gripX} ${downY})`);
  set('travel', 'd', `M454 ${beamY} V${beamY + full.handTravel * pxPerCm}`);
  set('goal', 'opacity', fraction > .99 ? 1 : .55);
  const prior = comparing === null ? null : leverAt(comparing);
  if (prior) {
    const y = beamY + prior.handTravel * pxPerCm;
    set('ghost','d', `M402 ${y}h44`);
  }
  set('ghost','visibility', prior ? 'visible' : 'hidden');
  get('effort').value = full.effort;
  get('distance').value = full.handTravel;
  get('effort-label').textContent = prior ? (full.effort < prior.effort ? 'Less' : 'More') : full.effort < 11 ? 'Light' : full.effort > 23 ? 'Heavy' : 'Medium';
  get('distance-label').textContent = prior ? (full.handTravel > prior.handTravel ? 'Farther' : 'Shorter') : full.handTravel < 5 ? 'Short' : full.handTravel > 9 ? 'Long' : 'Medium';
  position.setAttribute('aria-valuetext', full.loadArm <= 27 ? 'Close to the rock' : full.loadArm >= 51 ? 'Far from the rock' : 'Between close and far');
}
function stopAnimation() { if (anim) cancelAnimationFrame(anim); anim = 0; }
function moveSupport(value) {
  stopAnimation();
  position.value = value;
  const pivot = position.valueAsNumber;
  comparing = lastPivot === null || lastPivot === pivot ? null : lastPivot;
  fraction = 0;
  show();
}
function finishLift() {
  fraction = 1;
  const pivot = position.valueAsNumber;
  if (comparing === null) say('Rock up! Move the support and try the same lift.');
  else if (pivot < comparing) say('Same lift. Less push, but your hand moved farther.');
  else say('Same lift. More push, but your hand moved less.');
  lastPivot = pivot;
  show();
}
function push() {
  if (gesture || anim) return;
  if (fraction === 1) fraction = 0;
  const start = fraction;
  if (reducedMotion.matches) return finishLift();
  const at = performance.now();
  const duration = 320 + leverAt(position.valueAsNumber).handTravel * 23;
  const step = now => {
    const t = Math.min(1, (now - at) / duration);
    fraction = start + (1-start) * (1-(1-t)**2);
    if (t === 1) { anim = 0; finishLift(); }
    else { show(); anim = requestAnimationFrame(step); }
  };
  anim = requestAnimationFrame(step);
}
position.addEventListener('input', () => {
  if (gesture) return;
  moveSupport(position.valueAsNumber);
  say('Now push the beam again.');
});
const pushButton = get('push');
// Touch release can arrive without a compatibility click just after a drag.
let touchPress = null, lastTouchPush = null;
pushButton.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch' && event.isPrimary) {
    touchPress = { id:event.pointerId, x:event.clientX, y:event.clientY };
  }
});
pushButton.addEventListener('pointercancel', () => { touchPress = null; });
pushButton.addEventListener('pointerup', event => {
  if (touchPress?.id !== event.pointerId) return;
  const press = touchPress;
  touchPress = null;
  if (Math.hypot(event.clientX-press.x, event.clientY-press.y) > 12 ||
      !pushButton.contains(document.elementFromPoint(event.clientX, event.clientY))) return;
  lastTouchPush = { id:event.pointerId, at:performance.now() };
  push();
});
pushButton.addEventListener('click', event => {
  const followsHandledTouch = lastTouchPush && performance.now()-lastTouchPush.at < 800 &&
    ((event.pointerType === 'touch' && event.pointerId === lastTouchPush.id) ||
     event.sourceCapabilities?.firesTouchEvents);
  if (!followsHandledTouch) push();
  lastTouchPush = null;
});

function svgPoint(event) {
  return new DOMPoint(event.clientX,event.clientY).matrixTransform(scene.getScreenCTM().inverse());
}
for (const id of ['pivot', 'grip']) {
  const target = get(id);
  target.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    stopAnimation();
    if (id === 'grip' && fraction === 1) { fraction = 0; show(); }
    const point = svgPoint(event);
    gesture = {id:event.pointerId, x:point.x, y:point.y, pivot:position.valueAsNumber, start:fraction};
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', event => {
    if (event.pointerId !== gesture?.id) return;
    const point = svgPoint(event);
    if (id === 'pivot') moveSupport(Math.round(gesture.pivot + (point.x-gesture.x)/pxPerCm));
    else {
      const travel = leverAt(position.valueAsNumber).handTravel * pxPerCm;
      fraction = Math.max(0, Math.min(1, gesture.start + (point.y-gesture.y)/travel));
      show();
    }
  });
  const release = (event, canceled) => {
    if (event.pointerId !== gesture?.id) return;
    gesture = null;
    if (id === 'grip' && !canceled && fraction >= .97) finishLift();
    else if (id === 'grip') { fraction = 0; show(); }
    else say('Now push the beam again.');
  };
  target.addEventListener('pointerup', event => release(event, false));
  target.addEventListener('pointercancel', event => release(event, true));
  target.addEventListener('lostpointercapture', event => release(event, true));
}
if (!Number.isFinite(position.valueAsNumber)) position.value = DEFAULT_PIVOT;
set('goal', 'd', `M24 ${beamY - LIFT_CM*pxPerCm - 1}h97`);
show();
