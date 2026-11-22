export const SIGNAL = 42;
export const STATION = '“This is Congress Radio calling on 42.34 meters from somewhere in India.”';
export const sceneOrder = Object.freeze(['title','bridge','talks','wardha','gathering','arrests','radio','places','suppression','aftermath','independence']);
export const lessons = Object.freeze({
  title: {date:'LIVING HISTORY · 1942',title:'The Morning After',photo:'maidan',context:'The Quit India Movement. How did it continue after its leaders were arrested?'},
  bridge: {date:'FROM 1930 TO 1942',title:'From salt to freedom',context:'At Dandi in 1930, people challenged a salt law. By 1942 the demand was broader: British rule must end now. The two movements were twelve years apart.',
    clues:[['What changed?','Two goals, twelve years apart','Civil Disobedience used acts such as making salt to challenge colonial laws. Quit India called for immediate British withdrawal during a world war.']]},
  talks: {date:'INDIA · MARCH–APRIL 1942',title:'Two sides of the table',photo:'desk',context:'Japan had advanced through neighbouring Burma, and India faced a threat of attack. The Cripps talks also failed. Open the two documents to see why it mattered who held power during the war.',
    clues:[
      ['British draft','30 March · Paraphrase','Britain proposed that Indians start writing a new constitution after the war. During the war, Britain would keep control of India’s defence.'],
      ['Congress reply','2 April · Paraphrase','Congress sought freedom and real authority during the war, including responsibility for defence. That was one major reason it rejected the offer.'],
    ]},
  wardha: {date:'WARDHA · 14 JULY 1942',title:'The demand takes shape',context:'After the failed talks, the Congress Working Committee backed a demand to end British rule. In August, the All India Congress Committee would take it up in Bombay.',
    clues:[['Follow the resolution','Wardha → Bombay','The Congress Working Committee approved the proposal in July. The All India Congress Committee adopted the Quit India resolution at its August session.']]},
  gathering: {date:'BOMBAY · 8 AUGUST 1942',title:'The call',photo:'maidan',context:'From the back of Gowalia Tank Maidan, you witness Congress call for an end to British rule. Gandhi urges nonviolence: “Do or Die.”',
    clues:[['Look towards the platform','The Quit India Resolution','The All India Congress Committee called for British rule to end immediately. Gandhi urged nonviolent struggle and gave the call “Do or Die.”']]},
  arrests: {date:'BOMBAY · 9 AUGUST 1942',title:'The next morning',photo:'street',context:'By morning, Gandhi and other senior Congress leaders have been arrested. Can a movement continue without orders from its leaders?',
    clues:[['Read the notice','Leaders arrested','The colonial government arrested Gandhi and other senior Congress leaders. Gandhi was held at the Aga Khan Palace in Poona. People continued protesting even without direct instructions from the jailed leaders.']]},
  radio: {date:'BOMBAY · LATER IN 1942',title:'A voice through the static',photo:'radio',context:'Usha Mehta and her colleagues used Congress Radio to share news despite censorship. Turn the dial to find the simulated station. No historical audio is playing.'},
  places: {date:'INDIA · FROM AUGUST 1942',title:'How it spread',context:'Students demonstrated, workers struck, and some towns set up local administrations. Choose a place to see how the movement took different forms.',
    clues:[
      ['Ballia','United Provinces · 1942','Local protesters challenged colonial control and briefly set up their own administration.'],
      ['Tamluk','Bengal · From 1942','Local organisers set up a parallel administration in Tamluk. It was one example of people organising beyond Bombay.'],
      ['Satara','Bombay Presidency · From 1943','Local organisers formed a parallel government during the movement’s longer regional aftermath.'],
      ['Tamil Nadu','Madras Presidency · From 1942','K. Kamaraj continued organising after the arrests. Students protested and workers struck, including at Madras Port Trust. In Madurai, Congress volunteers clashed with the military. This was local action, not a scene of people receiving the Bombay broadcast.'],
    ]},
  suppression: {date:'INDIA · 1942 AND AFTER',title:'The authorities strike back',photo:'street',context:'The colonial government used arrests and force to suppress the uprising. Some protests became violent, despite Gandhi’s call for nonviolence.',
    clues:[['Read the record','The response was not uniform','The government detained many people. Demonstrations, strikes and local organising did not all end at once; Satara’s parallel government began in 1943.']]},
  aftermath: {date:'INDIA · AFTER THE UPRISING',title:'What changed?',context:'British rule did not end in 1942. Quit India showed how widely the demand for independence could be carried, even with the leading organisers jailed.',
    clues:[
      ['Why didn’t it end with the arrests?','One way to explain it','Local groups acted without waiting for their leaders. Students and workers organised protests, and initiatives like Congress Radio helped share news.'],
      ['Compare the three movements','Gandhi and the mass movements','Non-Cooperation: withdraw cooperation. Civil Disobedience: openly break colonial laws, as at Dandi. Quit India: demand the immediate end of British rule.'],
    ]},
  independence: {date:'INDIA · AUGUST 1947',title:'Five years later',context:'India became independent in 1947, not in 1942. Independence followed years of struggle and negotiations and came with Partition.',
    clues:[['Compare your retelling','An example retelling','The wartime talks failed, Congress demanded immediate freedom, and the authorities arrested the leaders. Local action continued. The government suppressed the uprising, but the demand for independence outlasted it.']]},
});
export function clampDial(value) { return Math.min(80,Math.max(0,Math.round(value))); }
export function hasSignal(value) { return Math.abs(value-SIGNAL)<=5; }
export function moveScene(index, step) {
  return Math.min(sceneOrder.length-1, Math.max(0,index+step));
}
