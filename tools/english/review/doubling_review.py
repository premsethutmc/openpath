"""
Builds the educator-review workbook for the consonant-doubling journey from the content files, so what the
reviewer sees is exactly what the app shows.

    python3 tools/english/review/doubling_review.py [out.xlsx]

Default output: docs/english/review/doubling-educator-review.xlsx. Then recalculate the summary formulas:
    python3 /mnt/skills/public/xlsx/scripts/recalc.py docs/english/review/doubling-educator-review.xlsx

Questions, lessons, hints and practice words are read from the content files; every quoted string on the
"Parent wording" sheet is checked against the source file named on its row, and the script stops if one has drifted. The review notes (ambiguity risks, overgeneralisation flags) are
the developer's, for the reviewer to accept or reject: nothing here is an educator's judgement.
"""
import json
import pathlib
import sys

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/english/review/doubling-educator-review.xlsx"
journey = json.loads((ROOT / "content/english/web/doubling-journey.json").read_text())
generated = {i["id"]: i for i in json.loads((ROOT / "content/english/spelling/generated-items.json").read_text())}
SOURCES = {p: (ROOT / p).read_text() for p in ["frontend/src/english/ui/Journey.tsx", "frontend/src/english/logic/journey.ts", "frontend/src/english/ui/App.tsx", "packages/english-core/src/planner.ts"]}
ITEMS = {i["id"]: i for i in journey["items"]}

