First full run, 19 November 2026, on commit b1074ef plus the robot script (run locally in four parts).

# Robot learner (robot@1)

**3,52,204 of 3,53,164 questions** (99.73%) go from start to right answer with nothing broken: the answer is accepted, a wrong one is refused, help opens in every way, and every box takes the right number and refuses a wrong one.

1118 question types · 9,13,558 help steps walked · 2,71,883 boxes typed into

| What went wrong | Questions | Types | Breaks the product |
|---|---:|---:|---|
| does-not-arrive | 35,250 | 129 | no (quality) |
| answer-said-early | 7,224 | 133 | no (quality) |
| box-accepts-wrong | 492 | 3 | yes |
| answer-not-accepted | 465 | 7 | yes |
| answer-in-cue | 5 | 3 | no (quality) |
| wrong-answer-accepted | 4 | 1 | yes |

## One example of each, by type

### does-not-arrive
- `disc` (960 of 960): gen:disc:-12,-20: last step "224 is positive: two solutions" for answer 2
- `fadd` (812 of 825): gen:fadd:1,1,3,1: last step "1 + 1 = 2 pieces of the same size" for answer 2/3
- `auqcs` (620 of 620): gen:auqcs:-10,-15: last step "(x + h)² adds h² = 25, so k = −15 − 25 = −40" for answer (−5, −40)
- `ahexp` (504 of 504): gen:ahexp:0,-5,-9: last step "t3 = −24" for answer (−14, −19, −24)
- `alsys` (500 of 500): gen:alsys:1,-4,1,4,-3,5: last step "Put y = 5 into the first equation: x = −3" for answer (−3, 5)
- `aemix` (450 of 450): gen:aemix:0,0,32,113: last step "m: 1 + 5 + 1 carried = 7 m" for answer (7, 25)
- `ajfspl` (450 of 450): gen:ajfspl:1,-7,3,1: last step "Group and take out the common bracket: (x − 7)(3x + 1)" for answer (−7, 1)
- `akscalc` (450 of 450): gen:akscalc:0,11,18,7,-5: last step "In scientific notation: 1.98 × 10²" for answer (1.98, 2)
- `aeeven` (417 of 417): gen:aeeven:0: last step "Look at the ones digit: numbers ending in 0, 2, 4, 6 or 8 are even: 28, 310, 12, 194" for answer 12,28,194,310
- `acmoneyadd` (400 of 400): gen:acmoneyadd:1,9,16,14,0: last step "Rupees: 1 + 16 + 1 carried = ₹18" for answer 18.15
- `aedivm` (400 of 400): gen:aedivm:0,23,7: last step "cm: 105 ÷ 7 = 15 cm" for answer (1, 15)
- `atcross` (400 of 400): gen:atcross:-4,-4,-4,1,3,-1: last step "k̂: a₁b₂ − a₂b₁ = −8" for answer (16, −8, −8)
- `auaprec` (400 of 400): gen:auaprec:0,-2,-5,-5: last step "Put n = 1, 2, 3, 4 into the rule: −12, −23, −38, −57" for answer (−12, −23, −38, −57)
- `aemulm` (400 of 400): gen:aemulm:0,23,7: last step "m: 1 × 7 + 1 = 8 m" for answer (8, 5)
- `ahmap` (400 of 400): gen:ahmap:0,-7,-5,7,4: last step "D is level with C, so its y-coordinate is C's: −1" for answer (−7, −1)
- `ajzero` (400 of 400): gen:ajzero:1,-9,1,-7: last step "Each bracket is 0: x = 9 or x = 7" for answer 7,9
- `antree` (400 of 400): gen:antree:1,2,0,1: last step "Multiply along each path of the tree and add the paths that give the event" for answer 1/3
- `aopf` (400 of 400): gen:aopf:-6,-5,-3,-3: last step "Put x = −5: B = −3 ÷ 1 = −3" for answer (−3, −3)
- `audk` (400 of 400): gen:audk:-5,-5,-5,-1,1,3: last step "k = −13 or k = 3" for answer -13,3
- `aeel24` (400 of 400): gen:aeel24:5,1,7,10: last step "Hours: 7 − 5 = 2" for answer (2, 45)
- `aeind` (400 of 400): gen:aeind:0,13,6,1: last step "6 hundred and 3 = 603; put the periods together" for answer 13603
- `almid` (400 of 400): gen:almid:0,-6,-6,0,0: last step "y: (−6 + 0) ÷ 2 = −3" for answer (−3, −3)
- `alsplit` (400 of 400): gen:alsplit:0,2,-3,1,-6: last step "Two numbers with sum −15 and product a × c: −12 and −3" for answer -12,-3
- `anpair` (400 of 400): gen:anpair:5,10,0: last step "Put y = 10 into the first equation: 2x = 40 − 3 × 10, so x = 5" for answer (5, 10)
- `arcircle` (400 of 400): gen:arcircle:1,-5,-5,2: last step "r = √(g² + f² − c) = √(50 − (48)) = √2" for answer (−5, −5, √2)
- `asbinmv` (400 of 400): gen:asbinmv:2,1,5,0: last step "Variance = npq = 2 × 1/5 × 4/5 = 8/25" for answer (2/5, 8/25)
- `aetrans` (400 of 400): gen:aetrans:0,0,3,1: last step "Up or down: 0 + 1 = 1" for answer (3, 1)
- `agprime` (400 of 400): gen:agprime:4,20: last step "Test each number from 4 to 24 for factors other than 1 and itself: the primes are 5, 7, 11, 13, 17, 19, 23" for answer 5,7,11,13,17,19,23
- `alrop` (400 of 400): gen:alrop:0,-6,-4,2,-2: last step "Cancel the factors in both the top and the bottom: (x − 6)/(x − 2)" for answer (−6, −2)
- `apmmul` (400 of 400): gen:apmmul:-3,-3,1,-2,4,-1,5,0: last step "row 2 of A with each of the columns of B: [−6, −1]" for answer [[−27, 3], [−6, −1]]
- `asbinom` (400 of 400): gen:asbinom:2,1,2,1,0: last step "That sum is the answer" for answer 1/2
- `astotp` (400 of 400): gen:astotp:1,1,3,2,1: last step "Bayes: P(Bag I | red) = P(Bag I and red) ÷ P(red)" for answer 3/43
- `auqsplit` (400 of 400): gen:auqsplit:1,-9,2,1: last step "Each bracket is 0: x = 9 or x = −1/2" for answer -1/2,9
- `aeineqz` (392 of 450): gen:aeineqz:0,1,-7,1,0: last step "The whole numbers that fit: 0, 1, 2, 3, 4, 5, 6, 7" for answer 0,1,2,3,4,5,6,7
- `aosetlaw` (382 of 530): gen:aosetlaw:0,0: last step "Check: (A ∪ B) ∪ C = {2, 3, 4, 5, 6, 9, 10} too, as the associative property says" for answer 2,3,4,5,6,9,10
- `asaddp` (374 of 400): gen:asaddp:10,2,8,0,2: last step "Neither = 1 − P(A ∪ B) = 1 − 1" for answer 0
- `auapln` (371 of 371): gen:auapln:0,1,2: last step "At n = 1, y = 1: c = 1 − 2 = −1" for answer (2, −1)
- `aqorddeg` (360 of 360): gen:aqorddeg:1,1,1,0: last step "It appears to the power 1: degree 1" for answer (1, 1)
- `aosetop` (353 of 400): gen:aosetop:10,2,4,0: last step "A ∪ B = {2, 4, 6, 8, 10}" for answer 2,4,6,8,10
- `arerror` (345 of 400): gen:arerror:0,2,1,0: last step "ΔV ≈ (dV/dx) Δx = 4 × 0.01 = 1/25" for answer 0.04

