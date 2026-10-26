// Text that can be read in more than one way is never given a definite verdict. "1/2x" is (1/2)x or 1/(2x); "1/x(x+1)" is (1/x)(x+1) or 1/(x(x+1)).
// Shared by every engine, for the problem and for each line.
export const ambiguousText = (expr: string): boolean => { const g = expr.replace(/[−–—]/g, "-").replace(/[÷∕⁄]/g, "/").replace(/\s+/g, ""); return /\/\d+(?:\.\d+)?[a-zA-Z(]/.test(g) || /[a-zA-Z0-9)]\/[a-zA-Z]\(|\/[a-zA-Z][a-zA-Z]/.test(g) || /\/\([^()]*\)[a-zA-Z0-9(]/.test(g) || /(?<![a-zA-Z])[a-zA-Z]\d/.test(g); };  // last: a letter followed by a digit (x2) is neither 2x nor x^2
