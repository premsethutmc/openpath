import { blankLesson, checkTransfer, firstDay, lessonView, loadLesson, loadPot, nextDay, savePot, stageOf } from './model.mjs';

const get = (id) => document.getElementById(id);
const soilText = {
  dry: 'Dry: pale and crumbly.',
  moist: 'Moist: damp to the touch, with no puddle.',
  waterlogged: 'Waterlogged: the soil is soaked and water is pooling.',
};
const outcomes = {
  soaked: 'Extra water filled the air spaces. The bean did not grow today.',
  drained: 'The extra water drained. The soil is moist again.',
  dry: 'The soil stayed too dry. Growth paused today.',
  grew: 'The soil had enough moisture today.',
};
const storage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
const loaded = loadPot(storage);
let pot = loaded.pot;
let lesson = loadLesson(storage, pot);
let uncovered = false;
let inspected = false;
let windowOpen = false;
let careAction = null;

function storageNotice(ok) {
  get('save-status').textContent = ok
    ? 'Only this pot and its lesson steps are saved in this browser. Nothing is sent.'
    : 'This browser couldn’t restore or save this pot. You can still play here.';
}
function save() { storageNotice(savePot(storage, pot, lesson)); }
function story(text) { get('seed-story').textContent = text; }
function render() {
  const view = lessonView(pot, lesson, windowOpen);
  const planted = pot.day > 0;
  get('day').textContent = planted ? 'Simulated day ' + pot.day : 'Ready to plant';
  get('pot').dataset.stage = uncovered ? 'uncovered' : view.stage;
  get('pot').dataset.window = view.cutaway ? 'open' : 'closed';
  get('pot').dataset.moisture = inspected ? pot.moisture : 'unseen';
  const caption = uncovered ? 'One bean rests on top of the soil.'
    : !planted ? 'The pot is ready for one bean.'
      : view.stage === 'root' ? 'A tiny root reaches down. The surface is still bare.'
        : view.stage === 'sprout' ? 'A shoot has pushed above the soil.'
          : 'There is nothing above the soil yet.';
  get('pot-title').textContent = 'View of the pot. ' + caption + (inspected ? ' ' + soilText[pot.moisture] : '');
  get('stage').textContent = caption;
  get('plant').hidden = planted || uncovered;
  get('cover').hidden = !uncovered;
  get('prediction-form').hidden = !view.mustPredict || uncovered;
  get('look').hidden = uncovered || view.cutaway || !(view.mustLook || lesson.rootSeen);
  get('inspect').hidden = !view.canCare || inspected || uncovered;
  get('care').hidden = !view.canCare || !inspected || uncovered;
  get('transfer').hidden = !view.canApply || uncovered;
  get('fresh').hidden = !planted || uncovered;
  if (inspected) get('moisture').textContent = soilText[pot.moisture];
  for (const action of ['water', 'wait']) get(action).setAttribute('aria-pressed', String(careAction === action));
  get('next').disabled = careAction === null;
}
function place() {
  uncovered = true;
  inspected = false;
  windowOpen = false;
  careAction = null;
  render();
  story('The bean is on the soil. Cover it to plant it.');
  get('cover').focus();
}
function cover() {
  pot = firstDay;
  lesson = blankLesson;
  uncovered = false;
  get('prediction-form').reset();
  get('fresh').open = false;
  render();
  story('The bean is covered. Make a prediction before the first day passes.');
  get('prediction-title').focus();
  save();
}
get('plant').addEventListener('click', place);
get('cover').addEventListener('click', cover);
get('reset').addEventListener('click', place);

get('prediction-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const view = lessonView(pot, lesson, windowOpen);
  const prediction = new FormData(event.currentTarget).get('prediction');
  if (!view.mustPredict || !['root', 'shoot'].includes(prediction)) return;
  lesson = { prediction, rootSeen: false };
  render();
  save();
  story('Prediction locked. Let’s see what happens.');
  get(lessonView(pot, lesson).mustLook ? 'look' : 'inspect').focus();
});

get('look').addEventListener('click', () => {
  const view = lessonView(pot, lesson, windowOpen);
  if (uncovered || view.cutaway || !(view.mustLook || lesson.rootSeen)) return;
  windowOpen = true;
  if (view.mustLook) {
    lesson = { ...lesson, rootSeen: true };
    save();
    story('The first root has appeared. This is germination: the seed has started to grow.');
  }
  render();
  get('stage').focus();
});
get('inspect').addEventListener('click', () => {
  if (!lessonView(pot, lesson, windowOpen).canCare) return;
  inspected = true;
  render();
  get('moisture').focus();
});
for (const action of ['water', 'wait']) {
  get(action).addEventListener('click', () => {
    if (!inspected) return;
    careAction = action;
    render();
    get('next').focus();
  });
}
get('next').addEventListener('click', () => {
  if (!inspected || careAction === null || !lessonView(pot, lesson, windowOpen).canCare) return;
  const previous = stageOf(pot);
  const next = nextDay(pot, careAction);
  pot = next.pot;
  inspected = false;
  careAction = null;
  const stage = stageOf(pot);
  story(outcomes[next.outcome] + (previous === 'root' && stage === 'sprout' ? ' Now the shoot has appeared, after the root.' : ''));
  render();
  save();
  const view = lessonView(pot, lesson, windowOpen);
  get(view.mustLook ? 'look' : view.canApply && previous === 'root' ? 'transfer' : 'inspect').focus();
});

const form = get('transfer-form');
function resetTransfer() {
  form.reset();
  form.hidden = false;
  get('feedback').hidden = true;
}
get('transfer').addEventListener('click', () => {
  if (!lessonView(pot, lesson, windowOpen).canApply) return;
  resetTransfer();
  get('grow').hidden = true;
  get('apply').hidden = false;
  get('apply-title').focus();
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (form.hidden) return;
  const result = checkTransfer(Object.fromEntries(new FormData(form)));
  if (!result) return;
  form.hidden = true;
  const correct = result.care && result.evidence;
  get('feedback-title').textContent = correct ? 'You found two useful clues.' : 'Check what each clue tells you.';
  get('feedback-care').textContent = (result.care ? 'Yes: ' : 'Try this: ') + 'Water Pot A, which is dry. Wait with Pot B, which is already damp. Two beans on the same day can need different care.';
  get('feedback-evidence').textContent = (result.evidence ? 'Yes: ' : 'Try this: ') + 'Look through the soil window. A little root can grow below the surface before a shoot appears.';
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
if (pot.day > 0) story('Your bean is back where you left it.');
