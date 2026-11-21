import { stringNote, compareNotes, wavePath, FRETS, FRET_NAMES, perSecond } from './model.mjs';
import { playString } from './audio.mjs';
import { report } from './journey.mjs';
const get = id => document.getElementById(id);
const tuning = get('tension'), svg = get('instrument'), line = get('string');
const slow = get('slow');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let last, lastTension, gesture, raf;
const fret = get('fret'), finger = get('finger'), rest = get('string-rest');
const end = () => 76 + 329 * FRETS[fret.valueAsNumber];
function drawString(y = 0, x = 240) {
  const e = end();
  line.setAttribute('d', `M76 101 Q${Math.min(x, e - 20)} ${101+2*y} ${e.toFixed(1)} 101`);
}
const drawWave = note => wavePath(note.hz, note.amplitude);
function pluck(pull) {
  cancelAnimationFrame(raf);
  const length = FRETS[fret.valueAsNumber], tension = tuning.valueAsNumber;
  const note = stringNote(tension, pull, length);
  if (last) get('previous').setAttribute('d', drawWave(last));
  get('wave').setAttribute('d', drawWave(note));
  get('notice').textContent = compareNotes(last, note);
  get('legend').textContent = (last ? 'Dotted = last pluck · ' : '') + perSecond(note.hz) + ' shakes a second';
  report({ station: 'veena', type: 'pluck', note, prev: last, tension, prevTension: lastTension, length });
  last = note; lastTension = tension;
  playString(note);
  drawString();
  if (motion.matches) return;
  const start = performance.now();
  function frame(stamp) {
    const t=(stamp-start)/1000, duration=slow.checked?1.4:.54;
    if (t>=duration) return drawString();
    const speed = note.hz/(slow.checked?84:30);
    drawString(33*note.amplitude*(1-t/duration)**1.35*Math.sin(2*Math.PI*speed*t));
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
}
function turn() {
  const t = tuning.valueAsNumber;
  get('peg').setAttribute('transform', `rotate(${(t-100)*1.4} 424 101)`);
  tuning.setAttribute('aria-valuetext', t<90?'Looser':t>110?'Tighter':'Middle');
}
tuning.addEventListener('input', turn);
turn();
function press() {
  const i = fret.valueAsNumber, e = end();
  fret.setAttribute('aria-valuetext', FRET_NAMES[i]);
  finger.hidden = !i;
  finger.setAttribute('transform', `translate(${e.toFixed(1)} 0)`);
  rest.setAttribute('d', i ? `M${e.toFixed(1)} 101H405` : '');
  drawString();
}
fret.addEventListener('input', press);
press();
const point = e => new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
for (const id of ['play-zone','peg']) {
  const target = get(id);
  target.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button!==0 || gesture) return;
    const p=point(e);
    gesture={id:e.pointerId,y:p.y,x:p.x,pull:0,t:tuning.valueAsNumber};
    if(id==='play-zone'){cancelAnimationFrame(raf);drawString();}
    target.setPointerCapture(e.pointerId);
  });
  target.addEventListener('pointermove', e => {
    if (e.pointerId!==gesture?.id) return;
    const p=point(e);
    if(id==='peg') { tuning.value=String(gesture.t+(p.x-gesture.x)*2);turn();return; }
    gesture.pull=Math.max(-1,Math.min(1,(p.y-gesture.y)/45));
    drawString(gesture.pull*36,Math.max(130,Math.min(350,gesture.x)));
  });
  const finish=(e, canceled) => {
    if(e.pointerId!==gesture?.id)return;
    const g=gesture;gesture=null;
    if (id==='play-zone') {
      drawString();
      if(!canceled) pluck(Math.max(.22,Math.abs(g.pull)));
    } else if (canceled) { tuning.value=g.t;turn(); }
  };
  target.addEventListener('pointerup',e=>finish(e,false));
  target.addEventListener('pointercancel',e=>finish(e,true));
  target.addEventListener('lostpointercapture',e=>finish(e,true));
}
// Respect touch release even if Chromium suppresses the post-drag click.
// Click still supports key activation, assistive technology, and the mouse.
for (const [id, pull] of [['soft',.27],['strong',.82]]) {
  const button=get(id);
  let tracking, used;
  button.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'&&e.isPrimary)tracking={id:e.pointerId,x:e.clientX,y:e.clientY};
  });
  button.addEventListener('pointercancel',()=>{tracking=null;});
  button.addEventListener('pointerup',e=>{
    if(e.pointerId!==tracking?.id)return;
    const p=tracking;tracking=null;
    if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>12||!button.contains(document.elementFromPoint(e.clientX,e.clientY)))return;
    used={id:e.pointerId,at:performance.now()};pluck(pull);
  });
  button.addEventListener('click',e=>{
    if(!(used&&performance.now()-used.at<800&&((e.pointerType==='touch'&&e.pointerId===used.id)||e.sourceCapabilities?.firesTouchEvents)))pluck(pull);
    used=null;
  });
}
