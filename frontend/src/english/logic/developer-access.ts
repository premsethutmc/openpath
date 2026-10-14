/**
 * What /developer should show on opening: the steps are "is there an account server", "is someone signed in",
 * "is that account a developer". Every outcome, including every failure, ends in a definite state with a message:
 * the page never waits for ever (each request has a time limit, see Api.request).
 */
import { type Api, ApiError } from "./account.ts";

export type Access =
  | { phase: "no-server" }
  | { phase: "signed-out" }
  | { phase: "not-developer"; commit: string }
  | { phase: "ready"; commit: string; mismatch: string | null }
  | { phase: "error"; title: string; message: string; detail: string };

const KNOWN = (v: string) => !!v && v !== "dev" && v !== "unknown";

/** A failure in words, with the technical detail kept separate (shown small, and safe to paste into a report). */
export function describeFailure(e: unknown, step: string): Extract<Access, { phase: "error" }> {
  if (e instanceof ApiError) {
    const detail = `${step}: ${e.reason === "http" ? `HTTP ${e.status}` : e.reason}${e.path ? ` (${e.path})` : ""}`;
    if (e.reason === "timeout") return { phase: "error", title: "The server did not answer", message: `${e.message} If this keeps happening, the API may have stopped: in the Codespace, run  bash .devcontainer/start-preview.sh`, detail };
    if (e.reason === "network") return { phase: "error", title: "OpenPath's server can't be reached", message: "Check the connection. If the Codespace has stopped, restart it at github.com/codespaces.", detail };
    if (e.status === 404 && e.path.startsWith("/developer/"))
      return {
        phase: "error",
        title: "The API server is older than this page",
        message: "The server answering here has no developer diagnostics: it is still running older code (for example after switching branches in the Codespace). In the Codespace, run  bash .devcontainer/start-preview.sh  — it restarts the API with the current code — then press Retry.",
        detail,
      };
    if (e.status === 502) return { phase: "error", title: "The OpenPath API is not running", message: "The app's server is up but the API behind it is not. In the Codespace, run  bash .devcontainer/start-preview.sh  and press Retry.", detail };
    return { phase: "error", title: "Something went wrong", message: e.message, detail };
  }
  return { phase: "error", title: "Something went wrong", message: e instanceof Error ? e.message : String(e), detail: `${step}: unexpected error` };
}

/** Decide what /developer shows. Never throws. */
export async function checkAccess(api: Api, appBuild: string): Promise<Access> {
  try {
    const s = await api.status();
    if (s.unreachable) return describeFailure(s.error ?? new ApiError(0, "unreachable", {}, "network", "/account/"), "account");
    if (!s.available) return { phase: "no-server" };
    if (!s.account.authenticated) return { phase: "signed-out" };
  } catch (e) {
    return describeFailure(e, "account");
  }
  try {
    const d = await api.developerStatus();
    if (!d || typeof d.developer !== "boolean") return describeFailure(new ApiError(200, "The server's answer was not understood.", {}, "http", "/developer/status/"), "developer status");
    if (!d.developer) return { phase: "not-developer", commit: d.commit };
    const mismatch = KNOWN(appBuild) && KNOWN(d.commit) && appBuild !== d.commit ? `This page is build ${appBuild} but the API is ${d.commit}. If something looks wrong, run  bash .devcontainer/start-preview.sh  in the Codespace to restart both on the same code.` : null;
    return { phase: "ready", commit: d.commit, mismatch };
  } catch (e) {
    // the session ended between the two requests: sign in again
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return { phase: "signed-out" };
    return describeFailure(e, "developer status");
  }
}
