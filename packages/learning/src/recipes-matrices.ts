/**
 * recipe@1 for the rest of the matrix topics (Classes 10 to 12): the transpose and symmetry, the adjoint and inverse,
 * row reduction and rank, consistency of a system, and a system written as AX = B.
 *
 * Every mission is a `pick` scene on the engine's matrix figure: the learner finds the idea on the matrix itself (which
 * entry stays, where one lands, what is left when a row and a column are crossed out, which row no longer counts)
 * before it is named. No new picture or screen: the matrix figure and its player already exist.
 */
import type { Recipe } from "./recipe";
import type { Scene } from "./scene";

const tap = (values: number[][], prompt: string, ask: string[], hint: string, success: string): Scene => ({ type: "scene", kind: "pick", figure: { of: "matrix", values }, prompt, ask, hint, success, goal: { measure: "wrong", equals: 0 } });
const row = (r: number, cols: number) => Array.from({ length: cols }, (_, j) => `e:${r},${j + 1}`);

const NINE = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const COF = [[1, 2, 3], [0, 4, 5], [1, 0, 6]];

export const MATRIX_RECIPES: Recipe[] = [
  {
    competency: "MATH.matrices.transpose-symmetry",
    type: "idea",
    title: "Flip it across the diagonal",
    question: [
      "A table of marks has one row for each child and one column for each test. Someone rewrites it with one row for each test instead.",
      "The numbers are the same. Which of them move, and where does each one go?",
    ],
    predict: {
      ask: "A = [[1, 2], [3, 4]]. Its rows are rewritten as columns. Which numbers stay where they are?",
      choices: [
        { label: "1 and 4", reply: "Good instinct. Let's find out why those two.", right: true },
        { label: "2 and 3", reply: "Those are the two that swap. Let's see it on a bigger one." },
        { label: "None of them", reply: "Two of them do stay. Let's find which." },
      ],
    },
    missions: [
      tap(NINE, "Rows are about to become columns. Tap an entry that will not move.", ["e:1,1", "e:2,2", "e:3,3"], "Row 1 becomes column 1. Look for an entry whose row number equals its column number.", "1, 5 and 9 stay: each is in the same row number and column number. They run from the top-left corner to the bottom-right."),
      tap(NINE, "The 2 is in row 1, column 2. Tap the place it lands when rows become columns.", ["e:2,1"], "Swap its row number and its column number.", "Row 1, column 2 goes to row 2, column 1, and the 4 that was there comes back the other way. The two places are mirror partners."),
      tap([[1, 5, 2], [5, 3, 8], [2, 7, 4]], "This one is nearly unchanged when rows become columns. Tap an entry that spoils it.", ["e:2,3", "e:3,2"], "Compare each entry with its mirror partner across the diagonal.", "8 and 7 are mirror partners but are not equal. Every other pair matches: 5 with 5, 2 with 2."),
      tap([[0, 3, -2], [-3, 0, 6], [2, -6, 5]], "Here every entry should be the opposite of its mirror partner. Tap the entry that breaks the rule.", ["e:3,3"], "3 and −3 are fine, and so are −2 and 2, and 6 and −6. Which entry is its own mirror partner?", "A diagonal entry is its own partner, so it must be its own opposite. Only 0 is: the 5 has to be 0."),
    ],
    names: ["transpose", "symmetric"],
    name: [
      "Writing the rows as columns gives the transpose, A′ (also written Aᵀ). If A′ = A the matrix is symmetric. If A′ = −A it is skew-symmetric, and its diagonal is all zeros.",
      "Every square matrix is a sum of the two kinds: P = ½(A + A′) is symmetric, Q = ½(A − A′) is skew-symmetric, and P + Q = A.",
    ],
    choose: {
      kind: "try",
      ask: "A has 4 in row 1, column 2 and 10 in row 2, column 1. What goes in those two places of the symmetric part P?",
      choices: [
        { label: "7 and 7", reply: "Yes: their average, in both places.", right: true },
        { label: "−3 and 3", reply: "That is the skew-symmetric part Q: half the difference, with opposite signs." },
        { label: "14 and 14", reply: "That is the sum. Halve it: P is ½(A + A′)." },
      ],
    },
  },
  {
    competency: "MATH.matrices.adjoint-inverse",
    type: "method",
    title: "Cross out, sign, flip",
    question: [
      "To undo a 3 × 3 matrix you need nine small numbers, one for each entry.",
      "Each one comes from the four entries left when that entry's row and column are crossed out. Which four?",
    ],
    predict: {
      ask: "Cross out one row and one column of a 3 × 3 matrix. How many entries are left?",
      choices: [
        { label: "6", reply: "The row and the column share one entry, so 5 are crossed out, not 3. Let's count on a real one." },
        { label: "4", reply: "Yes: a 2 × 2 block. Let's find it.", right: true },
        { label: "3", reply: "5 of the 9 are crossed out. Let's count on a real one." },
      ],
    },
    missions: [
      tap(COF, "Cross out row 1 and column 1 in your head. Tap any entry that is left.", ["e:2,2", "e:2,3", "e:3,2", "e:3,3"], "Leave out everything in row 1 and everything in column 1.", "Left: 4, 5, 0, 6. Their 2 × 2 determinant, 4 × 6 − 5 × 0 = 24, is the number that belongs to the top-left entry."),
      tap(COF, "Now cross out row 2 and column 3. Tap any entry that is left.", ["e:1,1", "e:1,2", "e:3,1", "e:3,2"], "Leave out everything in row 2 and everything in column 3.", "Left: 1, 2, 1, 0. Their determinant is 1 × 0 − 2 × 1 = −2."),
      tap(COF, "Signs go like a chessboard, with + in the top-left corner. Tap a place that gets a minus sign.", ["e:1,2", "e:2,1", "e:2,3", "e:3,2"], "Add the row number and the column number. An odd total means minus.", "Row number + column number is odd there, so the sign is minus. In row 2, column 3 the −2 becomes +2."),
    ],
    names: ["minor", "cofactor", "adjoint", "inverse"],
    name: [
      "The 2 × 2 determinant left after crossing out is the minor of the entry. With its chessboard sign it is the cofactor.",
      "Write all nine cofactors and turn the rows into columns: that is the adjoint, adj A. Divide every entry by |A| to get the inverse, A⁻¹. If |A| = 0 there is no inverse.",
    ],
    choose: {
      kind: "try",
      ask: "For a 2 × 2 matrix [[a, b], [c, d]] the same steps give a shortcut. Which is adj A?",
      choices: [
        { label: "[[d, −b], [−c, a]]", reply: "Yes: a and d change places, b and c change sign.", right: true },
        { label: "[[a, −b], [−c, d]]", reply: "The signs are right, but a and d must change places too." },
        { label: "[[d, b], [c, a]]", reply: "a and d changed places, but b and c must change sign." },
      ],
    },
  },
  {
    competency: "MATH.matrices.rank-row-reduction",
    type: "idea",
    title: "Which rows really count?",
    question: [
      "Three clues about three unknown numbers should pin them down. But sometimes a clue only repeats what the others already said.",
      "How can you tell, from the numbers alone, how many clues are real?",
    ],
    predict: {
      ask: "Three rows: (1, 2, 3), (2, 4, 6) and (0, 1, 5). How many of them say something new?",
      choices: [
        { label: "3", reply: "Look again at the second row. Let's check it." },
        { label: "2", reply: "Good eye. Let's see which one adds nothing.", right: true },
        { label: "1", reply: "The third row is not a multiple of the first, so it does add something. Let's check." },
      ],
    },
    missions: [
      tap([[1, 2, 3], [2, 4, 6], [0, 1, 5]], "One row is just another row doubled. Tap any entry in that row.", row(2, 3), "Compare each row with twice row 1.", "Row 2 is 2 × row 1. Take twice row 1 away from it and it becomes 0, 0, 0: it said nothing new."),
      tap([[1, 2, 3], [3, 7, 8], [0, 0, 4]], "Aim for a staircase: zeros in the bottom-left corner. Tap the entry that still has to become 0.", ["e:2,1"], "Each row should start with more zeros than the row above it.", "Row 2 minus 3 × row 1 gives 0, 1, −1. Now every row starts further to the right than the one above."),
      tap([[1, 2, 3], [0, 1, -1], [0, 0, 0]], "The staircase is finished. Tap an entry in a row that no longer counts.", row(3, 3), "Look for a row with nothing left in it.", "A row of zeros says 0 = 0 and carries no information. Two rows are left that count."),
    ],
    names: ["rank", "echelon"],
    name: [
      "The staircase shape is called echelon form. The number of rows in it that are not all zeros is the rank of the matrix, written ρ(A).",
      "Three moves are allowed: swap two rows, multiply a row by a number that is not 0, and add a multiple of one row to another. None of them changes the rank.",
    ],
    choose: {
      kind: "try",
      ask: "An echelon form is [[2, 1, 4], [0, 0, 5], [0, 0, 0]]. What is the rank?",
      choices: [
        { label: "2", reply: "Yes: two rows are not all zeros.", right: true },
        { label: "3", reply: "The last row is all zeros, so it does not count." },
        { label: "1", reply: "Row 2 is 0, 0, 5. It is not all zeros, so it counts." },
      ],
    },
  },
  {
    competency: "MATH.matrices.system-consistency",
    type: "idea",
    title: "One answer, many, or none?",
    question: [
      "Three equations in x, y and z can have exactly one answer, endlessly many answers, or no answer at all.",
      "Can you tell which, before solving them?",
    ],
    predict: {
      ask: "After tidying up, the last equation reads 0x + 0y + 0z = 5. What does that tell you?",
      choices: [
        { label: "z = 5", reply: "There is no z left in it: its number is 0. Let's look at the whole row." },
        { label: "No values can work", reply: "Good instinct. Let's see it in the rows.", right: true },
        { label: "Any values work", reply: "That would need 0 = 0. This row says 0 = 5. Let's look." },
      ],
    },
    missions: [
      tap([[1, 1, 1, 6], [0, 1, 2, 8], [0, 0, 0, 5]], "Each row is an equation: numbers of x, y, z, then the right side. Tap an entry in the row that can never be true.", row(3, 4), "Read each row as an equation. One of them has nothing on the left.", "Row 3 says 0x + 0y + 0z = 5, that is 0 = 5. Nothing can make that true, so the system has no answer."),
      tap([[1, 1, 1, 6], [0, 1, 2, 8], [0, 0, 0, 0]], "The 5 is now 0. Tap an entry in the row that says nothing at all.", row(3, 4), "Look for the row that reads 0 = 0.", "0 = 0 is always true. Only two real equations are left for three unknowns: z can be anything, so there are endlessly many answers."),
      tap([[1, 1, 1, 6], [0, 1, 2, 8], [0, 0, 3, 9]], "Now every row counts. Tap an entry in the row that gives one unknown straight away.", row(3, 4), "Find the row with only one unknown left in it.", "Row 3 says 3z = 9, so z = 3. Then row 2 gives y = 2 and row 1 gives x = 1: exactly one answer."),
    ],
    names: ["consistent", "rank", "augmented"],
    name: [
      "A system with at least one solution is consistent; with none, inconsistent. A with the right sides beside it is the augmented matrix [A | B].",
      "Compare the rank of A with the rank of [A | B]. Different: no solution. Equal: one solution if the rank equals the number of unknowns, infinitely many if it is smaller.",
    ],
    choose: {
      kind: "try",
      ask: "Three unknowns, ρ(A) = 2 and ρ([A | B]) = 2. How many solutions?",
      choices: [
        { label: "Infinitely many", reply: "Yes: the ranks are equal, and 2 is fewer than the 3 unknowns.", right: true },
        { label: "Exactly one", reply: "One solution needs the rank to be 3, the number of unknowns." },
        { label: "None", reply: "No solution needs the two ranks to be different. Here they are equal." },
      ],
    },
  },
  {
    competency: "MATH.algebra.matrix-systems",
    type: "method",
    title: "Equations packed into AX = B",
    question: [
      "Look at 2x + y = 5 and x + 3y = 10. The letters x and y are the same in both lines. Only the numbers change.",
      "What if you kept just the numbers, each in its own place?",
    ],
    predict: {
      ask: "In x + 3y = 10, which number stands in front of x?",
      choices: [
        { label: "0", reply: "0 would mean there is no x at all. Let's look at the numbers in a grid." },
        { label: "1", reply: "Yes: x alone means 1x. Let's put all the numbers in a grid.", right: true },
        { label: "3", reply: "3 is in front of y. Let's look at the numbers in a grid." },
      ],
    },
    missions: [
      tap([[2, 1, 5], [1, 3, 10]], "Row 1 is 2x + y = 5 and row 2 is x + 3y = 10, numbers only. Tap a number that multiplies y.", ["e:1,2", "e:2,2"], "y is the second letter, so look in the second column.", "Column 2 holds the y numbers, 1 and 3. Column 1 holds the x numbers, 2 and 1."),
      tap([[2, 1, 5], [1, 3, 10]], "Tap a number from the right-hand side of an equation.", ["e:1,3", "e:2,3"], "The right-hand sides are the numbers after the = sign.", "The last column, 5 and 10, is kept apart as the column B. The first two columns together are the matrix A."),
      tap([[2, 1, 5], [0, 3, 6]], "A new pair: 2x + y = 5 and 3y = 6. Tap the number that stands for the missing x.", ["e:2,1"], "The second equation has no x. Its place in the x column still has to be filled.", "No x is written as 0. The place is kept, so the columns still line up: x numbers, y numbers, right sides."),
    ],
    names: ["coefficient", "inverse"],
    name: [
      "The numbers in front of the letters are the coefficients, and A is the coefficient matrix. With X the column of unknowns and B the column of right sides, the whole system is AX = B.",
      "When |A| is not 0, multiply both sides by the inverse: X = A⁻¹B. For a 2 × 2 matrix [[a, b], [c, d]], A⁻¹ is [[d, −b], [−c, a]] divided by |A|.",
    ],
    choose: {
      kind: "try",
      ask: "A = [[2, 1], [1, 3]] and B is the column 5, 10. |A| = 5 and adj A = [[3, −1], [−1, 2]]. What is (x, y)?",
      choices: [
        { label: "(1, 3)", reply: "Yes: (3 × 5 − 1 × 10) ÷ 5 = 1 and (−1 × 5 + 2 × 10) ÷ 5 = 3.", right: true },
        { label: "(5, 15)", reply: "That is adj A times B. It still has to be divided by |A| = 5." },
        { label: "(3, 1)", reply: "x comes from the first row: (15 − 10) ÷ 5 = 1. Then y = 3." },
      ],
    },
  },
];
