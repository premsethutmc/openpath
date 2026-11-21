import { VILLAGE_STEP, LAST_STEP, routeNotes, stepForward } from './journey.mjs';
const by = id => document.getElementById(id);
const film = by('film');
const view = by('view');
const openEnd = 19.10;
const invitation = 'Come. Walk with me.';
const answer = 'Everyone needs salt. The British control who can make or sell it, and the tax hits poor families hardest. That’s why we’re starting with salt.';
let phase = 'title', sound = true, walking = false, right = false;
let greeted = false, steps = 0, revision = 0, tick = 0, lastTick = 0, pointer = null;
let revealed = false, shoreAmbience;
let ctx, noise;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hide = (id,value=true) => { by(id).hidden = value; };
const pressed = (id,value) => by(id).setAttribute('aria-pressed', String(value));

function unlock() {
  if (!sound) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  try {
    if (!ctx) {
      ctx = new AudioEngine();
      noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * .17), ctx.sampleRate);
      const data = noise.getChannelData(0);
      let low = 0;
      for (let i=0; i<data.length; i++) {
        low = low*.81 + (Math.random()*2-1)*.19;
        data[i] = low * (1-i/data.length)**2;
      }
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch { /* silent mode remains interactive */ }
}

function foot(volume) {
  if (!sound || document.hidden || ctx?.state !== 'running') return;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = .90 + Math.random()*.22;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

function startFeet() {
  if (tick) return;
  const beat = () => {
    const now = performance.now();
    if (now-lastTick < 530) return;
    lastTick = now;
    if (phase === 'road') {
      const next = stepForward(steps, { walking, ahead: !right, visible: !document.hidden });
      if (steps !== next) { steps = next; renderRoadProgress(); }
    }
    foot(phase === 'film' ? .05 : walking ? .17 : .075);
  };
  beat();
  tick = setInterval(beat, 560);
}

function stopFeet() { clearInterval(tick); tick = 0; }
function caption(text) {
  by('line').textContent = text;
  hide('caption', false);
}

function renderRoadProgress() {
  const atVillage = steps >= VILLAGE_STEP;
  const changed = view.dataset.village !== String(atVillage);
  view.dataset.village = String(atVillage);
  const amount = atVillage ? (steps - VILLAGE_STEP) * .006 : steps * .013;
  view.style.setProperty('--approach', reducedMotion.matches ? '0' : amount.toFixed(3));
  const progress = by('walk-progress');
  progress.setAttribute('aria-valuenow', steps);
  progress.firstElementChild.style.width = String(steps/LAST_STEP*100)+'%';
  if (changed) {
    by('place').textContent = atVillage ? 'Aslali village' : 'Approaching Aslali';
    view.setAttribute('aria-label',atVillage
      ? 'You approach Aslali. People have come out to watch the marchers go by.'
      : 'At a child’s eye level, a line of marchers on a dusty road outside Aslali. A man walks on your right.');
    hide('turn',atVillage);
    hide('ask');
    if (atVillage) by('hint').textContent = 'People come out to watch as you pass.';
  }
  if (steps === LAST_STEP) {
    setWalk(false);
    if (document.activeElement === by('walk')) by('see-route').focus({preventScroll:true});
    by('walk').disabled = true;
    by('see-route').classList.add('light');
    by('hint').textContent = 'This is your stop. Follow the march to the coast on the route.';
  }
}

function stopSurf() {
  shoreAmbience?.stop();
  shoreAmbience = undefined;
}

function startSurf() {
  if (!sound || document.hidden || shoreAmbience || ctx?.state !== 'running' || phase !== 'shore') return;
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate*6), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let foam=0, swell=0;
  for (let i=0;i<samples.length;i++) {
    foam = .86*foam + .14*(2*Math.random()-1);
    swell = .986*swell + .014*(2*Math.random()-1);
    const tide = Math.sin(Math.PI*i/samples.length)**2;
    samples[i] = (.45*foam + swell)*tide*.24;
  }
  shoreAmbience = ctx.createBufferSource();
  shoreAmbience.buffer = buffer;
  shoreAmbience.loop = true;
  shoreAmbience.connect(ctx.destination);
  shoreAmbience.start();
}

