/**
 * where-used@1: where a skill turns up outside the classroom. Not an explanation and not part of the lesson: a door the
 * learner may open ("Where is this used?"), with one everyday place the idea lives and one playful question about it.
 * Nothing here is recorded or counted, and nothing is shown unless asked for. Written once per skill and kept as data;
 * a skill with no honest everyday use has no entry (a forced one is worse than none).
 */
export interface Use { title: string; lines: string[]; ask: { q: string; choices: string[]; right: number; reply: string } }
const u = (title: string, lines: string[], q: string, choices: string[], right: number, reply: string): Use => ({ title, lines, ask: { q, choices, right, reply } });

const TOWER = u("The leaning tower", ["A famous tower in Pisa, Italy, leans about 4° away from straight up. People travel across the world to see it.", "Builders measure angles so that walls stand at a right angle to the ground and do not lean."], "A wall that stands straight makes which angle with the ground?", ["Acute", "Right", "Obtuse"], 1, "A right angle, 90°. The Pisa tower makes a little less, about 86°, so it leans.");
const CARROM = u("Carrom", ["On a carrom board the striker bounces off the side at the same angle it came in.", "Good players pick the angle before they flick."], "The striker hits the side at 40°. At about what angle does it bounce away?", ["20°", "40°", "90°"], 1, "40°: the same angle going out as coming in.");
const CROWD = u("Headlines", ["A newspaper says \"about 50,000 people watched the match\". Nobody wrote 49,872 in the headline: it was rounded.", "Round numbers are easier to say and to remember."], "49,872 people, to the nearest ten thousand, is about…", ["40,000", "50,000"], 1, "50,000. It is much nearer to 50,000 than to 40,000.");
const PEOPLE = u("Counting a country", ["India has more than 140 crore people. In other countries the same number is called 1.4 billion.", "Big numbers need names, and two ways of putting the commas."], "1 crore is how many million?", ["1", "10", "100"], 1, "10 million. So 140 crore is 1,400 million.");
const LIFT = u("Lifts and cold places", ["In a tall building the floors below the ground are −1 and −2. In Leh, winter nights go below 0 °C.", "Numbers below zero tell you how far under."], "You are at floor −2 and go up 5 floors. Where are you?", ["Floor 3", "Floor 7", "Floor −7"], 0, "Floor 3. From −2, five floors up passes 0 and reaches 3.");
const SHOP = u("At the shop", ["Before paying, round each price and add in your head.", "If the bill is far from your estimate, something was typed wrong."], "₹98 and ₹203 is about…", ["₹200", "₹300", "₹400"], 1, "About ₹300: 100 + 200.");
const PRICE = u("Price tags", ["A tag says ₹49.50. That is 49 rupees and 50 paise.", "The dot keeps the rupees and the paise apart."], "Which is more money?", ["₹4.50", "₹4.05"], 0, "₹4.50: 50 paise is more than 5 paise.");
const TAILOR = u("The tailor", ["A tailor buys cloth in metres but measures a sleeve in centimetres.", "To cut the cloth right, both must be in the same unit."], "A 3 m piece of cloth is how many centimetres?", ["30", "300", "3000"], 1, "300 cm. Each metre is 100 cm.");
const TRAIN = u("Train times", ["A train leaves at 6:40 and arrives at 9:10.", "A timetable is all hours and minutes, and 60 minutes make an hour, not 100."], "How long is the journey?", ["2 h 30 min", "3 h 30 min", "2 h 70 min"], 0, "2 hours 30 minutes: 6:40 to 8:40 is 2 hours, then 30 minutes more.");
const DOSA = u("Sharing a dosa", ["Cut a dosa into 4 equal pieces and eat 1: you ate 1/4.", "Cut it into 8 and eat 2: more pieces, but the same amount of dosa."], "Which is more dosa?", ["1/2", "1/4"], 0, "1/2. Cutting into more pieces makes each piece smaller.");
const RECIPE = u("In the kitchen", ["A recipe needs 1/2 cup of milk, and then 1/4 cup more.", "Cooks add fractions every day, without calling it maths."], "How much milk is that altogether?", ["2/6 cup", "3/4 cup", "1/6 cup"], 1, "3/4 cup. A half is two quarters, and one more quarter makes three.");
const SALE = u("Sales and batteries", ["A phone shows 50% battery: half is left.", "A shop sign says 10% off: ₹10 less on every ₹100."], "10% off a ₹200 bag saves how much?", ["₹2", "₹10", "₹20"], 2, "₹20. ₹10 off each hundred, and there are two hundreds.");
const FENCE = u("Fencing a garden", ["A fence goes all the way round a garden.", "To buy the right length you add up every side: that is the perimeter."], "A garden is 5 m long and 3 m wide. How much fence goes round it?", ["8 m", "15 m", "16 m"], 2, "16 m: 5 + 3 + 5 + 3.");
const TILES = u("Tiles on a floor", ["A floor is covered with square tiles, in rows.", "Rows times tiles in a row tells how many to buy: that is the area."], "A floor is 4 tiles long and 3 tiles wide. How many tiles?", ["7", "12", "14"], 1, "12 tiles: 3 rows of 4.");
const KOLAM = u("Kolams and butterflies", ["Many kolams look the same on both sides of a line down the middle. So does a butterfly.", "Fold along that line and the two halves match."], "How many lines of symmetry does a square have?", ["1", "2", "4"], 2, "4: up and down, side to side, and the two corner-to-corner lines.");
const FAN = u("Fans and wheels", ["A ceiling fan with 3 blades looks the same 3 times in one full turn.", "Wheels, flowers and windmills turn onto themselves too."], "A fan with 4 blades looks the same how many times in one full turn?", ["2", "4", "8"], 1, "4 times: once for each blade.");
const BUSES = u("Two buses", ["One bus comes every 10 minutes and another every 15 minutes. They both leave now.", "Common multiples tell you when they will leave together again."], "After how many minutes do they next leave together?", ["25", "30", "150"], 1, "30 minutes: the first number both 10 and 15 go into.");
const EGGS = u("Egg trays", ["An egg tray has 6 rows of 5 eggs: 30 eggs.", "Shopkeepers count trays, not eggs, and multiply."], "How many eggs are in 4 trays?", ["34", "100", "120"], 2, "120 eggs: 4 × 30.");
const AUTOS = u("Sharing fairly", ["25 children are going on a trip. Each auto holds 4 children.", "Dividing tells how many autos, and the remainder still needs a seat."], "How many autos are needed?", ["6", "7"], 1, "7. Six autos take 24 children, and the one child left over needs another auto.");
const CLOCK = u("Clocks and chapters", ["Some clock faces use I, II, III, up to XII. Books number their first pages this way too.", "They are Roman numerals, about two thousand years old."], "The hour hand points to IX. What hour is it?", ["4", "9", "11"], 1, "9. IX is one before ten.");
const CRICKET = u("Scorecards", ["A chart of the runs in each over shows the best over at a glance.", "A picture of numbers is quicker to read than a list."], "On a bar chart of runs, the tallest bar is the over with…", ["the most runs", "the fewest runs"], 0, "The most runs. A taller bar means a bigger number.");
const BOTTLE = u("Bottles and spoons", ["A water bottle holds 1 litre. A medicine spoon holds 5 millilitres.", "Big amounts and tiny amounts need different units."], "How many 500 mL glasses fill a 2 L bottle?", ["2", "4", "10"], 1, "4 glasses. Two glasses make a litre.");
const RACE = u("Running races", ["Races are timed to tenths and hundredths of a second: 11.2 s, 11.25 s.", "The places after the dot decide who wins."], "Who ran faster?", ["11.2 seconds", "11.5 seconds"], 0, "11.2 seconds. In a race the smaller time wins.");
const BOX = u("Sweet boxes", ["A sweet box starts as one flat piece of card, cut and folded.", "The flat shape is called its net."], "How many flat faces does a cube-shaped box have?", ["4", "6", "8"], 1, "6: top, bottom and four sides.");
const BORDER = u("Borders and beats", ["A sari border repeats the same few shapes again and again. So do the beats of a song.", "Find the part that repeats and you know what comes next."], "Red, blue, blue, red, blue, blue, red… what comes next?", ["Red", "Blue"], 1, "Blue. The part that repeats is red, blue, blue.");
const PACK = u("Packing a carton", ["A carton is packed with small boxes, in layers.", "Layers times boxes in a layer tells how many fit: that is the volume."], "A carton holds 2 layers of 6 boxes. How many boxes?", ["8", "12", "36"], 1, "12 boxes: 2 × 6.");

