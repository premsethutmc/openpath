# Mathematics notebook — design approval draft

**Revision 2 — refreshed colour and feel. Design artifacts only; implementation remains paused.**

The first beige/violet direction was rejected. This revision uses bright white paper, a pale sage surround, deep green ink, restrained teal controls and warm peach for a mistake. Faint writing guides follow only the revealed calculation rows. The side-by-side review now opens with working in progress so the notebook character is visible. The original initial-state screens remain included. The rejected draft remains available in Git history.

Branch: `design/mathematics-notebook-v1`

Based on the functioning mistake-recovery branch, commit `39d0006140e223805f2f802db4d3d3ca2625e0ca`.

## Review the three states

| Complete screen | 360 × 800 CSS px | 393 × 852 CSS px |
| --- | --- | --- |
| Working: first quotient is ready for entry | [PNG](working-360.png) · [SVG](working-360.svg) | [PNG](working-393.png) · [SVG](working-393.svg) |
| Mistake: second quotient entered as 3; previous work retained | [PNG](mistake-360.png) · [SVG](mistake-360.svg) | [PNG](mistake-393.png) · [SVG](mistake-393.svg) |
| Completed: 126 remainder 1 | [PNG](completed-360.png) · [SVG](completed-360.svg) | [PNG](completed-393.png) · [SVG](completed-393.svg) |

Side-by-side reviews (working in progress, mistake and completed): [360 px](review-360.png) · [393 px](review-393.png).
Supplementary working state after entering `1, 3, 0`: [360 px](working-in-progress-360.png) · [393 px](working-in-progress-393.png).

These are authored mockups, rasterized in Chromium, **not implemented application screenshots**. The grey numeric keyboard is an illustrative operating-system area, not a proposed custom keypad or a physical-device capture. Actual Android keyboard appearance and height vary. PNGs are rendered at 2× pixel density; sizes above describe CSS viewports.

## Visual specification

One bright notebook with a soft sage surround, one coordinate system, three states. Header, question origin and mathematical columns stay fixed as working expands. No gradient, shadow, nested card stack, learner-name banner or technical evidence labels.

| Element | Specification |
| --- | --- |
| Page / paper | `#F2F7F3` / `#FFFFFF`; subtle `#DCE9E2` separators and `#F0F5F2` writing guides; no shadows |
| Main text / supporting text | `#193D39` / `#536B65` |
| Accent / active fill | Deep teal `#146B5D` / pale mint `#E8F5ED` |
| Incorrect cell | Amber outline/text `#925532`, very light `#FFF1E6` fill; contextual words also identify the state |
| Completion | Teal `#146B5D`, tiny `#E3F3E9` check surround; indicates arithmetic completion only |
| Typography | System sans-serif, tabular lining numerals. Header 17/24 semibold; question 28/34 semibold; mathematical digits 30/44 regular; body/help 14–15/20; supporting text 12–13/18. Specimens rendered using installed Open Sans / DejaVu Sans; no remote fonts required. Device font metrics must be checked during implementation QA. |
| Spacing | 4 px base; 8/12 px within controls; 16 px header margins; 24 px content margins; 44 px mathematical row and column pitch |
| Header | 56 px high; 44×44 back/menu targets; short title; 34×3 progress line and small completed-entry count. `3 / 9` means three validated working entries, never proficiency. No invented percentages. |
| Paper | Full useful width; no enclosing rounded card. Printed digits, child digits, active input and subtraction rules use the same explicit grid. Normal rows 44 px. Rule thickness 1.25 px; bracket 1.6 px. |
| Active cell | 36×44 visible focus area inside a 44×44 hit target; 4 px corner radius; thin teal outline and a visible caret. Adjacent targets share the 44 px grid without overlapping. It remains a native numeric input. |
| Controls | Minimum 44×44 hit targets, even when icons/labels look smaller. Quiet Help and Write actions in one 56 px toolbar. No permanent save button, final-answer button, debug fields or evidence-policy text. |
| Completion action | One 48 px-high Next question action, 7 px corners; compact feedback immediately follows the calculation. Original working remains visible. |

## Behaviour to preserve after approval

