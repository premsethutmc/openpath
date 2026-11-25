# Step pictures for young children (Class 1 to 5)

**The principle.** For a young child, "Break it down" has to *show the step happening and let the child do it*, not explain it in English. A child who cannot do 0 + 2 cannot read a sentence about running totals. The model is the counter and the lift (`tally`, `packages/learning/src/tally.ts`): the child drops "+2" and the counter clicks 0 → 1 → 2, one number at a time. This page goes through every question family whose class is 1 to 5 and says, for each step a child gets stuck on, what picture shows it and what the child does with their finger. Every picture is a scene of the one scene engine (`packages/learning/src/scene.ts`), set up from the question's own numbers by a builder per family (as `scenes.ts` already does for `aacmp` and `aeround`), so no family gets a drawing of its own.

**How the families were found.** A family's class is the lowest grade any problem in its pool belongs to: its `grade(p)` where the family gives one, otherwise the first grade of its competency (`graph.get(competency).gradeRange[0]`). 360 of the 1,119 families come out at Class 1 to 5 (Class 1: 57, Class 2: 57, Class 3: 72, Class 4: 95, Class 5: 79). Families that span grades (`aaordx` 1/3/4/5/6, `aasign` 1/3/4/5, `abdiag` 2/4/5 …) are counted once, at their lowest class. Their worked steps were read with `frontend/scripts/step-why-dump.ts`.

## How many families each picture serves

| Picture | Families | of them Class 1–2 |
|---|---|---|
| Existing kinds as they are (`numberline` 44, `fraction` 22, `array` 21, `bars` 7, `rectangle` 7, `order` 4, `commas` 3, `pick` 3, `triangle` 1) | 112 | 22 |
| Existing kinds with a small extension (see the list below) | 26 | 11 |
| `tally` (the counter and the lift, being built) | 24 | 13 |
| **NEW blocks** (base-ten blocks on a place mat) | 39 | 14 |
| **NEW collection** (things to touch: count, match, pair, ring, sort, share) | 32 | 25 |
| **NEW two-scale line** (a double number line for units and rates) | 27 | 0 |
| **NEW dial** (a clock face, compass or protractor whose hand the child turns) | 25 | 5 |
| **NEW walk** (a token moved square by square on a numbered grid) | 16 | 10 |
| **NEW balance** (two pans and a beam) | 8 | 4 |
| **NEW cubes** (a box built layer by layer; unsure) | 7 | 0 |
| **NEW fold** (fold or turn a shape onto itself) | 6 | 1 |
| No picture (reason given in the table) | 38 | 9 |
| **Total** | **360** | **114** |

Where a family's question is several steps from other families (a shop bill: multiply, add, take away), it gets no picture of its own: each step borrows the picture of the family that owns that step.

## The families

