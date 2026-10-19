/**
 * Pictures for questions and lessons (family-kit Visual): drawn as SVG from the family's numbers, so a picture is
 * always exactly the mathematics of its question. Every picture has a text description (aria-label) that says the
 * same thing in words, so a learner using a screen reader gets the same question.
 */
type V = { type: string; [k: string]: unknown };
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));

export function describe(v: V): string {
  switch (v.type) {
    case "dots":
      return `${num(v.count)} objects`;
    case "tenframe":
      return `${num(v.frames, 1)} ten frame${num(v.frames, 1) > 1 ? "s" : ""} with ${num(v.filled)} counters`;
    case "blocks":
      return `Base-ten blocks: ${num(v.hundreds)} hundreds, ${num(v.tens)} tens and ${num(v.ones)} ones`;
    case "numberline":
      return `A number line from ${minus(num(v.from))} to ${minus(num(v.to))}${arr<number>(v.marks).length ? `, marked at ${arr<number>(v.marks).map(minus).join(", ")}` : ""}${arr<[number, number]>(v.jumps).length ? `, with jumps ${arr<[number, number]>(v.jumps).map(([a, b]) => `${minus(a)} to ${minus(b)}`).join(", ")}` : ""}`;
    case "clock":
      return "A clock face (read the time from the hands)";
    case "coins":
      return `Money: ${arr<number>(v.items).map((x) => `₹${x}`).join(", ")}`;
    case "bars":
      return `A bar chart${v.title ? ` of ${str(v.title)}` : ""}: ${arr<string>(v.labels).map((l, i) => `${l} ${arr<number>(v.values)[i]}`).join(", ")}`;
    case "pictograph":
      return `A pictograph where one picture stands for ${num(v.key, 1)}: ${arr<string>(v.labels).map((l, i) => `${l} ${arr<number>(v.counts)[i] / num(v.key, 1)} pictures`).join(", ")}`;
    case "table":
      return `A table: ${arr<string>(v.head).join(", ")}; ${arr<(string | number)[]>(v.rows).map((r) => r.join(", ")).join("; ")}`;
    case "shape":
      return `A ${str(v.name) || `${num(v.sides)}-sided shape`}${arr(v.lengths).length ? ` with sides ${arr(v.lengths).join(", ")}` : ""}`;
    case "angle":
      return "An angle (estimate or measure it)";
    case "circle":
      return `A circle${v.radius !== undefined ? ` with radius ${str(v.radius)}` : ""}${v.diameter !== undefined ? ` with diameter ${str(v.diameter)}` : ""}${v.sector !== undefined ? `, a sector of ${num(v.sector)}°` : ""}`;
    case "grid":
      return `A grid of ${num(v.rows)} rows and ${num(v.cols)} columns${num(v.shaded) ? ` with ${num(v.shaded)} squares shaded` : ""}`;
    case "triangle":
      return `A triangle${arr(v.sides).length ? ` with sides ${arr(v.sides).join(", ")}` : ""}${arr(v.angles).length ? ` and angles ${arr(v.angles).join(", ")}` : ""}${v.right ? ", right-angled" : ""}`;
    case "plane":
      return `Coordinate axes with points ${arr<[number, number, string?]>(v.points).map(([x, y, l]) => `${l ? `${l} ` : ""}(${minus(x)}, ${minus(y)})`).join(", ")}`;
    case "pie":
      return `A pie chart: ${arr<string>(v.labels).map((l, i) => `${l} ${arr<number>(v.values)[i]}`).join(", ")}`;
    case "solid":
      return `A ${str(v.name)}${arr(v.dims).length ? ` (${arr(v.dims).join(", ")})` : ""}`;
    case "balance":
      return `A balance: ${str(v.left)} on the left, ${str(v.right)} on the right`;
    default:
      return "A picture";
  }
}

const INK = "var(--ink, #1f2a37)";
const ACC = "var(--accent, #2f6fde)";
const SOFT = "var(--soft, #dbe6f7)";

