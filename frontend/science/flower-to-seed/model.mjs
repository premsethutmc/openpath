export const seeds = {
  dandelion: { name:'Dandelion', carrier:'wind', feature:'Feathery tuft catches the wind.' },
  coconut: { name:'Coconut', carrier:'water', feature:'Fibrous husk helps the coconut float.' },
  burdock: { name:'Burdock', carrier:'animal', feature:'Tiny hooks hold onto fur.' },
};
export const stages = [
  {title:'Pollen lands', detail:'Pollen lands on the stigma. That’s pollination.'},
  {title:'Fertilisation', detail:'A pollen tube grows. A male cell joins an egg inside an ovule.'},
  {title:'Seeds grow', detail:'Ovules become seeds. The ovary becomes the pod.'},
  {title:'Pod ripens', detail:'The dry pod is ready to split.'},
];
export function pollenPath(from,to,part) {
  if (![0,1].includes(from)||![0,1].includes(to)) return 'empty';
  return part!=='stigma'?'miss':from===to?'self':'cross';
}
export function cycle(path,stage) {
  return path==='cross'&&Number.isInteger(stage)&&stage>=0?stages[stage]??null:null;
}
export function disperse(seed,carrier) {
  if (!Object.hasOwn(seeds,seed)||!['wind','water','animal'].includes(carrier)) return null;
  return seeds[seed].carrier===carrier;
}
export const crops={
  mustard:{name:'Mustard seed', root:'A root comes out of the seed.', shoot:'A shoot grows up and opens its first leaves.'},
  potato:{name:'Potato with an eye', root:'The eye is a bud. Its shoot starts growing, without a seed.', shoot:'Roots and leaves grow from the sprouting potato.'},
};
export function startBed(crop='mustard') {
  if (!Object.hasOwn(crops,crop)) throw new RangeError('Unknown crop');
  return {crop,planted:false,moist:false,day:0};
}
export function tend(bed,action) {
  if (action==='plant') return {...bed,planted:true};
  if (action==='water'&&bed.planted) return {...bed,moist:true};
  if (action==='time'&&bed.planted&&bed.moist) return {...bed,day:Math.min(2,bed.day+1)};
  return bed;
}
