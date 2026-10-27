import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

export const GEOMETRY_WORKER_PROTOCOL = "openpath-geometry-worker@2" as const;
const MAX_REQUEST_BYTES = 1_000_000;
const MAX_RESPONSE_BYTES = 2_000_000;
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
export class GeometryTransportError extends Error { readonly kind = "geometry-transport"; }

class GeometryWorker {
  private child: ChildProcessWithoutNullStreams | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private buffer = "";
  private starts = 0;
  private pid: number | null = null;
  constructor(private root: string, private python: string) {}
  diagnostics() { return { pid: this.pid, starts: this.starts, pending: this.pending.size, protocol: GEOMETRY_WORKER_PROTOCOL }; }
  private start() {
    if (this.child && !this.child.killed) return;
    const child = spawn(this.python, ["-m", "geometry_reasoner.worker"], { cwd: this.root, env: { ...process.env, PYTHONPATH: "." }, stdio: ["pipe", "pipe", "pipe"] });
    this.child = child; this.pid = child.pid ?? null; this.starts++; this.buffer = "";
    const decoder = new StringDecoder("utf8");
    child.stdout.on("data", (data: Buffer) => { this.buffer += decoder.write(data); if (Buffer.byteLength(this.buffer) > MAX_RESPONSE_BYTES) return this.fail(new GeometryTransportError("geometry response exceeds maximum size")); let newline; while ((newline = this.buffer.indexOf("\n")) >= 0) { const line = this.buffer.slice(0, newline); this.buffer = this.buffer.slice(newline + 1); this.receive(line); } });
    child.on("error", (error) => { if (this.child === child) this.fail(new GeometryTransportError(`geometry worker error: ${error.message}`)); });
    child.on("exit", () => { if (this.child === child) this.fail(new GeometryTransportError("geometry worker exited")); });
  }
  private receive(line: string) {
    let message: any; try { message = JSON.parse(line); } catch { return this.fail(new GeometryTransportError("geometry worker returned malformed JSON")); }
    if (message?.protocol !== GEOMETRY_WORKER_PROTOCOL || !Number.isInteger(message?.id)) return this.fail(new GeometryTransportError("geometry worker protocol violation"));
    const pending = this.pending.get(message.id); if (!pending) return;
    clearTimeout(pending.timer); this.pending.delete(message.id);
    if (message.ok === true) pending.resolve(message.result); else pending.reject(new GeometryTransportError(String(message.transport_error ?? "geometry transport failed")));
  }
  private fail(error: Error) {
    const child = this.child; this.child = null; this.pid = null; this.buffer = "";
    if (child && !child.killed) child.kill("SIGKILL");
    for (const value of this.pending.values()) { clearTimeout(value.timer); value.reject(error); }
    this.pending.clear();
  }
  request(operation: "health" | "assess", payload: unknown, timeoutMs: number): Promise<unknown> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) { this.fail(new GeometryTransportError("geometry request timed out")); return Promise.reject(new GeometryTransportError("geometry request timed out")); }
    this.start();
    const id = this.nextId++;
    const encoded = JSON.stringify({ protocol: GEOMETRY_WORKER_PROTOCOL, id, operation, payload }) + "\n";
    if (Buffer.byteLength(encoded) > MAX_REQUEST_BYTES) return Promise.reject(new GeometryTransportError("geometry request exceeds maximum size"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new GeometryTransportError("geometry request timed out")); this.fail(new GeometryTransportError("geometry worker restarted after timeout")); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin.write(encoded, (error) => { if (error) this.fail(new GeometryTransportError(`geometry worker write failed: ${error.message}`)); });
    });
  }
  stop() { this.fail(new GeometryTransportError("geometry worker stopped")); }
}

const workers = new Map<string, GeometryWorker>();
function getWorker(root: string, python: string) { const key = `${python}\0${root}`; let worker = workers.get(key); if (!worker) { worker = new GeometryWorker(root, python); workers.set(key, worker); } return worker; }
export async function requestGeometryWorker(root: string, python: string, payload: unknown, timeoutMs = 5000) { return getWorker(root, python).request("assess", payload, timeoutMs); }
export async function healthGeometryWorker(root: string, python = "python3", timeoutMs = 1000) { return getWorker(root, python).request("health", null, timeoutMs); }
export function geometryWorkerDiagnostics(root: string, python = "python3") { return getWorker(root, python).diagnostics(); }
export function terminateGeometryWorker(root: string, python = "python3") { getWorker(root, python).stop(); }
export function stopGeometryWorkers() { for (const worker of workers.values()) worker.stop(); workers.clear(); }
