# Mathematics content versions

The aim: upgrading lesson content never erases a learner's history.

## The rules

1. **Each program file has a version** (`version`, for example `1.0.0`).
   * Every activity record stores the version it was made with (`lessonVersion`).
   * The server accepts new records for the current version only (`backend/family/mathematics.py`).
2. **Records are never deleted or rewritten** when content changes. They stay in the learner's mathematics record
   exactly as they were saved.
3. **Question and step ids are never reused with a different meaning.** If a question changes meaning, it gets a new
   id; the old one is retired.
4. **Compatible versions replay.** A program may list earlier versions in `compatibleVersions`, and replay then reads
   records of those versions too (`packages/mathematics/src/unit.ts`). A version may be listed only if every id its
   records use still means the same thing.
5. **Incompatible versions are kept but not counted** in the new version's progress. They can still be read.

## Current programs

| Program | Version | Compatible with | Notes |
| --- | --- | --- | --- |
| `equivalent-fractions` | 2 | none | Unchanged. |
| `jee-quadratics` (the chapter) | 1.1.0 | none | The first step changed from "recap" (1.0.0) to "class" (8 lessons). The 1.0.0 records are kept in the database, but they are not counted in 1.1.0 progress, so a learner who used 1.0.0 starts 1.1.0 from the beginning. Later steps keep their ids, so a future version could list 1.0.0 as compatible for those steps if wanted. |
| `completing-the-square` (reference unit) | 1.1.0 | 1.0.0 | 1.1.0 adds help-branch questions and tags. No 1.0.0 question or step changed meaning, so 1.0.0 records replay. Item ids keep the 1.0.0 namespace (`math:completing-the-square:1.0.0:<question>`), so evidence from both versions refers to the same items. |

## Upgrading a program

1. Bump `version`.
2. Keep every unchanged question and step id. Give changed ones new ids.
3. If every old id still means the same, add the old version to `compatibleVersions`.
4. Add a test that replays records of the old version (see "history is never erased" in
   `frontend/src/mathematics/unit/unit.test.ts`).
