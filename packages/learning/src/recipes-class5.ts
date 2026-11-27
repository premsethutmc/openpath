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
const commas = (digits: string, style: "indian" | "international", rest: Omit<Extract<Scene, { kind: "commas" }>, "type" | "kind" | "digits" | "style">): Scene => ({ type: "scene", kind: "commas", digits, style, ...rest });
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
        { label: "2", reply: "5 − 3 is 2, but the lift went past floor 0 on the way down. Which side of 0 is it on? Let's ride the lift." },
        { label: "−2", reply: "Good instinct. Let's ride the lift and see.", right: true },
        { label: "8", reply: "8 would be going up 5 floors. The lift goes down. Let's ride the lift." },
      ],
    },
    missions: [
      // lift-story@1: the story's own lift, which turns into the number line once it arrives
      line({ from: -5, to: 5, step: 1, start: 3, jump: true, story: "lift", prompt: "The lift is on floor 3. Drag it down 5 floors.", success: "3 + (−5) = −2. Three steps reach 0, and two more go below it.", goal: { measure: "x", equals: -2 } }),
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
      rows(12, { rows: 3, people: true, prompt: "Here are 3 rows. Put all 12 children in them.", success: "3 rows of 4 make 12. Nobody is left over.", goal: { measure: "off", equals: 0 } }),
      rows(12, { rows: 2, people: true, prompt: "Now 2 rows. Put all 12 children in them again.", success: "2 rows of 6 as well. 12 can be shared equally by 1, 2, 3, 4, 6 and 12.", goal: { measure: "off", equals: 0 } }),
      rows(13, { people: true, log: true, prompt: "Now 13 children. Try 2 rows, then 3, then 4, and watch who is left over. Finish with any equal rows that take all 13.", success: "Only one row of 13 works: every other way leaves someone over. Trying 2 and 3 rows was enough: 4 or more rows is one of those turned on its side.", goal: { measure: "off", equals: 0 } }),
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
  {
    competency: "MATH.number.fraction-of-collection",
    type: "idea",
    title: "A share of many",
    question: [
      "Amma makes 12 laddoos. She says a third of them are for the neighbours.",
      "How many laddoos go next door?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "3", reply: "3 is how many equal groups there are, not how many are in one group. Let's share them out." },
        { label: "4", reply: "Good instinct. Let's share them out and see.", right: true },
        { label: "9", reply: "Taking away 3 gives 9, but a third means one of three equal groups. Let's share them out." },
      ],
    },
    missions: [
      rows(12, { rows: 3, prompt: "Share the 12 laddoos into 3 equal rows.", success: "Each row has 4. One row out of three is a third of 12: 4.", goal: { measure: "off", equals: 0 } }),
      rows(20, { rows: 4, prompt: "Now share 20 into 4 equal rows.", success: "Each row has 5, so a quarter of 20 is 5.", goal: { measure: "off", equals: 0 } }),
      rows(15, { rows: 5, prompt: "Share 15 into 5 equal rows.", success: "Each row has 3. One fifth of 15 is 3, so two fifths is two rows: 6.", goal: { measure: "off", equals: 0 } }),
    ],
    names: ["divide"],
    name: [
      "The bottom number says how many equal groups to make. So to find 1/3 of a number, divide it by 3: 1/3 of 12 = 12 ÷ 3 = 4.",
      "For more than one part, divide first, then multiply by the top number: 2/5 of 15 = (15 ÷ 5) × 2 = 6.",
    ],
    choose: {
      kind: "try",
      ask: "What is 3/4 of 20?",
      choices: [
        { label: "15", reply: "Yes. A quarter of 20 is 5, and three quarters is 3 × 5.", right: true },
        { label: "5", reply: "That is one quarter. Three quarters is three of those groups." },
        { label: "60", reply: "That multiplies by 3 only. Share 20 into 4 equal groups first, then take 3 of them." },
      ],
    },
  },
  {
    competency: "MATH.number.division-remainders",
    type: "idea",
    title: "When it does not share exactly",
    question: [
      "Ravi has 39 marbles to share equally among 5 friends. He gives out as many as he can, so that everyone has the same number.",
      "How many marbles are still in his hand?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "None", reply: "That would need a number of marbles that 5 shares exactly, like 35 or 40. Let's share out 39." },
        { label: "4", reply: "Good instinct. Let's share them out and see.", right: true },
        { label: "7", reply: "7 is how many each friend gets. Let's see how many stay in his hand." },
      ],
    },
    missions: [
      rows(39, { rows: 5, share: true, prompt: "Each row is one friend. Give every friend the same number, as many as you can.", success: "5 rows of 7 use 35 marbles. The 4 left are not enough for another round.", goal: { measure: "left", below: 5 } }),
      rows(23, { rows: 4, share: true, prompt: "Now share 23 among 4 friends, as many each as you can.", success: "4 rows of 5 use 20, and 3 are left over.", goal: { measure: "left", below: 4 } }),
      rows(24, { rows: 6, share: true, prompt: "Share 24 among 6 friends.", success: "6 rows of 4 use all 24. This time nothing is left over.", goal: { measure: "left", below: 6 } }),
    ],
    names: ["remainder", "quotient"],
    name: [
      "What is left over after sharing equally is called the remainder. 39 ÷ 5 = 7 remainder 4, because 5 × 7 = 35 and 39 − 35 = 4. The 7 is called the quotient.",
      "The remainder is always smaller than the number you are dividing by. If it is not, there is enough for another round.",
    ],
    choose: {
      kind: "try",
      ask: "47 ÷ 6 = 7 remainder ?",
      choices: [
        { label: "5", reply: "Yes. 6 × 7 = 42, and 47 − 42 = 5.", right: true },
        { label: "1", reply: "6 × 7 is 42, not 46. Take 42 away from 47." },
        { label: "6", reply: "With 6 left over there would be enough for another round. 6 × 7 = 42, and 47 − 42 = 5." },
      ],
    },
  },
  {
    competency: "MATH.reasoning.estimate-check",
    type: "method",
    title: "About how much?",
    question: [
      "A child's ticket costs ₹38 and an adult's ticket costs ₹87. Asha has ₹120 and needs one of each. The queue is moving and she has no time to add exactly.",
      "Is ₹120 enough?",
    ],
    predict: {
      ask: "What do you think?",
      choices: [
        { label: "Yes, it is enough", reply: "Let's find a quick way to be sure." },
        { label: "No, it is not enough", reply: "Good instinct. Let's find a quick way to be sure.", right: true },
      ],
    },
    missions: [
      line({ from: 30, to: 40, step: 1, start: 38, near: 10, prompt: "38 sits between two tens. Move the point to the nearer one.", success: "38 is only 2 away from 40.", goal: { measure: "x", equals: 40 } }),
      line({ from: 80, to: 90, step: 1, start: 87, near: 10, prompt: "Now 87. Move the point to the nearer ten.", success: "87 is 3 away from 90. So the two tickets cost about 40 + 90 = 130.", goal: { measure: "x", equals: 90 } }),
    ],
    names: ["estimate"],
    name: [
      "A quick answer made with easy numbers is called an estimate. Round each number to the nearest ten (or hundred), then add or subtract the round numbers: 38 + 87 is about 40 + 90 = 130.",
      "An estimate also checks an exact answer. If you worked out 38 + 87 = 215, the estimate of 130 tells you something went wrong.",
    ],
    choose: {
      kind: "try",
      ask: "Estimate 62 + 29 by rounding each number to the nearest ten.",
      choices: [
        { label: "90", reply: "Yes. 60 + 30 = 90.", right: true },
        { label: "80", reply: "62 goes to 60, but 29 is nearer to 30 than to 20." },
        { label: "100", reply: "62 is nearer to 60 than to 70. 60 + 30 = 90." },
      ],
    },
  },
  {
    competency: "MATH.number.percentage",
    type: "method",
    title: "A percentage of an amount",
    question: [
      "A shop takes 10% off everything today. A cricket bat costs ₹200.",
      "How many rupees come off the price of the bat?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "₹10", reply: "10% means 10 out of every 100, and the bat costs two hundreds. Let's see it on a hundred-square." },
        { label: "₹20", reply: "Good instinct. Let's see it on a hundred-square.", right: true },
        { label: "₹190", reply: "That takes ₹10 off and gives the new price. The question is how much comes off. Let's see it on a hundred-square." },
      ],
    },
    missions: [
      frac([10, 100], { pieces: 100, prompt: "The whole square is the price, ₹200. Shade 10% of it.", success: "10 of the 100 squares. Each small square is worth ₹2, so 10 squares are ₹20.", goal: { measure: "miss", equals: 0 } }),
      frac([25, 100], { pieces: 100, prompt: "Now the whole square is ₹400. Shade 25% of it.", success: "25 squares. Each small square is worth ₹4, so 25% of ₹400 is ₹100.", goal: { measure: "miss", equals: 0 } }),
    ],
    names: ["one per cent"],
    name: [
      "First find one per cent: divide the amount by 100. Then multiply by the number of per cent. 10% of 200 = (200 ÷ 100) × 10 = 20.",
      "Some are worth knowing by heart: 50% is a half, 25% is a quarter and 10% is a tenth.",
    ],
    choose: {
      kind: "try",
      ask: "What is 30% of 50?",
      choices: [
        { label: "15", reply: "Yes. 1% of 50 is 0.5, and 30 of those make 15.", right: true },
        { label: "30", reply: "30% of 100 is 30. Here the amount is 50, so it is half of that." },
        { label: "1500", reply: "That multiplies 30 by 50 but never divides by 100." },
      ],
    },
  },
  {
    competency: "MATH.number.decimal-operations",
    type: "method",
    title: "Line up the point",
    question: [
      "Ravi buys a pen for ₹15.20 and an eraser for ₹2.38. He writes 15.2 with 2.38 under it, their last digits in line, and adds.",
      "He gets ₹3.90. Is he right?",
    ],
    predict: {
      ask: "What do you think?",
      choices: [
        { label: "Yes", reply: "₹3.90 is less than the pen alone costs. Something went wrong with where the digits sit." },
        { label: "No: it must be more than ₹15", reply: "Good thinking. Let's see where the digits should sit.", right: true },
      ],
    },
    missions: [],
    names: ["decimal point"],
    name: [
      "Write the numbers so that each decimal point is exactly under the one above. Then tens are under tens, ones under ones and tenths under tenths.",
      "Fill any empty place with 0 (15.2 is 15.20). Add or subtract as usual, and put the point in the answer directly under the others.",
    ],
    choose: {
      kind: "try",
      ask: "4.5 + 1.25 = ?",
      choices: [
        { label: "5.75", reply: "Yes. 4.50 + 1.25, with the points in line.", right: true },
        { label: "1.70", reply: "That lines up the last digits, so the 4 ones were added as tenths. Line up the points: 4.50 + 1.25." },
        { label: "5.30", reply: "The ones are right. In the pieces, 0.50 + 0.25 is 0.75." },
      ],
    },
  },
  {
    competency: "MATH.number.multiply-divide-powers-of-ten",
    type: "method",
    title: "Times ten",
    question: [
      "Meena says: to multiply by 10, just write a 0 at the end. 974 × 10 = 9740.",
      "Does her trick work for 2.5 × 10?",
    ],
    predict: {
      ask: "What do you think?",
      choices: [
        { label: "Yes: 2.50", reply: "2.50 is the same amount as 2.5, so nothing was multiplied. Let's see what really happens." },
        { label: "No: the answer is 25", reply: "Good thinking. Let's see what really happens to the digits.", right: true },
      ],
    },
    missions: [],
    names: ["place value"],
    name: [
      "Multiplying by 10 makes every digit worth ten times as much, so each digit moves one place to the left: 2.5 becomes 25 and 974 becomes 9740. Dividing by 10 moves each digit one place to the right.",
      "For 100 the digits move two places, and for 1000 three. This is place value at work: the 0 at the end of 9740 only fills the empty ones place.",
    ],
    choose: {
      kind: "try",
      ask: "36 ÷ 10 = ?",
      choices: [
        { label: "3.6", reply: "Yes. Each digit moves one place to the right.", right: true },
        { label: "360", reply: "That is 36 × 10. Dividing makes the number smaller: the digits move to the right." },
        { label: "0.36", reply: "That moves the digits two places, which is dividing by 100." },
      ],
    },
  },
  {
    competency: "MATH.measurement.money-decimals",
    type: "fact",
    title: "Rupees and paise",
    names: ["paise", "paisa"],
    name: [
      "100 paise make 1 rupee, so 1 paisa is one hundredth of a rupee: ₹0.01. The two digits after the point are the paise.",
      "₹3.05 is 3 rupees and 5 paise, which is 305 paise. ₹3.50 is 3 rupees and 50 paise, which is 350 paise.",
    ],
    missions: [
      frac([50, 100], { pieces: 100, prompt: "The square is one rupee, and each small square is 1 paisa. Shade 50 paise.", success: "50 of 100: half a rupee, written ₹0.50.", goal: { measure: "miss", equals: 0 } }),
      frac([5, 100], { pieces: 100, prompt: "Now shade just 5 paise.", success: "5 of 100 is written ₹0.05. (₹0.5 would be 50 paise.)", goal: { measure: "miss", equals: 0 } }),
    ],
    choose: {
      kind: "try",
      ask: "How many paise make ₹2.07?",
      choices: [
        { label: "207", reply: "Yes. 2 rupees are 200 paise, and 7 more.", right: true },
        { label: "27", reply: "Each rupee is 100 paise, so 2 rupees are 200 paise. Then add the 7." },
        { label: "270", reply: "That would be ₹2.70. The 07 after the point means 7 paise." },
      ],
    },
  },
  {
    competency: "MATH.number.indian-international-numeration",
    type: "idea",
    title: "Two ways to put the commas",
    question: [
      "A newspaper in Chennai says a film earned 21,10,00,000 rupees. A website in London says the same film earned 211,000,000 rupees.",
      "Has one of them made a mistake?",
    ],
    predict: {
      ask: "What do you think?",
      choices: [
        { label: "Yes, the two numbers are different", reply: "Look closely: the digits are the same, in the same order. Only the commas have moved. Let's move them ourselves." },
        { label: "No, it is the same number", reply: "Good eye. Let's move the commas ourselves.", right: true },
      ],
    },
    missions: [
      commas("211000000", "international", { prompt: "Put the commas the way the London website does: groups of three, counting from the right.", success: "211,000,000. The group in front of the second comma counts the millions: 211 million.", goal: { measure: "miss", equals: 0 } }),
      commas("211000000", "indian", { prompt: "Now the Chennai way: one group of three on the right, then groups of two.", success: "21,10,00,000. Reading the groups from the left: 21 crore 10 lakh.", goal: { measure: "miss", equals: 0 } }),
      commas("45000000", "international", { prompt: "4,50,00,000 is 4 crore 50 lakh. Here are its digits: group them in threes.", success: "45,000,000 is 45 million. So 4 crore 50 lakh is 45 million.", goal: { measure: "miss", equals: 0 } }),
    ],
    names: ["international system", "indian system"],
    name: [
      "Grouping in threes is called the international system: thousands, then millions. One group of three and then twos is the Indian system: thousands, lakhs, crores.",
      "The number itself never changes. To change from one to the other, write the same digits with the other commas and read the groups. Useful to know: 1 million = 10 lakh, and 1 crore = 10 million.",
    ],
    choose: {
      kind: "try",
      ask: "How many millions is 3 crore?",
      choices: [
        { label: "30", reply: "Yes. 3,00,00,000 regrouped is 30,000,000: 30 million.", right: true },
        { label: "3", reply: "A crore is bigger than a million: 1 crore = 10 million." },
        { label: "300", reply: "1 crore is 10 million, not 100. So 3 crore is 30 million." },
      ],
    },
  },
  {
    competency: "MATH.number.large-numbers",
    type: "idea",
    title: "Where do the commas go?",
    question: [
      "A scooter costs ₹759403. Ravi tries to read the price aloud and gets lost in the digits. His grandmother looks once and says: seven lakh fifty-nine thousand four hundred three.",
      "How does she read it so quickly?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "She has seen this price before", reply: "She can do it with any number. Let's find her trick." },
        { label: "She splits the digits into small groups", reply: "Good thinking. Let's split them ourselves.", right: true },
      ],
    },
    missions: [
      commas("759403", "indian", { prompt: "Split the price the Indian way: three digits on the right, then groups of two.", success: "7,59,403. Now it reads easily: 7 lakh, 59 thousand, 403.", goal: { measure: "miss", equals: 0 } }),
      commas("1250000", "indian", { prompt: "Split this number the same way: three on the right, then twos.", success: "12,50,000 reads as 12 lakh 50 thousand.", goal: { measure: "miss", equals: 0 } }),
      commas("30405060", "indian", { prompt: "A bigger one. Three on the right, then twos.", success: "3,04,05,060: 3 crore, 4 lakh, 5 thousand and 60. A 0 keeps each empty place.", goal: { measure: "miss", equals: 0 } }),
    ],
    names: ["period"],
    name: [
      "Each group of digits between commas is called a period. From the right: ones (three digits), then thousands, lakhs and crores (two digits each).",
      "To read a number, say each period with its name. To write one from words, fill every period, using 0 for any place that is not said: four lakh six thousand twenty is 4,06,020.",
    ],
    choose: {
      kind: "try",
      ask: "Write in figures: two lakh five thousand thirty.",
      choices: [
        { label: "2,05,030", reply: "Yes. 2 lakh, 05 thousand, and 030 in the ones.", right: true },
        { label: "2,5,30", reply: "Every place needs a digit. The thousands need two digits (05) and the ones need three (030)." },
        { label: "25,030", reply: "That is twenty-five thousand thirty. The 2 lakh needs its own group, and the thousands are 05." },
      ],
    },
  },
];
