import {SIGNAL, STATION, sceneOrder, lessons, clampDial, hasSignal, moveScene} from './story.mjs';
import {narration} from './voice.mjs';
const $ = id => document.getElementById(id);
let index=0, dialValue=0, signalShown=false, sound=false, contextAudio, audioBurst;
const memory = new Map();
const voice = $('voice');
const voiceKeys = new Set([...sceneOrder,'broadcast']);
function stopVoice() {
  voice.pause();
  if (!Number.isNaN(voice.duration)) voice.currentTime=0;
  voice.removeAttribute('src');
  voice.load();
}
function playVoice(key) {
  if(!sound || document.hidden || !voiceKeys.has(key)) return;
  stopVoice();
  const src = document.getElementById('offline-audio-' + key)?.textContent || './assets/voice/' + key + '.mp3';
  voice.src=src;
  voice.play().catch(()=>{}); // captions work even when playback is blocked
}
const activeVoice = () => sceneOrder[index]==='radio' && hasSignal(dialValue) ? 'broadcast' : sceneOrder[index];
const mapMarkup = `<svg class="place-map" viewBox="0 0 250 160" aria-hidden="true">
  <path class="outline" d="M67 10 80 16 99 11 99 27 108 38 119 42 128 53 148 61 157 69 172 65 182 55 204 49 213 44 221 47 224 58 237 66 224 81 221 97 209 90 199 82 185 86 174 83 166 95 154 104 144 104 135 116 120 124 113 135 100 151 91 158 83 145 78 125 69 112 60 101 54 83 40 83 34 77 42 74 32 69 32 63 54 59 58 45 64 39 60 27 67 20Z"/>
  <circle data-map-pin="0" cx="138" cy="66" r="4"/><text x="110" y="54">Ballia</text>
  <circle data-map-pin="1" cx="161" cy="84" r="4"/><text x="172" y="105">Tamluk</text>
  <circle data-map-pin="2" cx="72" cy="103" r="4"/><text x="30" y="111">Satara</text>
  <circle data-map-pin="3" cx="98" cy="140" r="4"/><text x="110" y="148">Tamil Nadu</text>
  <text x="0" y="157">Schematic locator</text>
</svg>`;

function button(label, activate, kind='') {
  const el=document.createElement('button');
  el.textContent=label;
  if(kind) el.className=kind;
  el.addEventListener('click',activate);
  return el;
}

function showEvidence(label, text) {
  $('label').textContent=label;
  $('answer').textContent=text;
  $('evidence').hidden=false;
}
function clearEvidence() {
  $('label').textContent='';
  $('answer').textContent='';
  $('evidence').hidden=true;
}

function stopStatic() {
  if (audioBurst) {
    const old=audioBurst;
    audioBurst=undefined;
    try { old.stop(); } catch { /* already ended */ }
  }
}
function readyAudio() {
  if (!sound || document.hidden) return;
  const Constructor=window.AudioContext || window.webkitAudioContext;
  if (!Constructor) return;
  try {
    contextAudio ||= new Constructor();
    if(contextAudio.state!=='running') contextAudio.resume().catch(()=>{});
  } catch { /* deliberately optional */ }
}
function crackle(locked) {
  stopStatic();
  if(!sound || contextAudio?.state!=='running' || document.hidden) return;
  const length=Math.floor(contextAudio.sampleRate*(locked ? .20 : .11));
  const buffer=contextAudio.createBuffer(1,length,contextAudio.sampleRate);
  const out=buffer.getChannelData(0);
  for(let i=0;i<length;i++) out[i]=(2*Math.random()-1)*Math.sin(Math.PI*i/length)*(locked ? .075 : .055);
  const src=contextAudio.createBufferSource();
  src.buffer=buffer;
  const filter=contextAudio.createBiquadFilter();
  filter.type='bandpass';filter.frequency.value=locked?1800:1400;filter.Q.value=.65;
  src.connect(filter).connect(contextAudio.destination);
  src.onended=()=>{if(audioBurst===src) audioBurst=undefined;};
  audioBurst=src;src.start();
}

