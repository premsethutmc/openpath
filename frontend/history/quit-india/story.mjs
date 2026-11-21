export const SIGNAL = 42;
export const STATION = '“This is Congress Radio calling on 42.34 meters from somewhere in India.”';
export const sceneOrder = Object.freeze(['title','talks','gathering','arrests','radio','places','aftermath']);
export const lessons = Object.freeze({
  title: {date:'LIVING HISTORY · 1942',title:'The Morning After',photo:'maidan',context:'The Quit India Movement. How did it continue after its leaders were arrested?'},
  talks: {date:'INDIA · MARCH–APRIL 1942',title:'Two sides of the table',photo:'desk',context:'Japan had advanced through neighbouring Burma, and India faced a threat of attack. The Cripps talks also failed. Open the two documents to see why it mattered who held power during the war.',
    clues:[
      ['British draft','30 March · Paraphrase','Britain proposed that Indians start writing a new constitution after the war. During the war, Britain would keep control of India’s defence.'],
      ['Congress reply','2 April · Paraphrase','Congress sought freedom and real authority during the war, including responsibility for defence. That was one major reason it rejected the offer.'],
    ]},
  gathering: {date:'BOMBAY · 8 AUGUST 1942',title:'The call',photo:'maidan',context:'You are at the back of the gathering at Gowalia Tank Maidan.',
    clues:[['Look towards the platform','The Quit India Resolution','The All India Congress Committee called for British rule to end immediately. Gandhi urged nonviolent struggle and gave the call “Do or Die.”']]},
  arrests: {date:'BOMBAY · 9 AUGUST 1942',title:'The next morning',photo:'street',context:'The street is quiet. There’s a notice by the road.',
    clues:[['Read the notice','Leaders arrested','The colonial government arrested Gandhi and other senior Congress leaders. Gandhi was held at the Aga Khan Palace in Poona. People continued protesting even without direct instructions from the jailed leaders.']]},
  radio: {date:'BOMBAY · LATER IN 1942',title:'A voice through the static',photo:'radio',context:'Turn the dial to find Congress Radio. The station is simulated; no historical audio is playing.'},
  places: {date:'INDIA · FROM AUGUST 1942',title:'How it spread',context:'Choose a place. The response took different forms in different regions.',
    clues:[
      ['Ballia','United Provinces · 1942','Local protesters challenged colonial control and briefly set up their own administration.'],
      ['Tamluk','Bengal · From 1942','Local organisers set up a parallel administration in Tamluk. It was one example of people organising beyond Bombay.'],
      ['Satara','Bombay Presidency · From 1943','Local organisers formed a parallel government during the movement’s longer regional aftermath.'],
      ['Tamil Nadu','Madras Presidency · From 1942','K. Kamaraj continued organising after the arrests. Students protested and workers struck, including at Madras Port Trust. In Madurai, Congress volunteers clashed with the military. This was local action, not a scene of people receiving the Bombay broadcast.'],
    ]},
  aftermath: {date:'1942 AND AFTER',title:'What changed?',context:'The authorities suppressed the uprising, and British rule did not end in 1942. Quit India showed that the demand for independence continued well beyond its jailed leaders. India became independent in 1947 through many developments and negotiations; independence came with Partition.',
    clues:[
      ['Why didn’t it end with the arrests?','One way to explain it','Local groups could act without waiting for their leaders. Students and workers organised protests, and initiatives like Congress Radio helped share news despite censorship.'],
      ['Compare the three movements','Gandhi and the mass movements','Non-Cooperation: withdraw cooperation. Civil Disobedience: openly break a specific law, as at Dandi. Quit India: demand the immediate end of British rule.'],
    ]},
});
export function clampDial(value) { return Math.min(80,Math.max(0,Math.round(value))); }
export function hasSignal(value) { return Math.abs(value-SIGNAL)<=5; }
export function moveScene(index, step) {
  return Math.min(sceneOrder.length-1, Math.max(0,index+step));
}