### answer-said-early
- `algcd` (596 of 300): gen:algcd:-6,-5,-4: Step by step, step 1 of 3: x² − 11x + 30 = (x − 6)(x − 5)
- `lineq` (486 of 500): gen:lineq:-6,-15,-15: Step by step, step 2 of 3: Divide both sides by −6 and reverse the sign, because dividing by a negative number reverses an inequality: x > 0
- `aonlread` (480 of 480): gen:aonlread:0,-6,1,0: Step by step, step 1 of 2: Read the ends and their dots: (−6, −5)
- `aglcm3` (436 of 400): gen:aglcm3:2,3,19: Prime factors, step 5 of 6: 2 × 3 × 19 = 114
- `aplpopt` (400 of 400): gen:aplpopt:1,2,2,1,1,1,4,3: Step by step, step 1 of 2: The corner points are (0, 0), (2, 0), (1, 2), (0, 3)
- `algcd3` (298 of 300): gen:algcd3:0,-5,-4,2,3: Step by step, step 1 of 2: Factorise each: (x − 5)(x − 4)(x + 2), (x − 5)(x − 4)(x + 3)
- `avdiv` (280 of 500): gen:avdiv:4,365,1,0: Check by multiplying, step 1 of 3: 1461 ÷ 4: the quotient is 365
- `arrolle` (270 of 289): gen:arrolle:-4,-4,1: Step by step, step 3 of 4: c = (4 − √91)/3, (4 + √91)/3
- `armvt` (249 of 266): gen:armvt:-3,-4,-3: Step by step, step 3 of 4: Solve the quadratic: c = (3 − √183)/3, (3 + √183)/3
- `ahthink` (234 of 288): gen:ahthink:2,1,5: Step by step, step 2 of 3: Open the bracket: 10n + 5 − 5
- `aglcm` (197 of 253): gen:aglcm:5,21: Prime factors, step 4 of 5: 3 × 5 × 7 = 105
- `atinvc` (189 of 300): gen:atinvc:0,-23,10: Step by step, step 1 of 2: −23π/10 has the same ratio as −3π/10 (a whole number of turns removed)
- `aulstd` (188 of 360): gen:aulstd:0,1,2: Step by step, step 1 of 2: Multiply and divide by 1x so that the standard limit appears: × 1/2
- `amnline` (156 of 450): gen:amnline:0,-9,7,-2,0: Step by step, step 1 of 2: −9/7 − (−2) = 5/7
- `aipi` (148 of 300): gen:aipi:0,0,220: Step by step, step 1 of 3: 691 ÷ 220 ≈ 3.14 (rounded)
- `abdisp` (137 of 300): gen:abdisp:0,2,21,1: Step by step, step 1 of 2: The water goes from 100 ml to 205 ml: a rise of 105 ml.
- `aspolm` (135 of 242): gen:aspolm:1,-5,3,-2,1: Step by step, step 2 of 3: Subtract the arguments: −π/2
- `ahrhy` (128 of 192): gen:ahrhy:0,1,13: Step by step, step 10 of 13: Length 11: 89 (ending with a short part) + 55 (ending with a long part) = 144
- `antwo` (117 of 234): gen:antwo:1,4,0: Step by step, step 3 of 4: Equate the two expressions for h and solve: x = 2(1 + √3)
- `aqabs` (116 of 300): gen:aqabs:-3,-2,-4,-2,0: Step by step, step 2 of 3: f at the end points and turning points: −32, −28, −27
- `akloop` (115 of 400): gen:akloop:1,4,29: Step by step, step 8 of 9: S = 91 + 29 = 120
- `aptel` (107 of 400): gen:aptel:1,0,4: Step by step, step 2 of 3: Writing out the terms, everything cancels except 1 − 1/5 = 4/5
- `aqcontk` (106 of 243): gen:aqcontk:0,2,-3,1,0: Step by step, step 1 of 7: The limit of the other piece at the point is 7/2
- `atindu` (98 of 324): gen:atindu:1,1,0: Step by step, step 1 of 2: P(A ∩ B) = P(A) × P(B) = 0.1 × 0.1 = 0.01
- `atinv` (95 of 384): gen:atinv:0,0,0,0,0: Step by step, step 1 of 2: sin⁻¹(−1) = −π/2
- `arvolrev` (89 of 109): gen:arvolrev:0,1,1: Step by step, step 2 of 7: V = π∫ from 0 to 1 of x dx = π/2
- `aologeq` (86 of 268): gen:aologeq:0,7,128,0: Step by step, step 1 of 3: log x + log y = log(xy), and log_B(…) = 7 means … = 2⁷: x(x − 127) = 128
- `ahid` (67 of 333): gen:ahid:1,1,5,1: Step by step, step 2 of 4: −2ab = −2 × x × 5 = −10x
- `attotal` (66 of 400): gen:attotal:1,1,3,2,6: Step by step, step 1 of 3: P(Bag I) × P(red | Bag I) = 1/6 × 1/4 = 1/24
- `anstd` (49 of 400): gen:anstd:0,1,0,4,2: Step by step, step 1 of 3: sin 30° = 1/2
- `aedesc` (49 of 240): gen:aedesc:1,2: Step by step, step 1 of 2: Compare place by place from the left: 9090618 > 9089610 > 9066310 > 9030431 > 9020930
- `asgenf` (44 of 500): gen:asgenf:0,1,-4,-6,0: Step by step, step 1 of 2: Rearrange: y = (1/4)x − 3/2
- `ajdisc` (40 of 400): gen:ajdisc:5,10,0: Step by step, step 1 of 2: 50% of ₹250 = ₹125
- `asarg` (36 of 135): gen:asarg:0,1: Step by step, step 2 of 3: The acute angle α with tan α = |y/x| is π/6
- `ajimul` (34 of 400): gen:ajimul:-15,-15: Step by step, step 1 of 2: 15 × 15 = 225
- `avdraw` (34 of 324): gen:avdraw:2,2,2: Step by step, step 1 of 3: 1/2 × 1/3 = 1/6
- `ajrdiv` (32 of 450): gen:ajrdiv:1,2,3,36,0: Step by step, step 2 of 3: One part: ₹1080 ÷ 6 = ₹180
- `ajmill` (31 of 350): gen:ajmill:10,0: Step by step, step 1 of 3: 10 crore = 100 million (1 crore = 10 million)
- `auinv` (30 of 400): gen:auinv:-2,0,1,1,1,2,-2,-1,-2: Step by step, step 2 of 3: adj A (the transpose of the cofactor matrix) = [[0, −1, −1], [−2, 6, 5], [1, −2, −2]]
- `acnlpos` (28 of 300): gen:acnlpos:0,5,1: Step by step, step 1 of 2: From 100 to 102 is one step of 2

