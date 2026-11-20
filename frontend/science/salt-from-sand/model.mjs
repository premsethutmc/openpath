export const initialPhase = 'dry';
export const phases = ['dry', 'wet', 'solution', 'filtered', 'recovered'];
export const actions = ['water', 'stir', 'filter', 'evaporate'];

const steps = {
  dry: ['water', 'wet', 'Both solids are wet. Stir to dissolve the salt.'],
  wet: ['stir', 'solution', 'The salt is out of sight; the sand is still visible.'],
  solution: ['filter', 'filtered', 'Sand stayed in the filter. The salty water passed through.'],
  filtered: ['evaporate', 'recovered', 'Water left as vapour. Solid salt was left behind.'],
};
const early = {
  water: 'You have enough water for this model. Adding more will not separate the solids.',
  stir: 'Stirring dry grains only mixes them. Try adding water.',
  filter: 'Dry grains would stay together in the filter. Dissolve one solid first.',
  evaporate: 'There is no liquid to evaporate yet. You need another way to separate the dry grains.',
};
export function perform(phase, action) {
  if (!phases.includes(phase) || !actions.includes(action)) throw new TypeError('Unknown lab step');
  const step = Object.hasOwn(steps, phase) ? steps[phase] : null;
  if (step?.[0] === action) return { phase: step[1], message: step[2] };
  if (!step) return { phase, message: 'Both solids have been recovered. Replay to try again.' };
  let message = early[action];
  if (phase === 'wet' && action === 'filter') message = 'Let the salt dissolve before filtering so the salt does not stay with the sand.';
  if ((phase === 'wet' || phase === 'solution') && action === 'evaporate') message = 'Evaporating now would leave the salt mixed with the sand. Filter first.';
  if (action === 'stir' && phase !== 'dry') message = 'The salt is already dissolved. Stirring again will not separate it.';
  if (action === 'filter' && phase === 'filtered') message = 'The filter has caught the sand. Another filter will not catch the dissolved salt.';
  return { phase, message };
}

export const particleNotes = {
  dry: 'Solid salt crystals sit beside grains of sand.',
  wet: 'In this model, stirring helps the salt finish dissolving.',
  solution: 'The salt separates into sodium and chloride ions that spread through the water. The sand stays solid.',
  filtered: 'The filter holds the sand grains. Water and the dissolved ions pass through.',
  recovered: 'Water molecules leave as vapour. As enough water leaves, sodium and chloride ions form solid salt crystals again.',
};
export function checkTransfer(method, reason) {
  if (!['filter', 'evaporate', 'stir'].includes(method) || !['vapour', 'holes', 'mixing'].includes(reason)) return null;
  return { method: method === 'evaporate', reason: reason === 'vapour' };
}
