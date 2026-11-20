import { checkTwoPots, firstDay, loadPot, nextDay, savePot, stageOf } from './model.mjs';

const get = (id) => document.getElementById(id);
const stageText = {
  empty: 'The pot is ready for one bean.',
  seed: 'A bean rests below the soil.',
  root: 'A pale root reaches down into the soil.',
  sprout: 'The shoot has pushed above the soil. The root is still growing below.',
};
const soilText = {
  dry: 'Dry: pale and crumbly.',
  moist: 'Moist: damp to the touch, with no puddle.',
  waterlogged: 'Waterlogged: the soil is soaked and water is pooling.',
};
const outcomes = {
  soaked: 'Extra water filled the air spaces in the soil. The bean did not grow today.',
  drained: 'The extra water drained. The soil is moist again.',
  dry: 'The soil stayed too dry. Growth paused today.',
  grew: 'The soil had enough moisture for growth.',
};
const storage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
const loaded = loadPot(storage);
let pot = loaded.pot;
let inspected = false;

function storageNotice(ok) {
  get('save-status').textContent = ok
    ? 'Only this bean pot is saved in this browser. Nothing is sent.'
    : 'This browser couldn’t restore or save this pot. You can still play here.';
}
function render() {
  const stage = stageOf(pot);
  const planted = stage !== 'empty';
  get('day').textContent = planted ? 'Simulated day ' + pot.day : 'Ready to plant';
  get('pot').dataset.stage = stage;
  get('pot').dataset.moisture = inspected ? pot.moisture : 'unseen';
  get('pot-title').textContent = 'Side view of the pot. ' + stageText[stage] + (inspected ? ' ' + soilText[pot.moisture] : '');
  get('stage').textContent = stageText[stage];
  get('plant').hidden = planted;
  get('inspect').hidden = !planted || inspected;
  get('care').hidden = !planted || !inspected;
  get('transfer').hidden = stage !== 'sprout';
  get('fresh').hidden = !planted;
  if (inspected) get('moisture').textContent = soilText[pot.moisture];
}
function save() { storageNotice(savePot(storage, pot)); }
function plant() {
  pot = firstDay;
  inspected = false;
  get('fresh').open = false;
  render();
  get('seed-story').textContent = 'Your bean is planted. Look at the soil before you decide.';
  get('inspect').focus();
  save();
}
function advance(action) {
  if (!inspected) return;
  const previous = stageOf(pot);
  const next = nextDay(pot, action);
  pot = next.pot;
  inspected = false;
  const stage = stageOf(pot);
  let discovery = '';
  if (previous === 'seed' && stage === 'root') discovery = ' The first root is out. That is germination.';
  if (previous === 'root' && stage === 'sprout') discovery = ' Now the shoot has appeared.';
  get('seed-story').textContent = outcomes[next.outcome] + discovery;
  render();
  get('inspect').focus();
  save();
}
get('plant').addEventListener('click', plant);
get('reset').addEventListener('click', plant);
get('inspect').addEventListener('click', () => {
  inspected = true;
  render();
  get('moisture').focus();
});
get('water').addEventListener('click', () => advance('water'));
get('wait').addEventListener('click', () => advance('wait'));

const form = get('transfer-form');
function resetTransfer() {
  form.reset();
  form.hidden = false;
  get('feedback').hidden = true;
}
get('transfer').addEventListener('click', () => {
  resetTransfer();
  get('grow').hidden = true;
  get('apply').hidden = false;
  get('apply-title').focus();
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (form.hidden) return;
  const data = new FormData(form);
  const result = checkTwoPots(data.get('crumbly'), data.get('damp'));
  if (!result) return;
  form.hidden = true;
  const correct = result.crumbly && result.damp;
  get('feedback-title').textContent = correct ? 'You read both pots.' : 'Look at the soil, not the day.';
  get('feedback-detail').textContent = correct
    ? 'Water the dry pot and wait with the damp one. Two beans on the same day can need different care.'
    : 'Pot A is dry and needs water. Pot B is already damp, so adding water now can soak it. Use what you notice, not just the day.';
  get('retry').hidden = correct;
  get('feedback').hidden = false;
  get('feedback').focus();
});
get('retry').addEventListener('click', () => {
  resetTransfer();
  form.querySelector('input').focus();
});
function back() {
  get('apply').hidden = true;
  get('grow').hidden = false;
  get('transfer').focus();
}
get('back').addEventListener('click', back);
get('return').addEventListener('click', back);

render();
if (loaded.status !== 'ready' || pot.day > 0) storageNotice(loaded.status === 'ready');
if (pot.day > 0) get('seed-story').textContent = 'Your bean is back where you left it. Check the soil to continue.';
