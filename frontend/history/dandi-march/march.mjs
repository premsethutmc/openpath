import { advance, answer, initial, lines, people, stages } from './story.mjs';
import { paint } from './art.mjs';

const $ = id => document.getElementById(id);
const q = $('questions'), walk = $('walk'), ask = $('ask'), reset = $('reset'), sound = $('sound');
const canvas = $('world'), c = canvas.getContext('2d');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const voice = new Audio();
voice.preload = 'none';
let state = initial(), joined = false, opened = false, active = null, cueVersion = 0;
let soundOn = false, journey = null, change = performance.now(), foot = 0, ctx, noise;

function ambience(kind) {
  if (!soundOn) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  ctx ||= new AudioContext();
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i=0; i<samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const sea = kind === 'sea', src = ctx.createBufferSource(), eq = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = noise; eq.type = 'lowpass'; eq.frequency.value = sea ? 380 : 1850;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(sea?.06:.11,now+(sea?.32:.019));
  gain.gain.exponentialRampToValueAtTime(.001,now+(sea?.88:.13));
  src.connect(eq).connect(gain).connect(ctx.destination);
  src.start(now,0,sea?.94:.14);
}
function stopVoice() {
  cueVersion++;
  voice.pause();
  voice.removeAttribute('src');
  voice.load();
}
function playVoice(id) {
  stopVoice();
  if (!soundOn) return;
  const version = cueVersion;
  voice.src = './voice-' + id + '.mp3';
  void voice.play().catch(() => {
    if (version === cueVersion) sound.textContent = 'Sound on · voice unavailable';
  });
}
function setStage(next) {
  if (next === state.stage) return;
  change = performance.now();
  if (next === 1) opened = true;
  if (next === 2) { opened = false; active = null; stopVoice(); ambience('sea'); }
}
function render() {
  const step = stages[state.stage];
  $('date').textContent = step.date;
  $('place').textContent = step.place;
  $('intro').hidden = joined;
  $('target').hidden = !joined || state.stage !== 0;
  $('hint').textContent = step.hint;
  $('fill').style.width = (state.position / 3 * 100) + '%';
  $('caption').hidden = !active;
  if (active) {
    $('speaker').textContent = people[lines[active].speaker];
    $('reply').textContent = lines[active].text;
  }
  walk.hidden = state.stage === 3;
  walk.disabled = !!journey;
  walk.firstChild.textContent = !joined ? 'Join the march ' : state.stage === 2 ? 'Go to the water ' : journey ? 'Walking… ' : 'Keep walking ';
  ask.hidden = state.stage !== 1;
  ask.setAttribute('aria-expanded', String(opened));
  ask.textContent = opened ? 'Hide questions' : 'Talk to a marcher';
  q.hidden = !opened;
  reset.hidden = !joined;
  for (const option of q.querySelectorAll('button')) option.setAttribute('aria-pressed', String(option.dataset.question === active));
  document.body.dataset.stage = String(state.stage);
}
for(const [id, item] of Object.entries(lines)){
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.question = id; button.textContent = item.prompt;
  button.addEventListener('click', () => {
    if (!answer(id,state.stage)) return;
    active = id; change = performance.now(); render(); playVoice(id);
  });
  q.querySelector('.choices').append(button);
}
walk.addEventListener('click', () => {
  if(journey || state.stage===3) return;
  const activeControl = document.activeElement === walk;
  joined = true; active = null; stopVoice();
  const to = Math.min(3,Math.floor(state.position)+1);
  journey = { from:state.position,to,start:performance.now(), focus:activeControl };
  foot = 0;
  render();
});
ask.addEventListener('click', () => {
  opened = !opened;
  if (!opened) { active = null; stopVoice(); }
  render();
});
reset.addEventListener('click', () => {
  stopVoice(); journey = null; joined = false; active = null; opened = false; state = initial();
  change = performance.now(); render(); walk.focus();
});
sound.addEventListener('click', () => {
  soundOn = !soundOn;
  sound.setAttribute('aria-pressed',String(soundOn)); sound.textContent = soundOn?'Sound on':'Sound off';
  if (soundOn) { ambience(state.stage >= 2 ? 'sea':'step'); if (active) playVoice(active); }
  else { stopVoice(); if (ctx?.state==='running') void ctx.suspend().catch(() => {}); }
});
window.addEventListener('pagehide',() => { stopVoice(); if (ctx?.state==='running') void ctx.suspend().catch(() => {}); });

function frame(now) {
  if (journey) {
    const {from,to,start,focus} = journey;
    const fraction = motion.matches ? 1 : Math.min(1,(now-start)/2300);
    const previous = state.stage;
    const update = advance({position:from},(to-from)*fraction);
    if (Math.floor(fraction*5)>foot){foot++; ambience('step');}
    if (previous !== update.stage) setStage(update.stage);
    state = update;
    if(fraction === 1) {
      journey = null; render();
      if(focus && (document.activeElement===document.body || document.activeElement===walk)) (state.stage===3?reset:walk).focus();
    }
    else $('fill').style.width = (state.position / 3 * 100) + '%';
  }
  if (c) {
    const {width:w,height:h} = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 1.75);
    const width = Math.round(w*scale), height = Math.round(h*scale);
    if (canvas.width !== width || canvas.height !== height) {canvas.width=width; canvas.height=height;}
    c.setTransform(scale,0,0,scale,0,0);
    paint(c,w,h,{...state,time:Math.max(0,(now-change)/1000),moving:!!journey,
      talker:active?lines[active].speaker:null,speaking:!voice.paused && !motion.matches,reduce:motion.matches});
  }
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
