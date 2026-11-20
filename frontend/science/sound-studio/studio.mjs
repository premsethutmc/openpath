import { stringNote, compareNotes } from './model.mjs';
const get = id => document.getElementById(id);
const tuning = get('tension'), svg = get('instrument'), line = get('string');
const sound = get('audio'), slow = get('slow');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let audio, master, voice, last, gesture, raf;
function play(note) {
  if (!sound.checked) return;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) { sound.checked = false; return; }
  try {
    if (!audio) {
      audio = new Audio();
      master = audio.createGain();
      master.gain.value = .8;
      master.connect(audio.destination);
    }
    const now = audio.currentTime;
    audio.resume().catch(() => { sound.checked = false; });
    if (voice) voice.gain.setTargetAtTime(0, now, .012);
    voice = audio.createGain();
    voice.gain.value = note.gain;
    voice.connect(master);
    const v = voice;
    let left = 4;
    // A short bright attack, then the higher partials decay faster.
    [.84,.28,.12,.07].forEach((level,i)=>{
      const wave = audio.createOscillator(), env = audio.createGain();
      wave.frequency.value = note.hz*(i+1);
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(level, now+.008);
      env.gain.exponentialRampToValueAtTime(.0001, now+.9-i*.13);
      wave.connect(env); env.connect(v);
      wave.onended = () => { wave.disconnect();env.disconnect(); if (!--left) { v.disconnect(); if (voice===v) voice=null; } };
      wave.start(now); wave.stop(now+.92);
    });
  } catch { sound.checked = false; }
}
sound.addEventListener('change', () => {
  if (master) master.gain.setTargetAtTime(sound.checked ? .8 : 0, audio.currentTime, .008);
  if (!sound.checked && voice) voice.gain.setTargetAtTime(0, audio.currentTime, .008);
});
function drawString(y = 0, x = 240) {
  line.setAttribute('d', `M76 101 Q${x} ${101+2*y} 405 101`);
}
function drawWave(note) {
  return Array.from({ length:145 },(_,i)=>{
    const t=i/144;
    const y=40-note.amplitude*34*Math.sin(2*Math.PI*note.hz*.019*t);
    return (i?'L':'M')+(360*t).toFixed(2)+' '+y.toFixed(2);
  }).join(' ');
}
function pluck(pull) {
  cancelAnimationFrame(raf);
  const note = stringNote(tuning.valueAsNumber, pull);
  if (last) { get('previous').setAttribute('d', drawWave(last)); get('legend').textContent = 'Dotted = last pluck'; }
  get('wave').setAttribute('d', drawWave(note));
  get('notice').textContent = compareNotes(last, note);
  last = note;
  play(note);
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
