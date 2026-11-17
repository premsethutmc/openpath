/**
 * money-piles@1: rupees and paise as coins. Taking away: the child pays by tapping coins, and when the paise are too
 * few one rupee is changed into 100 paise. Adding: the two amounts lie together, and 100 paise are changed into ₹1.
 * What is left is counted by the child and written in the two boxes: the picture never states the answer.
 * In a test (`still`) the coins are only shown.
 */
import React, { useState } from "react";
import { changePaise, changeRupee, coinLabel, coinsOf, needsChange, totals, type Coin, type MoneyPicture } from "../../../packages/learning/src/money-piles";

const words = (r: number, p: number) => `${r} rupee${r === 1 ? "" : "s"} and ${p} paise`;
export function MoneyPiles({ m }: { m: MoneyPicture }) {
  const [coins, setCoins] = useState<Coin[]>(() => coinsOf(m));
  const { paid, left } = totals(coins);
  const [b, pb] = m.other;
  const tap = (c: Coin) => setCoins(coins.map((x) => (x.id === c.id ? { ...x, paid: !x.paid } : x)));
  const short = m.take && needsChange(m) && left[1] + paid[1] < pb;
  const over = m.take && (paid[0] > b || paid[1] > pb);
  const done = m.take && paid[0] === b && paid[1] === pb;
  const row = (pile: Coin["pile"], name: string) => (
    <div className="money-pile">
      <span className="money-name">{name}</span>
      <div className="money-coins">
        {coins.filter((c) => c.pile === pile).map((c) => {
          const cls = `coin ${c.pile === "rupees" ? (c.paise >= 1000 ? "note" : "rupee") : "paisa"}${c.paid ? " paid" : ""}${c.group === "more" ? " more" : ""}`;
          return m.take && !m.still
            ? <button key={c.id} type="button" className={cls} aria-pressed={c.paid} aria-label={`${coinLabel(c)}${c.paid ? ", paid" : ""}`} onClick={() => tap(c)}>{coinLabel(c)}</button>
            : <span key={c.id} className={cls}>{coinLabel(c)}</span>;
        })}
      </div>
    </div>
  );
  return (
    <div className="figure money" data-testid="money-piles">
      {row("rupees", "Rupees")}
      {row("paise", "Paise")}
      {!m.still && m.take && (
        <p className={`money-say${done ? " ok" : over ? " over" : ""}`} role="status">
          {paid[0] || paid[1] ? `You have paid ${words(paid[0], paid[1])}.` : "Tap the coins you pay with."}
          {done ? " That is paid. Count what is left." : over ? " That is too much. Tap a coin to take it back." : short ? " There are not enough paise to pay with." : ""}
        </p>
      )}
      {!m.still && short && <button type="button" className="secondary money-change" onClick={() => setCoins(changeRupee(coins))}>Change ₹1 into 100 paise</button>}
      {!m.still && !m.take && left[1] >= 100 && <button type="button" className="secondary money-change" onClick={() => setCoins(changePaise(coins))}>Change 100 paise into ₹1</button>}
      {!m.take && <p className="money-say">{coins.some((c) => c.group === "more") ? "The coins with a dotted edge are the ones you get." : ""} Count the rupees, then the paise.</p>}
    </div>
  );
}
