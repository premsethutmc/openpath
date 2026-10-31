/**
 * A mocked model for the essay-to-diagnostic browser tests: deterministic outputs from
 * e2e/fixtures/essay-diagnostic-workflow.json (synthetic; they are not model outputs and measure no model).
 *
 *   node e2e/lib/essay-model-mock.mjs gateway [port]    stands in for OpenPath's server API (/api/evaluation/essays/…),
 *                                                       for a static preview with API_TARGET=http://127.0.0.1:<port>
 *   node e2e/lib/essay-model-mock.mjs provider [port]   stands in for the model provider (Anthropic Messages API,
 *                                                       POST /v1/messages), for Django's real gateway with
 *                                                       OPENPATH_LLM_BASE_URL=http://127.0.0.1:<port>
 *
 * GET /__mock/calls lists what reached the mock (task and protocol); POST /__mock/reset clears it.
 */
import { readFileSync } from "node:fs";
import http from "node:http";

export const FIXTURE = JSON.parse(readFileSync(new URL("../fixtures/essay-diagnostic-workflow.json", import.meta.url), "utf8"));
export const INFO = {
  available: true,
  reason: "",
  adapter: "llm",
  id: "openpath-gateway:llm",
  version: "essay-llm@1",
  model: "mock-model",
  rubric: "openpath.g8-writing@2",
  protocols: { observe: "essay-observe.v2", rewrite: "essay-rewrite.v2", questions: "essay-questions.v1" },
  synthetic_only: true,
};

/** The mocked model's answer to one request. */
export function answer(task, req) {
  if (task === "questions") {
    const rounds = FIXTURE.questions[req.competency.id] ?? [];
    const round = rounds.find((r) => !r.some((q) => req.avoid.includes(q.stem))) ?? rounds[0] ?? [];
    return { request_id: req.request_id, competency: req.competency.id, questions: structuredClone(round) };
  }
  if (task === "observe") {
    const key = Object.keys(FIXTURE.essays).find((k) => req.essay.text.includes(FIXTURE.essays[k].marker));
    return { essay_id: req.essay.id, rubric: req.rubric, observations: key ? FIXTURE.observations[key] : [], not_observable: [] };
  }
  throw new Error("the mocked model judges no rewrite");
}

const taskOf = (system) => (/essay-questions\.v1/.test(system) ? "questions" : /essay-observe\.v2/.test(system) ? "observe" : /essay-rewrite\.v2/.test(system) ? "rewrite" : "unknown");

export function startMock(mode, port) {
  const calls = [];
  const send = (res, status, body) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        if (req.url === "/__mock/calls") return send(res, 200, calls);
        if (req.url === "/__mock/reset") return send(res, 200, { reset: calls.splice(0).length });
        if (mode === "gateway") {
          if (req.method === "GET" && req.url.startsWith("/api/evaluation/essays/status/")) return send(res, 200, INFO);
          if (req.method === "POST" && req.url.startsWith("/api/evaluation/essays/")) {
            const body = JSON.parse(raw);
            calls.push({ task: body.task, data_use: body.data_use, protocol: body.request?.protocol });
            if (body.data_use !== "synthetic_test") return send(res, 403, { error: "only synthetic test essays are accepted" });
            const output = answer(body.task, body.request);
            return send(res, 200, { output, evaluator: { id: INFO.id, version: INFO.version, model: INFO.model, rubric: body.request.rubric, protocol: body.request.protocol }, record: calls.length });
          }
          // the rest of the account API: not here (as with no account server)
          return send(res, req.method === "GET" && req.url.startsWith("/api/account/") ? 200 : 404, { error: "not available in the mock" });
        }
        if (req.method === "POST" && req.url.startsWith("/v1/messages")) {
          const body = JSON.parse(raw);
          const task = taskOf(body.system ?? "");
          const request = JSON.parse(body.messages[0].content);
          calls.push({ task, protocol: request.protocol, key: req.headers["x-api-key"] ? "present" : "missing" });
          const text = JSON.stringify(answer(task, request));
          return send(res, 200, { id: `msg_mock_${calls.length}`, type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: Math.ceil(raw.length / 4), output_tokens: Math.ceil(text.length / 4) } });
        }
        return send(res, 404, { type: "error", error: { type: "not_found_error", message: "unknown path" } });
      } catch (e) {
        return send(res, 500, { type: "error", error: { type: "api_error", message: String(e.message) } });
      }
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, calls, port: server.address().port })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2];
  if (mode !== "gateway" && mode !== "provider") {
    console.error("usage: essay-model-mock.mjs gateway|provider [port]");
    process.exit(2);
  }
  const { port } = await startMock(mode, Number(process.argv[3] ?? (mode === "gateway" ? 8790 : 8791)));
  console.log(`essay model mock (${mode}) on http://127.0.0.1:${port}`);
}