### box-accepts-wrong
- `aksmag` (428 of 450): gen:aksmag:0,2,0,0: Step by step: "First: multiply." takes 63072001 for 6,30,72,000
- `aebig` (59 of 300): gen:aebig:1,1: Step by step: "Last: take 220,000 away from 2,200,000." takes 1980001 for 19,80,000
- `avpest` (5 of 400): gen:avpest:9522,99: Step by step: "Last: multiply 10,000 by 100." takes 1000001 for 10,00,000

### answer-not-accepted
- `abmeas` (108 of 267): gen:abmeas:2,3,1: "31" for A pencil is laid along a ruler with its end at 0. The picture shows the part of 
- `amcrit` (100 of 300): gen:amcrit:2,3,0: "A" for In ΔABC and ΔPQR (A matches P, B matches Q and C matches R): ∠A = ∠P = 75°; AB =
- `amsimc` (72 of 336): gen:amsimc:4,0,0: "B" for In ΔABC and ΔPQR (A matches P, B matches Q, C matches R): AB = 2 cm, PQ = 4 cm; 
- `aiconvex` (70 of 229): gen:aiconvex:0,2,0: "B" for A closed path goes through four points A, B, C and D in order and back to A. The
- `aasolid` (64 of 300): gen:aasolid:1,0: "1" for The picture shows a cylinder. Here are some things: a tin of oil, a matchbox, an
- `aofclass` (41 of 300): gen:aofclass:-4,-4,-5,2: "C" for Let f : [−5, ∞) → [−3, ∞) be given by f(x) = x² + 8x + 12. Which statement is tr
- `aqd2` (10 of 90): gen:aqd2:0,1,1: "e^x(2cos(x))" for If y = eˣ sin x, find d²y/dx².

### answer-in-cue
- `ahtile` (2 of 119): gen:ahtile:3,2,3,0,2: Step by step: Next: take 120 away from 360.
- `pct` (2 of 380): gen:pct:25,400: Out of 100: First: per cent means "out of 100". Write 25% as a fraction.
- `aeshop` (1 of 400): gen:aeshop:14,2,15,2,2: Step by step: Next: add 160 and 180.

### wrong-answer-accepted
- `ahname` (4 of 108): gen:ahname:0,1,0,5: "c" (the answer is "C")

