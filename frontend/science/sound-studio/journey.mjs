// Meena akka's festival: which instrument is open, what to try next, and what has been found.
import { DISCOVERIES, discover, nextAsk } from './model.mjs';

const get = id => document.getElementById(id);
const KEY = 'openpath.sound-studio.found';
const OPENERS = {
  veena: 'Pull the veena string and let go.',
  bottles: 'Tap a bottle to blow across its mouth.',
  drum: 'Tap the drum. Watch the rice.',
  bell: 'Ring the bell inside the jar.',
  hear: 'Slide the pitch. Who can hear it?',
};
const tabs = [...document.querySelectorAll('[role=tab]')];
const leaving = new Set();
let station = 'veena', started = new Set(), found;
try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]').filter(id => DISCOVERIES.some(d => d.id === id))); }
catch { found = new Set(); }

function save() { try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch {} }

function guide() {
  const ask = nextAsk(station, found);
  get('guide-line').textContent = !started.has(station) ? OPENERS[station]
    : ask ? ask.ask : found.size === DISCOVERIES.length ? 'Everything is ready. Start the concert!' : 'All done here. Try another instrument.';
}

function notebook() {
  get('nb-count').textContent = `${found.size} of ${DISCOVERIES.length}`;
  get('nb-list').replaceChildren(...DISCOVERIES.filter(d => found.has(d.id)).map(d => {
    const li = document.createElement('li'); li.textContent = d.found; return li;
  }));
  get('concert').hidden = found.size < DISCOVERIES.length;
  for (const tab of tabs) {
    const all = DISCOVERIES.filter(d => d.station === tab.dataset.station);
    const done = all.filter(d => found.has(d.id)).length;
    tab.querySelector('i').textContent = done === all.length ? '✓' : `${done}/${all.length}`;
    tab.querySelector('i').setAttribute('aria-label', `${done} of ${all.length} found`);
  }
}

export function report(event) {
  started.add(event.station);
  const hit = discover(event, found);
  if (hit) {
    found.add(hit.id); save(); notebook();
    toast('You found out', hit.found);
  }
  guide();
  return hit;
}

let hide;
export function toast(title, text) {
  const box = get('eureka');
  box.innerHTML = '';
  const b = document.createElement('b'); b.textContent = title;
  box.append(b, text);
  box.hidden = false;
  clearTimeout(hide);
  hide = setTimeout(() => { box.hidden = true; }, 7000);
}
get('eureka').addEventListener('click', () => { get('eureka').hidden = true; });

export function onLeave(fn) { leaving.add(fn); }

function open(next, focus) {
  if (next === station) return;
  leaving.forEach(fn => fn(station));
  station = next;
  for (const tab of tabs) {
    const on = tab.dataset.station === next;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    get(tab.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) tab.focus();
  }
  get('eureka').hidden = true;
  guide();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => open(tab.dataset.station));
  tab.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    open(tabs[(i + step + tabs.length) % tabs.length].dataset.station, true);
  });
});

export function onConcert(fn) { get('concert').addEventListener('click', fn); }
notebook();
guide();
