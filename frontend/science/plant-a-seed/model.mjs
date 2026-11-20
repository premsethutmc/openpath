// A teaching model, not a growing schedule. Temperature and soil drainage are held fixed.
export const storageKey = 'openpath:science:bean-pot:v1';
export const emptyPot = Object.freeze({ day: 0, moisture: 'moist', growth: 0 });
export const firstDay = Object.freeze({ day: 1, moisture: 'moist', growth: 0 });
const soils = ['dry', 'moist', 'waterlogged'];
const actions = ['water', 'wait'];

export function validPot(pot) {
  return !!pot && Number.isSafeInteger(pot.day) && pot.day >= 0
    && soils.includes(pot.moisture)
    && Number.isSafeInteger(pot.growth) && pot.growth >= 0 && pot.growth <= 3
    && (pot.day === 0
      ? pot.growth === 0 && pot.moisture === 'moist'
      : pot.growth < pot.day);
}

export function stageOf(pot) {
  if (!validPot(pot)) throw new TypeError('Invalid pot');
  if (pot.day === 0) return 'empty';
  if (pot.growth >= 3) return 'sprout';
  return pot.growth >= 1 ? 'root' : 'seed';
}

export function nextDay(pot, action) {
  if (!validPot(pot) || pot.day === 0 || !actions.includes(action)) {
    throw new TypeError('Plant the bean and choose Water or Wait');
  }
  const { moisture, day, growth } = pot;
  const soaked = action === 'water' && moisture !== 'dry';
  const canGrow = !soaked && (moisture === 'moist' || action === 'water');
  // Puddles drain if left alone; growth resumes only on the following suitable day.
  const newSoil = soaked ? 'waterlogged' : action === 'water' || moisture === 'waterlogged' ? 'moist' : 'dry';
  return {
    pot: {
      day: Math.min(day + 1, Number.MAX_SAFE_INTEGER),
      moisture: newSoil,
      growth: Math.min(growth + Number(canGrow), 3),
    },
    outcome: soaked ? 'soaked' : moisture === 'waterlogged' ? 'drained' : canGrow ? 'grew' : 'dry',
  };
}

export function checkTwoPots(crumbly, damp) {
  if (!actions.includes(crumbly) || !actions.includes(damp)) return null;
  return { crumbly: crumbly === 'water', damp: damp === 'wait' };
}

export function loadPot(storage) {
  try {
    const saved = storage.getItem(storageKey);
    if (saved === null) return { pot: emptyPot, status: 'ready' };
    const value = JSON.parse(saved);
    if (value.version !== 1 || !validPot(value.pot)) throw new TypeError('Invalid saved pot');
    const { day, growth, moisture } = value.pot;
    return { pot: { day, growth, moisture }, status: 'ready' };
  } catch { return { pot: emptyPot, status: 'unavailable' }; }
}

export function savePot(storage, pot) {
  if (!validPot(pot)) throw new TypeError('Invalid pot');
  try {
    storage.setItem(storageKey, JSON.stringify({ version: 1, pot }));
    return true;
  } catch { return false; }
}