function show(newPhase) {
  phase = newPhase;
  hide('stage',!['title','film','road','shore'].includes(phase));
  hide('film',phase !== 'film');
  hide('launch',phase !== 'title');
  hide('scene',phase !== 'road');
  hide('shore',phase !== 'shore');
  hide('film-controls',phase !== 'film');
  hide('road-controls',phase !== 'road');
  hide('shore-controls',phase !== 'shore');
  hide('route',phase !== 'route');
  hide('spread',phase !== 'spread');
  hide('toolbar',phase === 'route' || phase === 'spread');
  if (phase !== 'shore') stopSurf();
}
function showStop(i) {
  by('route-note').textContent = routeNotes[i];
  document.querySelectorAll('[data-stop]').forEach((button,j)=>button.setAttribute('aria-pressed',String(j === i)));
  by('route').dataset.stop = String(i);
}
function enterRoute(i) {
  setWalk(false);
  stopFeet();
  show('route');
  showStop(i);
  by('route-title').focus();
}
function showShore() {
  show('shore');
  by('shore').dataset.salt = String(revealed);
  by('shore-date').textContent = revealed ? '6 April 1930 · Reconstruction' : '5 April 1930 · Reconstruction';
  by('shore-caption').textContent = revealed
    ? 'At dawn, Gandhi picks up salt from the shore. He has openly broken the salt law without violence.'
    : 'The marchers reach the coast. They wait until morning.';
  hide('salt-act',revealed);
  hide('see-spread',!revealed);
  if (sound) { unlock(); startSurf(); ctx?.resume().then(startSurf).catch(()=>{}); }
  by(revealed?'see-spread':'salt-act').focus();
}

function changeLook(value) {
  if (phase !== 'road' || steps >= VILLAGE_STEP || value === right) return;
  right = value;
  view.dataset.look = right ? 'right' : 'ahead';
  pressed('turn',right);
  by('turn').textContent = right ? '← Look ahead' : 'Look right →';
  hide('ask', !right);
  if (!right) {
    by('hint').textContent = 'The marchers are ahead of you.';
    view.dataset.answer = 'false';
    hide('caption');
  } else {
    by('hint').textContent = 'The marcher turns toward you.';
    if (!greeted) { greeted = true; caption(invitation); }
  }
}

function setWalk(value) {
  if (value && (phase !== 'road' || steps >= LAST_STEP)) return;
  if (value && right) changeLook(false);
  walking = value;
  pressed('walk', walking);
  view.dataset.walking = String(walking);
  by('walk').textContent = walking ? 'Stop' : 'Walk';
  if (walking) by('hint').textContent = steps < VILLAGE_STEP ? 'You fall into step. There’s a marcher on your right.' : 'You keep pace through the village.';
}

function enterRoad() {
  if (phase === 'road') return;
  revision++;
  show('road');
  film.pause(); film.volume = 1;
  hide('caption'); hide('ask');
  greeted = false; right = false; revealed = false; steps = 0;
  by('walk').disabled = false; by('see-route').classList.remove('light');
  view.dataset.village = ''; renderRoadProgress();
  pressed('turn',false);
  by('turn').textContent = 'Look right →';
  by('hint').textContent = 'Walk or turn to look at the marcher beside you.';
  view.dataset.look = 'ahead'; view.dataset.answer = 'false';
  setWalk(false);
  startFeet();
  by('walk').focus({preventScroll:true});
}

async function startFilm() {
  const seq = ++revision;
  unlock(); stopFeet();
  show('film');
  film.currentTime = 0; film.volume = 1; film.muted = !sound;
  by('pause').textContent = 'Pause film';
  try {
    await film.play();
    if (phase === 'film' && seq === revision) by('pause').focus({preventScroll:true});
  } catch {
    if (phase === 'film' && seq === revision) {
      by('pause').textContent = 'Retry film';
      by('enter').focus({preventScroll:true});
    }
  }
}

