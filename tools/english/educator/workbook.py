"""Educator review workbook (Excel / Google Sheets) from the consolidated records, and back to a decisions CSV.

    python3 tools/english/educator/workbook.py build            write docs/product/essay-learning/educator-review-v1/review-workbook.xlsx
    python3 tools/english/educator/workbook.py extract <in.xlsx> <out.csv>
                                                                 a filled workbook -> the decisions CSV that
                                                                 tools/english/educator/review.ts reads

Each reviewer works in their own copy (independent review). Sheets: Instructions, Questions, Lessons, Competencies,
Lists. The content columns are locked in meaning (do not edit them); the reviewer columns have drop-down lists for the
decision and issues. Nothing here changes content or approves anything in the app.
"""
import csv
import json
import sys
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

REPO = Path(__file__).resolve().parents[3]
PKG = REPO / "docs" / "product" / "essay-learning" / "educator-review-v1"
DECISIONS = ["approve", "revise", "reject", "unable_to_determine"]
ISSUES = ["incorrect answer", "ambiguous", "wrong difficulty", "wrong skill", "not age-appropriate", "duplicate", "cultural or context", "other"]
REVIEW_COLS = ["reviewer_id", "decision", "reason", "suggested_correction", "issues", "date"]

SHEETS = {
    "Questions": ("question", ["id", "version", "set", "competency_name", "response_type", "format", "question", "passage", "options", "expected_answer", "explanation", "misconceptions", "difficulty_b", "difficulty_justification", "intended_role", "evidence_status", "competency", "fingerprint"]),
    "Lessons": ("lesson", ["id", "version", "competency_name", "title", "rule", "examples", "tip", "check_question", "check_options", "check_answer", "check_explanation", "evidence_status", "competency", "fingerprint"]),
    "Competencies": ("competency", ["id", "version", "name", "area", "specified", "band_descriptors", "band5_descriptor", "prerequisites", "curriculum_mappings", "target_band", "target_status", "review_question", "fingerprint"]),
}

INSTRUCTIONS = [
    "OpenPath Grade 8 English: educator review workbook (educator-review@1)",
    "",
    "Work in your own copy; do not look at another reviewer's decisions until you have finished (independent review).",
    "For each row, fill the yellow columns: reviewer_id (your initials or code, never a child's name), decision, reason, suggested_correction, issues, date.",
    "decision: approve | revise | reject | unable_to_determine. A reason is required for revise, reject and unable_to_determine; revise also needs a suggested correction.",
    "issues (optional, separate with ;): " + "; ".join(ISSUES),
    "",
    "Questions: is the expected answer correct and the only defensible one? Does it test the named competency? Is the difficulty (band b) right for its role? Is it suitable for 12-14-year-olds in India?",
    "Recognition questions (choose, order, match) and constructed questions (typed) are marked in response_type.",
    "Lessons: is the rule correct and clear, are the examples correct, does the check question have one right answer?",
    "Competencies: are the descriptors, prerequisites and curriculum mappings right? Is band 5 the right Grade 8 expectation? (The framework has no band-5 descriptor; every target is provisional.)",
    "",
    "Disagreements between reviewers are resolved by an adjudicator (tools/english/educator/review.ts reconcile). Approved decisions are NOT applied automatically: a separate content-release change applies them.",
    "Do not edit the white content columns or the fingerprint: if content looks wrong, say so in reason and suggested_correction.",
]


def build():
    data = json.loads((PKG / "records.json").read_text(encoding="utf-8"))
    wb = Workbook()
    ws = wb.active
    ws.title = "Instructions"
    for k, line in enumerate(INSTRUCTIONS, 1):
        ws.cell(row=k, column=1, value=line).alignment = Alignment(wrap_text=True)
    ws["A1"].font = Font(bold=True, size=14)
    ws.column_dimensions["A"].width = 140
    lists = wb.create_sheet("Lists")
    for k, d in enumerate(DECISIONS, 1):
        lists.cell(row=k, column=1, value=d)
    for k, d in enumerate(ISSUES, 1):
        lists.cell(row=k, column=2, value=d)
    yellow = PatternFill("solid", fgColor="FFF4C2")
    for title, (kind, cols) in SHEETS.items():
        rows = [r for r in data["records"] if r["kind"] == kind]
        sh = wb.create_sheet(title, index=len(wb.sheetnames) - 1)
        header = cols + REVIEW_COLS
        for c, h in enumerate(header, 1):
            cell = sh.cell(row=1, column=c, value=h)
            cell.font = Font(bold=True)
            if h in REVIEW_COLS:
                cell.fill = yellow
        for r_i, r in enumerate(rows, 2):
            for c, h in enumerate(cols, 1):
                sh.cell(row=r_i, column=c, value=r.get(h, "")).alignment = Alignment(wrap_text=True, vertical="top")
            for c in range(len(cols) + 1, len(header) + 1):
                sh.cell(row=r_i, column=c).fill = yellow
        dcol = header.index("decision") + 1
        letter = sh.cell(row=1, column=dcol).column_letter
        dv = DataValidation(type="list", formula1=f"=Lists!$A$1:$A${len(DECISIONS)}", allow_blank=True, showErrorMessage=True, error="Choose approve, revise, reject or unable_to_determine")
        sh.add_data_validation(dv)
        dv.add(f"{letter}2:{letter}{len(rows) + 1}")
        for c, h in enumerate(header, 1):
            sh.column_dimensions[sh.cell(row=1, column=c).column_letter].width = 60 if h in ("question", "options", "explanation", "difficulty_justification", "band_descriptors", "curriculum_mappings", "rule", "examples", "passage") else 18
        sh.freeze_panes = "B2"
    wb.properties.creator = "OpenPath"
    out = PKG / "review-workbook.xlsx"
    wb.save(out)
    print(f"wrote {out.relative_to(REPO)}")


def extract(src, dst):
    wb = load_workbook(src, read_only=True)
    out = [["record_kind", "record_id", "version", "fingerprint", "reviewer_id", "decision", "reason", "suggested_correction", "issues", "date"]]
    for title, (kind, cols) in SHEETS.items():
        sh = wb[title]
        rows = list(sh.iter_rows(values_only=True))
        h = [str(x) for x in rows[0]]
        for r in rows[1:]:
            g = lambda n: "" if r[h.index(n)] is None else str(r[h.index(n)]).strip()
            if not g("decision"):
                continue
            out.append([kind, g("id"), g("version"), g("fingerprint"), g("reviewer_id"), g("decision"), g("reason"), g("suggested_correction"), g("issues"), g("date")])
    with open(dst, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(out)
    print(f"wrote {dst}: {len(out) - 1} decisions")


if __name__ == "__main__":
    if sys.argv[1:2] == ["build"]:
        build()
    elif sys.argv[1:2] == ["extract"] and len(sys.argv) == 4:
        extract(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
        sys.exit(2)
