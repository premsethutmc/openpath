export const initialGarden = () => ({ week: 0, leaves: true, caterpillars: 6, birds: 3 });
export const setLeaves = (state, leaves) => ({ ...state, leaves });
const approach = (value, target, step) => value + Math.sign(target - value) * Math.min(step, Math.abs(target - value));

export function nextWeek(state) {
  return {
    ...state,
    week: state.week + 1,
    caterpillars: approach(state.caterpillars, state.leaves ? 6 : 0, 2),
    // Birds respond to the previous week's food, not to removing the plants directly.
    birds: approach(state.birds, Math.ceil(state.caterpillars / 2), 1),
  };
}

export function observation(before, after) {
  if (before.caterpillars > after.caterpillars)
    return before.birds > after.birds ? 'Fewer caterpillars to eat. Fewer birds visit.' : 'Less food for caterpillars. Fewer stay.';
  if (before.caterpillars < after.caterpillars)
    return before.birds < after.birds ? 'More caterpillars, and more birds come to feed.' : 'Fresh leaves bring back caterpillars.';
  if (before.birds > after.birds) return 'With no caterpillars here, the last birds look elsewhere.';
  if (before.birds < after.birds) return 'More birds visit now that there is food.';
  return after.leaves ? 'The garden is steady this week.' : 'Without the plants, this food chain is still quiet.';
}
