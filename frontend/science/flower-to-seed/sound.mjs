// Original procedural score & ambience. All audio is synthesized on device.
const pace=4.7;
const score=[
 {root:50,notes:[62,69,76,73]},
 {root:47,notes:[66,69,78,76]},
 {root:43,notes:[62,67,74,69]},
 {root:45,notes:[64,69,76,71]},
 {root:50,notes:[62,66,73,76]},
 {root:47,notes:[66,71,74,73]},
 {root:43,notes:[62,67,71,76]},
 {root:45,notes:[64,71,73,69]},
];
const hz=n=>440*2**((n-69)/12);
export function gardenSound(win=window){
 const Context=win.AudioContext||win.webkitAudioContext;
 let ctx=null,mix=null,wind=null,loop=0,enabled=false,bar=0,revision=0;
 const clear=()=>{win.clearTimeout(loop);loop=0;};
 const silent=()=>!enabled||!ctx||ctx.state!=='running';
 function note(semitone,start,life,volume,type='sine',endPitch=null){
  const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;
  osc.frequency.value=hz(semitone);
  if(endPitch!==null)osc.frequency.exponentialRampToValueAtTime(hz(endPitch),start+life);
  env.gain.setValueAtTime(.0001,start);
  env.gain.exponentialRampToValueAtTime(volume,start+Math.min(.28,life*.24));
  env.gain.exponentialRampToValueAtTime(.0001,start+life);
  osc.connect(env).connect(mix);
  osc.start(start);osc.stop(start+life+.02);
  osc.onended=()=>{osc.disconnect();env.disconnect();};
 }
 function open(){
  ctx=new Context();
  mix=ctx.createGain();mix.gain.value=0;mix.connect(ctx.destination);
  const samples=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);
  const data=samples.getChannelData(0);
  let rng=3197,low=0;
  for(let i=0;i<data.length;i++){
   rng=(rng*1664525+1013904223)>>>0;
   low=.88*low+.12*(rng/2147483648-1);
   data[i]=low*(.56+.44*Math.sin(Math.PI*i/data.length)**2)*Math.min(1,i/400,(data.length-i-1)/400);
  }
  wind=ctx.createBufferSource();wind.buffer=samples;wind.loop=true;
  const filter=ctx.createBiquadFilter(),level=ctx.createGain();filter.type='bandpass';filter.frequency.value=660;filter.Q.value=.48;
  level.gain.value=.07;wind.connect(filter).connect(level).connect(mix);wind.start();
 }
 function playBar(){
  clear();if(silent()||win.document.hidden)return;
  const {root,notes}=score[bar%score.length];const now=ctx.currentTime+.035;
  note(root,now,pace*1.09,.043);
  note(root+12,now+.1,pace*.99,.021);
  notes.forEach((pitch,i)=>{
   const t=now+[.2,1.21,2.39,3.67][i];
   note(pitch,t,1.7,.047);
   note(pitch+12,t,1.03,.011);
   note(pitch,t+.21,1.36,.011);
  });
  // A sparse, distant bird-like chirrup, deliberately lower than the music.
  if(bar%4===1){
   note(85,now+3.1,.16,.008,'sine',93);
   note(88,now+3.35,.22,.007,'sine',84);
  }
  bar++;loop=win.setTimeout(playBar,pace*1000);
 }
 async function set(value){
  if(!Context)return false;
  const request=++revision;enabled=value;clear();
  if(!value){
   if(ctx){mix.gain.cancelScheduledValues(ctx.currentTime);mix.gain.setValueAtTime(0,ctx.currentTime);await ctx.suspend().catch(()=>{});}
   return false;
  }
  try{
   if(!ctx)open();
   await ctx.resume();
   if(revision!==request||!enabled)return enabled;
   if(ctx.state!=='running'){enabled=false;return false;}
   if(win.document.hidden){await ctx.suspend();return enabled;}
   mix.gain.cancelScheduledValues(ctx.currentTime);
   mix.gain.setTargetAtTime(.48,ctx.currentTime,.16);
   playBar();
   return true;
  }catch{
   if(revision===request)enabled=false;
   return false;
  }
 }
 function effect(name){
  if(silent()||win.document.hidden)return;
  const t=ctx.currentTime+.02;
  if(name==='fly'){note(40,t,.44,.045,'triangle',44);note(52,t,.36,.018,'sine',47);}
  if(name==='pollen'){note(79,t,.43,.032);note(83,t+.075,.37,.020);}
  if(name==='pod'){note(67,t,.10,.034,'triangle',56);note(81,t+.10,.28,.026);}
  if(name==='rain'){note(85,t,.19,.018,'sine',72);note(80,t+.13,.23,.021,'sine',68);note(87,t+.33,.22,.017,'sine',74);}
 }
 async function visibility(){
  if(!enabled||!ctx)return;
  if(win.document.hidden){clear();try{await ctx.suspend();}catch{}}
  else await set(true);
 }
 return {supported:Boolean(Context),set,effect,visibility};
}
