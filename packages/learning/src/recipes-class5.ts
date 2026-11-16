/**
 * Lesson recipes for Class 5 (recipe@1, shape@1): data only. Each is checked by `checkRecipe` with the rest (`recipe.ts`).
 * The stories are everyday ones a ten-year-old in India knows; the pictures are scenes (`scene.ts`), so nothing here is
 * drawn by hand and nothing here is evidence.
 */
import type { Recipe } from "./recipe";
import type { Scene } from "./scene";

const frac = (target: [number, number], rest: Omit<Extract<Scene, { kind: "fraction" }>, "type" | "kind" | "target">): Scene => ({ type: "scene", kind: "fraction", target, ...rest });
const line = (rest: Omit<Extract<Scene, { kind: "numberline" }>, "type" | "kind">): Scene => ({ type: "scene", kind: "numberline", ...rest });
const rows = (total: number, rest: Omit<Extract<Scene, { kind: "array" }>, "type" | "kind" | "total">): Scene => ({ type: "scene", kind: "array", total, ...rest });
const rect = (rest: Omit<Extract<Scene, { kind: "rectangle" }>, "type" | "kind">): Scene => ({ type: "scene", kind: "rectangle", ...rest });

export const CLASS5_RECIPES: Recipe[] = [
  {
    competency: "MATH.number.fraction-models",
    type: "idea",
    title: "A fair share",
    question: [
      "Ravi cuts a paratha into 4 pieces, but one piece is much bigger than the others. He gives Mala a small piece and says: you got 1 out of 4, the same as everyone.",
      "Is he right?",
    ],
    predict: {
      ask: "What do you think?",
      choices: [
        { label: "Yes. 1 piece out of 4 is 1 out of 4", reply: "It sounds right, but Mala's piece is smaller than the others. Let's see what has to be true." },
        { label: "No. The pieces must be the same size", reply: "Good thinking. Let's cut some bars fairly.", right: true },
      ],
    },
    missions: [
      frac([3, 4], { prompt: "Cut the bar into 4 equal pieces and shade 3 of them.", success: "3 out of 4 equal pieces. Every piece is the same size, so each one is a fair share.", goal: { measure: "exact", equals: 0 } }),
      frac([2, 5], { prompt: "Now cut the bar into 5 equal pieces and shade 2.", success: "2 out of 5 equal pieces. More pieces, so each piece is smaller.", goal: { measure: "exact", equals: 0 } }),
    ],
    names: ["fraction", "numerator", "denominator"],
    name: [
      "A fraction says how many equal pieces of a whole are taken. 3 out of 4 equal pieces is written 3/4 and read three quarters.",
      "The bottom number, the denominator, is how many equal pieces the whole is cut into. The top number, the numerator, is how many are taken. The pieces must be equal.",
    ],
    choose: {
      kind: "think",
      ask: "A bar is cut into 8 equal pieces and 5 are shaded. How much of the bar is shaded?",
      choices: [
        { label: "5/8", reply: "Yes: 5 pieces taken, out of 8 equal pieces.", right: true },
        { label: "8/5", reply: "The number of equal pieces in the whole goes at the bottom: 5 out of 8 is 5/8." },
        { label: "5/3", reply: "That compares shaded with unshaded. A fraction compares with the whole bar: 5 out of 8." },
      ],
    },
  },
  {
    competency: "MATH.number.equivalent-fractions",
    type: "idea",
    title: "Same amount, different pieces",
    question: [
      "Meena eats 1/2 of a chocolate bar. Her brother has the same bar, but his is cut into 8 small pieces, and he eats 4 of them.",
      "Who ate more chocolate?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "Her brother: 4 pieces is more than 1", reply: "He has more pieces, but his pieces are smaller. Let's put the two bars side by side." },
        { label: "Meena: a half is a big piece", reply: "Her piece is bigger, but he has more of them. Let's put the two bars side by side." },
        { label: "They ate the same amount", reply: "Good instinct. Let's check with the bars.", right: true },
      ],
    },
    missions: [
      frac([1, 2], { show: true, pieces: 8, prompt: "The green bar shows 1/2. Shade the same amount of the bar cut into 8.", success: "4 of 8 small pieces cover exactly as much as 1 of 2 big ones.", goal: { measure: "miss", equals: 0 } }),
      frac([3, 4], { show: true, pieces: 12, prompt: "The green bar shows 3/4. Shade the same amount of the bar cut into 12.", success: "9 of 12. Each quarter became 3 small pieces, so 3 quarters became 9.", goal: { measure: "miss", equals: 0 } }),
      frac([2, 3], { show: true, prompt: "The green bar shows 2/3. Show the same amount using a different number of pieces.", success: "Every piece was cut into smaller equal pieces: more pieces, the same amount.", goal: { measure: "other", equals: 0 } }),
    ],
    names: ["equivalent"],
    name: [
      "Fractions that show the same amount are called equivalent fractions: 1/2 = 4/8 and 3/4 = 9/12.",
      "To make one, multiply the top and the bottom by the same number: 3/4 = (3 × 3)/(4 × 3) = 9/12. Dividing both by the same number works too: 4/8 = 1/2.",
    ],
    choose: {
      kind: "try",
      ask: "Which is the same amount as 2/5?",
      choices: [
        { label: "4/10", reply: "Yes. Top and bottom are both multiplied by 2.", right: true },
        { label: "4/7", reply: "Adding 2 to the top and the bottom changes the amount. Multiply both by the same number instead." },
        { label: "2/10", reply: "Only the bottom was doubled: the pieces are half the size but there are no more of them, so this is half as much." },
      ],
    },
  },
  {
    competency: "MATH.number.fraction-comparison",
    type: "idea",
    title: "Which share is bigger?",
    question: [
      "Two cakes of the same size are each cut into 8 equal slices. Asha's family eats 3 slices of one cake. Bala's family eats 5 slices of the other.",
      "Whose family ate more cake? And would it change if the cakes were cut into different numbers of slices?",
    ],
    predict: {
      ask: "Which is more: 3/8 or 5/8?",
      choices: [
        { label: "3/8", reply: "The slices are all the same size here. Let's shade them and look." },
        { label: "5/8", reply: "Yes. Let's see why, and what happens when the slices change size.", right: true },
        { label: "They are equal", reply: "Both are eighths, but the number of slices is different. Let's shade them and look." },
      ],
    },
    missions: [
      frac([3, 8], { show: true, pieces: 8, prompt: "The green bar shows 3/8. Shade more than that on the bar below.", success: "The pieces are the same size, so more pieces means more cake.", goal: { measure: "behind", below: 0 } }),
      frac([1, 4], { show: true, shaded: 1, prompt: "Only 1 piece is shaded. Change the number of pieces until the shaded share is smaller than the green 1/4.", success: "Cutting into more pieces makes every piece smaller: 1/5 is less than 1/4.", goal: { measure: "ahead", below: 0 } }),
    ],
    names: ["like fractions"],
    name: [
      "Fractions with the same bottom number are called like fractions. Their pieces are the same size, so the one with the bigger top number is bigger: 5/8 > 3/8.",
      "When the top numbers are the same instead, the one with the bigger bottom number is smaller, because its pieces are smaller: 1/5 < 1/4.",
    ],
    choose: {
      kind: "try",
      ask: "Which is the biggest: 2/7, 6/7 or 4/7?",
      choices: [
        { label: "2/7", reply: "All three are sevenths, so the pieces are the same size. 2 pieces is the fewest." },
        { label: "6/7", reply: "Yes. Same size pieces, and 6 is the most of them.", right: true },
        { label: "4/7", reply: "All three are sevenths, so look for the most pieces: 6." },
      ],
    },
  },
  {
    competency: "MATH.number.percent-intro",
    type: "idea",
    title: "Out of a hundred",
    question: [
      "In a quiz, Ravi gets 1 question wrong out of every 4. His teacher wants one number for the report: how many he would get wrong out of 100 questions.",
      "What number does she write?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "4", reply: "4 is how many questions are in each group. Let's see how many out of 100 are wrong." },
        { label: "25", reply: "Good instinct. Let's check on a hundred-square.", right: true },
        { label: "14", reply: "Let's shade it on a hundred-square and count." },
      ],
    },
    missions: [
      frac([1, 4], { show: true, pieces: 100, prompt: "The green bar shows 1/4. Shade the same amount of the hundred-square.", success: "25 of the 100 small squares cover the same amount as 1 of 4.", goal: { measure: "miss", equals: 0 } }),
      frac([3, 10], { show: true, pieces: 100, prompt: "The green bar shows 3/10. Shade the same amount of the hundred-square.", success: "30 of 100: three full rows of ten.", goal: { measure: "miss", equals: 0 } }),
    ],
    names: ["per cent", "percentage"],
    name: [
      "Per cent means out of a hundred. 25 out of 100 is written 25% and read 25 per cent.",
      "To write a fraction or a decimal as a percentage, find how many it is out of 100: 1/4 = 25/100 = 25%, and 0.3 = 30/100 = 30%.",
    ],
    choose: {
      kind: "try",
      ask: "Write 3/5 as a percentage.",
      choices: [
        { label: "60%", reply: "Yes. 3/5 = 60/100, multiplying top and bottom by 20.", right: true },
        { label: "35%", reply: "That puts the 3 and the 5 side by side. Change 3/5 into hundredths: multiply top and bottom by 20." },
        { label: "6%", reply: "3/5 = 6/10, which is 60 out of 100, not 6." },
      ],
    },
  },
  {
    competency: "MATH.number.decimal-tenths",
    type: "fact",
    title: "Tenths and hundredths",
    names: ["decimal", "tenth", "hundredth"],
    name: [
      "Cut one whole into 10 equal pieces: each is one tenth, written 0.1. Cut it into 100 equal pieces: each is one hundredth, written 0.01.",
      "The decimal point separates the wholes from the pieces. 0.7 is seven tenths. 0.25 is 25 hundredths, which is 2 tenths and 5 hundredths.",
    ],
    missions: [
      frac([7, 10], { pieces: 10, prompt: "The bar is cut into 10 equal pieces. Shade 0.7 of it.", success: "7 of 10 pieces: seven tenths, 0.7.", goal: { measure: "miss", equals: 0 } }),
      frac([25, 100], { pieces: 100, prompt: "Shade 0.25 of the hundred-square.", success: "25 small squares: 2 full rows of ten and 5 more. That is 2 tenths and 5 hundredths.", goal: { measure: "miss", equals: 0 } }),
      frac([3, 10], { pieces: 100, prompt: "Shade 0.3 of the hundred-square.", success: "30 small squares fill 3 rows. 0.30 and 0.3 are the same amount.", goal: { measure: "miss", equals: 0 } }),
    ],
    choose: {
      kind: "try",
      ask: "Which is bigger: 0.4 or 0.35?",
      choices: [
        { label: "0.4", reply: "Yes. 0.4 is 40 hundredths and 0.35 is 35 hundredths.", right: true },
        { label: "0.35", reply: "35 looks bigger than 4, but 0.4 is 4 tenths, which is 40 hundredths. Compare the tenths first." },
        { label: "They are equal", reply: "0.4 is 40 hundredths; 0.35 is 35 hundredths. Compare the tenths first: 4 against 3." },
      ],
    },
  },
  {
    competency: "MATH.number.number-line",
    type: "idea",
    title: "What is each mark worth?",
    question: [
      "A road has a stone at 0 km and a stone at 100 km. Between them stand 9 small posts, equally spaced, with nothing written on them.",
      "You are standing at the third post. How far along the road are you?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "3 km", reply: "That would be right if the posts were 1 km apart. Let's find how far apart they really are." },
        { label: "30 km", reply: "Good instinct. Let's check on the line.", right: true },
        { label: "33 km", reply: "9 posts make 10 gaps, not 3. Let's count the gaps on the line." },
      ],
    },
    missions: [
      line({ from: 0, to: 100, step: 10, start: 0, label: 100, hide: true, prompt: "Only 0 and 100 are numbered. Put the point on 30.", success: "10 gaps share 100, so each gap is 10. Three gaps from 0 is 30.", goal: { measure: "x", equals: 30 } }),
      line({ from: 0, to: 100, step: 5, start: 0, label: 50, hide: true, prompt: "Now the marks are closer together. Put the point on 35.", success: "From 0 to 50 there are 10 gaps, so each gap is 5. Seven gaps is 35.", goal: { measure: "x", equals: 35 } }),
      line({ from: 200, to: 400, step: 20, start: 200, label: 100, hide: true, prompt: "Put the point on 320.", success: "From 200 to 300 there are 5 gaps, so each is 20. One gap after 300 is 320.", goal: { measure: "x", equals: 320 } }),
    ],
    names: ["interval"],
    name: [
      "The gap between two marks next to each other is called an interval. On one number line every interval is worth the same.",
      "To find it, take two numbers you can see, find their difference, and share it by the number of gaps between them. Then count on from a number you can see.",
    ],
    choose: {
      kind: "try",
      ask: "A line is numbered only at 0 and 60. There are 5 marks between them. What is each gap worth?",
      choices: [
        { label: "10", reply: "Yes. 5 marks between make 6 gaps, and 60 shared by 6 is 10.", right: true },
        { label: "12", reply: "That shares 60 by the 5 marks. Count the gaps instead: 5 marks between make 6 gaps." },
        { label: "6", reply: "6 is the number of gaps. Each gap is worth 60 shared by 6." },
      ],
    },
  },
  {
    competency: "MATH.number.integers",
    type: "idea",
    title: "Colder than zero",
    question: [
      "On a winter morning it is 3 degrees in Shimla. In Leh it is 7 degrees below zero, and in Kargil it is 4 degrees below zero.",
      "Which town is the coldest?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "Shimla", reply: "3 is the smallest number you can see, but Shimla is above zero. Let's put all three on a line." },
        { label: "Leh", reply: "Good instinct. Let's put all three on a line.", right: true },
        { label: "Kargil", reply: "4 below zero is cold, but is 7 below zero warmer or colder? Let's put them on a line." },
      ],
    },
    missions: [
      line({ from: -10, to: 10, step: 1, start: 0, label: 5, prompt: "Put the point on Leh's temperature: 7 below zero.", success: "Numbers below zero are written with a minus sign: −7.", goal: { measure: "x", equals: -7 } }),
      line({ from: -10, to: 10, step: 1, start: 0, label: 5, prompt: "Kargil is at −4. Put the point on any temperature colder than that.", success: "Colder is further left: −5, −6, −7 and so on are all less than −4.", goal: { measure: "x", below: -4 } }),
      line({ from: -10, to: 10, step: 1, start: -8, label: 5, prompt: "Put the point on a number that is greater than −3 but still below zero.", success: "−2 and −1 are greater than −3: they are further right, closer to zero.", goal: { measure: "x", equals: -1.5, tol: 0.5 } }),
    ],
    names: ["integer", "negative"],
    name: [
      "The whole numbers, zero, and the numbers below zero are together called integers: ..., −3, −2, −1, 0, 1, 2, 3, ... The ones below zero are negative.",
      "On a number line, the number further right is always the greater one. So −7 < −4 < 3, even though 7 is more than 4.",
    ],
    choose: {
      kind: "try",
      ask: "Put these in order, smallest first: 2, −6, 4, −5.",
      choices: [
        { label: "−6, −5, 2, 4", reply: "Yes. −6 is furthest left, then −5, then 2 and 4.", right: true },
        { label: "−5, −6, 2, 4", reply: "−6 is further left than −5, so −6 is smaller." },
        { label: "2, 4, −5, −6", reply: "The numbers below zero are smaller than every number above zero, so they come first." },
      ],
    },
  },
  {
    competency: "MATH.number.integer-add",
    type: "method",
    title: "Jumps on the number line",
    question: [
      "A lift is on floor 3. It goes down 5 floors. The floors under floor 0 are basements, numbered −1, −2, −3 and so on.",
      "Which floor is the lift on now?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "2", reply: "5 − 3 is 2, but the lift went past floor 0 on the way down. Which side of 0 is it on? Let's jump it on a line." },
        { label: "−2", reply: "Good instinct. Let's jump it on a line.", right: true },
        { label: "8", reply: "8 would be going up 5 floors. The lift goes down. Let's jump it on a line." },
      ],
    },
    missions: [
      line({ from: -10, to: 10, step: 1, start: 3, label: 5, jump: true, prompt: "The lift starts at 3. Jump it 5 back.", success: "3 + (−5) = −2. Three steps reach 0, and two more go below it.", goal: { measure: "x", equals: -2 } }),
      line({ from: -10, to: 10, step: 1, start: -4, label: 5, jump: true, prompt: "Start at −4. Add 6: jump 6 forward.", success: "(−4) + 6 = 2. Four steps reach 0, and two more go above it.", goal: { measure: "x", equals: 2 } }),
      line({ from: -10, to: 10, step: 1, start: -2, label: 5, jump: true, prompt: "Start at −2. Add −5: jump 5 back.", success: "(−2) + (−5) = −7. Both go back, so the two sizes add up.", goal: { measure: "x", equals: -7 } }),
    ],
    names: ["positive number", "negative number"],
    name: [
      "Adding a positive number is a jump forward, to the right. Adding a negative number is a jump back, to the left.",
      "Same signs: add the sizes and keep the sign, (−2) + (−5) = −7. Different signs: take the smaller size from the bigger and keep the sign of the bigger, 3 + (−5) = −2.",
    ],
    choose: {
      kind: "try",
      ask: "(−8) + 5 = ?",
      choices: [
        { label: "−3", reply: "Yes. From −8, five steps forward stop at −3, still below zero.", right: true },
        { label: "3", reply: "The size is right, but start at −8 and jump 5 forward: you stop before reaching 0." },
        { label: "−13", reply: "That jumps back. Adding 5 is a jump forward from −8." },
      ],
    },
  },
  {
    competency: "MATH.number.rounding",
    type: "idea",
    title: "The nearest ten",
    question: [
      "A shop has 347 pencils. The owner says: about 350. Her son says: about 340.",
      "Who is closer?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "The owner: 350", reply: "Good instinct. Let's measure it on a line.", right: true },
        { label: "Her son: 340", reply: "340 keeps the 34, but is it the closer one? Let's measure it on a line." },
        { label: "Both are equally close", reply: "That would be true for 345. Let's measure 347 on a line." },
      ],
    },
    missions: [
      line({ from: 340, to: 350, step: 1, start: 347, near: 10, prompt: "The point is on 347. Move it to the ten that is nearest.", success: "347 is 3 away from 350 and 7 away from 340, so 350 is the nearest ten.", goal: { measure: "x", equals: 350 } }),
      line({ from: 2000, to: 3000, step: 100, start: 2400, label: 500, near: 1000, prompt: "The point is on 2400. Move it to the nearest thousand.", success: "2400 is 400 away from 2000 and 600 away from 3000, so 2000 is nearer.", goal: { measure: "x", equals: 2000 } }),
      line({ from: 60, to: 70, step: 1, start: 65, near: 10, prompt: "65 is exactly in the middle. Everyone agrees on one rule: the middle goes up. Move the point there.", success: "65 goes up to 70. A 5 always goes up.", goal: { measure: "x", equals: 70 } }),
    ],
    names: ["rounding", "round"],
    name: [
      "Rounding means swapping a number for the nearest ten, hundred or thousand. It gives a number that is easier to say and to work with.",
      "Look at the digit just to the right of the place you are rounding to. 0 to 4: the number goes down. 5 to 9: it goes up. For 347 to the nearest ten, the 7 says up: 350.",
    ],
    choose: {
      kind: "try",
      ask: "Round 4,449 to the nearest hundred.",
      choices: [
        { label: "4,400", reply: "Yes. The tens digit is 4, so the hundreds stay as they are.", right: true },
        { label: "4,500", reply: "Look only at the tens digit, which is 4: the number goes down. (Do not round the 9 first.)" },
        { label: "4,000", reply: "That is the nearest thousand. For the nearest hundred, keep the 44 hundreds and look at the tens digit." },
      ],
    },
  },
  {
    competency: "MATH.number.primes",
    type: "idea",
    title: "Numbers that make only one row",
    question: [
      "A teacher has 12 children and wants them in equal rows for a photo. She finds several ways. The next day one more child joins, so there are 13.",
      "Can 13 children stand in equal rows too, with more than one row and more than one child in each row?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "Yes, there is always a way", reply: "It works for 12. Let's try it with 13 counters." },
        { label: "Yes, in 3 rows", reply: "3 rows of 4 is 12, so one child is left over. Let's try other rows with counters." },
        { label: "No, 13 cannot", reply: "Good instinct. Let's try every way with counters.", right: true },
      ],
    },
    missions: [
      rows(12, { rows: 3, prompt: "Here are 3 rows. Make exactly 12 counters.", success: "3 rows of 4 make 12.", goal: { measure: "off", equals: 0 } }),
      rows(12, { rows: 2, prompt: "Now 2 rows. Make exactly 12 again.", success: "2 rows of 6 as well. 12 can be shared equally by 1, 2, 3, 4, 6 and 12.", goal: { measure: "off", equals: 0 } }),
      rows(13, { prompt: "Now 13. Try 2 rows, 3 rows, 4 rows. Finish with any equal rows that make exactly 13.", success: "Only one row of 13 works. No other number shares 13 equally.", goal: { measure: "off", equals: 0 } }),
    ],
    names: ["prime", "composite"],
    name: [
      "A number that only 1 and itself divide exactly, so it makes only a single row, is called a prime number: 2, 3, 5, 7, 11, 13, ...",
      "A number with more ways, like 12, is a composite number. 1 is neither. To test a number up to 100, try dividing by 2, 3, 5 and 7: if none divides it exactly, it is prime.",
    ],
    choose: {
      kind: "try",
      ask: "Which of these is a prime number?",
      choices: [
        { label: "21", reply: "21 = 3 × 7, so it makes 3 rows of 7." },
        { label: "23", reply: "Yes. 2, 3, 5 and 7 all leave a remainder.", right: true },
        { label: "27", reply: "27 = 3 × 9, so it makes 3 rows of 9." },
      ],
    },
  },
  {
    competency: "MATH.measurement.area-squares",
    type: "idea",
    title: "Counting squares quickly",
    question: [
      "A floor is covered with square tiles: 4 rows, with 6 tiles in every row. Ravi starts counting the tiles one by one.",
      "Is there a quicker way to know how many tiles there are?",
    ],
    predict: {
      ask: "Which way works?",
      choices: [
        { label: "Add the two numbers: 6 + 4 = 10", reply: "10 is only one row and one column. Let's build the floor and count." },
        { label: "4 rows of 6: 6 + 6 + 6 + 6 = 24", reply: "Good thinking. Let's build some floors and check.", right: true },
        { label: "Count around the edge: 20", reply: "That counts the border, not the tiles inside. Let's build the floor and count." },
      ],
    },
    missions: [
      rect({ area: 24, words: ["edge", "squares"], prompt: "Drag the corner to make a floor of exactly 24 squares.", success: "Rows times squares in a row gives 24: 4 × 6, or 3 × 8.", goal: { measure: "off", equals: 0 } }),
      rect({ area: 18, words: ["edge", "squares"], prompt: "Now make a floor of exactly 18 squares.", success: "2 × 9 or 3 × 6: count one row, then multiply by the number of rows.", goal: { measure: "off", equals: 0 } }),
      rect({ area: 16, perimeter: 16, words: ["edge", "squares"], prompt: "Make a floor of 16 squares with all four sides the same length.", success: "4 rows of 4 make 16.", goal: { measure: "off", equals: 0 } }),
    ],
    names: ["area"],
    name: [
      "The number of unit squares that cover a shape is called its area. A square 1 cm on each side is 1 square centimetre.",
      "For a rectangle you do not need to count every square: area = number of rows × squares in each row, which is length × breadth.",
    ],
    choose: {
      kind: "try",
      ask: "A rectangle is covered by 5 rows of 7 unit squares. What is its area?",
      choices: [
        { label: "35 square units", reply: "Yes. 5 rows of 7 is 5 × 7.", right: true },
        { label: "12 square units", reply: "That adds 5 and 7. Five rows of seven squares is 5 × 7." },
        { label: "24 square units", reply: "That is the distance around the edge. The squares inside are 5 rows of 7." },
      ],
    },
  },
  {
    competency: "MATH.measurement.rectangle-perimeter",
    type: "idea",
    title: "Walking round the edge",
    question: [
      "A farmer walks once around his field to check the fence. The field is a rectangle, 6 metres long and 4 metres wide.",
      "How far does he walk?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "10 metres", reply: "That is one long side and one short side: only halfway round. Let's build the field." },
        { label: "20 metres", reply: "Good instinct. Let's build some fields and check.", right: true },
        { label: "24 metres", reply: "24 is the number of square metres inside the field. The walk is around the edge. Let's build it." },
      ],
    },
    missions: [
      rect({ perimeter: 14, words: ["fence", "squares"], prompt: "Drag the corner to make a field that needs exactly 14 metres of fence.", success: "Length and breadth add up to 7, and the fence is twice that.", goal: { measure: "off", equals: 0 } }),
      rect({ perimeter: 18, words: ["fence", "squares"], prompt: "Now make a field that needs exactly 18 metres of fence.", success: "Any length and breadth that add up to 9 need 18 metres of fence.", goal: { measure: "off", equals: 0 } }),
      rect({ perimeter: 12, area: 9, words: ["fence", "squares"], prompt: "Make a field with 12 metres of fence and all four sides the same length.", success: "3 + 3 + 3 + 3 = 12. For a square, the fence is 4 × one side.", goal: { measure: "off", equals: 0 } }),
    ],
    names: ["perimeter"],
    name: [
      "The distance all the way round a shape is called its perimeter.",
      "A rectangle has two lengths and two breadths, so perimeter = 2 × (length + breadth). For the farmer's field: 2 × (6 + 4) = 20 metres.",
    ],
    choose: {
      kind: "try",
      ask: "A rectangle is 8 cm long and 5 cm wide. What is its perimeter?",
      choices: [
        { label: "26 cm", reply: "Yes. 2 × (8 + 5) = 2 × 13.", right: true },
        { label: "13 cm", reply: "That is one length and one breadth: halfway round. Double it." },
        { label: "40 cm", reply: "8 × 5 counts the squares inside. Around the edge is 2 × (8 + 5)." },
      ],
    },
  },
];