| Families (class) | The step the child is stuck on | Picture | Set up from the question's numbers | What the child does |
|---|---|---|---|---|
| cnt (1), aarow (1) | Saying one number for each thing, and knowing the last number is how many (or which place) | **NEW collection** | The things in the question's picture, in a row or scattered | Taps each thing; it gets its number and the counter clicks; the last number stays big |
| aaadd (1), acstory9 (1), abcost (1) | Counting on from the first number | **tally** | start 0, tiles +a, +b (or start a, tile +b); floors 0–20; ₹ unit for prices | Drops the tiles; the counter clicks up one floor at a time |
| aasub (1) | Counting back | **tally** | start a, tile −b, floors 0–20 | Drops the −b tile; the counter clicks down to the answer |
| aazero (1) | Taking away nothing leaves all; taking away all leaves nothing | **NEW collection** | a things in the tray | Moves 0 things out (nothing changes) or all of them (the tray is empty) |
| aabond (1) | How many more to reach the target | **NEW collection** | Ten frame (two for up to 20) with a counters filled | Taps empty cells until the frame shows the target; a second counter counts the new ones |
| aasenadd (1), aasensub (1), acstory (2) | Which operation the story is: join, take away, equal groups or share | **NEW collection** | The story's things in trays | Acts the story (drags the newcomers in, the burst balloons out, deals into plates); the sentence writes itself under each move |
| aamore (1), aagrp (1), abpicmore (1), aaspan (1) | Comparing two groups by matching one to one | **NEW collection** | Two rows of the picture's things | Drags a line from each thing in one row to one in the other; the ones with no partner light up and are counted |
| abpic (1) | Counting one row of the picture record | **NEW collection** | The record's row | Taps each picture; the counter clicks |
| acpict (2), acpicthalf (2), acpicttab (2) | Each picture stands for more than one (the key) | **tally** | start 0, one tile +key for each picture (a half picture is +key/2) | Drops one tile per picture; the counter clicks key floors each time |
| adtally (3) | Counting tally marks in fives | **tally** | start 0, tiles +5 for each bundle, +1 for each single mark | Drops a +5 for each bundle and +1s for the rest |
| acgrow (3), acsticks (3), afmatch (5) | The pattern grows by the same amount each step | **tally** | start = first step's count, tiles +d for each further step (sticks: +2 per new triangle) | Drops one tile per step; sees the same jump every time |
| afletter (5) | A machine does the same thing to any number | **tally** | Several starts (2, 5, 9 …), one tile +k | Tries the tile from different floors; always k floors up, so 'm goes to m + k' |
| avrsub (3) | Division as taking away the same amount again and again | **tally** | start a, tiles −b until 0 | Drops −b tiles until the lift is at ground; counts the tiles |
| aeidesc (5) | Ordering integers: below ground is less | **tally** | floors from the smallest to the largest, the numbers marked as floors | Rides the lift down from the top and taps each number as the lift passes it |
| akromr (4) | A Roman numeral is its symbols added (X X I = 10 + 10 + 1) | **tally** | start 0, one tile per symbol (+10, +5, +1; IV and IX as −1 then +5 / +10) | Drops one tile per letter and reads the floor |
| aamoney (1), aaways (1), aamake (1) | Adding coin values, or how many coins of one kind reach an amount | **tally** | unit ₹, one tile per coin (+10, +5, +2, +1); goal floor = the amount | Drops coins as tiles; the counter clicks ₹1 at a time; counts the tiles that reached the amount |
| abchange (2), abneed (2), abenough (2) | Change and 'how much more' by counting up from the price | **tally** | unit ₹, start at the price (or the money held), floors up to the amount paid or needed | Drops ₹1/₹2/₹5 tiles until the lift reaches the note; the tiles dropped are the change |
| aacoin (1) | Which coin or note is worth most | `order` + picture cards (ext.) | The coins as cards (pictures with their value) | Drags the coins into order; the one at the right end is worth most |
| acpaise (3), acp2r (3), acmoneymul (4/5) | ₹1 is 100 paise | **NEW two-scale line** | Top scale ₹ (0, 1, 2 …), bottom scale paise (0, 100, 200 …) | Slides the marker to the amount on one scale and reads it off the other |
| acmoneyadd (3), agrupee (5) | 100 paise make ₹1 (carrying from paise into rupees) | **NEW blocks** | Mat with ₹ and paise columns; each paise is a ten-paise rod or one-paise cube | Pushes both amounts in; bundles 10 ten-paise rods into a ₹1 coin and moves it across |
| agchange (5/7) | Change: counting up from the bill to the note | `numberline` | numberline from the bill to the note, jump on | Drags the point from the bill up to the note; the jump is the change |
| aeshop (4), acbill (4/5), aetab (4), aebig (4), acstory4 (4) | Several steps in one story (multiply, add, take away) | none | — | No picture of its own: each step is a question of another family and borrows that family's picture |
| aatens (1), aadigit (1), aaword (1), abhto (2), adexp (3), aeexpb (4), adname (3) | A digit's place gives its value (tens and ones; hundreds) | **NEW blocks** | Blocks for the number (or empty columns to fill) | Builds the number by dragging rods and cubes into columns; the digits appear under each column |
| aabund (1) | Making groups of ten | **NEW collection** | The scattered shells | Draws a ring round ten at a time; each ring turns into a ten-rod; the loose ones are left |
| aagreat (1), aadigmax (3/4/5/6), acplace (3) | The bigger digit belongs in the bigger place | **NEW blocks** | Place mat with empty columns and the digit cards | Drops digit cards on the columns; the blocks for each card appear, so a 9 in tens is seen to be far more than a 9 in ones |
| addr (2), acsub2 (2), acsub3 (2), acsubn (2), adcol3 (3), adcolx (3), aeaddn (2), aeadd3 (3), aecol4 (3), aastadd (2/3), aastsub (2/3) | Ten ones make a ten (carry); a ten breaks into ten ones (borrow) | **NEW blocks** | Columns with both numbers' blocks (subtract: only the first) | Pushes the ones together; when there are 10 or more taps 'bundle' and carries a rod across. To take away, taps a rod to break it into 10 cubes, then drags cubes away |
| abreg (2) | Extra ones or tens regroup into the next column | **NEW blocks** | 1 hundred, 2 tens and 10 ones laid out | Bundles the 10 ones into a ten; reads the number |
| acaddten (2) | Adding tens or hundreds changes only that column | **NEW blocks** | The first number's blocks | Drags in the hundreds (tens); the other columns stay still |
| afmissd (4) | A carry (or a borrow) changes the hidden column | **NEW blocks** | The sum on the mat with one column covered | Does the right-hand column, carries the rod, then fills the hidden column until it matches |
| aep10 (4), aemult (4), aediv0 (4) | × 10 moves every digit one place left | **NEW blocks** | The number's blocks | Taps × 10: every cube becomes a rod, every rod a flat, and they slide one column left |
| avdiv (4/5), avmdiv (4), ldiv (4) | Long division: share the biggest blocks first, break the rest | **NEW blocks** | The dividend's blocks and k trays | Deals flats into the trays; breaks the leftover flat into rods and deals those; then the cubes; what is left is the remainder |
| aedec (4), aedpv (4), aedlike (4), agdec (5) | Decimal places: a flat is 1, a rod a tenth, a cube a hundredth | **NEW blocks** | Mat with ones, tenths and hundredths columns | Builds the decimal; adds two by pushing them together and bundling ten cubes into a rod |
| aemix (4), aemulm (4), aedivm (4) | 100 cm make 1 m (exchange between two units) | **NEW blocks** | Mat with m and cm columns (a 10 cm rod and 1 cm cubes) | Pushes in both measures; bundles 100 cm into 1 m and moves it across (divide: breaks a metre into cm to share) |
| aeind (4), aenumf (4), aeintl (5) | Reading and writing large numbers by groups | `commas` | The digits of the number, Indian or international | Places the commas; each group's name (thousand, lakh) appears above it |
| aaname (1) | Saying the number name | none | — | The skill is the word itself; read aloud with the tens-and-ones blocks already in the question |
| aacmp (1), aanext (1), acnlpos (2), acnljump (2), acnlbetween (2), adbetw (3), acnlcmp (2) | Where a number lives, counting on and back | `numberline` | from–to around the numbers, step 1 (or the question's step), jump on | Drags the point; it jumps from the start and the readout counts the steps |
| aaordn (1), aaordx (1/3/4/5/6), aecmp (4), aedesc (5) | Putting numbers in order | `order` | The numbers as cards | Drags the cards smallest to largest |
| aalong (1), aaorder (1) | Ordering lengths from a common start line | `order` + picture cards (ext.) | The ribbons as cards drawn to their lengths, all from one start line | Drags the ribbons into order |
| aaseq (1), aadur (1) | Putting events in time order | `order` + picture cards (ext.) | The events as picture cards | Drags them first to last (or shortest to longest) |
| aasign (1/3/4/5), accmpx (3) | Which side is more (<, > or =) | **NEW balance** | One number (or expression) on each pan, as cubes or number weights | Watches the beam tip to the heavier side; the sign opens towards it |
| abseq (2), abmiss (2), adseq (3), aepat (4), affrule (5) | Skip counting: the same jump every time | `numberline` | numberline with step = the pattern's jump, jump on | Hops from the first number; the jump stays the same; lands on the missing one |
| ad1000 (3), admental (3) | How much more to a round number: count up | `numberline` | numberline from the number to 100 (or 1000), step 1 (or 100) | Drags the point up to the round number; the jump is the answer |
| adest (3), aeest (4), adestchk (3), adestcost (3), aeround (4), aernd (4), aeestp (4), aechk (4), aerdec (4), aeestq (5), avpest (4) | Rounding: which round number is nearer | `numberline` | numberline between the two round numbers, near = 10/100/1000 | Drags the point to the number; sees which end it is nearer to |
| aedecc (4), aedord (4) | Comparing decimals | `numberline` | numberline 0–1 in tenths with hundredths marks | Places each decimal; the further right is greater |
| aglcm (5), aglcm3 (5), agjump (5) | Common multiples: where two jumpers both land | `numberline` | numberline from 0, step = each number in turn | Hops in 2s, then in 3s; the marks both land on light up; the first is the LCM |
| adwtcap (3), actrain (3), addur (3) | The difference between two values on a scale (or a timeline) | `numberline` | numberline over the two values (hours for journeys, midnight marked) | Drags from one value to the other; the jump is the difference |
| abjug (2), ablen (2), abmeas (2/3/4), aaclip (1), abdisp (5) | Reading where a mark falls on a scale | `numberline` | numberline drawn as the ruler, tape or jug (hide where counting marks is the point) | Slides the end of the object (or the water level) to the mark; counts the marks |
| aeints (5) | Which numbers are integers | `numberline` | numberline −5 to 5 with halves between | Taps the points that land on whole marks |
| aaage (1) | Years between two dates, less one if the birthday has not come | none | — | Unsure: a timeline of years could show it, but the stuck step is the 'not yet' rule; leave words for now |
| mul (3), amf2510 (2), amf34 (3), amf69 (3), abgroup (2), abrep (2), amderive (3), aamul01 (3), avdfact (3), afcount (4) | Multiplication as equal rows | `array` | array with rows fixed to the first number, columns set by the child | Adds counters to each row (or rows) until the total shows; one more row is one more lot |
| agfac (5), agcomf (5), aghcf3 (5), agprime (5), agptest (5), aecomp (5), agcop (5), agtwin (5) | Factors are the rectangles a number can make | `array` | array with total = the number, rows free | Tries rows 1, 2, 3 …; the tries that leave none over are factors; a prime makes only one row |
| acpart (2), mmul (4), avtab (3), avstrat (4), avpp (4) | Split one number into tens and ones and multiply each part | `array` + cut (ext.) | array (or rectangle) rows × columns with a cut after the tens | Drags the cut to 10; the two parts' counts show and add up |
| acshare (2), achalfof (2), adfcol (3), aghlw (5) | Sharing equally: deal one at a time | **NEW collection** | The things and k plates | Deals the things one at a time round the plates; reads one plate (a fraction: takes some plates) |
| divr (3) | The remainder is what is left after equal rows | `array` | array share with total and rows = divisor | Fills the rows; the left-over counters stand underneath |
| aeeven (4), aepair (4) | Even or odd: does every one have a partner | **NEW collection** | The things (for big numbers, only the ones digit's worth) | Joins things two by two; one left alone means odd |
| afnim (4) | Leave a multiple of 3 for the other player | **NEW collection** | The counters | Takes 1 or 2; rings groups of 3 to see what to leave |
| aapatn (1), aapatu (1), aaweave (1), aapat2 (5) | Finding the part that repeats | **NEW collection** | The pattern's things in a row | Rings the part that repeats; the ring copies itself along the row and the next thing appears |
| achalf (2), adfname (3), adfbuild (3), adshade (3), adfcmp (3), adford (3), adfcmpu (3), adfordu (3), avlike (4), avfold (4), avlow (4/5), eqfrac (4), fadd (4), faddu (5), avfas (5), aefword (5) | A fraction is equal pieces, some shaded; equal amounts look the same | `fraction` | fraction bar, target = the fraction (show the second fraction for comparing) | Cuts the bar into pieces and shades them; compares with the dashed line |
| agpct (5), agpctd (5), aefpct (5), agpgrid (5), aedfr (4), aedfrl (4) | Per cent and decimals are hundredths | `fraction` | fraction with 100 pieces (hundred square) | Shades the squares; reads how many hundredths |
| acequal (2) | Halves must be equal pieces | `fraction` + unequal cuts (ext.) | A bar cut where the question cuts it | Slides the pieces over each other to see if they match |
| agimp (5), agmix (5), agclass (5), fmulw (5) | Several wholes and some pieces | `fraction` + several wholes (ext.) | Several bars of the denominator's pieces | Shades piece by piece across the bars; counts wholes and pieces |
| afpie (4) | A pie chart's slice is a fraction of the whole | `fraction` + round (ext.) | A circle cut into equal slices | Shades the slices for one group; reads the fraction of the total |
| adfnl (3), adfunit (3), agnl (5), avfwq (5) | Fractions as points: equal jumps of 1/b | `numberline` | numberline 0 to the answer's whole, step 1/b, jump on | Makes the jumps of 1/b; counts them; reads the whole numbers passed |
| adbar (3), adbartf (3), afbar (4), acpictmore (2), aacups (1), abcup (2), abcupord (2) | Reading a bar's height off the scale; how much taller | `bars` | bars from the chart's labels and values (ask read or more) | Slides the reading line to the top of the bar |
| adline (5) | Reading a point of a line graph | `bars` + line graph (ext.) | bars drawn as points joined by lines | Slides the reading line to the point |
| adbarmk (3) | Drawing each bar to the table's value | `bars` + set each bar (ext.) | bars with every bar's height set by the child | Drags each bar's top to its value on the scale |
| mean4 (5), avmiss (5/7) | The mean is what each would have if shared evenly | `bars` + level out (ext.) | bars of the numbers, with a 'level' line | Drags blocks from tall bars to short ones until all are level |
| adtwo (3), advenn (3) | Reading a two-way table and a missing cell | none | — | The table is already the picture; the step is subtraction, which links to its own picture |
| adrec (3) | Sorting a list into a two-way table | **NEW collection** | Each child as a card; four trays (rows × columns) | Drops each card in its tray; the trays are counted |
| acmcm (3), acmmkm (3), acmcmp (3), acdecu (4/5), abkgg (4), adhmin (3), adm2h (3), adsec (3), adday (3), adfmeas (3), aeparts (4), aeconv (4), aeconvu (4), aeconvd (4), aewcmp (4), aeftin (4), adrace (3), aedrip (4) | Changing units: 1 m is 100 cm, 1 hour is 60 minutes | **NEW two-scale line** | Top scale the big unit (0, 1, 2 …), bottom the small unit (0, 100, 200 …), marked to the question's numbers | Slides the marker to the measure on one scale; reads the other; 'and what is left' is the gap to the last whole |
| agspd (5), agspdc (5), ajrate (5), ajfare (5), agmeas (5), aetrip (4) | Rates: per one hour, per one kg | **NEW two-scale line** | Top scale distance (or ₹), bottom hours (or kg); the given pair marked | Slides back to 1 on the bottom scale and reads the top |
| aaheavy (1), aaheavyo (1), abkg (2), acbalance (3), acmissing (3), acfacts (3/4/5) | Equal means the beam is level; the missing amount makes it level | **NEW balance** | Left pan: the known side; right pan: the known part and an empty box | Drops number weights (or cubes) into the box until the beam is level |
| abclock (2), abminute (2), acelapsed (3), acelhm (3) | The minute hand counts round in fives; the hour hand creeps | **NEW dial** | dial with 12 numbers, two hands set to the start time | Drags the minute hand round; the hour hand follows; a counter clicks the minutes passed |
| ab24h (4), aet24 (4), aet12 (4), aeel24 (4), aeampm (4) | After 12 noon the hours go on: 13, 14 … | **NEW dial** | dial with the 12-hour ring and a 24-hour ring outside, a day/night band | Turns the hand past noon; reads the outer ring |
| aaweek (1), aaseason (1) | The days (months) go round in a fixed order | **NEW dial** | dial with 7 days (12 months, coloured by season) | Turns the hand one step on or back and reads the day (season) |
| aeturn (4), afclock (5), afturn (5), afface (5), abdir (2) | A turn is counted in steps round a circle (30° a number, 8 compass points) | **NEW dial** | dial with 12 numbers (or 8 directions), the hand at the start | Turns the hand; each step clicks and the degrees (or fraction of a turn) add up |
| aeang (4), aeangk (4), aertang (4), afprot (5), afmkang (5), afpieang (4), afpair (5), afcross (5), afpara (5) | An angle is an amount of turn; compare it with a square corner; a straight line is 180° | **NEW dial** | dial as a protractor (0–180 or 360), one arm fixed, a ghost square corner | Turns the other arm; sees it pass the square corner; reads the degrees; for pairs, both angles fill the straight line |
| aamdays (1), aaddmm (1), abunit (2), abwunit (2/4), aabig (1), aecf (4) | Facts and judgements (days in a month, date format, sensible units, sizes) | none | — | Knowledge or language, not a step that can be shown happening; a still picture in the question is enough |
| aacald (1), aacalc (1), aacalgap (1), aacalmo (1), aaday (1), aacalpat (2), accal (3) | On a calendar, one row down is 7 days later | **NEW walk** | walk on a 7-wide grid of the month's dates (two months when needed) | Moves the token day by day (or a row at a time); the counter clicks each day |
| aehund (4) | On a hundred square one row down is 10 more | **NEW walk** | walk on the 10 × 10 grid of 1–100 | Moves the token down and across; the number under it changes |
| abgrid (2), abmove (2), abroute (2), abseat (2), aetrans (4), aerefl (4), acparl (3), accoll (3) | Counting squares across and up along a grid | **NEW walk** | walk on the question's grid with S, E or the point | Moves the token one square at a time; across and up are counted separately (reflect: the same count on the other side of the line) |
| aashelf (1), aawhere (1) | Position words (above, below, inside, outside) | none | — | The question is already a tap on a picture; there is no step to break down, only the word |
| aasolid (1), aaflat (1), absort (1), abline (2), abroll (2), abcurve (2), abobj (2) | Sorting things by one property | **NEW collection** | The things (shapes, letters, objects) and two trays | Drags each into its tray (rolls / does not roll); the tray is counted |
| abside (2), abdiag (2/4/5), absolid (2), abcurved (2), aclines (3), afsolid (5) | Counting sides, corners, faces or segments without missing one | `pick` + count taps (ext.) | pick on the shape (or solid, or points), every part tappable | Taps each side/corner/face; it lights and the counter clicks; a second tap does nothing |
| aecirc (4), aecpart (4), aearms (4) | Naming the parts of a circle or an angle | `pick` | pick with the circle or angle figure | Taps the part named |
| absym (2), aesym (4), aedsym (4), aedigsym (4), aemirror (4), afrot (5) | A fold (or turn) that makes the halves match | **NEW fold** | The letter, digit or design with its possible fold lines (or a centre to turn about) | Taps a fold line; the shape folds over and the parts that match light up (turn: rotates until it fits) |
| rect (5), aearea (4), aeperar (4), actile (3), afapr (5), rperim (4), avfence (4) | Area is rows × columns of squares; perimeter is the walk round | `rectangle` | rectangle with the question's width and height (area or perimeter asked) | Drags the corner to the size; counts squares or the edge |
| adperim (3), adpreg (3), admper (3) | Perimeter is the sides added one by one | **tally** | start 0, one tile per side (+4, +8, +5); missing side: start at the known sum, goal the perimeter | Drops a tile for each side; for the missing side, drops +1s until the perimeter is reached |
| aftri (5) | The largest angle decides acute, right or obtuse | `triangle` | triangle with the question's angles | Moves the angles and watches the name change at 90° |
| vol (5), avvcmp (5), afview (5), afpaint (5), afcube (5), afnet (5), aesym3 (5) | A box is layers of cubes; what is seen from each side | **NEW cubes** | A box of unit cubes, length × width set, height built layer by layer | Taps to add a layer; the counter adds a layer's cubes each time. Unsure: 3-D on a small phone screen needs testing |
| afquad (5), afkind (5), aftris (5), afpside (5), afhidden (4), afdigits (4), affrac (5) | Classifying by several properties; counting arrangements | none | — | Unsure: the step is reasoning over a table or a list; a picture would only repeat the question |
| affig (5), affigrel (5) | Square numbers are squares of counters; odd numbers add an L | `array` | array with rows = columns = n | Adds the next L of counters; the square grows |
| aerev (4), aecons (4), agbod (5), agwrite (5), agterm (5), agcex (5), aghlp (5), abnine (4/5), akromw (4), aematch (4), aeirr (4), afriver (4), ajsize (5/7), avlat (4) | Rules about written numbers and expressions, logic puzzles | none | — | The step is about symbols or reasoning (order of operations, a lattice's diagonals, Roman letters); no picture shows it better than the working. Unsure for aecons (a staircase of counters could help) |

## New picture kinds, ranked

Ranked by families served, with the youngest children weighed most (a Class 1–2 child who is stuck has no words to fall back on). Each is meant as one scene kind in `scene.ts`: numbers on fixed grids for controls, a few measures, a goal, a `draw`, and checks in `check`, so `step-scenes.ts` / `scenes.ts` can build it from a question. Like `tally`, anything that changes a number should *click through* the numbers in between, not jump.

### 1. `blocks`: base-ten blocks on a place mat (39 families, 14 in Class 1–2)

The child sees a mat with two to four columns (ones, tens, hundreds, thousands; or ₹ and paise, m and cm, ones/tenths/hundredths: the column names and the exchange rate are data). Each column holds its blocks: small cubes, rods of ten, flats of a hundred, a big cube for a thousand; the digit of each column is written under it and changes as the blocks change. The child *drags* blocks onto the mat from a waiting pile (the second number of a sum), *taps "bundle"* on a column holding ten or more, which snaps ten pieces into one bigger piece and slides it into the next column, *taps a piece to break it* into ten of the next smaller piece (borrowing), *drags pieces away* (taking away), and can *deal* pieces one by one into k trays (division: flats first, break what is left, then rods). Digit cards can be dropped on a column to build a number (largest number from digits). State: the count in each column, the pile, the trays; measures: the value, the count per column, whether any column holds ten or more, the left-over after dealing. Checks: a column never shows more than 19 pieces (beyond that the builder writes digits on tokens instead of drawing), the exchange rate is whole, the value never goes below 0. It grows with the child: tens and ones in Class 1, carrying and borrowing in Class 2–3, long division and × 10 in Class 4, decimals, money and mixed units in Class 4–5.

### 2. `collection`: things to touch (32 families, 25 in Class 1–2)

The child sees the question's own things (mangoes, shells, buttons, counters, shapes, picture-record icons) laid out in a row, scattered, or in a ten frame, and up to four labelled trays (plates, "rolls / does not roll", the cells of a two-way table). What the child does is one of a few verbs, set by the builder: *count* (tap each thing; it gets its number and a counter clicks; the last number stays large), *match* (draw a line from a thing in one row to one in the other; things with no partner light up and are counted), *pair* (join things two by two; one alone means odd), *ring* (draw a ring round k things: ten shells become a ten-rod for the move to `blocks`; the repeating part of a pattern copies itself along the row), *sort* (drag each thing into a tray), *share* (deal one at a time round k plates; what will not go round stays out) and *move* (drag things in or out of a tray, for join and take-away stories). Measures: counted, per tray, unmatched, rings, left over. Checks: at most about 20 things (a phone screen), a share or ring size that divides as the question says. This is the picture for the youngest children: counting, comparing, sorting, sharing, halves of a collection and even/odd all live here.

### 3. `dial`: a face with a hand to turn (25 families, 5 in Class 1–2)

The child sees a circle with n marks and labels: 12 hours (with an optional 24-hour ring outside and a day/night band), 7 days, 12 months coloured by season, 8 compass points, or a protractor (0–180 or 0–360 in degrees). One or two hands; with two, the hour hand creeps as the minute hand turns. The child *drags the hand round*; each mark passed clicks a counter (minutes passed, days on, degrees turned, eighths of a turn), exactly as the lift clicks floors. A ghost square corner can be shown to compare an angle with a right angle; for angle pairs, a fixed straight line shows the two angles filling 180°. Measures: the mark pointed at, steps turned (signed for anticlockwise), degrees, the time shown. Checks: the hands snap to marks; the start and target are marks on the dial. It grows from reading the clock (Class 2) through elapsed time and 24-hour time (Class 3–4) to turns, angle types and the protractor (Class 4–5 and on to Class 6–7).

### 4. Two-scale line: a double number line (27 families, all Class 3–5)

The child sees two number lines one above the other, tied together: metres above and centimetres below, hours and minutes, ₹ and paise, kg and g, or (for rates) hours and kilometres with the question's pair marked. The child *slides one marker* and it stands on both lines at once; the readout gives both values, and for "how many m and cm" the gap from the last whole mark is shaded. This may be best built as an option on the existing `numberline` (a second label row with its own scale factor) rather than a separate kind: the control and the drawing are the same. It grows straight into ratio, proportion and percentages in Class 6–7.

### 5. `walk`: a token on a numbered grid (16 families, 10 in Class 1–2)

The child sees a grid: a month's calendar (7 wide, starting on the right weekday, two months side by side when the question crosses months), the 1–100 square, a map or seating plan, or a coordinate grid with an optional mirror line. A token sits at the start. The child *moves it one square at a time* (drag, or arrow buttons for small fingers); each step clicks a counter, and moves across and up are counted separately. On a calendar a step down adds 7, on the hundred square 10, which the child sees rather than is told. Measures: position, number under the token, steps across, steps up, total steps. Checks: the start and target are on the grid; the mirror line lies on grid lines.

### 6. `balance`: two pans and a beam (8 families, 4 in Class 1–2)

The child sees a beam on a stand with a pan at each end; each pan holds number weights or cubes, and one may hold an empty box. The child *drops weights from a tray into the box* (or takes them out); the beam tips towards the heavier side (the tilt is capped and only shows which side, so it never gives the amount) and sits level when both sides are equal. The sign between the pans (<, >, =) opens towards the heavier side. Measures: left total, right total, level (0/1). This is the picture for "what is missing" and "both sides equal", and it is the same picture Class 6–8 equations need.

### 7. `fold`: fold or turn a shape onto itself (6 families, 1 in Class 1–2)

The child sees a letter, digit or design on a grid with its possible fold lines dashed (or a centre point). Tapping a line *folds the shape over*; the parts that land on the shape light up green and the parts that do not, red. In turn mode the child turns the shape about its centre and counts how often it fits in a full turn. Measures: matched (0/1), folds found, turns that fit. Small, but it is the only honest way to show symmetry without words.

### 8. `cubes`: a box built layer by layer (7 families, all Class 4–5; unsure)

The child sees an isometric box of unit cubes and taps to add a layer; a counter adds a layer's worth each time (rows × columns, then × layers). Views (top, front, side) and painted faces would follow. I am unsure this works on a small phone screen; build it last and test it on a phone first.

## Small extensions of existing kinds (26 families)

- `pick` + **count taps** (6: `abside`, `abdiag`, `absolid`, `abcurved`, `aclines`, `afsolid`): each tapped part lights and stays lit, and a counter clicks; needs figures for flat shapes, solids and points on a line.
- `order` + **picture cards** (5: `aalong`, `aaorder`, `aaseq`, `aadur`, `aacoin`): cards drawn as ribbons of their length (from one start line), event pictures, or coins.
- `array` + **a cut** (5: `acpart`, `mmul`, `avtab`, `avstrat`, `avpp`): a line the child drags across the columns, splitting 13 × 2 into 10 × 2 and 3 × 2 with both counts shown.
- `fraction` + **several wholes** (4: `agimp`, `agmix`, `agclass`, `fmulw`), + **round** (pie, `afpie`), + **unequal cuts** (`acequal`).
- `bars` + **level out** (mean: `mean4`, `avmiss`; the child moves blocks from tall bars to short ones), + **set each bar** (`adbarmk`), + **line graph** (`adline`).

## Notes for the `tally` builder

- Tiles are never 0, so `aazero` is put on `collection` (take nothing away, or take all). If `tally` later allows a 0 tile that leaves the lift still, it can move back.
- Floors are at most 60 apart, which keeps `tally` to Class 1 sums within 20, coins and small money, pictograph keys, tally marks in fives, growing patterns, perimeters with small sides, repeated subtraction, Roman numerals and integers. Two-digit sums and anything with carrying go to `blocks`; counting up to 100 or 1000 goes to `numberline` with a bigger step.
- For "how many more to make …" the family wants the number of +1 presses, not a given list of tiles; `collection` with a ten frame does it for `aabond`. A "keep pressing +1 until the goal" mode for `tally` would also do it.

## Where no picture helps (38 families)

- **Facts and words** (`aamdays`, `aaddmm`, `abunit`, `abwunit`, `aabig`, `aecf`, `aaname`, `aashelf`, `aawhere`): the skill is a fact, a format or a word. The question's still picture is already enough, and there is no step to watch happen.
- **Stories of several steps** (`aeshop`, `acbill`, `aetab`, `aebig`, `acstory4`, `adtwo`, `advenn`): each step is another family's question and borrows that family's picture.
- **Symbols and reasoning** (`agbod`, `agwrite`, `agterm`, `agcex`, `aghlp`, `abnine`, `akromw`, `aematch`, `afriver`, `ajsize`, `avlat`, `aerev`, `aecons`, `aeirr`, `afquad`, `afkind`, `aftris`, `afpside`, `afhidden`, `afdigits`, `affrac`, `aaage`): order of operations, letters for numbers, logic puzzles, classifying from a table, counting arrangements. These are Class 4–5 and the step is reasoning about symbols. I am unsure about `aecons` (a staircase of counters could show the pairing), `afhidden` (tap-to-count rectangles) and `aaage` (a timeline of years).

## Recommended next

1. **`blocks`**: the most families, and carrying and borrowing is where most children stall from Class 2 to Class 5.
2. **`collection`**: the most Class 1–2 families by far (25). It is what a child who cannot yet read most needs, and it hands over to `blocks` (a ring of ten becomes a rod).
3. **`dial`**: one picture for the clock, elapsed time, 24-hour time, turns, compass directions and the protractor, from Class 2 to Class 7. The two-scale line serves slightly more families (27 against 25) but no child below Class 3. As an option on `numberline` it is cheap, so it could be built alongside.
