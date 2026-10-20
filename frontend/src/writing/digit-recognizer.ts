/** Actual local pretrained MNIST inference. No service, credentials, training or synthetic lookup. */
import * as ort from "onnxruntime-web/wasm";
import type {
  Recognizer,
  Stroke,
  Rect,
  Region,
  RecognitionRequest,
  Candidate,
} from "./contract";
const box = (s: Stroke[]): Rect => {
  const p = s.flatMap((s) => s.points);
  const xs = p.map((p) => p.x),
    ys = p.map((p) => p.y);
  return {
    x: Math.min(...xs) - 3,
    y: Math.min(...ys) - 3,
    width: Math.max(...xs) - Math.min(...xs) + 6,
    height: Math.max(...ys) - Math.min(...ys) + 6,
  };
};
/** Group overlapping x-ranges; this is segmentation, not a newly trained recognizer. */
export function groups(strokes: Stroke[]) {
  const sorted = strokes
      .map((s) => ({ strokes: [s], bounds: box([s]) }))
      .sort((a, b) => a.bounds.x - b.bounds.x),
    out: typeof sorted = [];
  for (const s of sorted) {
    const prior = out.at(-1);
    if (prior && s.bounds.x <= prior.bounds.x + prior.bounds.width + 2) {
      prior.strokes.push(...s.strokes);
      prior.bounds = box(prior.strokes);
    } else out.push(s);
  }
  return out;
}
/** MNIST preprocessing: rasterize original strokes, aspect-preserving 20px ink in 28px black canvas. */
export function rasterize(strokes: Stroke[]): Float32Array {
  const b = box(strokes),
    c = document.createElement("canvas");
  c.width = c.height = 112;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 112, 112);
  const scale = 80 / Math.max(b.width, b.height);
  ctx.translate((112 - b.width * scale) / 2, (112 - b.height * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(-b.x, -b.y);
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, Math.min(4, Math.max(b.width, b.height) * 0.09));
  for (const s of strokes) {
    ctx.beginPath();
    s.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    if (s.points.length === 1) {
      ctx.arc(s.points[0].x, s.points[0].y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.stroke();
  }
  const small = document.createElement("canvas");
  small.width = small.height = 28;
  const dst = small.getContext("2d", { willReadFrequently: true })!;
  dst.drawImage(c, 0, 0, 28, 28);
  const pixels = dst.getImageData(0, 0, 28, 28).data;
  const image = new Float32Array(784);
  let sum = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < 784; i++) {
    image[i] = pixels[i * 4] / 255;
    sum += image[i];
    cx += (i % 28) * image[i];
    cy += Math.floor(i / 28) * image[i];
  }
  if (!sum) throw Error("No visible ink; type the intended number");
  const dx = Math.round(13.5 - cx / sum),
    dy = Math.round(13.5 - cy / sum),
    centered = new Float32Array(784);
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 28; x++) {
      const a = x - dx,
        b = y - dy;
      if (a >= 0 && a < 28 && b >= 0 && b < 28)
        centered[y * 28 + x] = image[b * 28 + a];
    }
  return centered;
}
export function probabilities(logits: ArrayLike<number>) {
  const max = Math.max(...Array.from(logits)),
    e = Array.from(logits, (x) => Math.exp(x - max)),
    sum = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / sum);
}
export class LocalDigitRecognizer implements Recognizer {
  readonly id = "onnx-mnist-digits@1";
  private session: Promise<ort.InferenceSession> | null = null;
  private base: string;
  constructor(base = "/recognition/") {
    this.base = base;
  }
  available() {
    return (
      typeof WebAssembly !== "undefined" && typeof document !== "undefined"
    );
  }
  private load() {
    if (!this.session) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = this.base;
      ort.env.wasm.proxy = false;
      this.session = ort.InferenceSession.create(this.base + "mnist.onnx", {
        executionProviders: ["wasm"],
      }).catch((e) => {
        this.session = null;
        throw Error(
          "Local digit recognition could not load. Type this part instead; no mathematical mistake was recorded.",
        );
      });
    }
    return this.session;
  }
  async classify(strokes: Stroke[], signal: AbortSignal) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const session = await this.load(),
      input = rasterize(strokes);
    const result = await session.run({
      [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 1, 28, 28]),
    });
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const p = probabilities(
        result[session.outputNames[0]].data as Float32Array,
      ),
      rank = p.map((p, d) => ({ p, d })).sort((a, b) => b.p - a.p);
    return {
      text: String(rank[0].d),
      confidence: rank[0].p,
      margin: rank[0].p - rank[1].p,
      alternatives: rank.slice(0, 3).map((x) => String(x.d)),
    };
  }
  async recognize(req: RecognitionRequest, signal: AbortSignal) {
    const candidates: Candidate[] = [];
    if (
      req.strokes.length > 500 ||
      req.strokes.reduce((n, s) => n + s.points.length, 0) > 30000
    )
      throw Error(
        "Please interpret a smaller piece of working, or type this region",
      );
    for (const region of req.regions) {
      const strokes = req.strokes.filter((s) => s.regionId === region.id);
      if (region.role === "expression" && strokes.length) {
        candidates.push({
          id:
            "expression:" +
            strokes
              .map((s) => s.id)
              .sort()
              .join(":"),
          text: "?",
          bounds: {
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
          },
          strokeIds: strokes.map((s) => s.id),
          regionId: region.id,
          confidence: null,
        });
        continue;
      }
      for (const g of groups(strokes)) {
        const pred = await this.classify(g.strokes, signal),
          r = region as Region;
        const bounds = {
          x: Math.max(r.x, g.bounds.x),
          y: Math.max(r.y, g.bounds.y),
          width: Math.min(
            g.bounds.width,
            r.x + r.width - Math.max(r.x, g.bounds.x),
          ),
          height: Math.min(
            g.bounds.height,
            r.y + r.height - Math.max(r.y, g.bounds.y),
          ),
        };
        if (bounds.width <= 0 || bounds.height <= 0)
          throw Error(
            "Writing is outside its region; select the region and type your intended input",
          );
        const id =
          "digit:" +
          g.strokes
            .map((s) => s.id)
            .sort()
            .join(":");
        candidates.push({
          id,
          text: pred.text,
          bounds,
          strokeIds: g.strokes.map((s) => s.id),
          regionId: r.id,
          confidence:
            g.strokes.reduce(
              (n, s) =>
                n +
                s.points
                  .slice(1)
                  .reduce(
                    (k, p, i) =>
                      k + Math.hypot(p.x - s.points[i].x, p.y - s.points[i].y),
                    0,
                  ),
              0,
            ) < 8 || g.bounds.width / g.bounds.height > 1.8
              ? null
              : pred.margin < 0.25
                ? Math.min(0.5, pred.confidence)
                : pred.confidence,
          alternatives: pred.alternatives,
        });
      }
    }
    return { revision: req.revision, provider: this.id, candidates };
  }
}