function clueActive(scene, number) {
  const data=lessons[scene].clues;
  if(!data?.[number]) return;
  memory.set(scene,number);
  $('stage').dataset.clue=String(number);
  $('controls').querySelectorAll('button').forEach((el,j)=>el.setAttribute('aria-pressed',String(j===number)));
  $('object').querySelectorAll('[data-map-pin]').forEach((el,j)=>el.classList.toggle('active',j===number));
  showEvidence(data[number][1],data[number][2]);
}
function renderRadio() {
  $('object').innerHTML='<div class="radio-panel" id="receiver"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7"/></svg><div><label for="dial">Tuning dial</label><input id="dial" type="range" min="0" max="80" step="1" value="0" aria-valuetext="Searching"></div></div>';
  $('object').hidden=false;
  const dial=$('dial');
  dial.value=dialValue;
  let wasLocked=hasSignal(dialValue);
  const tune=(force=false)=>{
    const locked=hasSignal(dialValue);
    if(!locked && wasLocked) stopVoice();
    syncReceiver(true,locked && (!wasLocked || force));
    wasLocked=locked;
  };
  dial.addEventListener('input',()=>{
    readyAudio(); dialValue=clampDial(Number(dial.value)); tune();
  });
  $('controls').append(button('Tune to Congress Radio',()=>{
    readyAudio(); dialValue=SIGNAL; dial.value=SIGNAL; tune(true);
  }));
  const replay=button('Replay station identification',()=>playVoice('broadcast'));
  replay.id='broadcast-replay';
  $('controls').append(replay);
  syncReceiver(false);
}
function syncReceiver(play, broadcast=false) {
  const locked=hasSignal(dialValue);
  $('receiver').dataset.locked=String(locked);
  $('dial').setAttribute('aria-valuetext',locked?'Congress Radio found':dialValue<SIGNAL?'Searching; tune to the right':'Searching; tune to the left');
  $('broadcast-replay').hidden=!(signalShown || locked);
  $('broadcast-replay').disabled=!(sound && locked);
  if(play && (!locked || broadcast)) crackle(locked);
  if(broadcast) playVoice('broadcast');
  if (locked) signalShown=true;
  if (signalShown) showEvidence('Congress Radio · Station identification · Reenactment',STATION+' Usha Mehta and her colleagues used radio to share news and speeches despite censorship.');
}
function launch(step,focus=true) {
  stopStatic();
  stopVoice();
  index=step;
  const kind=sceneOrder[index];
  const scene=lessons[kind];
  $('stage').dataset.scene=kind;
  delete $('stage').dataset.clue;
  $('date').textContent=scene.date;
  $('chapter').textContent=scene.title;
  $('context').textContent=scene.context;
  $('transcript').open=false;
  $('narration-text').textContent=narration[kind];
  $('reconstruction').hidden=!scene.photo;
  $('object').hidden=true;
  $('object').replaceChildren();
  $('controls').replaceChildren();
  $('links').hidden=true; $('links').replaceChildren();
  clearEvidence();
  $('navigation').hidden=kind==='title';
  $('position').textContent=kind==='title'?'':index+' / '+(sceneOrder.length-1);
  $('back').textContent=index===1?'← Opening':'← Back';
  $('next').textContent=kind==='independence'?'Replay ↻':kind==='aftermath'?'Go to 1947 →':'Next →';
  if(kind==='title') $('controls').append(button('Step into 1942',()=>launch(1),'primary'));
  if(kind==='radio') renderRadio();
  if(kind==='places') { $('object').innerHTML=mapMarkup; $('object').hidden=false; }
  if(kind==='bridge' || kind==='wardha') {
    $('object').innerHTML=kind==='bridge'
      ? '<div class="date-track"><span>1930 <small>Dandi</small></span><span aria-hidden="true">→</span><span>1942 <small>Quit India</small></span></div>'
      : '<div class="date-track"><span>14 July <small>Wardha</small></span><span aria-hidden="true">→</span><span>8 August <small>Bombay</small></span></div>';
    $('object').hidden=false;
  }
  if(kind==='independence') {
    $('object').innerHTML='<div class="end-years"><span>1942</span><span aria-hidden="true">······</span><span>1947</span></div>';
    $('object').hidden=false;
    const reflection=document.createElement('p');
    reflection.className='reflection';
    reflection.textContent='Optional: explain why the movement continued after the arrests. Use two things you saw. Then compare your retelling.';
    $('controls').append(reflection);
    if (location.protocol==='http:'||location.protocol==='https:') {
      const a=document.createElement('a');
      a.href='../dandi-march/first-person/index.html'; a.textContent='Revisit the Dandi March';
      $('links').append(a);$('links').hidden=false;
    }
  }
  if(scene.clues) {
    scene.clues.forEach(([name],j)=>{
      const el=button(name,()=>clueActive(kind,j));
      el.setAttribute('aria-pressed','false');
      $('controls').append(el);
    });
    if(memory.has(kind)) clueActive(kind,memory.get(kind));
  }
  if(focus) $('chapter').focus();
  if(focus && sound) playVoice(activeVoice());
}

$('sound').addEventListener('click',()=>{
  sound=!sound;
  $('sound').setAttribute('aria-pressed',String(sound));
  $('sound').textContent=sound?'Sound on':'Sound off';
  $('narration-replay').disabled=!sound;
  if(sceneOrder[index]==='radio') syncReceiver(false);
  if(sound) { readyAudio(); playVoice(activeVoice()); }
  else { stopStatic(); stopVoice(); }
});
$('narration-replay').addEventListener('click',()=>playVoice(sceneOrder[index]));
$('back').addEventListener('click',()=>launch(moveScene(index,-1)));
$('next').addEventListener('click',()=>{
  if(index===sceneOrder.length-1){memory.clear();signalShown=false;dialValue=0;launch(0);}
  else launch(moveScene(index,1));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden) { stopStatic(); stopVoice(); }});
launch(0,false);
