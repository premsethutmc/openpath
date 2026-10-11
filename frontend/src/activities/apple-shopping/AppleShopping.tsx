/**
 * Mom goes shopping.
 *
 * A give-N task dressed as a trip to the fruit shop. The child reads the
 * shopping list, drags fruit into the basket one at a time, and decides for
 * themselves when it is time to go home.
 *
 * Assessment-critical design choices:
 *  - No running count is shown and Mom never says the target number while the
 *    child is working unaided: either would do the counting for them.
 *  - "Go home" is always available, so stopping at the right amount is the
 *    child's own decision.
 *  - Help arrives in steps (look again -> count together -> spots to fill) and
 *    is recorded, so the engine can tell independent success from supported.
 *  - This component records what happened. It never decides what it means.
 */
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { now } from "../../core/clock";
import { uuid } from "../../core/identity";
import { EvidenceRecorder } from "../../core/recorder";
import { isMuted, play, setMuted, speak } from "../../core/sound";
import type { EvidenceStore } from "../../core/store";
import type { RoundSpec, SessionPlan, SessionResult } from "../../core/types";
import { Awning, Basket, BasketFront, Fruit, INK, Mom, type Mood, Plate, ShoppingList, Star } from "./art";
import { FRUIT_R, type Layout, type Point, basketSlot, layoutFor, rowsOf, shelfSlots } from "./layout";

export const ACTIVITY = "apple-shopping";
export const ACTIVITY_VERSION = "1";

type Phase = "list" | "shop" | "celebrate" | "home" | "done";

interface Item {
  id: string;
  kind: string;
  slot: number;
  inBasket: boolean;
  order: number;
}

interface Drag {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  moved: boolean;
}

const PLURAL: Record<string, string> = { apple: "apples", orange: "oranges", pear: "pears" };

/** Mix the fruit on the shelf the same way every time for a given round. */
function buildItems(spec: RoundSpec): Item[] {
  const items: Item[] = [];
  for (const [kind, count] of Object.entries(spec.available)) {
    for (let i = 0; i < count; i++) items.push({ id: `${spec.id}-${kind}-${i + 1}`, kind, slot: 0, inBasket: false, order: 0 });
  }
  let seed = spec.target * 7919 + items.length * 104729 + 17;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.map((item, slot) => ({ ...item, slot }));
}

