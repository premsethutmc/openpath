const by = id => document.getElementById(id);
const film = by('film');
const view = by('view');
const openEnd = 19.10;
const speech = [by('invitation'), by('answer')];
const invitation = 'Come. Walk with me.';
const answer = 'Everyone needs a pinch of this. The tax weighs hardest on families with the least money. That is why we are starting with salt.';
let phase = 'title', sound = true, walking = false, right = false;
let greeted = false, approach = 0, revision = 0, tick = 0, lastTick = 0, pointer = null;
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
    if (phase === 'road' && walking && !right && !document.hidden && !reducedMotion.matches) {
      approach = Math.min(.12,approach+.008);
      view.style.setProperty('--approach',approach.toFixed(3));
    }
    foot(phase === 'film' ? .05 : walking ? .17 : .075);
  };
  beat();
  tick = setInterval(beat, 560);
}

function stopFeet() { clearInterval(tick); tick = 0; }
function stopSpeech() { for (const a of speech) { a.pause(); a.currentTime = 0; } }
function say(text, index) {
  stopSpeech();
  by('line').textContent = text;
  hide('caption', false);
  if (sound && !document.hidden) speech[index].play().catch(() => {});
}

function changeLook(value) {
  if (phase !== 'road' || value === right) return;
  right = value;
  view.dataset.look = right ? 'right' : 'ahead';
  pressed('turn',right);
  by('turn').textContent = right ? '← Look ahead' : 'Look right →';
  hide('ask', !right);
  if (!right) {
    by('hint').textContent = 'The marchers are ahead of you.';
    view.dataset.answer = 'false';
    hide('caption'); stopSpeech();
  } else {
    by('hint').textContent = 'The marcher turns toward you.';
    if (!greeted) { greeted = true; say(invitation,0); }
  }
}

function setWalk(value) {
  walking = value;
  pressed('walk', walking);
  view.dataset.walking = String(walking);
  by('walk').textContent = walking ? 'Stop' : 'Walk';
  if (walking && !right) by('hint').textContent = 'You fall into step. There’s a marcher on your right.';
}

function enterRoad() {
  if (phase === 'road') return;
  phase = 'road'; revision++;
  film.pause(); film.volume = 1;
  hide('film'); hide('launch'); hide('film-controls');
  hide('scene',false); hide('road-controls',false);
  hide('caption'); hide('ask');
  greeted = false; right = false; approach = 0;
  view.style.removeProperty('--approach');
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
  unlock(); stopSpeech(); stopFeet();
  phase = 'film';
  hide('scene'); hide('road-controls'); hide('launch');
  hide('film',false); hide('film-controls',false);
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
  if (sound) unlock(); else stopSpeech();
});
by('turn').addEventListener('click',() => { unlock(); changeLook(!right); });
by('walk').addEventListener('click',() => { unlock(); setWalk(!walking); });
by('ask').addEventListener('click',() => {
  if (phase !== 'road' || !right) return;
  unlock(); setWalk(false);
  view.dataset.answer = 'true';
  by('hint').textContent = 'He shows you a pouch of salt.';
  say(answer,1);
});
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
    if (phase === 'road') { stopFeet(); stopSpeech(); setWalk(false); }
  } else if (phase === 'road') startFeet();
});
