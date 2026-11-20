import { checkTransfer, initialPhase, particleNotes, perform } from './model.mjs';

const get = (id) => document.getElementById(id);
const captions = {
  dry: 'White salt crystals and dark sand grains share the beaker.',
  wet: 'Water covers the mixture. You can still see both solids.',
  solution: 'The salt is no longer visible. Sand is still in the beaker.',
  filtered: 'Sand is in the filter. Clear salty water is in the beaker.',
  recovered: 'Solid salt is back in the beaker. The sand is still separate.',
};
let phase = initialPhase;
let particles = false;
function render() {
  const scene = get('scene');
  scene.dataset.phase = phase;
  scene.dataset.view = particles ? 'particles' : 'bench';
  const note = particles ? particleNotes[phase] : captions[phase];
  get('scene-label').textContent = note;
  get('observation').textContent = note;
  get('particles').setAttribute('aria-pressed', String(particles));
  get('ion-key').hidden = !particles || phase === 'dry' || phase === 'wet';
  get('tools').hidden = phase === 'recovered';
  get('challenge').hidden = phase !== 'recovered';
}
get('particles').addEventListener('click', () => {
  particles = !particles;
  render();
});
get('tools').addEventListener('click', (event) => {
  const action = event.target.closest('button')?.dataset.action;
  if (!action || phase === 'recovered') return;
  const result = perform(phase, action);
  phase = result.phase;
  get('status').textContent = result.message;
  render();
  if (phase === 'recovered') get('challenge').focus();
});
const form = get('check');
function resetCheck() {
  form.reset();
  form.hidden = false;
  get('feedback').hidden = true;
}
get('challenge').addEventListener('click', () => {
  get('bench').hidden = true;
  get('apply').hidden = false;
  resetCheck();
  get('apply-title').focus();
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (form.hidden) return;
  const data = new FormData(form);
  const result = checkTransfer(data.get('method'), data.get('reason'));
  if (!result) return;
  form.hidden = true;
  get('result').textContent = result.method && result.reason ? 'You got the sugar back.' : 'Think about what leaves.';
  get('explanation').textContent = 'When the water evaporates, it leaves as water vapour. The dissolved sugar stays behind.';
  get('retry').hidden = result.method && result.reason;
  get('feedback').hidden = false;
  get('feedback').focus();
});
get('retry').addEventListener('click', () => {
  resetCheck();
  form.querySelector('input').focus();
});
get('replay').addEventListener('click', () => {
  phase = initialPhase;
  particles = false;
  get('status').textContent = 'Choose a tool and see what changes.';
  get('apply').hidden = true;
  get('bench').hidden = false;
  render();
  get('bench-title').focus();
});
render();
