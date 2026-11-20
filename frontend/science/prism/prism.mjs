import {trace} from './model.mjs';
const $ = selector => document.querySelector(selector);
const aim = $('#aim'), toggle = $('#glass-toggle');
const ns = 'http://www.w3.org/2000/svg';
let inserted = false;
const coords = points => points.map(p => p.map(n => n.toFixed(3)).join(',')).join(' ');
function line(points, color, width) {
  const el = document.createElementNS(ns,'polyline');
  el.setAttribute('points',coords(points));
  el.setAttribute('stroke',color);
  el.setAttribute('fill','none');
  el.setAttribute('stroke-width',width);
  el.setAttribute('stroke-linecap','round');
  return el;
}
function draw() {
  const angle = Number(aim.value), beam = $('input[name=beam]:checked').value;
  const rays = trace(angle, inserted, beam);
  const reference = trace(angle, false, beam)[0];
  const color = reference.color;
  const split = inserted && beam === 'white';
  $('#reference').setAttribute('points',coords(reference.points));
  $('#reference').setAttribute('visibility',inserted ? 'visible' : 'hidden');
  $('#prism').setAttribute('fill',inserted ? 'url(#glass)' : 'none');
  $('#prism').setAttribute('stroke',inserted ? '#a7c6f4' : '#6d7d9a');
  $('#prism').setAttribute('stroke-dasharray',inserted ? '0' : '4 5');
  $('#lamp').setAttribute('transform','rotate('+angle+' 30 117)');
  const lines = inserted
    ? [line(rays[0].points.slice(0,2),color,2.3), ...rays.map(r=>line(r.points.slice(1),r.color,split ? .95 : 2.3))]
    : [line(reference.points,color,2.3)];
  $('#rays').replaceChildren(...lines);
  $('#scale').hidden = !split;
  $('#swatches').style.background = split ? 'linear-gradient(90deg,'+rays.map(r=>r.color).join(',')+')' : color;
  const msg = split ? 'Red bends least, violet most. The glass separates colours that were already in the white light.'
    : inserted ? 'The red beam bends, but stays red. The glass didn’t add any colours.'
      : beam === 'red' ? 'One red spot. With no prism, the beam goes straight.'
        : 'One white spot. Insert the prism to see what was in the beam.';
  if ($('#observation').textContent !== msg) $('#observation').textContent = msg;
  $('#scene-desc').textContent = msg;
}
toggle.addEventListener('click',()=>{
  inserted = !inserted;
  toggle.setAttribute('aria-pressed',String(inserted));
  toggle.textContent = inserted ? 'Remove prism' : 'Insert prism';
  draw();
});
aim.addEventListener('input',draw);
document.querySelectorAll('input[name=beam]').forEach(el=>el.addEventListener('change',draw));
document.querySelectorAll('.answers button').forEach(el=>el.addEventListener('click',()=>{
  $('#result').textContent = el.value === 'red' ? 'Yes. It changes direction but stays red. Try it on the bench.' : 'Try red-only light on the bench. Watch whether new colours appear.';
}));
draw();
