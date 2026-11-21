import {act,start,tick,total} from './model.mjs';
const $=id=>document.getElementById(id);
let s=start(), paused=false;
const grams=n=>n.toFixed(1)+' g';
function render(){
  for(const v of ['pot','cup','receiver']){
    const el=$(v), b=v==='receiver'?{water:s.receiver,sand:0,salt:0,ions:0}:s[v];
    el.style.setProperty('--water',Math.min(94, b.water/.93)+'%');
    el.style.setProperty('--sand',Math.min(22,b.sand*1.45)+'%');
    el.style.setProperty('--salt',Math.min(22,b.salt*1.45)+'%');
    const vapour=v===s.on&&s.heat>0&&b.temp>47&&b.water>.1;
    el.style.setProperty('--vapour',vapour?.68:0);
    el.style.setProperty('--motion',vapour&&!paused?'running':'paused');
    el.querySelector('.reading').textContent=v==='receiver'?grams(b.water)+' caught\n'+grams(s.air)+' escaped'
      : grams(b.water)+' water\n'+grams(b.ions)+' salt dissolved\n'+grams(b.salt)+' salt solid\n'+grams(b.sand)+' sand\n'+Math.round(b.temp)+' °C';
  }
  for(const mode of ['stir','trap','pause']) $(mode).setAttribute('aria-pressed',String(mode==='pause'?paused:s[mode]));
  const heater=s[s.on];
  $('flow').dataset.on=String(s.trap && !paused && s.heat>0 && heater.temp>44 && heater.water>.1);
  const hasCrystals=['pot','cup'].some(key=>s[key].sand<.01 && s[key].salt>=1 && s[key].water<.05);
  const msg=hasCrystals && s.receiver>=1 ? 'You collected salt and water separately. Try beating the amount you caught.'
    : hasCrystals ? 'Salt crystals recovered. Can you catch the water on the next run?'
    : s.receiver>=1 ? 'You caught liquid water. Can you collect the salt too?' : '';
  if ($('goal').textContent!==msg) $('goal').textContent=msg;
  const t=total(s);
  $('ledger').textContent='In both beakers, the catcher and the air: '+grams(t.water)+' water, '+grams(t.salt)+' salt, '+grams(t.sand)+' sand. Water added: '+grams(s.added)+'.';
}
const say=text=>{$('status').textContent=text;};
for(const tool of ['water','stir','filter','return','trap']){
  $(tool).addEventListener('click',()=>{
    const old=s;
    s=act(s,tool,tool==='water'?Number($('dose').value):undefined);
    const messages={
      water:s===old?'No more water in the supply.':'Water added to the mixing beaker.',
      stir:s.stir?'Stirring speeds up dissolving. Watch the solid and dissolved readings.':'Stirring stopped.',
      filter:old.pot.water>0?'The liquid went into the filter cup. The filter held the solids back; they are shown in the mixing beaker.':'No liquid to pour. The filter would retain both dry solids.',
      return:'Everything in the filter cup went back to the mixing beaker.',
      trap:s.trap?'Catcher connected. New vapour will collect as liquid.':'Catcher disconnected. New vapour will escape into the air.',
    };
    say(messages[tool]);render();
  });
}
$('heat').addEventListener('change',()=>{s=act(s,'heat',Number($('heat').value));say(s.heat?'Heating the selected beaker. Watch its water and solid salt readings.':'Heater off.');render();});
$('target').addEventListener('change',()=>{s=act(s,'target',$('target').value);say('Heater moved.');render();});
$('pause').addEventListener('click',()=>{paused=!paused;say(paused?'Time paused. You can still move things.':'Time running.');render();});
$('reset').addEventListener('click',()=>{
  s=start($('sample').value);paused=false;$('heat').value='0';$('target').value='cup';say('New sample loaded.');render();
});
setInterval(()=>{if(!paused&&!document.hidden){s=tick(s,.5);render();}},250);
render();
