import { checkStand, compareBrickFace } from './model.mjs';
import { mountTrayArt } from './tray-art.mjs';

mountTrayArt();

const byId = (id) => document.getElementById(id);
const panels = ['explore', 'compare', 'apply'];
const stepItems = [...document.querySelectorAll('.steps li')];
const exploreScene = document.querySelector('#explore .scene');
const objects = byId('objects');
const drop = byId('drop');
const lift = byId('lift');
const exploreNote = byId('explore-note');
const predictionForm = byId('prediction-form');
const trials = byId('trials');
const comparisonResult = byId('comparison-result');
const standForm = byId('stand-form');
const feedback = byId('transfer-feedback');
const placed = new Set();
let object = 'brick';
let prediction = null;

function showPanel(name) {
  panels.forEach((id, index) => {
    const current = name === id;
    byId(id).hidden = !current;
    if (current) stepItems[index].setAttribute('aria-current', 'step');
    else stepItems[index].removeAttribute('aria-current');
  });
  document.querySelector('#' + name + ' h2').focus();
}

function resetTray() {
  exploreScene.dataset.shape = object;
  exploreScene.dataset.pose = 'hover';
  exploreNote.textContent = 'The ' + object + ' is above the sand.';
  drop.textContent = 'Drop ' + object;
  drop.disabled = false;
  lift.disabled = true;
}

objects.addEventListener('change', (event) => {
  object = event.target.value;
  resetTray();
});

drop.addEventListener('click', () => {
  exploreScene.dataset.pose = 'land';
  exploreNote.textContent = 'The ' + object + ' is on the sand. Lift it to inspect the surface.';
  lift.disabled = false;
  lift.focus();
  drop.disabled = true;
});

lift.addEventListener('click', () => {
  exploreScene.dataset.pose = 'lift';
  exploreNote.textContent = object === 'brick' ? 'The brick left a visible mark.' : 'The feather left almost no mark.';
  drop.disabled = false;
  drop.focus();
  lift.disabled = true;
});

byId('start').addEventListener('click', () => showPanel('compare'));

predictionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (prediction !== null) return;
  prediction = new FormData(predictionForm).get('prediction');
  if (!['wide', 'narrow', 'same'].includes(prediction)) return;
  predictionForm.hidden = true;
  trials.hidden = false;
  byId('trial-prompt').focus();
});

function renderTrial(face) {
  const trial = document.querySelector('.trial[data-face="' + face + '"]');
  const { forceN, areaCm2, pressureKPa } = compareBrickFace(face);
  trial.querySelector('.scene').dataset.pose = 'land';
  trial.querySelector('.measurement').textContent = forceN + ' N · ' + areaCm2 + ' cm² · ' + pressureKPa + ' kPa';
  placed.add(face);
  if (placed.size === 2 && comparisonResult.hidden) {
    comparisonResult.hidden = false;
    byId('prediction-result').textContent = prediction === 'narrow'
      ? 'Your prediction matched: the narrow face had more pressure.'
      : 'Compare the results: the narrow face had more pressure.';
  }
}

for (const button of document.querySelectorAll('.place')) {
  button.addEventListener('click', () => renderTrial(button.dataset.face));
}

byId('apply-action').addEventListener('click', () => showPanel('apply'));

standForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (standForm.hidden) return;
  const data = new FormData(standForm);
  const result = checkStand(data.get('foot'), data.get('reason'));
  if (!result.complete) return;
  standForm.hidden = true;
  feedback.hidden = false;
  byId('feedback-heading').textContent = result.correct ? 'You applied the idea.' : 'Look at what changed.';
  byId('feedback-detail').textContent = result.correct
    ? 'Wide feet spread the same downward force over more sand, so they put less pressure on it.'
    : result.footCorrect
      ? 'Wide feet are the right choice. The force stays the same; those feet spread it over a larger area.'
      : 'The narrow feet press on less sand. The wide feet spread the same force over a larger area, so they put less pressure on the sand.';
  byId('retry').hidden = result.correct;
  feedback.focus();
});

byId('retry').addEventListener('click', () => {
  feedback.hidden = true;
  standForm.reset();
  standForm.hidden = false;
  standForm.querySelector('input').focus();
});

byId('restart').addEventListener('click', () => {
  objects.querySelector('input[value="brick"]').checked = true;
  object = 'brick';
  resetTray();
  prediction = null;
  predictionForm.reset();
  predictionForm.hidden = false;
  placed.clear();
  for (const trial of document.querySelectorAll('.trial')) {
    trial.querySelector('.scene').dataset.pose = 'hover';
    trial.querySelector('.measurement').textContent = '';
  }
  trials.hidden = true;
  comparisonResult.hidden = true;
  byId('prediction-result').textContent = '';
  standForm.reset();
  standForm.hidden = false;
  feedback.hidden = true;
  showPanel('explore');
});
