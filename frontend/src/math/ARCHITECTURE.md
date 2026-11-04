# Universal Learning Screen Renderer — Architecture

## Purpose

A reusable, curriculum-independent rendering system for mathematical learning
experiences across Grades 1–12. One rendering system, many mathematical
learning experiences.

## Responsibility Boundaries

The renderer (layer D) is strictly a display and input-capture layer:

| Layer | Responsibility | Not in renderer |
|-------|---------------|-----------------|
| A — Math engine | Verify mathematical correctness | ✓ |
| B — Adaptive engine | Decide what to show next | ✓ |
| C — Teaching composer | Construct the RenderSpec | ✓ |
| **D — Screen renderer** | **Display spec, capture events** | — |

The renderer **never** grades answers, marks mastery, decides progression,
or makes pedagogical choices. It receives a `RenderSpec` and emits
`RendererEvent`s.

## Rendering Contract (RenderSpec v1.0.0)

Defined in `types.ts`. A versioned, typed schema containing:

- **question** — prompt text, math expression (plain + optional LaTeX),
  generator reference, question ID
- **input** — type (numeric, fraction, symbolic, multiple-choice), config
- **visual** — optional visualization (place-value, fraction-bar, number-line,
  array-model, geometry, coordinate-graph, data-chart) with typed params
- **working** — optional step-by-step working with progressive reveal
- **feedback** — level (none/correct/incorrect/partial), verified flag,
  message, evidence
- **hints** — progressive hints with answer-reveal marking
- **progress** — session progress with per-question status
- **nav** — submit/skip/back button enable states
- **a11y** — accessibility labels and metadata
- **layout** — panel list, breakpoint hint

Key invariants:
1. No `mastery`, `status`, or `outcome` fields — renderer cannot mark mastery
2. `feedback.verified` distinguishes kernel-verified from local checks
3. `working.steps[].verified` marks each step's verification status
4. `hints[].revealsAnswer` flags hints that disclose the answer

## Presentation Modes

| Mode | Visual | Working | Keypad |
|------|--------|---------|--------|
| minimal | — | — | No |
| guided | Yes | Collapsed, progressive | No |
| visual-interactive | Yes (interactive) | First step revealed | Yes (mobile) |

## Component Architecture

```
LearningScreen (compositor)
├── ProgressBar          — session progress dots
├── QuestionPanel        — prompt + math expression
│   └── MathDisplay      — renders plain text (LaTeX ready)
├── PlaceValueViz        — place-value table with carry
├── WorkingPanel         — collapsible step-by-step
├── NumericInput         — text input + optional keypad
├── FeedbackPanel        — correct/incorrect with evidence
├── HintPanel            — progressive hint reveal
└── NavControls          — submit/skip/back
```

All components receive typed props from the RenderSpec. The compositor
(`LearningScreen`) wires event dispatch and manages layout.

## Responsive Layout

- **Desktop** (≥1024px): Two-column — question+visual left, input+working right
- **Tablet** (640–1023px): Same or stacked depending on mode
- **Mobile** (<640px): Single column, on-screen keypad for numeric input

CSS uses custom properties with light/dark theme support via
`prefers-color-scheme` and `data-theme` attributes. Plain CSS, no framework.

## Localization

- `i18n.ts` provides UI label strings for `en` and `ta` (Tamil)
- Mathematical content (numbers, operators, expressions) is locale-independent
- Labels are separated from math content per the directive
- Baloo 2 font supports Tamil script

## Event System

The renderer emits `RendererEvent`s to the parent:

| Event | When |
|-------|------|
| `answer_submitted` | User submits an answer |
| `hint_requested` | User requests a hint |
| `working_toggled` | User shows/hides working |
| `working_step_revealed` | User reveals next step |
| `mode_changed` | Presentation mode changed |
| `locale_changed` | Language changed |
| `visual_interaction` | User interacts with visualization |
| `navigation` | Back/skip button pressed |

Events carry timestamps and typed data. The parent (teaching composer or
app shell) handles all events — the renderer has no built-in side effects.

## Experience Generators

Each experience generator produces a `RenderSpec` from parameters:

### Grade 5 Addition (`experiences/addition.ts`)
- Parses `gen:addr:A,B` references
- Generates place-value visualization params
- Builds working steps with carry detection
- Provides 3-level progressive hints
- Local grading function (clearly marked as non-kernel-verified)

### Future (Stage 2)
- Fractions (`gen:fadd`) — fraction-bar visualization
- Higher math — symbolic working, coordinate graph

## Build

```bash
npm run math:build              # dist-math/ with assets
npm run math:build:standalone   # single HTML file
```

Uses esbuild with React JSX automatic runtime. Same toolchain as the
existing OpenPath frontend.

## Testing

```bash
npx tsx --test src/math/experiences/addition.test.ts
npx tsc --noEmit --project tsconfig.math.json
```

22 tests covering:
- Reference parsing
- Spec generation for all three modes
- Working step generation with/without carry
- Grading correctness
- Rendering contract invariants (no mastery, verified flags, hint marking)
- Accessibility metadata presence

## Files

```
src/math/
├── types.ts                    # RenderSpec v1.0.0 contract
├── i18n.ts                     # EN/TA locale strings
├── App.tsx                     # Demo app shell with controls
├── main.tsx                    # Entry point
├── math.css                    # All styles (light/dark, responsive)
├── react-shim.d.ts             # Minimal React types (dev env shim)
├── css.d.ts                    # CSS module declaration
├── ARCHITECTURE.md             # This file
├── components/
│   ├── LearningScreen.tsx      # Main compositor
│   ├── QuestionPanel.tsx       # Question display
│   ├── NumericInput.tsx        # Numeric input + keypad
│   ├── FeedbackPanel.tsx       # Answer feedback
│   ├── HintPanel.tsx           # Progressive hints
│   ├── WorkingPanel.tsx        # Step-by-step working
│   ├── ProgressBar.tsx         # Session progress
│   ├── PlaceValueViz.tsx       # Place-value visualization
│   └── NavControls.tsx         # Navigation buttons
└── experiences/
    ├── addition.ts             # Grade 5 addition generator
    └── addition.test.ts        # Tests (22 cases)
```
