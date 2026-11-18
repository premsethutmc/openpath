// Candidate retrieval only: overlap never establishes correctness or category agreement.
export function requiredAnnotations(c) {
 return (c.annotations ?? []).filter(a => !a.optional && (c.kind === 'language' ? a.kind === 'error' : true));
}
export function overlapCandidates(text, quote, lints) {
 const i=text.indexOf(quote);
 // Ambiguous repeated reference quotes do not get automatic credit.
 if (!quote || i < 0 || text.indexOf(quote,i+1)>=0) return [];
 const start=Array.from(text.slice(0,i)).length;
 const end=start+Array.from(quote).length;
 return lints.filter(l=>l.start<end&&l.end>start);
}
