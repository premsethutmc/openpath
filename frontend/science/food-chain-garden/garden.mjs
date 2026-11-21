import { SPECIES, LIMITS, initialGarden, setCount, nextWeek, trend, observation } from './model.mjs';

const el = (id) => document.getElementById(id);
const scene = el('scene');
const icons = Object.fromEntries(SPECIES.map(key => [key, [...document.querySelectorAll(`#${key} use`)]]));
const COLORS = { plants: '#3f7d3c', caterpillars: '#a08a1e', frogs: '#2f6f8f', birds: '#a8452c' };
const DASH = { plants: '', caterpillars: '6 3', frogs: '2 3', birds: '9 3 2 3' };
const baseline = 'Caterpillars eat leaves. Frogs and birds eat caterpillars.';
const NAMES = { plants: 'plants', caterpillars: 'caterpillars', frogs: 'frogs', birds: 'birds' };
let state, history, guess;

function drawChart() {
  const svg = el('chart');
  const shown = history.slice(-13);
  const x = i => 14 + i * (296 / 12);
  const y = n => 106 - n * (96 / 12);
  let out = '<title id="chart-title">' + el('chart-title').textContent + '</title>';
  out += [0, 4, 8, 12].map(n => `<path d="M14 ${y(n)}H312" stroke="#dde2cf"/><text x="10" y="${y(n) + 3}" text-anchor="end">${n}</text>`).join('');
  for (const key of SPECIES) {
    const pts = shown.map((s, i) => `${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
    out += `<polyline points="${pts}" fill="none" stroke="${COLORS[key]}" stroke-width="2.4" stroke-dasharray="${DASH[key]}" stroke-linejoin="round"/>`;
  }
  svg.innerHTML = out;
}

function paint(message) {
  el('week').textContent = 'Week ' + state.week;
  for (const key of SPECIES) {
    el(key + '-count').textContent = state[key];
    icons[key].forEach((icon, index) => icon.classList.toggle('away', index >= state[key]));
    const tile = document.querySelector(`li[data-key="${key}"]`);
    tile.querySelector('[data-step="-1"]').disabled = state[key] === 0;
    tile.querySelector('[data-step="1"]').disabled = state[key] === LIMITS[key];
  }
  el('art-title').textContent = `Garden, week ${state.week}: ` + SPECIES.map(key => `${state[key]} ${NAMES[key]}`).join(', ') + '.';
  el('chart-title').textContent = `Numbers over the last ${Math.min(history.length, 13)} weeks. This week: ` + SPECIES.map(key => `${NAMES[key]} ${state[key]}`).join(', ') + '.';
  drawChart();
  el('notice').textContent = message;
}

function setGuess(value) {
  guess = value;
  document.querySelectorAll('[data-guess]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.guess === value)));
}

function start() {
  state = initialGarden();
  history = [state];
  setGuess(null);
  paint(baseline);
}

document.querySelectorAll('.counts li').forEach(tile => tile.addEventListener('click', event => {
  const step = event.target.closest('[data-step]');
  if (!step) return;
  const key = tile.dataset.key;
  state = setCount(state, key, state[key] + Number(step.dataset.step));
  history[history.length - 1] = state; // changes happen within the current week
  paint(`Now ${state[key]} ${NAMES[key]}. What will happen next week?`);
}));

document.querySelectorAll('[data-guess]').forEach(b => b.addEventListener('click', () => setGuess(guess === b.dataset.guess ? null : b.dataset.guess)));

el('next').addEventListener('click', () => {
  const before = state;
  state = nextWeek(before);
  history.push(state);
  let message = observation(before, state);
  if (guess) {
    const who = el('guess-who').value;
    const actual = trend(before, state, who);
    const said = `${actual === 'same' ? 'the same number of' : actual} ${NAMES[who]}`;
    message = (actual === guess ? `Your guess was right: ${said}. ` : `Not this time: there were ${said}. `) + message;
    setGuess(null);
  }
  paint(message);
});

el('reset').addEventListener('click', start);

start();
scene.dataset.ready = 'true';
