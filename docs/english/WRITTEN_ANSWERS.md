# Write an answer, and "This looks wrong?" (21 November 2026)

## Write an answer (written-answers v1)
The learner reads a short passage from the Reading course and types the answer to a question on it, as in a school
test. 24 questions, four at each of the six reading levels, starting at the learner's own level. The answer is checked
by rule, with no AI: it must hold a word from every key group of the question (simple endings, numbers in figures and a
one-letter slip in longer words are allowed). After a miss: a hint and a second try; then the model answer. A right
answer of one or two words is accepted with a nudge to answer in a full sentence. What the learner types is never
stored, only whether it was right and on which try. Closes Class 2 RW6 ("writes answers to questions on a passage").
Limits: a rule check cannot see a key word used to say the opposite ("not red"); the model answer and hint guide the
learner back.

## "This looks wrong?"
Under the answer in Grammar, Words, Reading, Long reads, Listen and write, Listen and answer and Write an answer, one
tap reports the question with one of three reasons (marked wrong when right, confusing, something else). No typing.
The report is a `flag` event (`<activity>:<question id>`) and the owner's usage summary at each server start lists the
questions reported, with counts and reasons, so wrong content can be found and fixed.

## Guards against trick answers (21 November 2026)

Key-word marking alone accepted "It was not red", "red or green" and a pasted paragraph. Now: a key word within three
words after "not", "no", "never" or a "n't" word does not count; an item may list wrong-answer words (`avoid`: a wrong
colour, the wrong cause) that make an answer wrong unless denied ("red, not green" is right); "or" between choices is
a guess; an answer longer than twice the model plus six words is sent back to be said in one sentence. Each gives its
own feedback. Test WA-4 builds trick answers for every item (the model with its key words denied, the model "or
something else", the whole passage, each wrong-answer word): the old marking accepted 86 of 86, the new accepts none,
and every model answer is still right.