FONT = "Arial"
F = Font(name=FONT, size=10)
FB = Font(name=FONT, size=10, bold=True)
FH = Font(name=FONT, size=10, bold=True, color="FFFFFF")
FT = Font(name=FONT, size=14, bold=True)
HEAD = PatternFill("solid", start_color="2F4F6F")
INPUT = PatternFill("solid", start_color="FFFF00")
FLAG = PatternFill("solid", start_color="FCE4D6")
EXAMPLE = PatternFill("solid", start_color="E7E6E6")
THIN = Side(style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")

REVIEW_COLS = ["Reviewer decision", "Required change (exact new wording if any)", "Reviewer initials", "Date reviewed"]
DECISIONS = '"Approve,Approve with changes,Reject,Needs discussion"'


def sheet(wb, title, headers, rows, widths, review=True, decision_list=DECISIONS, flag_col=None):
    ws = wb.create_sheet(title)
    cols = headers + (REVIEW_COLS if review else [])
    ws.append(cols)
    for c in range(1, len(cols) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font, cell.fill, cell.alignment, cell.border = FH, HEAD, WRAP, BOX
    for r in rows:
        ws.append(list(r) + ([""] * len(REVIEW_COLS) if review else []))
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.font, cell.alignment, cell.border = F, WRAP, BOX
            if review and cell.column > len(headers):
                cell.fill = INPUT
            if flag_col and cell.column == flag_col and cell.value:
                cell.fill = FLAG
    for i, w in enumerate(widths + ([16, 40, 12, 14] if review else []), start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "C2"
    if review and ws.max_row > 1:
        dv = DataValidation(type="list", formula1=decision_list, allow_blank=True)
        ws.add_data_validation(dv)
        col = get_column_letter(len(headers) + 1)
        dv.add(f"{col}2:{col}{ws.max_row}")
    return ws


wb = Workbook()

# ---------------------------------------------------------------- Guide
g = wb.active
g.title = "Guide"
guide = [
    ("OpenPath: educator review of the consonant-doubling journey", FT),
    ("", F),
    ("What this is", FB),
    ("Every question, lesson, hint, practice word, draft threshold and parent-facing sentence in the doubling journey, exactly as the app shows them. Nothing here has been reviewed by an educator yet. The notes in orange cells are the developer's concerns for you to accept or reject; they are not educational judgements.", F),
    ("", F),
    ("What your decisions change", FB),
    ("Approved questions can be switched from 'provisional' to 'validated' (a one-line change per question, recorded with your initials and date). Until then, answers to them never change a learner's levels and never support a mastery claim. Nothing is marked approved without a named reviewer and date in this workbook.", F),
    ("", F),
    ("How to fill it in", FB),
    ("1. Work through the sheets left to right. Only the yellow cells are for you.", F),
    ("2. Reviewer decision: choose Approve, Approve with changes, Reject or Needs discussion from the list.", F),
    ("3. Required change: if you want different wording, write the exact new wording. If you reject, say why in a few words.", F),
    ("4. Add your initials and the date on every row you decide. The 'Summary' sheet counts what is still undecided.", F),
    ("5. The 'Overgeneralisation' sheet lists statements we think are too broad. Please decide each one; lessons and hints cannot be approved while a flag on them is open.", F),
    ("", F),
    ("Example row (format only; not a real decision)", FB),
]
for i, (text, font) in enumerate(guide, start=1):
    c = g.cell(row=i, column=1, value=text)
    c.font, c.alignment = font, Alignment(wrap_text=True, vertical="top")
ex_row = len(guide) + 1
example = ["(example) spl.infl.18", "Approve with changes", "Change 'Dad is ___ the onions.' to 'Dad is ___ the carrots.' (onions is fine; carrots is more familiar to younger pupils)", "AB", "2026-10-20"]
for j, v in enumerate(example, start=1):
    c = g.cell(row=ex_row, column=j, value=v)
    c.font, c.fill, c.alignment, c.border = F, EXAMPLE, WRAP, BOX
legend = ex_row + 2
g.cell(row=legend, column=1, value="Legend").font = FB
for k, (fill, text) in enumerate([(INPUT, "Yellow: for the reviewer to fill in"), (FLAG, "Orange: a concern raised by the developer, for you to accept or reject"), (EXAMPLE, "Grey: example of the expected format only")], start=1):
    c = g.cell(row=legend + k, column=1, value=text)
    c.font, c.fill, c.border = F, fill, BOX
scope = legend + 5
for k, line in enumerate(
    [
        "Scope: one rule (doubling the final consonant before -ing, -ed, -er, -est), for learners aged about 7–11 using the app with an adult.",
        "Out of scope here: the rest of the 780-question bank, the other seven inflection rules, and the scoring model.",
        "Source of everything quoted: content/english/web/doubling-journey.json, content/english/spelling/generated-items.json, and the app's screen code (file named on each row of 'Parent wording').",
    ]
):
    c = g.cell(row=scope + k, column=1, value=line)
    c.font, c.alignment = F, Alignment(wrap_text=True, vertical="top")
g.column_dimensions["A"].width = 110
for col, w in zip("BCDE", [20, 60, 10, 12]):
    g.column_dimensions[col].width = w

# ---------------------------------------------------------------- Questions
order = journey["independent"]["assessOrder"]
Q_NOTES = {
    "spl.infl.j02": ("Copy of bank item spl.infl.02 for the journey. 'swim' is very familiar; easy start.", "Regional: none. A child may write 'swiming' (no doubling) or 'swimmming' (over-doubling, not tagged)."),
    "spl.infl.18": ("Common verb; cooking context.", "None expected. 'cutting' is not accepted because the root word is given."),
    "spl.infl.19": ("Past tense -ed, not only -ing.", "Some children write 'stopt' (phonetic) or 'stops' (wrong tense); both marked wrong, neither tagged as a doubling error."),
    "spl.infl.20": ("Comparative -er.", "None expected."),
    "spl.infl.21": ("Correction format: the child must find the wrong word and retype it.", "A child may retype the whole sentence; the app expects one word. Check the instruction is clear for the age group."),
    "spl.infl.22": ("Less familiar verb.", "'trim' may be unfamiliar to younger pupils; vocabulary, not spelling, could cause errors."),
    "spl.infl.j11": ("Copy of bank item spl.infl.11 for the journey.", "None expected."),
    "spl.infl.23": ("Superlative -est; monsoon context.", "Context suits learners in South Asia; check it suits your pupils. 'wetest' is the tagged error."),
    "spl.infl.24": ("Contrast: two final consonants (mp), so no doubling.", "Tests only clusters. It does not test w/x/y endings, unstressed syllables or vowel teams after teaching (see Overgeneralisation)."),
    "spl.infl.25": ("Contrast: vowel team (ai), so no doubling. Correction format.", "As 21: format may confuse."),
    "spl.infl.26": ("NEW contrast for the check after teaching: two final consonants (lt).", "None expected. 'melted' is a less common past tense for younger pupils."),
    "spl.infl.27": ("NEW contrast: vowel team (oo).", "None expected."),
    "spl.infl.28": ("NEW contrast: two final consonants (st); -est ending.", "None expected."),
    "spl.infl.29": ("NEW contrast: vowel team (ou).", "None expected."),
    "spl.infl.30": ("NEW contrast: vowel team (ea).", "'ea' has a short sound in some words (head, bread); here it is long. A child taught 'listen for the short vowel' may hesitate."),
    "spl.infl.31": ("NEW contrast: two final consonants (rk); -er ending.", "None expected."),
}
q_rows = []
for n, qid in enumerate(order, start=1):
    i = ITEMS[qid]
    contrast = i["family"].endswith(".contrast")
    use = "Diagnostic check, or the 'must not double' word in the reassessment after each lesson (unseen only)" if contrast else "Diagnostic check, reassessment after teaching, or the delayed check (whichever comes first, unseen only)"
    wrong = "; ".join(f"{w} → {t.replace('_', ' ')}" for w, t in i.get("wrong", {}).items())
    note, risk = Q_NOTES[qid]
    q_rows.append(
        [
            n,
            qid,
            i["prompt"],
            " / ".join(i["answers"]),
            wrong,
            "Double the final consonant of a one-syllable word ending in one vowel letter + one consonant letter, before a vowel suffix" if not contrast else "Do not double when the word ends in two consonants or has two vowel letters before the last consonant",
            "Contrast (must not double)" if contrast else "Application (must double)",
            use,
            note,
            risk,
            f"{i.get('evidence_status', 'candidate')} (review: {i['review']})",
            "No: answers are recorded but never change levels or support a mastery claim",
        ]
    )
qs = sheet(
    wb,
    "Questions",
    ["#", "ID", "Exact prompt (as shown)", "Accepted answer", "Tagged wrong answer → error type", "Rule tested", "Application or contrast", "Where the journey uses it", "Developer note", "Ambiguity risks (please check)", "Validation status now", "Counts towards levels now?", "Age / vocabulary suitable? (Y/N + note)"],
    q_rows,
    [4, 13, 46, 13, 24, 34, 16, 30, 30, 40, 22, 26, 22],
    flag_col=10,
)
for r in range(2, qs.max_row + 1):
    qs.cell(row=r, column=13).fill = INPUT

# ---------------------------------------------------------------- Lessons
L_META = {
    "worked_examples": (
        "Recognise when a one-syllable word needs its last consonant doubled before -ing, -ed, -er or -est, and when it does not.",
        "States a letter-pattern rule (one vowel + one consonant → double) with two doubling examples and one cluster contrast.",
        "Learner may apply the rule to any word ending vowel + consonant, including fix → 'fixxing', snow → 'snowwing', visit → 'visitted', open → 'openning', and to consonant suffixes (sad → 'saddly').",
    ),
    "sound_first": (
        "Use the short vowel sound in a one-syllable word to decide whether to double the last consonant.",
        "Links doubling to vowel length (short vowel: double; long vowel / split digraph: no double), contrasting hop/hope and tap/tape.",
        "Learner may double after any short vowel sound: head → 'headding', visit → 'visitting', panic → 'panicing/panicc', fix → 'fixxing'. Vowel length also varies by accent.",
    ),
    "word_building": (
        "Build the inflected word from root + optional extra consonant + ending, deciding first whether the extra letter is needed.",
        "Morphological: root | doubled letter (if one vowel + one consonant) | suffix, with a vowel-team and a cluster contrast.",
        "Same pattern rule as worked_examples, so the same overgeneralisation (w/x/y, unstressed final syllables, consonant suffixes).",
    ),
}
FOLLOW_UP = "The app's check: 3 unseen questions on the learner's own, no hints: a word that must double, a word that must NOT double, then another that must double. All must be right for the lesson to count as having worked, so a learner who now doubles everything does not pass."
l_rows = []
for s in journey["strategies"]:
    les = s["lesson"]
    obj, expl, mis = L_META[s["id"]]
    l_rows.append(
        [
            s["id"],
            s["name"],
            les["title"],
            obj,
            "\n".join(f"{k}. {t}" for k, t in enumerate(les["steps"], start=1)),
            "\n".join(f"{e['text']}" + (f"  ({e['note']})" if e.get("note") else "") for e in les["examples"]),
            les.get("tip", ""),
            expl,
            mis,
            FOLLOW_UP,
        ]
    )
sheet(
    wb,
    "Lessons",
    ["Strategy ID", "Name", "Lesson title", "Learning objective (developer's draft)", "Steps (exact)", "Examples (exact)", "Tip (exact)", "What the explanation claims", "Possible misconception it could create", "Independent follow-up check"],
    l_rows,
    [16, 22, 22, 34, 46, 40, 30, 34, 44, 40],
    flag_col=9,
)

# ---------------------------------------------------------------- Hints
WORKED = "REVISED: now a labelled worked example that shows the answer. The app records that the answer was shown; the answer typed after it is help, never independent, and the next word is new and tried once without a hint. Please check the wording."
H_FLAGS = {
    ("worked_examples", 3): WORKED,
    ("sound_first", 2): "States as a fact that a short vowel 'needs a guard'. True for these one-syllable words; overgeneralises beyond them.",
    ("sound_first", 3): WORKED + " This one no longer mentions the short vowel.",
    ("word_building", 3): WORKED,
    ("sound_first", 1): "Relies on hearing vowel length, which varies by accent and is hard for some children.",
}


def render(t, base="clap", ending="ing"):
    word = base + (base[-1] if not base.endswith(("e",)) else "") + ending
    shown = t.replace("{base}", base).replace("{last}", base[-1]).replace("{ending}", ending).replace("{word}", word)
    # the app shows the worked example under a bold label
    return shown.replace("Worked example (this shows the answer): ", "[Worked example: this shows the answer.] ")


h_rows = []
for s in journey["strategies"]:
    for lvl, t in enumerate(s["hints"], start=1):
        h_rows.append([s["id"], lvl, t, render(t), render(t, "skip", "ed"), H_FLAGS.get((s["id"], lvl), "")])
sheet(wb, "Hints", ["Strategy", "Level", "Template (exact)", "As shown for clap + -ing", "As shown for skip + -ed", "Developer concern"], h_rows, [16, 7, 52, 44, 44, 44], flag_col=6)

# ---------------------------------------------------------------- Practice words
p_rows = []
for gid in journey["guided"]:
    i = generated[gid]
    gen = i["generated"]
    note = []
    if not i.get("wrong"):
        note.append(f"No tagged wrong answer: the undoubled form is a real word ({gen['base']}e + ing), so a wrong answer is not labelled as a doubling error.")
    p_rows.append([n := len(p_rows) + 1, gid, gen["base"], gen["join"], i["prompt"], i["answers"][0], "; ".join(f"{w} → {t.replace('_', ' ')}" for w, t in i.get("wrong", {}).items()), i["explain"], " ".join(note)])
sheet(
    wb,
    "Practice words",
    ["#", "ID", "Root", "Ending", "Prompt (exact)", "Answer", "Tagged wrong answer", "Explanation stored with the item (not shown in the journey)", "Developer concern"],
    p_rows,
    [4, 30, 8, 8, 36, 12, 18, 52, 44],
    flag_col=9,
)
pw = wb["Practice words"]
r = pw.max_row + 2
pw.cell(row=r, column=2, value="Concern for the whole set").font = FB
c = pw.cell(row=r + 1, column=2, value="All 12 practice words double. Guided practice never shows a word that must not double, so practice may reinforce 'always double'. Please say whether contrast words should be added before testing with children.")
c.font, c.fill, c.alignment = F, FLAG, WRAP
pw.merge_cells(start_row=r + 1, start_column=2, end_row=r + 1, end_column=8)
pw.row_dimensions[r + 1].height = 30

# ---------------------------------------------------------------- Thresholds
T = [
    ("planner-policy@0-draft", "diagnosticMax", 5, "At most 5 questions on their own before teaching (fewer once the same error is seen twice or the rule looks weak)."),
    ("planner-policy@0-draft", "guidedItems", 4, "4 practice words with help in each teaching block."),
    ("planner-policy@0-draft", "hintLevels", 3, "Up to 3 hints per practice word."),
    ("planner-policy@0-draft", "reassessItems", 2, "2 unseen words on their own after each lesson."),
    ("planner-policy@0-draft", "reassessPassMin", 2, "Both must be right for the lesson to count as having worked."),
    ("planner-policy@0-draft", "maxStrategiesBeforeHuman", 3, "After 3 different lessons have not worked, stop and recommend a teacher or parent."),
    ("planner-policy@0-draft", "retentionGapDays", 7, "The delayed check is offered from 7 days after the last answer."),
    ("planner-policy@0-draft", "retentionItems", 2, "2 unseen words in the delayed check."),
    ("rule-evidence-policy@0-draft", "demonstratedMinApplications", 4, "'Shown on new words' needs at least 4 'must double' answers on their own (smallest passing records: 4/4, 5/5, 5/6, 6/7, 7/8)."),
    ("rule-evidence-policy@0-draft", "demonstratedMinContrastCorrect", 1, "...and at least 1 'must not double' answer right."),
    ("rule-evidence-policy@0-draft", "window", 8, "Only the most recent 8 answers are considered."),
    ("rule-evidence-policy@0-draft", "weakRate / weakProbability", "0.5 / 0.8", "'Not yet' when it is at least 80% likely that fewer than half would be right."),
    ("rule-evidence-policy@0-draft", "activeMinErrors", 2, "The same error type on 2 different words, on their own, is reported as a pattern."),
    ("rule-evidence-policy@0-draft", "delayedGapDays / delayedMinApplications", "7 / 2", "The delayed check needs 2 answers at least 7 days after the previous evidence, with no practice earlier in that session."),
    ("app", "JOURNEY_IDLE_MS", "6 hours", "A journey left open for 6 hours is closed when next opened."),
]
t_rows = [[a, b, v, d] for a, b, v, d in T]
ts = sheet(wb, "Thresholds", ["Policy", "Setting", "Draft value", "What it means for a child", "Suggested value (if different)"], t_rows, [26, 30, 12, 70, 16], decision_list='"Keep,Change,Needs pilot data"')
for rr in range(2, ts.max_row + 1):
    ts.cell(row=rr, column=5).fill = INPUT
note_r = ts.max_row + 2
c = ts.cell(row=note_r, column=1, value="These values are drafts. This review records opinions on them; changing any of them is a separate decision and is not part of this pilot preparation.")
c.font = Font(name=FONT, size=10, italic=True)

# ---------------------------------------------------------------- Parent and child wording
J, JT, A, P = "frontend/src/english/ui/Journey.tsx", "frontend/src/english/logic/journey.ts", "frontend/src/english/ui/App.tsx", "packages/english-core/src/planner.ts"
W = [
    ("Child", "Today card", "hop → hopping, stop → stopped. A few questions on your own, then teaching that changes if it is not working, then new words on your own.", A, ""),
    ("Child", "Today card", "Demonstration content: the questions, lessons and hints are provisional and not yet reviewed by an educator. They do not change your levels.", A, ""),
    ("Child", "Question label", "On your own: no hints", J, ""),
    ("Child", "Question label", "New word, on your own: no hints", J, ""),
    ("Child", "Question label", "A week later: has it stuck? No hints", J, "Shown at 7 or 30 days alike."),
    ("Child", "Lesson heading", "Let's try a different way", J, ""),
    ("Child", "Lesson: why this", "Not yet right on new words: teaching the rule.", P, "Also shown when the child made no rule error but the 5-question check ended before enough answers (see Pilot readiness, finding P-1)."),
    ("Child", "Lesson: why this", "The same mistake appeared on different words: teaching the rule.", P, ""),
    ("Child", "Lesson: why this", "Shown before, but not remembered after a delay. A short refresher with the approach that helped before.", P, ""),
    ("Child", "Practice label", "Practice with help: this does not count as doing it on your own", J, ""),
    ("Child", "Feedback", "Not yet. A hint might help.", J, ""),
    ("Child", "Feedback", "Not yet. A worked example can show you how.", J, "NEW: before the third hint."),
    ("Child", "Hint button", "Show a worked example", J, "NEW: the third hint button."),
    ("Child", "Worked example label", "Worked example: this shows the answer.", J, "NEW."),
    ("Child", "Feedback", "Right, after seeing the worked example. Next, a new word.", J, "NEW."),
    ("Child", "Practice label", "A new word: try it yourself first.", J, "NEW: the word after a worked example; no hint until one try."),
    ("Child", "Lesson: why this", "Doubled a letter where it should not be doubled: teaching when to double, and when not to.", P, "NEW: for a learner whose only errors are doubling where it should not."),
    ("Child", "Summary", "You doubled the letter correctly on new words, on your own. We'll check again in about a week to see if it has stuck.", J, ""),
    ("Child", "Summary", "After the lesson you got new words right on your own. That's real progress. A few more, and a check in a week, will show it is secure.", J, ""),
    ("Child", "Summary", "This one is tricky, and that's fine. We've tried three different ways; next, it's best to work on it with a grown-up. You can carry on with other practice.", J, "Check tone: encouraging, not discouraging?"),
    ("Child", "Summary", "A week later, you still remembered it. Well done.", J, ""),
    ("Parent", "Skill", "Doubling the last consonant before an ending (hop → hopping, stop → stopped, big → bigger)", JT, "'before an ending' is too broad: only endings that start with a vowel (sad → sadly does not double)."),
    ("Parent", "Where things stand", "Not enough answers yet to say.", JT, ""),
    ("Parent", "Where things stand", "Mixed results so far: right and wrong in different ways.", JT, ""),
    ("Parent", "Where things stand", "Not yet doing this without help.", JT, ""),
    ("Parent", "Where things stand", "Getting there: some right on new words without help, not yet consistently.", JT, ""),
    ("Parent", "Where things stand", "Shown without help on new words today. Not yet checked after a delay.", JT, ""),
    ("Parent", "Where things stand", "Shown without help, and still right after at least a week.", JT, "Always followed by the provisional note below while content is provisional."),
    ("Parent", "Where things stand", " (on provisional questions: a demonstration, not a verified result)", JT, ""),
    ("Parent", "Where things stand", "Right with help in practice, not yet without help.", JT, ""),
    ("Parent", "Where things stand", "First shown on {date}; not remembered at the check after a week. Needs refreshing.", JT, ""),
    ("Parent", "Difficulty: pattern", "Pattern in answers given without help: {error} ({n} times, on different words).", JT, ""),
    ("Parent", "Difficulty: on their own", 'Wrote "{typed}" for "{answer}", on their own (no hint, first try).', JT, "Also used for answers at the delayed check; it does not say which answers were at the check."),
    ("Parent", "Difficulty: slip", 'Wrote "{typed}" for "{answer}": letters swapped, the rule itself was applied.', JT, ""),
    ("Parent", "Difficulty: with help", 'With help (practice): wrote "{typed}" for "{answer}", then {right after N hints | right at a later try | not right, even with help}.', JT, ""),
    ("Parent", "Difficulty: unknown", 'Wrote "{typed}" for "{answer}" (recorded before help was tracked: whether help was given is unknown).', JT, ""),
    ("Parent", "Help received", "{n} lesson(s) ({names}). Practice with help: {a} right at the first try, {b} right after a hint or second try, {h} hints used.", J, ""),
    ("Parent", "Help received", ", of which {w} were worked examples showing the answer", J, "NEW: appended when a worked example was shown."),
    ("Parent", "Difficulty: with help", "right only after a worked example showed the answer", JT, "NEW: end of a 'with help' line."),
    ("Parent", "Difficulty: with help", "not right, even after a worked example showed the answer", JT, "NEW."),
    ("Parent", "Where things stand", "Doubles correctly where it is needed, but also doubles where it should not. Not yet shown without help.", JT, "NEW: over-doubling."),
    ("Parent", "Where things stand", "Right on new words without help after teaching, including a word that must not double. Progress, not yet mastery: more answers and a check after a week are needed.", JT, "REVISED: now says a 'must not double' word was included."),
    ("Parent", "Question gap", "The check after the last lesson could not be finished: no unused {'must not double'} question is left. This is a gap in the app's questions, not a result about the learner; more reviewed questions are needed.", JT, "NEW."),
    ("Parent", "Help received", "None: every answer so far was given without help.", J, ""),
    ("Parent", "After teaching", 'After "{strategy}": {right} of {total} new words right without help, and {c} of {ct} words that must not double.{ Check not finished.}', J, "REVISED: now includes the 'must not double' word."),
    ("Parent", "After teaching", 'After "{strategy}": not checked yet.', J, "NEW."),
    ("Parent", "Remembered later", "Not yet: it first needs to be shown securely on its own, then checked again after a week.", J, ""),
    ("Parent", "Remembered later", "Pending: not yet checked after a delay.", J, ""),
    ("Parent", "Remembered later", "Confirmed: still right after at least a week.", J, ""),
    ("Parent", "Remembered later", "Not kept: wrong at the check after a week. Earlier progress is still recorded.", J, ""),
    ("Parent", "Recommended", "{n} different approaches have not yet worked. We recommend a teacher or parent works on this with them; the app has paused this rule rather than repeating it.", JT, ""),
    ("Parent", "Footer", "The questions, lessons and hints in this journey are provisional: not yet reviewed by an educator. This is a record of what happened, not a mastery certificate.", JT, ""),
]
w_rows = []
# rows whose text the app assembles from parts: the fragment that must appear literally in the source
PROBES = {", of which {w} were worked examples showing the answer": "were worked examples\"} showing the answer"}
for who, where, text, src, flag in W:
    probe = text
    probe = probe.split('"{')[0] if '"{' in probe else probe
    for piece in ([PROBES[text]] if text in PROBES else [p for p in probe.replace("{", "|").replace("}", "|").split("|") if len(p.strip()) > 12][:1] or [probe]):
        if piece.strip() not in SOURCES[src] and piece.strip().replace("'", "\\'") not in SOURCES[src]:
            sys.exit(f"wording drifted: {piece.strip()!r} not found in {src}")
    w_rows.append([who, where, text, src, flag])
sheet(wb, "Parent wording", ["Reader", "Where", "Exact text ({…} = filled in by the app)", "Source file", "Developer concern"], w_rows, [9, 22, 70, 34, 44], flag_col=5)

# ---------------------------------------------------------------- Overgeneralisation flags
O = [
    ("OG-1", "Lessons: worked_examples step 2; word_building step 2; hints worked_examples 1–2, word_building 1",
     "One vowel, then one consonant? Double the consonant before -ing, -ed, -er or -est.",
     "Words ending in w, x or y never double: fix → fixing, snow → snowing, play → playing.",
     "Add: 'Never double w, x or y.'"),
    ("OG-2", "Same as OG-1",
     "One vowel, then one consonant? Double…",
     "In longer words doubling depends on stress: begin → beginning, forget → forgetting, but visit → visited, open → opening, garden → gardening. (UK travel → travelled, US traveled.)",
     "Limit the rule explicitly to one-syllable words: 'In a short word with one syllable…'; teach longer words separately later."),
    ("OG-3", "Lesson sound_first step 3, tip; hint sound_first 2",
     "A short vowel before one consonant needs a double letter to stay short.",
     "A short vowel sound is not enough on its own: head → heading, bread, visit → visiting, panic → panicking (c → ck), fix → fixing (x is two sounds). Vowel length also varies by accent.",
     "Present the short vowel as a reason the pattern exists, not as the test: keep the letter test (one vowel letter + one consonant letter, one syllable) as the rule."),
    ("OG-4", "Lesson worked_examples step 3",
     "Two consonants at the end, or two vowels before the last letter? Just add the ending.",
     "'qu' counts as a consonant sound: quit → quitting, quiz → quizzes, squat → squatting double although two vowel letters come before the last letter.",
     "Accept as a known exception not taught at this level, or add a note for teachers only."),
    ("OG-5", "Parent skill line; lesson steps list the endings but the skill line does not",
     "Doubling the last consonant before an ending",
     "Only endings that start with a vowel: sad → sadly, ship → shipment, wet → wetness do not double.",
     "'…before an ending that starts with a vowel (-ing, -ed, -er, -est)'."),
    ("OG-6", "Hints, level 3 (all three strategies)",
     "Worked example (this shows the answer): … = {word}.",
     "ADDRESSED (pending your review): level 3 is now a labelled worked example. The app records that the answer was shown, reports it to the parent as such, never counts what follows as independent, and makes the next word a new one tried without a hint first.",
     "Check the new wording on the Hints sheet."),
    ("OG-7", "Journey design: practice words and the check after teaching",
     "All 12 practice words double. The check after teaching now includes a 'must not double' word (new contrasts spl.infl.26–31).",
     "PARTLY ADDRESSED (pending your review): a child who learns 'always double' no longer passes the check after teaching. Practice itself still contains only doubling words.",
     "Decide whether practice also needs 'must not double' words (content change, needs approval)."),
    ("OG-8", "Question rationale texts (internal, not shown to children): spl.infl.18 'One short vowel, one final consonant: double before -ing.'",
     "One short vowel, one final consonant: double…",
     "Same as OG-1 to OG-3; internal only.",
     "Align with whatever wording is approved for the lessons."),
]
sheet(wb, "Overgeneralisation", ["Flag", "Where it appears", "Statement (exact or abridged)", "Why it is too broad (counterexamples)", "Possible fix (developer suggestion, not applied)"], O, [7, 34, 40, 60, 46], flag_col=4)
for rr in range(2, 2 + len(O)):
    wb["Overgeneralisation"].cell(row=rr, column=4).fill = FLAG

# ---------------------------------------------------------------- Summary (formulas)
sm = wb.create_sheet("Summary", 1)
sm.append(["Sheet", "Rows to review", "Decided", "Approved (incl. with changes)", "Rejected", "Still undecided"])
for c in range(1, 7):
    cell = sm.cell(row=1, column=c)
    cell.font, cell.fill, cell.alignment, cell.border = FH, HEAD, WRAP, BOX
targets = [("Questions", 14), ("Lessons", 11), ("Hints", 7), ("Practice words", 10), ("Thresholds", 5 + 1), ("Parent wording", 6), ("Overgeneralisation", 6)]
for k, (name, col_idx) in enumerate(targets, start=2):
    ws = wb[name]
    n = {"Practice words": len(p_rows), "Thresholds": len(t_rows)}.get(name, ws.max_row - 1)
    col = get_column_letter(col_idx)
    rng = f"'{name}'!${col}$2:${col}${n + 1}"
    sm.cell(row=k, column=1, value=name)
    sm.cell(row=k, column=2, value=n)
    sm.cell(row=k, column=3, value=f"=COUNTA({rng})")
    if name == "Thresholds":
        sm.cell(row=k, column=4, value=f'=COUNTIF({rng},"Keep")')
        sm.cell(row=k, column=5, value=f'=COUNTIF({rng},"Change")')
    else:
        sm.cell(row=k, column=4, value=f'=COUNTIF({rng},"Approve")+COUNTIF({rng},"Approve with changes")')
        sm.cell(row=k, column=5, value=f'=COUNTIF({rng},"Reject")')
    sm.cell(row=k, column=6, value=f"=B{k}-C{k}")
last = len(targets) + 1
tot = last + 1
sm.cell(row=tot, column=1, value="Total")
for c in range(2, 7):
    col = get_column_letter(c)
    sm.cell(row=tot, column=c, value=f"=SUM({col}2:{col}{last})")
for row in sm.iter_rows(min_row=2, max_row=tot):
    for cell in row:
        cell.font, cell.border = (FB if cell.row == tot else F), BOX
sm.cell(row=2, column=2).comment = Comment("Row counts are taken from the content files when the workbook is built.", "OpenPath")
gate = tot + 2
sm.cell(row=gate, column=1, value="Questions approved and ready to switch to 'validated'").font = FB
sm.cell(row=gate, column=4, value=f"=COUNTIF(Questions!$N$2:$N${len(q_rows) + 1},\"Approve\")+COUNTIF(Questions!$N$2:$N${len(q_rows) + 1},\"Approve with changes\")")
sm.cell(row=gate + 1, column=1, value="Overgeneralisation flags still open").font = FB
sm.cell(row=gate + 1, column=4, value=f"=F{2 + [t[0] for t in targets].index('Overgeneralisation')}")
sm.cell(row=gate + 3, column=1, value="Questions marked 'Approve with changes' are switched only after the change is made and re-checked.").font = Font(name=FONT, size=10, italic=True)
for col, w in zip("ABCDEF", [52, 14, 10, 26, 10, 16]):
    sm.column_dimensions[col].width = w

OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print(f"wrote {OUT} ({len(q_rows)} questions, {len(l_rows)} lessons, {len(h_rows)} hints, {len(p_rows)} practice words, {len(t_rows)} thresholds, {len(w_rows)} wording lines, {len(O)} flags)")