- **Working:** first focus above the leading dividend position; no prerequisite screen. Entering child-calculated values progressively reveals rows. Verbatim bring-down remains automatic. Autosave runs quietly; a small transient saving/failure status may replace the toolbar's empty centre. Do not claim saved until acknowledged. No permanent save control.
- **Mistake:** preserve the entered digit and all rows. Place the quiet prompt below the current working, not over it. Try again returns to that cell; Need a hint? expands the existing deterministic support in place. Help stays optional, Backspace and earlier-digit editing remain active. A pending multi-digit entry shows no error styling.
- **More help:** longer hints flow below the paper and scroll naturally; the current cell and original working remain anchored. There is no separate tutoring screen. Stronger explanations remain opt-in through the existing recovery policy.
- **Completed:** dismiss the numeric keyboard after final validation, keep the full paper, show the result and Next question. The action follows the existing practice-question transition and evidence policy; no curriculum or mastery changes are implied.
- **Overflow:** existing final-answer mode, existing guided worksheet, and return-to-lesson access. Save is automatic. Progress/evidence detail belongs in existing progress views. The menu introduces no new learning features.
- **Write:** enter the existing scribbler without discarding typed work; preserve its tools, clarification and typed fallback. Returning restores the same mathematical grid.

## Responsive and keyboard rules

At both target widths the notebook uses the same 44 px grid, same text scale and same header height. More width becomes margin, not larger controls. Mockups reserve 248 px for an illustrative Android keyboard. Implement against `visualViewport`: keep the input and quiet toolbar inside the remaining viewport; account for browser chrome and safe-area insets. Do not pin the toolbar to the full layout viewport behind the keyboard.

With more rows or a taller keyboard, the notebook scrolls vertically rather than shrinking numerals or covering working with a prompt. Keep the active row visible; permit scrolling back to previous rows without changing or clearing them. Help pointer interactions must not steal focus from the numeric input. Keyboard users receive normal Tab order, visible focus and properly labelled controls. Announce mathematical feedback with a polite live region; colour is never the only indication.

At tablet/desktop sizes cap the notebook column around 640 px, retain the 44 px coordinate pitch, and use available space for the existing writing surface. Do not introduce a second panel. For unusually wide arithmetic, allow deliberate horizontal paper scrolling rather than compressing touch targets. Fractions, algebra and calculus can share typography, toolbar, focus/error treatments and tutoring placement; their layouts remain problem-specific.

## Existing evidence and inspection

Reviewed current `progressive-division/zero-and-bring-down-android.png` and `complete-android.png`, the existing `ProgressiveDivision`, `WorkspaceRecovery`, `writing/style.css`, and My Learning Year header/tokens. Current screenshots devote excessive space to preview/learner banners and permanent action stacks. This draft removes those from the exercise composition while retaining the existing mint/peach accents, with a teal exercise accent in this proposed revision.

Checked all eight individual mockups at both widths for column centres, subtraction rules, complete arithmetic, header/control placement and clipping. The designs show the actual calculation: `3 − 3 = 0`, bring down 7, `7 − 6 = 1`, bring down 9, `19 − 18 = 1`; quotient `126`. No React, application CSS, validator, curriculum, persistence, estimator or evidence-policy file has changed. Revision 2 also verifies the eight raster dimensions and the main text/background contrast pairs: ink/white 11.88:1, supporting text/sage 5.30:1, white/teal 6.38:1, and amber/peach 5.32:1. These checks do not constitute physical-device or full accessibility testing. Functional app tests were not rerun because this branch changes only design documents and render helpers.

## Reproduce / next gate

From repository root, with existing frontend development dependencies and Chromium installed:

```sh
python docs/design/mathematics-notebook-v1/render-design.py
CHROMIUM_PATH=/usr/bin/chromium node docs/design/mathematics-notebook-v1/capture-design.mjs
```

Render helpers write only into this design folder; they do not serve a second application or implement interactions. View PNGs or SVGs directly in GitHub; no deployment is required.

**Awaiting product-owner design approval.** Only then implement the visual shell over the existing workspace and capture real app screenshots at both widths for comparison and functional regression testing. Nothing is merged or deployed by this design branch.
