#!/usr/bin/env python3
"""Validate staged TN intake; optionally verify local PDFs, with zero model/API calls.

python tools/curriculum/validate_tn_primary.py
python tools/curriculum/validate_tn_primary.py --pdf-dir /tmp/openpath-tn-sources
PDF filenames: g1.pdf, g2.pdf, g3.pdf. PyMuPDF is only needed for --pdf-dir.
Nothing is downloaded, released, mapped or written by this command.
"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INTAKE = ROOT / 'content/learning/ingestion/tn-primary-2026-term1.json'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data):
    require(data['schema'] == 'textbook-intake@1' and data['status'] == 'draft', 'intake must remain draft')
    require(data['board'] == 'tn' and data['academicYear'] == '2026-27', 'wrong board/year')
    require(data['subject'] == 'Mathematics', 'wrong subject')
    require([b['grade'] for b in data['books']] == [1, 2, 3], 'expected grades 1–3 exactly once')
    ids, counts = set(), {}
    for book in data['books']:
        require(book['term'] == 1 and book['medium'] == 'English', 'out-of-scope term/medium')
        source = book['source']
        require(len(source['sha256']) == 64 and all(c in '0123456789abcdef' for c in source['sha256']), 'invalid source hash')
        require(source['bytes'] > 0 and source['pdfPages'] > 7, 'invalid source size')
        require(source['editionPdfPage'] == 2 and source['contentsPdfPage'] == 7, 'unexpected front matter')
        require(source['printedToPdfOffset'] == 7, 'unexpected page offset')
        cov = book['coverage']
        require(cov['status'] == 'partial' and cov['unknown'] and not cov['learnerReleaseUpdated'], 'unknown coverage must remain explicit')
        require(len(book['lessons']) == cov['contentsLessonsEnumerated'] == 8, 'contents inventory incomplete')
        counts[book['grade']] = 0
        previous_end = 0
        for n, lesson in enumerate(book['lessons'], 1):
            require(lesson['number'] == n and lesson['unit'] == (1 if n <= 4 else 2), 'incorrect lesson order/unit')
            a, z = lesson['printedPages']
            require(a == previous_end + 1 and z >= a, 'lesson page gap/overlap')
            require(lesson['pdfPages'] == [a + 7, z + 7], 'incorrect lesson PDF offset')
            require(z + 7 <= source['pdfPages'], 'lesson exceeds PDF')
            previous_end = z
            require(lesson['outcomes'], 'lesson must carry observed outcomes')
            for outcome in lesson['outcomes']:
                require(outcome['id'] not in ids, 'duplicate outcome ID')
                ids.add(outcome['id'])
                require(bool(outcome['statement'].strip()), 'empty outcome')
                require(outcome['mappingStatus'] == 'not-reviewed' and outcome['mapped'] == [], 'draft must not accept mappings')
                require(outcome['educatorReviewed'] is False, 'no educator approval exists')
                p = outcome['provenance']
                require(p['sourceId'] == book['id'], 'wrong source reference')
                x, y = p['printedPages']
                require(a <= x <= y <= z, 'outcome evidence outside lesson')
                require(p['pdfPages'] == [x + 7, y + 7], 'incorrect outcome PDF offset')
                require(p['basis'], 'missing evidence basis')
                counts[book['grade']] += 1
    return counts


def page_text(page):
    # These particular mirrors overlay hundreds of Helvetica watermark spans.
    # This is a source-specific reading aid, not a general-purpose PDF extractor.
    # flags=0 avoids decoding large embedded images. Never modify the source PDF.
    return '\n'.join(s['text'] for b in page.get_text('dict', flags=0)['blocks']
                     if 'lines' in b for line in b['lines'] for s in line['spans']
                     if s['font'] not in ('Helvetica', 'Helvetica-Bold'))


def verify_pdf(book, path):
    import fitz
    require(hashlib.sha256(path.read_bytes()).hexdigest() == book['source']['sha256'], f'{path.name}: source hash mismatch')
    require(path.stat().st_size == book['source']['bytes'], 'source size mismatch')
    with fitz.open(path) as doc:
        require(len(doc) == book['source']['pdfPages'], 'PDF page count mismatch')
        edition = page_text(doc[1])
        require('2026' in edition and 'First Edition' in edition and 'NOT FOR SALE' in edition, 'edition/rights mismatch')
        toc = ' '.join(page_text(doc[6]).split())
        for lesson in book['lessons']:
            require(lesson['title'] in toc, f"contents title missing: {lesson['title']}")
            for outcome in lesson['outcomes']:
                a, z = outcome['provenance']['printedPages']
                for printed in range(a, z + 1):
                    text = page_text(doc[printed + 6])
                    require(text.split()[0] == str(printed), f'printed/PDF page mismatch: {printed}')
    # This verifies source identity and locations, not the semantic accuracy of a paraphrase.


def release_counts():
    result = {}
    def count(chapter):
        return len(chapter['outcomes']) + sum(count(s) for s in chapter.get('sections', []))
    for grade in (1, 2, 3):
        p = ROOT / f'content/learning/curricula/tn-samacheer-mathematics-grade-{grade}.v1.0.0.json'
        r = json.loads(p.read_text())
        result[grade] = sum(count(c) for s in r['subjects'] for c in s['chapters'])
    return result


def structured_text(book):
    """Adapter to extractStructured; JSON remains the authoritative provenance record."""
    lines = ['---', f"title: {book['title']} [PARTIAL DRAFT]", f"grade: {book['grade']}",
             'subject: Mathematics', 'board: Tamil Nadu State Board',
             f"edition: {book['edition']}", f"publisher: {book['publisher']}",
             f"licence: {book['source']['rights']}", f"source: {book['source']['url']}",
             f"sha: {book['source']['sha256']}", 'coverage: partial; Terms II and III unknown',
             'status: draft; mappings not reviewed; no educator approval', '---']
    unit = None
    for lesson in book['lessons']:
        if lesson['unit'] != unit:
            unit = lesson['unit']
            lines.append(f"# Unit {unit}: Unit {unit}")
        a, z = lesson['printedPages']
        lines += [f"# Chapter {lesson['number']}: {lesson['title']} (pp. {a}-{z})", '## Learning outcomes']
        for outcome in lesson['outcomes']:
            a, z = outcome['provenance']['printedPages']
            lines.append(f"- {outcome['statement']} (pp. {a}-{z})")
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf-dir', type=Path)
    parser.add_argument('--structured-grade', type=int, choices=[1, 2, 3], help='Print a draft for the existing structured parser; JSON retains full provenance')
    args = parser.parse_args()
    data = json.loads(INTAKE.read_text())
    counts = validate(data)
    if args.pdf_dir:
        for book in data['books']:
            verify_pdf(book, args.pdf_dir / f"g{book['grade']}.pdf")
    if args.structured_grade:
        print(structured_text(data['books'][args.structured_grade - 1]), end='')
        return
    print(json.dumps({'draftOutcomes': counts, 'totalDraftOutcomes': sum(counts.values()),
                      'existingReleaseOutcomes': release_counts(), 'pdfVerified': bool(args.pdf_dir),
                      'annualCoverage': 'unknown', 'modelApiCalls': 0}, sort_keys=True))


if __name__ == '__main__':
    main()