by('start').addEventListener('click',startFilm);
by('replay').addEventListener('click',startFilm);
by('restart').addEventListener('click',startFilm);
for (const id of ['skip','enter']) by(id).addEventListener('click',() => { unlock(); enterRoad(); });
by('pause').addEventListener('click', async () => {
  if (phase !== 'film') return;
  if (!film.paused) { film.pause(); return; }
  unlock();
  try { await film.play(); } catch { by('pause').textContent = 'Retry film'; }
});
film.addEventListener('pause',() => {
  if (phase === 'film') { stopFeet(); by('pause').textContent = 'Resume film'; }
});
film.addEventListener('playing',() => { if (phase === 'film') by('pause').textContent = 'Pause film'; });
film.addEventListener('timeupdate',() => {
  if (phase !== 'film') return;
  if (film.currentTime >= openEnd) { enterRoad(); return; }
  if (film.currentTime >= 18.35) {
    film.volume = Math.max(.15, 1-(film.currentTime-18.35)/.82);
    startFeet();
  }
});
film.addEventListener('ended',() => { if (phase === 'film') enterRoad(); });
film.addEventListener('error',() => { by('pause').textContent = 'Retry film'; });

by('sound').addEventListener('click',() => {
  sound = !sound;
  pressed('sound',sound); by('sound').textContent = sound ? 'Sound on' : 'Sound off';
  film.muted = !sound;
  if (sound) { unlock(); if (phase === 'shore') ctx?.resume().then(startSurf).catch(()=>{}); }
  else stopSurf();
});
by('turn').addEventListener('click',() => { unlock(); changeLook(!right); });
by('walk').addEventListener('click',() => { unlock(); setWalk(!walking); });
by('ask').addEventListener('click',() => {
  if (phase !== 'road' || !right) return;
  unlock(); setWalk(false);
  view.dataset.answer = 'true';
  by('hint').textContent = 'He shows you a pouch of salt.';
  caption(answer);
});
document.querySelectorAll('[data-stop]').forEach(button=>button.addEventListener('click',()=>showStop(Number(button.dataset.stop))));
by('see-route').addEventListener('click',()=>enterRoute(1));
by('shore-route').addEventListener('click',()=>enterRoute(3));
by('back-road').addEventListener('click',()=>{
  show('road'); startFeet();
  by(steps === LAST_STEP ? 'see-route' : 'walk').focus();
});
by('to-shore').addEventListener('click',showShore);
by('salt-act').addEventListener('click',()=>{ revealed = true; showShore(); });
by('see-spread').addEventListener('click',()=>{ show('spread'); by('spread-title').focus(); });
by('back-shore').addEventListener('click',showShore);
view.addEventListener('pointerdown',e => {
  if (!e.isPrimary || e.button !== 0) return;
  pointer = {id:e.pointerId,x:e.clientX,y:e.clientY};
  view.setPointerCapture(e.pointerId);
});
view.addEventListener('pointercancel',() => { pointer = null; });
view.addEventListener('pointerup',e => {
  if (pointer?.id !== e.pointerId) return;
  const dx = e.clientX-pointer.x, dy = e.clientY-pointer.y;
  pointer = null;
  if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy)*1.3) {
    unlock(); changeLook(dx < 0);
  }
});
document.addEventListener('keydown',e => {
  if (phase !== 'road' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('details')) return;
  if (!['ArrowLeft','ArrowRight','ArrowUp'].includes(e.key)) return;
  e.preventDefault(); unlock();
  if (e.key === 'ArrowUp') setWalk(!walking); else changeLook(e.key === 'ArrowRight');
});
document.addEventListener('visibilitychange',() => {
  if (document.hidden) {
    if (phase === 'film') film.pause();
    if (phase === 'road') { stopFeet(); setWalk(false); }
    if (phase === 'shore') stopSurf();
  } else if (phase === 'road') startFeet();
  else if (phase === 'shore') startSurf();
});