export function Figure({ v }: { v: V }) {
  const label = describe(v);
  const box = (w: number, h: number, body: JSX.Element | JSX.Element[]) => (
    <figure className="figure" aria-label={label} role="img">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: Math.min(w, 420) }} aria-hidden="true">
        {body}
      </svg>
    </figure>
  );
  switch (v.type) {
    case "dots": {
      const n = num(v.count);
      const per = n > 10 ? 10 : n;
      const rows = Math.ceil(n / per);
      return box(per * 30 + 10, rows * 30 + 10, Array.from({ length: n }, (_, i) => <circle key={i} cx={20 + (i % per) * 30} cy={20 + Math.floor(i / per) * 30} r={11} fill={ACC} />));
    }
    case "tenframe": {
      const frames = Math.max(1, num(v.frames, 1));
      const filled = num(v.filled);
      const out: JSX.Element[] = [];
      for (let f = 0; f < frames; f++)
        for (let i = 0; i < 10; i++) {
          const x = 6 + (i % 5) * 32;
          const y = 6 + f * 74 + Math.floor(i / 5) * 32;
          out.push(<rect key={`r${f}-${i}`} x={x} y={y} width={32} height={32} fill="none" stroke={INK} />);
          if (f * 10 + i < filled) out.push(<circle key={`c${f}-${i}`} cx={x + 16} cy={y + 16} r={11} fill={ACC} />);
        }
      return box(172, frames * 74, out);
    }
    case "blocks": {
      const h = num(v.hundreds);
      const t = num(v.tens);
      const o = num(v.ones);
      const out: JSX.Element[] = [];
      let x = 6;
      for (let i = 0; i < h; i++, x += 56) out.push(<rect key={`h${i}`} x={x} y={6} width={50} height={50} fill={SOFT} stroke={INK} />);
      for (let i = 0; i < t; i++, x += 12) out.push(<rect key={`t${i}`} x={x} y={6} width={9} height={50} fill={ACC} stroke={INK} strokeWidth={0.5} />);
      x += 6;
      for (let i = 0; i < o; i++) out.push(<rect key={`o${i}`} x={x + (i % 5) * 11} y={6 + Math.floor(i / 5) * 11} width={9} height={9} fill={ACC} stroke={INK} strokeWidth={0.5} />);
      return box(Math.max(80, x + 60), 64, out);
    }
    case "numberline": {
      const from = num(v.from);
      const to = num(v.to, from + 10);
      const span = Math.max(1, to - from);
      const step = num(v.step, span <= 20 ? 1 : Math.ceil(span / 10));
      const X = (n: number) => 20 + ((n - from) / span) * 360;
      const out: JSX.Element[] = [<line key="axis" x1={10} y1={60} x2={390} y2={60} stroke={INK} strokeWidth={2} />];
      for (let n = from; n <= to + 1e-9; n += step) {
        out.push(<line key={`t${n}`} x1={X(n)} y1={54} x2={X(n)} y2={66} stroke={INK} />);
        out.push(<text key={`l${n}`} x={X(n)} y={84} fontSize={12} textAnchor="middle" fill={INK}>{num(v.unknown, NaN) === n ? "?" : minus(Math.round(n * 100) / 100)}</text>);
      }
      for (const m of arr<number>(v.marks)) out.push(<circle key={`m${m}`} cx={X(m)} cy={60} r={6} fill={ACC} />);
      arr<[number, number]>(v.jumps).forEach(([a, b], i) => out.push(<path key={`j${i}`} d={`M ${X(a)} 54 Q ${(X(a) + X(b)) / 2} ${14} ${X(b)} 54`} fill="none" stroke={ACC} strokeWidth={2} markerEnd="" />));
      return box(400, 96, out);
    }
    case "clock": {
      const h = num(v.h) % 12;
      const m = num(v.m);
      const ang = (deg: number, r: number) => [100 + r * Math.sin((deg * Math.PI) / 180), 100 - r * Math.cos((deg * Math.PI) / 180)];
      const [hx, hy] = ang(h * 30 + m * 0.5, 45);
      const [mx, my] = ang(m * 6, 70);
      return box(200, 200, [
        <circle key="face" cx={100} cy={100} r={90} fill="#fff" stroke={INK} strokeWidth={3} />,
        ...Array.from({ length: 12 }, (_, i) => {
          const [x, y] = ang((i + 1) * 30, 74);
          return <text key={`n${i}`} x={x} y={y + 6} fontSize={16} textAnchor="middle" fill={INK}>{i + 1}</text>;
        }),
        ...Array.from({ length: 60 }, (_, i) => {
          const [x1, y1] = ang(i * 6, 86);
          const [x2, y2] = ang(i * 6, i % 5 ? 82 : 79);
          return <line key={`k${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={i % 5 ? 1 : 2} />;
        }),
        <line key="h" x1={100} y1={100} x2={hx} y2={hy} stroke={INK} strokeWidth={6} strokeLinecap="round" />,
        <line key="m" x1={100} y1={100} x2={mx} y2={my} stroke={ACC} strokeWidth={4} strokeLinecap="round" />,
        <circle key="c" cx={100} cy={100} r={5} fill={INK} />,
      ]);
    }
    case "coins": {
      const items = arr<number>(v.items);
      let x = 6;
      const out: JSX.Element[] = [];
      items.forEach((c, i) => {
        if (c >= 10 && c !== 10 && c !== 20) {
          // a note
          out.push(<rect key={`n${i}`} x={x} y={14} width={86} height={44} rx={4} fill={SOFT} stroke={INK} />, <text key={`t${i}`} x={x + 43} y={42} fontSize={16} textAnchor="middle" fill={INK}>₹{c}</text>);
          x += 94;
        } else {
          out.push(<circle key={`c${i}`} cx={x + 26} cy={36} r={24} fill="#f3e3a6" stroke={INK} />, <text key={`t${i}`} x={x + 26} y={42} fontSize={16} textAnchor="middle" fill={INK}>₹{c}</text>);
          x += 58;
        }
      });
      return box(Math.max(60, x), 72, out);
    }
    case "bars":
    case "pictograph": {
      const labels = arr<string>(v.labels);
      const values = v.type === "bars" ? arr<number>(v.values) : arr<number>(v.counts);
      if (v.type === "pictograph") {
        const key = num(v.key, 1);
        const out: JSX.Element[] = [];
        labels.forEach((l, i) => {
          out.push(<text key={`l${i}`} x={4} y={30 + i * 34} fontSize={13} fill={INK}>{l}</text>);
          const n = values[i] / key;
          for (let k = 0; k < Math.floor(n); k++) out.push(<circle key={`p${i}-${k}`} cx={110 + k * 26} cy={25 + i * 34} r={10} fill={ACC} />);
          if (n % 1) out.push(<path key={`half${i}`} d={`M ${110 + Math.floor(n) * 26} ${15 + i * 34} A 10 10 0 0 0 ${110 + Math.floor(n) * 26} ${35 + i * 34} Z`} fill={ACC} />);
        });
        out.push(<text key="key" x={4} y={30 + labels.length * 34} fontSize={12} fill={INK}>Key: ● = {key}</text>);
        return box(420, 44 + labels.length * 34, out);
      }
      const max = Math.max(1, ...values);
      const scale = num(v.scale, max <= 10 ? 1 : max <= 50 ? 5 : max <= 100 ? 10 : Math.ceil(max / 10));
      const top = Math.ceil(max / scale) * scale;
      const H = 160;
      const bw = Math.min(50, 300 / Math.max(1, labels.length));
      const out: JSX.Element[] = [<line key="y" x1={40} y1={10} x2={40} y2={10 + H} stroke={INK} />, <line key="x" x1={40} y1={10 + H} x2={400} y2={10 + H} stroke={INK} />];
      for (let t = 0; t <= top; t += scale) {
        const y = 10 + H - (t / top) * H;
        out.push(<line key={`g${t}`} x1={36} y1={y} x2={400} y2={y} stroke={SOFT} />, <text key={`gt${t}`} x={32} y={y + 4} fontSize={11} textAnchor="end" fill={INK}>{t}</text>);
      }
      labels.forEach((l, i) => {
        const h = (values[i] / top) * H;
        const x = 50 + i * (bw + 12);
        out.push(<rect key={`b${i}`} x={x} y={10 + H - h} width={bw} height={h} fill={ACC} />, <text key={`bl${i}`} x={x + bw / 2} y={28 + H} fontSize={11} textAnchor="middle" fill={INK}>{l}</text>);
      });
      return box(410, H + 40, out);
    }
    case "table": {
      const head = arr<string>(v.head);
      const rows = arr<(string | number)[]>(v.rows);
      return (
        <figure className="figure" aria-label={label}>
          <table className="data">
            <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" ? minus(c) : c}</td>)}</tr>)}</tbody>
          </table>
        </figure>
      );
    }
    case "shape": {
      const n = Math.max(3, num(v.sides, 4));
      const lengths = arr<string | number>(v.lengths);
      const pts = Array.from({ length: n }, (_, i) => [110 + 80 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), 100 + 80 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)]);
      return box(220, 200, [
        <polygon key="p" points={pts.map((p) => p.join(",")).join(" ")} fill={SOFT} stroke={INK} strokeWidth={2} />,
        ...lengths.map((l, i) => {
          const [a, b] = [pts[i], pts[(i + 1) % n]];
          return <text key={`l${i}`} x={(a[0] + b[0]) / 2 + ((a[0] + b[0]) / 2 - 110) * 0.18} y={(a[1] + b[1]) / 2 + ((a[1] + b[1]) / 2 - 100) * 0.18 + 4} fontSize={13} textAnchor="middle" fill={INK}>{String(l)}</text>;
        }),
      ]);
    }
    case "angle": {
      const d = num(v.deg);
      const r = (deg: number, len: number) => [40 + len * Math.cos((-deg * Math.PI) / 180), 150 + len * Math.sin((-deg * Math.PI) / 180)];
      const [x, y] = r(d, 140);
      const [ax, ay] = r(d, 30);
      return box(260, 170, [
        <line key="a" x1={40} y1={150} x2={220} y2={150} stroke={INK} strokeWidth={3} />,
        <line key="b" x1={40} y1={150} x2={x} y2={y} stroke={INK} strokeWidth={3} />,
        <path key="arc" d={`M 70 150 A 30 30 0 ${d > 180 ? 1 : 0} 0 ${ax} ${ay}`} fill="none" stroke={ACC} strokeWidth={2} />,
      ]);
    }
    case "circle": {
      const sector = num(v.sector, 0);
      const end = (deg: number) => [110 + 80 * Math.cos((-deg * Math.PI) / 180), 100 + 80 * Math.sin((-deg * Math.PI) / 180)];
      const [ex, ey] = end(sector);
      return box(220, 200, [
        <circle key="c" cx={110} cy={100} r={80} fill={SOFT} stroke={INK} strokeWidth={2} />,
        <circle key="o" cx={110} cy={100} r={3} fill={INK} />,
        ...(v.diameter !== undefined ? [<line key="d" x1={30} y1={100} x2={190} y2={100} stroke={ACC} strokeWidth={2} />, <text key="dt" x={110} y={92} fontSize={13} textAnchor="middle" fill={INK}>{str(v.diameter)}</text>] : []),
        ...(v.radius !== undefined && v.diameter === undefined ? [<line key="r" x1={110} y1={100} x2={190} y2={100} stroke={ACC} strokeWidth={2} />, <text key="rt" x={150} y={92} fontSize={13} textAnchor="middle" fill={INK}>{str(v.radius)}</text>] : []),
        ...(sector ? [<path key="s" d={`M 110 100 L 190 100 A 80 80 0 ${sector > 180 ? 1 : 0} 0 ${ex} ${ey} Z`} fill={ACC} opacity={0.35} />] : []),
      ]);
    }
    case "grid": {
      const rows = num(v.rows, 3);
      const cols = num(v.cols, 4);
      const shaded = num(v.shaded);
      const s = Math.min(30, 360 / Math.max(rows, cols));
      return box(cols * s + 4, rows * s + 4, Array.from({ length: rows * cols }, (_, i) => <rect key={i} x={2 + (i % cols) * s} y={2 + Math.floor(i / cols) * s} width={s} height={s} fill={i < shaded ? ACC : "#fff"} stroke={INK} />));
    }
    case "triangle": {
      const sides = arr<string>(v.sides);
      const angles = arr<string>(v.angles);
      const P = v.right ? [[30, 160], [230, 160], [30, 30]] : [[20, 160], [240, 160], [100, 30]];
      const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      return box(260, 190, [
        <polygon key="t" points={P.map((p) => p.join(",")).join(" ")} fill={SOFT} stroke={INK} strokeWidth={2} />,
        ...(v.right ? [<path key="sq" d="M 30 145 L 45 145 L 45 160" fill="none" stroke={INK} />] : []),
        ...sides.map((s, i) => {
          const [x, y] = mid(P[i], P[(i + 1) % 3]);
          return <text key={`s${i}`} x={x + (i === 0 ? 0 : i === 1 ? 14 : -14)} y={y + (i === 0 ? 20 : 0)} fontSize={13} textAnchor="middle" fill={INK}>{s}</text>;
        }),
        ...angles.map((a, i) => <text key={`a${i}`} x={P[i][0] + (i === 1 ? -28 : i === 0 ? 22 : 0)} y={P[i][1] + (i === 2 ? 26 : -8)} fontSize={12} textAnchor="middle" fill={ACC}>{a}</text>),
      ]);
    }
    case "plane": {
      const R = Math.max(5, num(v.range, 6));
      const X = (x: number) => 110 + (x / R) * 100;
      const Y = (y: number) => 110 - (y / R) * 100;
      const out: JSX.Element[] = [];
      for (let k = -R; k <= R; k++) out.push(<line key={`gx${k}`} x1={X(k)} y1={10} x2={X(k)} y2={210} stroke={SOFT} />, <line key={`gy${k}`} x1={10} y1={Y(k)} x2={210} y2={Y(k)} stroke={SOFT} />);
      out.push(<line key="xa" x1={10} y1={110} x2={210} y2={110} stroke={INK} />, <line key="ya" x1={110} y1={10} x2={110} y2={210} stroke={INK} />, <text key="xl" x={204} y={124} fontSize={12} fill={INK}>x</text>, <text key="yl" x={116} y={20} fontSize={12} fill={INK}>y</text>);
      arr<[[number, number], [number, number]]>(v.segments).forEach(([a, b], i) => out.push(<line key={`s${i}`} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={ACC} strokeWidth={2} />));
      arr<[number, number, string?]>(v.points).forEach(([x, y, l], i) => out.push(<circle key={`p${i}`} cx={X(x)} cy={Y(y)} r={4} fill={ACC} />, <text key={`pl${i}`} x={X(x) + 6} y={Y(y) - 6} fontSize={12} fill={INK}>{l ?? ""}</text>));
      return box(220, 220, out);
    }
    case "pie": {
      const labels = arr<string>(v.labels);
      const values = arr<number>(v.values);
      const total = values.reduce((a, b) => a + b, 0) || 1;
      let a0 = -Math.PI / 2;
      const colours = [ACC, "#e9a23b", "#3aa17e", "#c4536b", "#7b61c9", "#5aa9c9"];
      const out: JSX.Element[] = [];
      values.forEach((val, i) => {
        const a1 = a0 + (val / total) * 2 * Math.PI;
        const [x0, y0, x1, y1] = [100 + 80 * Math.cos(a0), 100 + 80 * Math.sin(a0), 100 + 80 * Math.cos(a1), 100 + 80 * Math.sin(a1)];
        out.push(<path key={`s${i}`} d={`M 100 100 L ${x0} ${y0} A 80 80 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z`} fill={colours[i % colours.length]} stroke="#fff" />);
        out.push(<text key={`l${i}`} x={210} y={24 + i * 20} fontSize={12} fill={colours[i % colours.length]}>■ {labels[i]}</text>);
        a0 = a1;
      });
      return box(330, 200, out);
    }
    case "solid": {
      const name = str(v.name, "cube");
      const dims = arr<string>(v.dims);
      const body: Record<string, JSX.Element[]> = {
        cube: [<rect key="f" x={30} y={60} width={100} height={100} fill={SOFT} stroke={INK} />, <path key="t" d="M 30 60 L 70 25 L 170 25 L 130 60 Z M 130 60 L 170 25 L 170 125 L 130 160" fill="#fff" stroke={INK} />],
        cuboid: [<rect key="f" x={20} y={70} width={140} height={80} fill={SOFT} stroke={INK} />, <path key="t" d="M 20 70 L 60 35 L 200 35 L 160 70 Z M 160 70 L 200 35 L 200 115 L 160 150" fill="#fff" stroke={INK} />],
        cylinder: [<ellipse key="t" cx={100} cy={40} rx={60} ry={16} fill="#fff" stroke={INK} />, <path key="s" d="M 40 40 L 40 150 A 60 16 0 0 0 160 150 L 160 40" fill={SOFT} stroke={INK} />],
        cone: [<path key="s" d="M 100 20 L 40 150 A 60 16 0 0 0 160 150 Z" fill={SOFT} stroke={INK} />],
        sphere: [<circle key="s" cx={100} cy={95} r={70} fill={SOFT} stroke={INK} />, <ellipse key="e" cx={100} cy={95} rx={70} ry={18} fill="none" stroke={INK} strokeDasharray="4 3" />],
        pyramid: [<path key="s" d="M 100 20 L 30 150 L 150 160 Z M 100 20 L 150 160 L 190 130 Z" fill={SOFT} stroke={INK} />],
      };
      return box(220, 180, [...(body[name] ?? body.cube), ...dims.map((d, i) => <text key={`d${i}`} x={8} y={175 - i * 16} fontSize={12} fill={INK}>{d}</text>)]);
    }
    case "balance":
      return box(320, 140, [
        <polygon key="b" points="150,130 170,130 160,60" fill={INK} />,
        <line key="beam" x1={40} y1={60} x2={280} y2={60} stroke={INK} strokeWidth={4} />,
        <rect key="l" x={30} y={30} width={100} height={28} rx={4} fill={SOFT} stroke={INK} />,
        <rect key="r" x={190} y={30} width={100} height={28} rx={4} fill={SOFT} stroke={INK} />,
        <text key="lt" x={80} y={49} fontSize={14} textAnchor="middle" fill={INK}>{str(v.left)}</text>,
        <text key="rt" x={240} y={49} fontSize={14} textAnchor="middle" fill={INK}>{str(v.right)}</text>,
      ]);
    default:
      return <figure className="figure" aria-label={label}><p>{label}</p></figure>;
  }
}
