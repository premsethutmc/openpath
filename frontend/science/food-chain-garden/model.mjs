// A small, deterministic garden food web for Class 5. Counts are teaching-model values, not forecasts.
// Caterpillars eat leaves; frogs and birds both eat caterpillars.
export const SPECIES = ['plants', 'caterpillars', 'frogs', 'birds'];
export const LIMITS = { plants: 8, caterpillars: 12, frogs: 4, birds: 4 };
export const initialGarden = () => ({ week: 0, plants: 6, caterpillars: 6, frogs: 1, birds: 2 });

const clamp = (key, n) => Math.max(0, Math.min(LIMITS[key], Math.round(n)));
const approach = (value, target, step) => value + Math.sign(target - value) * Math.min(step, Math.abs(target - value));

export const setCount = (state, key, n) => ({ ...state, [key]: clamp(key, n) });

export function nextWeek(state) {
  const { plants: P, caterpillars: C, frogs: F, birds: B } = state;
  const meals = Math.floor(C / 2); // each frog or bird needs two caterpillars a week
  let plants = P;
  // Too many caterpillars strip leaves, but roots survive: grazing never removes the last plant.
  if (P > 0 && C > P) plants = Math.max(1, P - Math.min(2, Math.ceil((C - P) / 2)));
  else if (P > 0 && C < P) plants = Math.min(LIMITS.plants, P + 1);
  // Leaves let caterpillars multiply; hunters hold them back. Butterflies can lay eggs again on any leaves.
  const caterpillarTarget = Math.min(LIMITS.caterpillars, Math.max(0, 2 * P - 2 * (F + B)));
  // Frogs live here and cannot fly in once gone. Birds visit when spare caterpillars are about.
  const frogTarget = F === 0 ? 0 : Math.min(LIMITS.frogs, Math.max(0, meals - B));
  const birdTarget = Math.min(LIMITS.birds, Math.max(0, meals - F));
  return {
    week: state.week + 1,
    plants,
    caterpillars: approach(C, caterpillarTarget, 2),
    frogs: approach(F, frogTarget, 1),
    birds: approach(B, birdTarget, 1),
  };
}

export const trend = (before, after, key) =>
  after[key] > before[key] ? 'more' : after[key] < before[key] ? 'fewer' : 'same';

export function observation(before, after) {
  const notes = [];
  if (before.frogs > 0 && after.frogs === 0) notes.push('The last frog is gone. Frogs cannot fly in, so only you can bring them back.');
  const t = key => trend(before, after, key);
  if (t('plants') === 'fewer') notes.push('Too many caterpillars chewed the plants.');
  if (t('plants') === 'more') notes.push('Plants grew new leaves.');
  if (t('caterpillars') === 'more')
    notes.push(before.caterpillars === 0 ? 'Butterflies laid eggs. New caterpillars hatched.'
      : 2 * (before.frogs + before.birds) < before.caterpillars ? 'With few hunters about, caterpillars multiplied.'
      : 'Plenty of leaves, so more caterpillars hatched.');
  if (t('caterpillars') === 'fewer')
    notes.push(before.plants < before.caterpillars ? 'There were not enough leaves for every caterpillar.'
      : 'Hungry birds and frogs ate many caterpillars.');
  if (t('birds') === 'more') notes.push('Birds flew in to eat spare caterpillars.');
  if (t('birds') === 'fewer') notes.push('Too few caterpillars, so some birds flew away.');
  if (t('frogs') === 'more') notes.push('Well-fed frogs grew in number.');
  if (t('frogs') === 'fewer' && after.frogs > 0) notes.push('Frogs went hungry. Fewer are left.');
  if (notes.length) return notes.slice(0, 2).join(' ');
  if (SPECIES.every(key => after[key] === 0)) return 'The garden is empty. Add plants to start a food chain.';
  return after.plants === 0 ? 'Without plants, nothing here can make food.' : 'The garden is steady this week. Change something and see.';
}
