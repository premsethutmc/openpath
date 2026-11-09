#!/usr/bin/env python3
"""Validate staged TN intake; optionally verify local PDFs, with zero model/API calls.

python tools/curriculum/validate_tn_primary.py
python tools/curriculum/validate_tn_primary.py --pdf-dir /tmp/openpath-tn-sources
PDF filenames: g1.pdf, g2.pdf, g3.pdf. PyMuPDF is only needed for --pdf-dir.
Nothing is downloaded, released or mapped. OCR uses disposable temporary images.
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
import os
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
        term = book['term']
        require(term in (1, 2) and book['medium'] == 'English', 'out-of-scope term/medium')
        offset = 7 if term == 1 else 6
        lessons_per_unit = 4 if term == 1 else 3
        source = book['source']
        require(len(source['sha256']) == 64 and all(c in '0123456789abcdef' for c in source['sha256']), 'invalid source hash')
        require(source['bytes'] > 0 and source['pdfPages'] > 7, 'invalid source size')
        require(source['editionPdfPage'] == 2 and source['contentsPdfPage'] == offset, 'unexpected front matter')
        require(source['printedToPdfOffset'] == offset, 'unexpected page offset')
        cov = book['coverage']
        require(cov['status'] == 'partial' and cov['unknown'] and not cov['learnerReleaseUpdated'], 'unknown coverage must remain explicit')
        require(len(book['lessons']) == cov['contentsLessonsEnumerated'] == 2 * lessons_per_unit, 'contents inventory incomplete')
        counts[book['grade']] = 0
        previous_end = 0
        for n, lesson in enumerate(book['lessons'], 1):
            require(lesson['number'] == n and lesson['unit'] == (1 if n <= lessons_per_unit else 2), 'incorrect lesson order/unit')
            a, z = lesson['printedPages']
            require(a == previous_end + 1 and z >= a, 'lesson page gap/overlap')
            require(lesson['pdfPages'] == [a + offset, z + offset], 'incorrect lesson PDF offset')
            require(z + offset <= source['pdfPages'], 'lesson exceeds PDF')
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
                require(p['pdfPages'] == [x + offset, y + offset], 'incorrect outcome PDF offset')
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


def ocr_text(page, clip=None):
    with tempfile.TemporaryDirectory(prefix='tn-ocr-') as tmp:
        path = Path(tmp) / 'page.png'
        page.get_pixmap(dpi=300 if clip else 150, clip=clip).save(path)
        if clip:
            from PIL import Image
            Image.open(path).convert('L').point(lambda x: 0 if x < 100 else 255).save(path)
        return subprocess.check_output(['tesseract', str(path), 'stdout', '--psm', '3' if clip is None else '11'],
            text=True, stderr=subprocess.DEVNULL, env={**os.environ, 'OMP_THREAD_LIMIT': '1'})


def verify_pdf(book, path, allow_ocr=False):
    import fitz
    require(hashlib.sha256(path.read_bytes()).hexdigest() == book['source']['sha256'], f'{path.name}: source hash mismatch')
    require(path.stat().st_size == book['source']['bytes'], 'source size mismatch')
    offset = book['source']['printedToPdfOffset']
    with fitz.open(path) as doc:
        require(len(doc) == book['source']['pdfPages'], 'PDF page count mismatch')
        def read(index):
            text = page_text(doc[index])
            if len(text.strip()) < 30:
                require(allow_ocr, 'scanned page: rerun with --ocr (local Tesseract required)')
                return ocr_text(doc[index])
            return text
        edition = read(1)
        require('2026' in edition and 'First Edition' in edition and 'NOT FOR SALE' in edition, 'edition/rights mismatch')
        normal = lambda text: re.sub(r'[^a-z0-9]', '', text.lower())
        toc = normal(read(book['source']['contentsPdfPage'] - 1))
        evidence_pages = set()
        for lesson in book['lessons']:
            require(normal(lesson['title']) in toc, f"contents title missing: {lesson['title']}")
            for outcome in lesson['outcomes']:
                a, z = outcome['provenance']['printedPages']
                evidence_pages.update(range(a, z + 1))
        for printed in sorted(evidence_pages):
            page = doc[printed + offset - 1]
            text = page_text(page)
            if text.strip():
                require(text.split()[0] == str(printed), f'printed/PDF page mismatch: {printed}')
            else:
                require(allow_ocr, 'scanned evidence page requires --ocr')
                footer = ocr_text(page, fitz.Rect(page.rect.width * .35, page.rect.height * .92, page.rect.width * .65, page.rect.height))
                require(re.search(r'(?<!\d)' + str(printed) + r'(?!\d)', footer), f'OCR page number unresolved: {printed}; visual review needed')
    # Source identity and locations only; paraphrase semantics require source review.


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
             f"sha: {book['source']['sha256']}", 'coverage: partial; Term III unknown; no annual completeness',
             'status: draft; no accepted mappings; no educator approval', '---']
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
    parser.add_argument('--term', type=int, choices=[1, 2], default=1)
    parser.add_argument('--ocr', action='store_true', help='Use local Tesseract for scanned pages; no model calls')
    parser.add_argument('--structured-grade', type=int, choices=[1, 2, 3], help='Print a draft for the existing structured parser; JSON retains full provenance')
    args = parser.parse_args()
    data = json.loads(INTAKE.with_name(f'tn-primary-2026-term{args.term}.json').read_text())
    counts = validate(data)
    if args.pdf_dir:
        for book in data['books']:
            name = f"g{book['grade']}" + ('-t2' if args.term == 2 else '') + '.pdf'
            verify_pdf(book, args.pdf_dir / name, allow_ocr=args.ocr)
    if args.structured_grade:
        print(structured_text(data['books'][args.structured_grade - 1]), end='')
        return
    print(json.dumps({'draftOutcomes': counts, 'totalDraftOutcomes': sum(counts.values()),
                      'existingReleaseOutcomes': release_counts(), 'pdfVerified': bool(args.pdf_dir),
                      'annualCoverage': 'unknown', 'modelApiCalls': 0}, sort_keys=True))


if __name__ == '__main__':
    main()
