/**
 * tamil-help@1: short Tamil lines under the app's English instructions, buttons and headings, for children (and
 * parents) from Tamil-medium homes. Off by default; switched on per device. The English stays; the Tamil is shown
 * beneath it (CSS ::after from a data-ta attribute), so nothing else on the screen changes. The words come from
 * content/english/help/tamil-ui.json, matched to an element's whole text. Passages, questions and answers are never
 * translated: they are the English being learnt.
 */
import { useEffect, useState } from "react";
import data from "../../../../content/english/help/tamil-ui.json";
import explain from "../../../../content/english/help/tamil-explain.json";

const KEY = "openpath-english-tamil-help";
const SELECTOR = "button, h1, h2, h3, p, label, summary, legend, .pill, .eyebrow, li, .prompt";
const norm = (s: string) => s.replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}“"]+/u, "").replace(/[^\p{L}\p{N}.?!:”"')]+$/u, "").trim();
// the app's own lines, then the grammar explanations (tamil-help@2, machine-translated and spot-checked)
const MAP = new Map([...Object.entries((explain as { strings: Record<string, string> }).strings), ...Object.entries((data as { strings: Record<string, string> }).strings)].map(([en, ta]) => [norm(en), ta]));

/** The Tamil for an English line of the app, if there is one. */
export const tamilFor = (en: string): string | undefined => MAP.get(norm(en));

function mark(el: Element) {
  const text = norm(el.textContent ?? "");
  // a wrapper whose only child says the same thing: the child carries the Tamil, not both
  const only = el.children.length === 1 && norm(el.children[0].textContent ?? "") === text;
  const ta = !only && !el.closest("[data-no-ta]") ? MAP.get(text) : undefined;
  if (ta) {
    if (el.getAttribute("data-ta") !== ta) el.setAttribute("data-ta", ta);
  } else if (el.hasAttribute("data-ta")) el.removeAttribute("data-ta");
}

let observer: MutationObserver | null = null;
let queued = false;
function sweep() {
  queued = false;
  document.querySelectorAll(SELECTOR).forEach(mark);
}
function apply(on: boolean) {
  document.documentElement.classList.toggle("ta-help", on);
  observer?.disconnect();
  observer = null;
  if (!on) {
    document.querySelectorAll("[data-ta]").forEach((el) => el.removeAttribute("data-ta"));
    return;
  }
  sweep();
  observer = new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(sweep);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** Turns the Tamil lines on at start where this device chose them. */
export function startTamilHelp() {
  if (stored()) apply(true);
}

const CHANGED = "openpath-tamil-help";

/**
 * Whether this device chose Tamil help. The activities made for Tamil speakers (slips from Tamil, sounds that are
 * easy to mix up) are shown only then: a child from an English-medium home without the choice does not see them.
 */
export function useTamilHelp(): boolean {
  const [on, setOn] = useState(stored);
  useEffect(() => {
    const h = () => setOn(stored());
    window.addEventListener(CHANGED, h);
    return () => window.removeEventListener(CHANGED, h);
  }, []);
  return on;
}

/** The switch: "தமிழ் உதவி / Tamil help". */
export function TamilToggle() {
  const [on, setOn] = useState(stored);
  useEffect(() => {
    apply(on);
    window.dispatchEvent(new Event(CHANGED));
  }, [on]);
  return (
    <button
      type="button"
      className={on ? "chip on ta-toggle" : "chip ta-toggle"}
      aria-pressed={on}
      data-no-ta
      onClick={() => {
        const next = !on;
        try {
          localStorage.setItem(KEY, next ? "on" : "off");
        } catch {
          /* this device keeps no settings: on for this visit only */
        }
        setOn(next);
      }}
    >
      <span lang="ta">தமிழ் உதவி</span> · Tamil help {on ? "on" : "off"}
    </button>
  );
}
