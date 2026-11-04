# Interactive Mathematics preview

Preview Mode is a read-only view over the existing Mathematics curriculum and learner components. It does not need an account and never creates diagnostic, attempt, teaching, progress or mastery records.

## Open it

After building and starting the existing frontend, open:

```text
/curriculum/?preview=1#b=cbse&g=7
```

Direct local example: `http://127.0.0.1:4174/curriculum/?preview=1#b=cbse&g=7`.

An enrolled learner also sees **Preview Mathematics experience** on My Learning Year. That link opens the same read-only route for the learner's selected board and grade.

## Navigate

1. Choose **CBSE / NCERT** or **Tamil Nadu**, then Grade **7** or **10**. Other existing grades remain browsable because this is the universal curriculum interface.
2. Open a chapter, nested topic and competency.
3. Use the state controls: **Overview**, **Teaching**, **Example**, **Question**, **Mistake**, **Correct** and **Complete**.
4. Type into a representative question if useful. Nothing is submitted. Use **Preview mistake** or **Preview correct** to inspect feedback without answering.
5. Use **Back** to return to the containing syllabus level and **Home** to return to the current board and grade. **Preview home** returns to CBSE Grade 7.

The preview reuses the repository's curriculum releases, teaching screens, worked examples, question renderer, figures and keyboard answer inputs. It does not create a separate lesson or question engine. Preview state lives only in React; answer fields have no submit path and the preview has no API mutation calls.

Unsupported content remains unsupported. The preview selects representative competencies that already have modules and question families, and it preserves existing provisional/source-verification labels.

## Verification

The browser acceptance test covers both boards at Grades 7 and 10, at 360px and 393px widths. It traverses all seven experience states, exercises Back and Home, types into a question without submission, checks for horizontal overflow, and asserts that no non-GET API request occurs.

```sh
cd frontend
npm run typecheck
node --import tsx --test src/learning/dashboard.test.ts src/learning/engine.test.ts
PREVIEW_URL=http://127.0.0.1:4174 \
  CHROMIUM_PATH=/usr/bin/chromium \
  node --test e2e/interactive-preview.test.mjs
```

The committed screenshots show the actual browser output at both target widths. Browser tests simulate Android-sized Chromium viewports; physical Android hardware was not used.
