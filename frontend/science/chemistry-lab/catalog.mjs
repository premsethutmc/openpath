// The inventory and rules are content, independent of the lab UI.
export const materials = Object.freeze({
  water:{name:'Water',formula:'H₂O',atoms:{H:2,O:1},dose:{water:20}},
  salt:{name:'Table salt',formula:'NaCl',atoms:{Na:1,Cl:1},dose:{salt:2}},
  vinegar:{name:'Vinegar',formula:'Dilute acetic acid',dose:{acid:1,water:10}},
  baking:{name:'Baking soda',formula:'NaHCO₃',atoms:{Na:1,H:1,C:1,O:3},dose:{baking:1}},
  acid:{name:'Acetic acid',formula:'CH₃COOH',atoms:{C:2,H:4,O:2}},
  acetate:{name:'Sodium acetate',formula:'CH₃COONa',atoms:{C:2,H:3,O:2,Na:1}},
  carbon:{name:'Carbon dioxide',formula:'CO₂',atoms:{C:1,O:2}},
  copper:{name:'Copper',formula:'Cu',atoms:{Cu:1},dose:{copper:1}},
  zinc:{name:'Zinc',formula:'Zn',atoms:{Zn:1},dose:{zinc:1}},
});
export const stations = Object.freeze({
  beaker:{name:'Beaker',tools:['water','salt','vinegar','baking'],question:'What fizzes? What only dissolves?'},
  crucible:{name:'Metals',tools:['copper','zinc'],question:'Can two metals make a new material without making a new compound?'},
});
export const reactions = Object.freeze([
  {id:'acid-carbonate',station:'beaker',in:{acid:1,baking:1},out:{acetate:1,water:1},gas:{carbon:1},
   observation:'Bubbles of carbon dioxide escape.',equation:'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂'},
]);
export const alloys = Object.freeze([
  {id:'brass',station:'crucible',ingredients:['copper','zinc'],name:'Copper–zinc alloy'},
]);