export const USES: Record<string, Use> = {
  "MATH.geometry.angles-intro": TOWER, "MATH.geometry.angle-measure": CARROM,
  "MATH.number.rounding": CROWD, "MATH.number.indian-international-numeration": PEOPLE, "MATH.number.large-numbers": PEOPLE,
  "MATH.number.integer-add": LIFT, "MATH.number.integers": LIFT, "MATH.number.number-line": LIFT,
  "MATH.reasoning.estimate-check": SHOP, "MATH.measurement.money-decimals": PRICE,
  "MATH.measurement.length-conversion": TAILOR, "MATH.measurement.compute-with-measures": TAILOR,
  "MATH.measurement.time-unit-conversion": TRAIN, "MATH.measurement.elapsed-time": TRAIN,
  "MATH.number.fraction-models": DOSA, "MATH.number.equivalent-fractions": DOSA, "MATH.number.fraction-comparison": DOSA, "MATH.number.fraction-add": RECIPE,
  "MATH.number.percent-intro": SALE, "MATH.number.percentage": SALE,
  "MATH.measurement.perimeter-intro": FENCE, "MATH.measurement.rectangle-perimeter": FENCE, "MATH.measurement.area-squares": TILES, "MATH.measurement.rectangle-area": TILES,
  "MATH.geometry.symmetry-lines": KOLAM, "MATH.geometry.rotational-symmetry": FAN,
  "MATH.number.hcf-lcm": BUSES, "MATH.number.factors-multiples": BUSES,
  "MATH.number.multiplication-tables": EGGS, "MATH.number.multi-multiplication": EGGS, "MATH.number.long-division": AUTOS, "MATH.number.division-remainders": AUTOS,
  "MATH.number.roman-numerals": CLOCK,
  "MATH.statistics.bar-charts": CRICKET, "MATH.statistics.scaled-bars": CRICKET,
  "MATH.measurement.unit-conversions": BOTTLE, "MATH.measurement.capacity": BOTTLE,
  "MATH.number.decimal-tenths": RACE, "MATH.number.decimal-operations": RACE,
  "MATH.geometry.nets": BOX, "MATH.algebra.repeating-patterns": BORDER, "MATH.measurement.volume-cubes": PACK,
};
export const useFor = (competency: string | undefined): Use | null => (competency && Object.prototype.hasOwnProperty.call(USES, competency) ? USES[competency] : null);
