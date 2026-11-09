import React, { useState } from 'react';
import { recordAction, tallySVG } from '../../../../packages/learning/src/primary/tally';
export function TallyRows({ counts, labels = ['Books', 'Games'] }: { counts: number[]; labels?: string[] }) {
  return <table className="tally-table"><caption>Tally observations</caption><thead><tr><th>Category</th><th>Marks</th></tr></thead><tbody>{counts.map((n, i) => <tr key={i}><th scope="row">{labels[i]}</th><td><div dangerouslySetInnerHTML={{ __html: tallySVG(n, labels[i]) }} /></td></tr>)}</tbody></table>;
}
export function TallyModel({ state, save, busy }: { state?: string; save: (id: string, response: string) => Promise<void>; busy: boolean }) {
  const [count, setCount] = useState(() => { try { const n: unknown = JSON.parse(state ?? '[0]')[0]; return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 20 ? n : 0; } catch { return 0; } });
  async function change(action: 'add' | 'undo' | 'clear') {
    const next = recordAction({ count }, action).count;
    setCount(next);
    await save('model', JSON.stringify([next, 0, 2, 1, 4, 2]));
    await save('exploration', 'done');
  }
  return <section aria-label="Record tally observations"><TallyRows counts={[count]} labels={['Your observations']} /><div className="actions"><button disabled={busy || count === 20} onClick={() => void change('add')}>Add one mark</button><button disabled={busy || count === 0} onClick={() => void change('undo')}>Undo one mark</button><button disabled={busy || count === 0} onClick={() => void change('clear')}>Clear marks</button></div><p>Record up to 20 observations. Four uprights and one crossing mark make five.</p></section>;
}
