import { useEffect, useRef, useState } from "react";

import { WritingWorkspace } from "./Workspace";
import {
  BrowserWorkStore,
  fixtureRecognizer,
  fixtureWork,
  restore,
  unavailableRecognizer,
} from "./adapters";
import { createWork, divisionLayout, freeLayout } from "./model";
import type { Work, InputPacket, WorkStore } from "./contract";
import "./style.css";
function demoStore(): WorkStore {
  try {
    return new BrowserWorkStore(localStorage);
  } catch {
    return {
      async load() {
        return null;
      },
      async save() {
        throw Error(
          "Browser storage unavailable. Download your draft before closing this tab.",
        );
      },
    };
  }
}
export function Demo() {
  const [work, setWork] = useState<Work | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("Opening draft…"),
    [dividend, setDividend] = useState("379"),
    [divisor, setDivisor] = useState("3"),
    [layout, setLayout] = useState("division"),
    [fixture, setFixture] = useState<
      "correct" | "incorrect" | "ambiguous" | null
    >(null),
    [sent, setSent] = useState<InputPacket | null>(null);
  const store = useRef(demoStore()),
    queue = useRef(Promise.resolve()),
    current = useRef(work);
  current.current = work;
  function save(w: Work) {
    setSaved("Saving…");
    const task = queue.current
      .catch(() => undefined)
      .then(() => store.current.save(w));
    queue.current = task;
    void task.then(
      () => {
        if (
          current.current?.revision === w.revision &&
          current.current.id === w.id
        ) {
          try {
            localStorage.setItem("openpath:math-input:last@1", w.id);
          } catch {
            /* Draft itself was saved; last-open pointer is optional. */
          }
          setSaved("Saved on this browser");
          setError("");
        }
      },
      (e) => {
        setSaved("Not saved — keep this tab open or download the draft");
        setError(String(e));
      },
    );
  }
  useEffect(() => {
    void open(true);
  }, []);
  useEffect(() => {
    if (work && !loading) save(work);
  }, [work, loading]);
  async function open(resumeLast = false) {
    setLoading(true);
    setError("");
    try {
      await queue.current.catch(() => undefined);
      let id =
        layout === "division"
          ? `division:${dividend}:${divisor}`
          : `layout:${layout}`;
      if (resumeLast) {
        try {
          id = localStorage.getItem("openpath:math-input:last@1") ?? id;
        } catch {
          /* Device storage may be unavailable. */
        }
      }
      const old = await store.current.load(id);
      if (old?.problem.id.startsWith("division:")) {
        const [, a, b] = old.problem.id.split(":");
        setDividend(a);
        setDivisor(b);
        setLayout("division");
      }
      const synthetic = id.startsWith("synthetic:") ? id.split(":")[1] : null;
      setFixture(
        synthetic === "correct" ||
          synthetic === "incorrect" ||
          synthetic === "ambiguous"
          ? synthetic
          : null,
      );
      setSent(null);
      setWork(
        old ??
          createWork(
            id,
            {
              id,
              statement:
                layout === "division"
                  ? `${dividend} ÷ ${divisor}`
                  : "Free mathematical working",
            },
            layout === "division"
              ? divisionLayout(dividend, divisor)
              : freeLayout(layout),
          ),
      );
    } catch (e) {
      setError(String(e));
      setSaved("Not opened — original stored draft preserved");
      setWork(null);
    } finally {
      setLoading(false);
    }
  }
  function sample(kind: "correct" | "incorrect" | "ambiguous") {
    setFixture(kind);
    setSent(null);
    setWork(fixtureWork(`synthetic:${kind}`, divisionLayout("379", "3"), kind));
  }
  function download() {
    if (!work) return;
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(work, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = "openpath-writing-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  return (
    <main>
      <header>
        <p className="eyebrow">OpenPath · reusable mathematical input</p>
        <h1>Your mathematical notebook</h1>
        <p>
          Private, local demonstration. No learner records, recognition services
          or mathematical scoring are connected.
        </p>
      </header>
      <details>
        <summary>Problem and writing layout</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void open();
          }}
        >
          <label>
            Layout
            <select
              aria-label="Layout"
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              <option value="division">Long division</option>
              {[
                "free",
                "column-addition",
                "column-subtraction",
                "multiplication",
                "fractions",
                "algebra",
                "coordinates",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {layout === "division" && (
            <>
              <label>
                Dividend
                <input
                  value={dividend}
                  onChange={(e) => setDividend(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label>
                Divisor
                <input
                  value={divisor}
                  onChange={(e) => setDivisor(e.target.value)}
                  inputMode="numeric"
                />
              </label>
            </>
          )}
          <button>Open or resume this problem</button>
        </form>
        <p>
          Other layouts provide free writing regions, not automatic mathematical
          understanding. Add regions for extra steps. A host can supply a
          structured worksheet.
        </p>
      </details>
      <details>
        <summary>Synthetic recognition demonstrations</summary>
        <p>
          These are generated vector samples and labelled recognition fixtures,
          not recognition of your handwriting. Mathematical correctness is not
          judged here. “Incorrect” changes the second multiplication digit from
          6 to 8 to test transport of an error.
        </p>
        {(["correct", "incorrect", "ambiguous"] as const).map((k) => (
          <button key={k} onClick={() => sample(k)}>
            Load {k} sample
          </button>
        ))}
      </details>
      <div className="draft-controls">
        <p role="status" aria-live="polite">
          {saved}
        </p>
        <button disabled={!work} onClick={() => work && save(work)}>
          Save draft now
        </button>
        <button disabled={!work} onClick={download}>
          Download draft
        </button>
        <label>
          Restore draft
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 8_000_000) throw Error("Draft too large");
                const w = restore(await file.text());
                setFixture(null);
                setWork({ ...w, id: `import:${crypto.randomUUID()}` });
                setError("");
              } catch (e) {
                setError(String(e));
              }
            }}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Opening…</p>
      ) : (
        work && (
          <WritingWorkspace
            work={work}
            onChange={setWork}
            recognizer={
              fixture ? fixtureRecognizer(fixture) : unavailableRecognizer
            }
            onConfirmedInput={setSent}
          />
        )
      )}
      {sent && sent.revision === work?.revision && sent.workId === work.id && (
        <details open>
          <summary>Structured input sent to mock validator</summary>
          <pre data-testid="input-packet">{JSON.stringify(sent, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}
