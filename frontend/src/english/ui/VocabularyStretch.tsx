import { useState } from "react";
import { firstContextItem, nextContextItems, observedContextCount, type ContextItem } from "../logic/vocabulary/context-stretch.ts";

export function VocabularyStretch({ onBack }: { onBack: () => void }) {
  const [choices, setChoices] = useState<(number | null)[]>([]);
  const [ruledOut, setRuledOut] = useState<number[]>([]);
  const items = choices.length ? [firstContextItem, ...nextContextItems(choices[0])] : [firstContextItem];
  const item: ContextItem | undefined = items[choices.length];
  const submit = (choice: number | null) => {
    if (!item || (choice !== null && ruledOut.includes(choice))) return;
    setChoices((old) => old.length === choices.length ? [...old, choice] : old);
    setRuledOut([]);
  };

  return (
    <main className="page vocab" data-phase={item ? "vocabulary-stretch" : "vocabulary-stretch-result"}>
      <button type="button" className="link" onClick={onBack}>← Back to results</button>
      <p className="eyebrow">Words · Context challenge</p>
      {item ? (
        <>
          <h1 className="hero">A harder word in context</h1>
          <p className="pill">Question {choices.length + 1} of 3</p>
          <p className="prompt">{item.sentence}</p>
          <p>What does <strong>{item.word}</strong> mean here?</p>
          <details className="small" key={item.word}>
            <summary>Rule out choices (optional)</summary>
            <p>Cross out choices that the sentence rules out. You can undo any choice before answering.</p>
            {item.choices.map((choice, i) => (
              <div key={choice}><label>
                <input type="checkbox" checked={ruledOut.includes(i)} onChange={() => setRuledOut((old) => old.includes(i) ? old.filter((x) => x !== i) : [...old, i])} /> {choice}
              </label></div>
            ))}
          </details>
          <div className="options">
            {item.choices.map((choice, i) => (
              <button type="button" className="option" key={choice} disabled={ruledOut.includes(i)} onClick={() => submit(i)}>
                {ruledOut.includes(i) ? <s>{choice}</s> : choice}
              </button>
            ))}
            <button type="button" className="option vocab-unknown" onClick={() => submit(null)}>I'm not sure</button>
          </div>
        </>
      ) : (
        <>
          <h1 className="hero">{observedContextCount(items, choices)} of 3 correct in context</h1>
          <p className="sub">This shows how you did on these sentences, not an advanced level or proof you can use the words on your own.</p>
          <ol>
            {items.map((q, index) => (
              <li key={q.word}>
                <h2>{q.word}</h2>
                <p>{choices[index] === null ? "You weren't sure." : `You chose: ${q.choices[choices[index]!]}`}</p>
                <p><strong>{q.choices[q.answer]}.</strong> {q.clue}</p>
                <ul>{q.choices.map((option, i) => <li key={option}><strong>{option}:</strong> {q.why[i]}</li>)}</ul>
              </li>
            ))}
          </ol>
          <button type="button" className="primary" onClick={onBack}>Back to results</button>
        </>
      )}
    </main>
  );
}