export function AppleShopping({
  plan,
  store,
  onResult,
  onPlayAgain,
  onGrownUps,
}: {
  plan: SessionPlan;
  store: EvidenceStore;
  onResult: (result: SessionResult | null, error: Error | null) => void;
  onPlayAgain: () => void;
  onGrownUps: () => void;
}) {
  const recorder = useRef<EvidenceRecorder | null>(null);
  const sessionId = useRef(uuid());
  const uploads = useRef<Promise<unknown>>(Promise.resolve());
  const timers = useRef<number[]>([]);
  const orderCounter = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [layout, setLayout] = useState<Layout>(() => layoutFor(window.innerWidth, window.innerHeight));
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("list");
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hopId, setHopId] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [mood, setMood] = useState<Mood>("happy");
  const [line, setLine] = useState("");
  const [listPulse, setListPulse] = useState(false);
  const [counted, setCounted] = useState<number | null>(null);
  const [countedPlates, setCountedPlates] = useState(0);
  const [showSpots, setShowSpots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  const spec = plan.rounds[roundIndex];
  const plural = PLURAL[spec.target_kind] ?? `${spec.target_kind}s`;
  const isLast = roundIndex === plan.rounds.length - 1;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const say = (text: string) => {
    setLine(text);
    speak(text);
  };

  const beginRound = (index: number) => {
    const next = plan.rounds[index];
    const kinds = PLURAL[next.target_kind] ?? `${next.target_kind}s`;
    const { id, ...rest } = next;
    recorder.current!.startRound(id, rest);
    orderCounter.current = 0;
    setRoundIndex(index);
    setItems(buildItems(next));
    setHintLevel(0);
    setCounted(null);
    setCountedPlates(0);
    setShowSpots(false);
    setListPulse(false);
    setBusy(false);
    setMood("happy");
    setPhase("list");
    if (next.representation === "set") say(`Friends are coming for a picnic. We need one ${next.target_kind} for each plate.`);
    else if (index === 0) say(`We need ${kinds}. Look at my list!`);
    else say(`Today we need ${kinds}. Look at the list!`);
  };

  // Start the session once. The guard keeps a development double-mount from
  // recording the first round twice.
  useEffect(() => {
    if (!recorder.current) {
      recorder.current = new EvidenceRecorder();
      recorder.current.record("session_started", { band: plan.band });
      beginRound(0);
    }
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setLayout(layoutFor(stage.clientWidth, stage.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /** Send everything recorded so far. Uploads run one after another. */
  const upload = (finished: boolean) => {
    const payload = {
      client_session_id: sessionId.current,
      activity: ACTIVITY,
      activity_version: ACTIVITY_VERSION,
      plan,
      finished,
      ended_at: now().toISOString(),
      events: [...recorder.current!.events],
    };
    uploads.current = uploads.current
      .then(() => store.saveSession(payload))
      .then(
        (result) => onResult(result, null),
        (error: Error) => onResult(null, error),
      );
  };

  /* ------------------------------------------------------------ the shop */

  const shelf = useMemo(() => shelfSlots(layout, items.length), [layout, items.length]);
  const inBasket = useMemo(() => items.filter((i) => i.inBasket).sort((a, b) => a.order - b.order), [items]);
  const basketIndex = useMemo(() => new Map(inBasket.map((item, index) => [item.id, index])), [inBasket]);

  const restingPlace = (item: Item): Point =>
    item.inBasket ? basketSlot(layout, basketIndex.get(item.id) ?? 0) : (shelf[item.slot] ?? { x: 0, y: 0 });

  const toStage = (event: PointerEvent): Point => {
    const matrix = svgRef.current!.getScreenCTM()!.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  };

  const move = (item: Item, toBasket: boolean) => {
    if (toBasket === item.inBasket) return;
    orderCounter.current += 1;
    const order = orderCounter.current;
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, inBasket: toBasket, order } : i)));
    setCounted(null);
    if (toBasket) {
      recorder.current!.record("item_added", { item: item.id, kind: item.kind });
      play("drop");
    } else {
      recorder.current!.record("item_removed", { item: item.id });
      play("lift");
    }
  };

  const canPlay = phase === "shop" && !busy;

  const onPointerDown = (item: Item) => (event: PointerEvent<SVGGElement>) => {
    if (!canPlay || drag) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointer = toStage(event);
    const place = restingPlace(item);
    setDrag({ id: item.id, x: place.x, y: place.y, dx: place.x - pointer.x, dy: place.y - pointer.y, moved: false });
  };

  const onPointerMove = (item: Item) => (event: PointerEvent<SVGGElement>) => {
    if (!drag || drag.id !== item.id) return;
    const pointer = toStage(event);
    const x = pointer.x + drag.dx;
    const y = pointer.y + drag.dy;
    const place = restingPlace(item);
    const moved = drag.moved || Math.hypot(x - place.x, y - place.y) > 8;
    setDrag({ ...drag, x, y, moved });
  };

  const onPointerUp = (item: Item) => () => {
    if (!drag || drag.id !== item.id) return;
    const zone = layout.shop.dropZone;
    const overBasket = drag.x >= zone.x1 && drag.x <= zone.x2 && drag.y >= zone.y1 && drag.y <= zone.y2;
    if (!drag.moved) {
      setHopId(item.id);
      later(() => setHopId(null), 450);
    } else if (overBasket !== item.inBasket) {
      move(item, overBasket);
    }
    setDrag(null);
  };

  const onItemKey = (item: Item) => (event: KeyboardEvent) => {
    if (!canPlay || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    move(item, !item.inBasket);
  };

  const countTogether = (total: number, others: number) => {
    setBusy(true);
    say("Let's count them together.");
    let at = 1700;
    for (let i = 1; i <= total; i++) {
      later(() => {
        setCounted(i);
        play("tick");
        speak(String(i));
      }, at);
      at += 850;
    }
    if (spec.representation === "set") {
      later(() => say("Now the plates."), at);
      at += 1500;
      for (let i = 1; i <= spec.target; i++) {
        later(() => {
          setCountedPlates(i);
          play("tick");
          speak(String(i));
        }, at);
        at += 850;
      }
    }
    later(() => {
      const have = `We have ${total}.`;
      const need = spec.representation === "set" ? `There are ${spec.target} plates. One ${spec.target_kind} for each plate!` : `The list says ${spec.target}.`;
      say(`${have} ${need}${others ? ` And we only need ${plural}.` : ""}`);
      setListPulse(true);
      setBusy(false);
    }, at + 300);
    later(() => {
      setListPulse(false);
      setMood("happy");
    }, at + 3200);
  };

  const check = () => {
    if (!canPlay) return;
    if (inBasket.length === 0) {
      say(`First put some ${plural} in the basket.`);
      return;
    }
    const counts: Record<string, number> = {};
    for (const item of inBasket) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
    recorder.current!.record("check_requested", { counts });
    const right = counts[spec.target_kind] ?? 0;
    const others = inBasket.length - right;

    if (right === spec.target && others === 0) {
      recorder.current!.record("round_completed");
      upload(isLast);
      setBusy(true);
      setShowSpots(false);
      setCounted(null);
      setMood("cheer");
      setPhase("celebrate");
      play("cheer");
      say("That is just what we need. Let's go home!");
      later(() => {
        setPhase("home");
        setBusy(false);
        say(
          spec.representation === "set"
            ? `One ${spec.target_kind} for every plate. Thank you!`
            : `${spec.target} ${plural}, just like the list. Thank you!`,
        );
      }, 2400);
      return;
    }

    const level = Math.min(3, hintLevel + 1);
    setHintLevel(level);
    recorder.current!.record("hint_shown", { level });
    setMood("thinking");
    play("nudge");
    if (level === 1) {
      say(others ? `We only need ${plural} today. Let's look at the list again.` : "Hmm. Let's look at the list again.");
      setListPulse(true);
      later(() => {
        setListPulse(false);
        setMood("happy");
      }, 2600);
    } else if (level === 2) {
      countTogether(inBasket.length, others);
    } else {
      setShowSpots(true);
      say(`Let's fill these spots. One ${spec.target_kind} in each, and nothing else.`);
      later(() => setMood("happy"), 2600);
    }
  };

  const goToShop = () => {
    setPhase("shop");
    say(
      spec.representation === "set"
        ? `Put one ${spec.target_kind} in the basket for each plate. Then press go home.`
        : `Put the ${plural} in the basket. When we have what the list says, press go home.`,
    );
  };

  const next = () => {
    if (!isLast) {
      beginRound(roundIndex + 1);
      return;
    }
    recorder.current!.record("session_finished");
    setMood("cheer");
    setPhase("done");
    play("cheer");
    say("You were a great helper today. See you next time!");
  };

  /* -------------------------------------------------------------- render */

  const { shop, home } = layout;
  const inShop = phase === "shop" || phase === "celebrate";
  const dragged = drag ? items.find((i) => i.id === drag.id) : undefined;

  const fruitNode = (item: Item) => {
    const dragging = drag?.id === item.id;
    const place = dragging ? drag : restingPlace(item);
    const index = basketIndex.get(item.id);
    const extra = showSpots && index !== undefined && (index >= spec.target || item.kind !== spec.target_kind);
    const label = `${item.kind}, ${item.inBasket ? "in the basket" : "on the shelf"}`;
    return (
      <g
        key={item.id}
        className={`fruit${dragging ? " dragging" : ""}${canPlay ? "" : " locked"}`}
        style={{ transform: `translate(${place.x}px, ${place.y}px)` }}
        role="button"
        tabIndex={canPlay ? 0 : -1}
        aria-label={label}
        data-kind={item.kind}
        data-where={item.inBasket ? "basket" : "shelf"}
        onPointerDown={onPointerDown(item)}
        onPointerMove={onPointerMove(item)}
        onPointerUp={onPointerUp(item)}
        onPointerCancel={onPointerUp(item)}
        onKeyDown={onItemKey(item)}
      >
        <circle r={FRUIT_R + 12} fill="transparent" />
        <g className={`fruit-art${hopId === item.id ? " hop" : ""}${extra ? " extra" : ""}`} opacity={dragging ? 0 : 1}>
          <Fruit kind={item.kind} />
        </g>
      </g>
    );
  };

  const tableSpacing = Math.min(home.table.spacing, (home.table.width - 70) / Math.min(spec.target, home.table.perRow));
  const tableSpots = rowsOf(spec.target, home.table.perRow, tableSpacing, home.table.cx, home.table.rows);
  const onPlates = spec.representation === "set";

  return (
    <div className="game">
      <header className="hud">
        <div className="speech">
          <svg className="speech-face" viewBox="-46 -264 92 92" aria-hidden="true">
            <Mom mood={mood} bag={false} />
          </svg>
          <p aria-live="polite">{line}</p>
          <button type="button" className="icon-button" aria-label="Say it again" onClick={() => speak(line)} disabled={muted}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="hud-tools">
          <span className="progress" aria-label={`Trip ${roundIndex + 1} of ${plan.rounds.length}`}>
            {plan.rounds.map((round, i) => (
              <i key={round.id} className={i < roundIndex || phase === "done" ? "done" : i === roundIndex ? "now" : ""} />
            ))}
          </span>
          <button
            type="button"
            className="text-button"
            aria-pressed={muted}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button type="button" className="text-button" onClick={onGrownUps}>
            For grown-ups
          </button>
        </div>
      </header>

      <div className="stage" ref={stageRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="application"
          aria-label="Fruit shop game"
          data-phase={phase}
          data-round={spec.id}
        >
          {inShop ? (
            <g key={`shop-${spec.id}`} className="scene">
              <rect x="-3000" y="-3000" width="7000" height="7000" fill="#CFEAF0" />
              <rect x="-3000" y={shop.floorY} width="7000" height="4000" fill="#EBCB8B" />
              <rect x="-3000" y={shop.shelfPanel.y - 30} width="7000" height={shop.shelfPanel.h + 30} fill="#F3D9A4" />
              {(shop.shelfRows[Math.max(1, Math.ceil(items.length / shop.shelfPerRow))] ?? []).map((y) => (
                <g key={y}>
                  <rect x="-3000" y={y + FRUIT_R - 2} width="7000" height="14" fill="#B9773F" />
                  <rect x="-3000" y={y + FRUIT_R + 12} width="7000" height="6" fill="#8A5328" opacity=".35" />
                </g>
              ))}
              <g transform="translate(-1000 0)">
                <Awning width={3000} />
              </g>

              <Basket cx={shop.basket.cx} y={shop.basket.y} width={shop.basket.width} />

              <g transform={`translate(${shop.mom.x} ${shop.mom.y}) scale(${shop.mom.scale})`}>
                <Mom mood={mood} />
              </g>
              <g transform={`translate(${shop.list.x} ${shop.list.y})`}>
                <ShoppingList
                  w={shop.list.w}
                  h={shop.list.h}
                  target={spec.target}
                  kind={spec.target_kind}
                  representation={spec.representation}
                  pulse={listPulse}
                  counted={countedPlates}
                />
              </g>

              {items.map(fruitNode)}
              <BasketFront cx={shop.basket.cx} y={shop.basket.y} width={shop.basket.width} />
              {/* Help layers sit above the fruit so a full basket cannot hide them. */}
              {showSpots &&
                Array.from({ length: spec.target }, (_, i) => {
                  const spot = basketSlot(layout, i);
                  return <circle key={i} className="spot" cx={spot.x} cy={spot.y} r={FRUIT_R + 3} pointerEvents="none" />;
                })}
              {counted !== null &&
                inBasket.slice(0, counted).map((item, i) => {
                  const spot = basketSlot(layout, i);
                  return (
                    <g key={item.id} transform={`translate(${spot.x} ${spot.y - 6})`} pointerEvents="none">
                      <g className="count-badge">
                        <circle r="20" fill="#FFFDF5" stroke="#1F8A7A" strokeWidth="4" />
                        <text y="9" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1F8A7A" className="numeral">
                          {i + 1}
                        </text>
                      </g>
                    </g>
                  );
                })}
              {dragged && drag && (
                <g className="fruit-ghost" transform={`translate(${drag.x} ${drag.y}) scale(1.12)`} pointerEvents="none">
                  <Fruit kind={dragged.kind} />
                </g>
              )}

              {phase === "celebrate" && <Sparkles cx={shop.basket.cx} cy={shop.basket.y - 70} spread={shop.basket.width / 2} />}
              {phase === "shop" && (
                <SceneButton x={shop.button.x} y={shop.button.y} label="Go home" icon="home" onPress={check} quiet={inBasket.length === 0} />
              )}
            </g>
          ) : (
            <g key={`home-${spec.id}-${phase}`} className="scene">
              <rect x="-3000" y="-3000" width="7000" height="7000" fill="#BFE3DC" />
              <rect x="-3000" y={home.floorY} width="7000" height="4000" fill="#D9A066" />
              <rect x="-3000" y={home.floorY} width="7000" height="10" fill="#B9773F" />
              <g transform={`translate(${layout.portrait ? 548 : 120} ${layout.portrait ? 610 : 130})`}>
                <rect x="-70" y="-70" width="140" height="140" rx="12" fill="#EAF7FB" stroke="#FFFDF5" strokeWidth="12" />
                <circle cx="24" cy="-22" r="24" fill="#FFC83D" />
                <path d="M0 -70 V70 M-70 0 H70" stroke="#FFFDF5" strokeWidth="8" />
              </g>

              {phase === "list" ? (
                <g transform={`translate(${home.list.x} ${home.list.y})`}>
                  <ShoppingList w={home.list.w} h={home.list.h} target={spec.target} kind={spec.target_kind} representation={spec.representation} />
                </g>
              ) : (
                <>
                  <Table layout={layout} />
                  {tableSpots.map((spot, i) => (
                    <g key={i} transform={`translate(${spot.x} ${spot.y})`}>
                      {onPlates && (
                        <g transform={`translate(0 ${tableSpacing * 0.08})`}>
                          <Plate r={tableSpacing * 0.45} />
                        </g>
                      )}
                      <g className="pop" style={{ animationDelay: `${150 + i * 110}ms` }}>
                        <Fruit kind={spec.target_kind} r={Math.min(38, tableSpacing * (onPlates ? 0.3 : 0.42))} />
                      </g>
                    </g>
                  ))}
                </>
              )}

              <g transform={`translate(${home.mom.x} ${home.mom.y}) scale(${home.mom.scale})`}>
                <Mom mood={mood} bag={phase === "list"} />
              </g>
              {phase === "done" && <Sparkles cx={home.table.cx} cy={home.table.rows[0] - 110} spread={home.table.width / 2.4} />}

              {phase === "list" && <SceneButton x={home.button.x} y={home.button.y} label="Go to the shop" icon="go" onPress={goToShop} />}
              {phase === "home" && <SceneButton x={home.button.x} y={home.button.y} label={isLast ? "All done" : "Next"} icon="go" onPress={next} />}
              {phase === "done" && <SceneButton x={home.button.x} y={home.button.y} label="Play again" icon="again" onPress={onPlayAgain} />}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function Table({ layout }: { layout: Layout }) {
  const { table, floorY } = layout.home;
  const top = table.rows[0] - 62;
  const bottom = table.rows[table.rows.length - 1] + 62;
  const left = table.cx - table.width / 2;
  return (
    <g>
      <rect x={left + 40} y={bottom - 20} width="22" height={floorY - bottom + 60} fill="#8A5328" />
      <rect x={left + table.width - 62} y={bottom - 20} width="22" height={floorY - bottom + 60} fill="#8A5328" />
      <rect x={left} y={top} width={table.width} height={bottom - top} rx="26" fill="#FFFDF5" />
      <rect x={left} y={top} width={table.width} height={bottom - top} rx="26" fill="url(#gingham)" />
      <defs>
        <pattern id="gingham" width="44" height="44" patternUnits="userSpaceOnUse">
          <rect width="22" height="44" fill="#E2463A" opacity=".16" />
          <rect width="44" height="22" fill="#E2463A" opacity=".16" />
        </pattern>
      </defs>
    </g>
  );
}

function Sparkles({ cx, cy, spread }: { cx: number; cy: number; spread: number }) {
  const stars = [
    [-0.9, 30, 18, "#FFC83D"],
    [-0.5, -40, 13, "#E2463A"],
    [-0.1, 10, 20, "#FFC83D"],
    [0.3, -50, 14, "#1F8A7A"],
    [0.7, -5, 18, "#FFC83D"],
    [1.0, 40, 12, "#E2463A"],
  ] as const;
  return (
    <g pointerEvents="none">
      {stars.map(([fx, dy, r, fill], i) => (
        <g key={i} transform={`translate(${cx + fx * spread} ${cy + dy})`}>
          <g className="sparkle" style={{ animationDelay: `${i * 90}ms` }}>
            <Star r={r} fill={fill} />
          </g>
        </g>
      ))}
    </g>
  );
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M-15 2 L0 -13 L15 2 M-10 -1 V13 H10 V-1" fill="none" stroke="#FFFDF5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />,
  go: <path d="M-12 0 H12 M3 -10 L13 0 L3 10" fill="none" stroke="#FFFDF5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />,
  again: (
    <path
      d="M11 -7 A13 13 0 1 0 13 4 M12 -15 V-6 H3"
      fill="none"
      stroke="#FFFDF5"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

/** A big button that lives inside the scene, so it scales with everything else. */
function SceneButton({
  x,
  y,
  label,
  icon,
  onPress,
  quiet = false,
}: {
  x: number;
  y: number;
  label: string;
  icon: keyof typeof ICONS;
  onPress: () => void;
  quiet?: boolean;
}) {
  // Press on pointer-up rather than on the browser's synthesised click: after a
  // quick flick of a fruit, touch browsers swallow the next tap's click, and a
  // child would press "Go home" and see nothing happen.
  const armed = useRef(false);
  const pressedAt = useRef(0);
  const textWidth = label.length * 15.5;
  const width = textWidth + 124;
  const left = -width / 2;
  return (
    <g
      className={`scene-button${quiet ? " quiet" : ""}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={() => {
        armed.current = true;
      }}
      onPointerLeave={() => {
        armed.current = false;
      }}
      onPointerUp={() => {
        if (!armed.current) return;
        armed.current = false;
        pressedAt.current = Date.now();
        onPress();
      }}
      onClick={() => {
        // Assistive technology sends a click with no pointer events before it.
        if (Date.now() - pressedAt.current > 700) onPress();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress();
        }
      }}
    >
      <rect x={left} y="-32" width={width} height="76" rx="38" fill="#14584E" />
      <rect className="face" x={left} y="-40" width={width} height="76" rx="38" fill="#1F8A7A" />
      <g className="face" transform={`translate(${left + 50} -2)`}>
        {ICONS[icon]}
      </g>
      <text className="face" x={left + 82} y="8" fontSize="28" fontWeight="700" fill="#FFFDF5" textLength={textWidth} lengthAdjust="spacingAndGlyphs">
        {label}
      </text>
      <rect className="focus-ring" x={-width / 2 - 7} y="-47" width={width + 14} height="98" rx="46" fill="none" stroke={INK} strokeWidth="4" />
    </g>
  );
}
