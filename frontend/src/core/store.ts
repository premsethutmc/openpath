/**
 * Where learning evidence is kept. Activities and screens talk to this
 * interface only, so the same game works against the Django API or entirely
 * on the family's device.
 */
import { curriculum } from "./curriculum";
import { ENGINE_VERSION, buildProfile, evaluateSession, planNextSession } from "./engine";
import { type Identity, uuid } from "./identity";
import { now } from "./clock";
import { load, remove, save } from "./storage";
import type { DatedObservation, Overview, SessionResult, SessionUpload, Status } from "./types";

export interface EvidenceStore {
  readonly kind: "device" | "server";
  overview(): Promise<Overview>;
  saveSession(upload: SessionUpload): Promise<SessionResult>;
  exportAll(): Promise<unknown>;
  erase(): Promise<void>;
}

/** Enrol a new pseudonymous learner. Consent has been confirmed by the caller. */
export async function enrol(apiBase: string | null, nickname: string): Promise<Identity> {
  const consent = { given_by: "guardian" as const, confirmed_at: new Date().toISOString() };
  if (!apiBase) return { learner_id: uuid(), nickname, consent };
  const response = await fetch(`${apiBase}/learners/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consent: { given_by: "guardian", confirmed: true } }),
  });
  if (!response.ok) throw new Error(`Could not create a learner record (${response.status}).`);
  const body = await response.json();
  return { learner_id: body.learner_id, access_token: body.access_token, nickname, consent };
}

export function openStore(apiBase: string | null, identity: Identity): EvidenceStore {
  return apiBase && identity.access_token ? new ServerStore(apiBase, identity) : new DeviceStore(identity);
}

/* ---------------------------------------------------------------- device */

interface StoredSession extends SessionUpload {
  /** Order of arrival, used as the session's identity in the engine. */
  index: number;
}

class DeviceStore implements EvidenceStore {
  readonly kind = "device" as const;
  private readonly key: string;

  constructor(private readonly identity: Identity) {
    this.key = `openpath.sessions.${identity.learner_id}`;
  }

  private sessions(): StoredSession[] {
    return load<StoredSession[]>(this.key, []);
  }

  private compute(sessions: StoredSession[], asOf: Date): Overview {
    const observations: DatedObservation[] = [];
    let completed = 0;
    for (const session of sessions) {
      const result = evaluateSession(session.events);
      if (result.integrity !== "ok") continue;
      if (session.finished) completed += 1;
      for (const o of result.observations) {
        observations.push({
          skill: o.skill,
          outcome: o.outcome,
          context: o.context,
          session: session.client_session_id,
          observed_at: session.ended_at,
        });
      }
    }
    const profile = buildProfile(curriculum, observations, asOf);
    return {
      learner_id: this.identity.learner_id,
      sessions_completed: completed,
      profile,
      next_session: planNextSession(profile, completed),
    };
  }

  async overview(): Promise<Overview> {
    return this.compute(this.sessions(), now());
  }

  async saveSession(upload: SessionUpload): Promise<SessionResult> {
    const all = this.sessions();
    const others = all.filter((s) => s.client_session_id !== upload.client_session_id);
    const existing = all.find((s) => s.client_session_id === upload.client_session_id);
    const before = this.compute(others, now());
    const sessions = [...others, { ...upload, index: existing?.index ?? all.length }].sort((a, b) => a.index - b.index);
    save(this.key, sessions);

    const evaluation = evaluateSession(upload.events);
    const asOf = new Date(Math.max(now().getTime(), Date.parse(upload.ended_at)));
    const after = this.compute(sessions, asOf);
    const was = new Map<string, Status>(before.profile.skills.map((s) => [s.key, s.status]));
    return {
      ...after,
      session: {
        client_session_id: upload.client_session_id,
        integrity: evaluation.integrity,
        problems: evaluation.problems,
        rounds: evaluation.rounds,
      },
      observations: evaluation.observations,
      changes: after.profile.skills
        .filter((s) => was.get(s.key) !== s.status)
        .map((s) => ({ skill: s.key, from: was.get(s.key)!, to: s.status })),
    };
  }

  async exportAll(): Promise<unknown> {
    const sessions = this.sessions();
    return {
      format: "openpath-export/1",
      exported_at: new Date().toISOString(),
      engine_version: ENGINE_VERSION,
      learner_id: this.identity.learner_id,
      consents: [this.identity.consent],
      sessions: sessions.map((s) => ({ ...s, observations: evaluateSession(s.events).observations })),
      profile: this.compute(sessions, now()).profile,
    };
  }

  async erase(): Promise<void> {
    remove(this.key);
  }
}

/* ---------------------------------------------------------------- server */

class ServerStore implements EvidenceStore {
  readonly kind = "server" as const;
  private readonly pendingKey: string;

  constructor(
    private readonly apiBase: string,
    private readonly identity: Identity,
  ) {
    this.pendingKey = `openpath.pending.${identity.learner_id}`;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.apiBase}/learners/${this.identity.learner_id}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.identity.access_token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!response.ok) throw new Error(`The server answered ${response.status}.`);
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  private put(upload: SessionUpload): Promise<SessionResult> {
    const { client_session_id, ...body } = upload;
    return this.request<SessionResult>(`sessions/${client_session_id}/`, { method: "PUT", body: JSON.stringify(body) });
  }

  /** Sessions that could not be sent earlier (offline, server down) go first. */
  private async flushPending(): Promise<void> {
    const pending = load<SessionUpload[]>(this.pendingKey, []);
    while (pending.length) {
      await this.put(pending[0]);
      pending.shift();
      save(this.pendingKey, pending);
    }
  }

  async overview(): Promise<Overview> {
    await this.flushPending();
    return this.request<Overview>("");
  }

  async saveSession(upload: SessionUpload): Promise<SessionResult> {
    try {
      await this.flushPending();
      return await this.put(upload);
    } catch (error) {
      const pending = load<SessionUpload[]>(this.pendingKey, []).filter(
        (s) => s.client_session_id !== upload.client_session_id,
      );
      save(this.pendingKey, [...pending, upload]);
      throw error;
    }
  }

  exportAll(): Promise<unknown> {
    return this.request("export/");
  }

  async erase(): Promise<void> {
    await this.request("", { method: "DELETE" });
    remove(this.pendingKey);
  }
}
