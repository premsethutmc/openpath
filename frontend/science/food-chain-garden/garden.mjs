import { initialGarden, setLeaves, nextWeek, observation } from './model.mjs';

const el = (id) => document.getElementById(id);
const scene = el('scene');
const plot = el('plot');
const caterpillars = [...document.querySelectorAll('#caterpillars use')];
const birds = [...document.querySelectorAll('#birds use')];
const baseline = 'Caterpillars eat leaves. Birds eat caterpillars.';
let state = initialGarden();

function paint(message) {
  scene.dataset.leaves = String(state.leaves);
  el('week').textContent = 'Week ' + state.week;
  plot.textContent = state.leaves ? 'Remove plants' : 'Restore plants';
  el('leaf-count').textContent = state.leaves ? '6' : '0';
  el('caterpillar-count').textContent = state.caterpillars;
  el('bird-count').textContent = state.birds;
  caterpillars.forEach((icon, index) => icon.classList.toggle('away', index >= state.caterpillars));
  birds.forEach((icon, index) => icon.classList.toggle('away', index >= state.birds));
  el('art-title').textContent = `Garden, week ${state.week}: ${state.leaves ? 6 : 0} plants, ${state.caterpillars} caterpillars and ${state.birds} birds.`;
  el('notice').textContent = message;
}

plot.addEventListener('click', () => {
  state = setLeaves(state, !state.leaves);
  paint(state.leaves ? 'Fresh leaves are back. See what changes next week.' : 'The plants are gone. See what changes next week.');
});

el('next').addEventListener('click', () => {
  const before = state;
  state = nextWeek(before);
  paint(observation(before, state));
});

el('reset').addEventListener('click', () => {
  state = initialGarden();
  paint(baseline);
});

paint(baseline);
scene.dataset.ready = 'true';
