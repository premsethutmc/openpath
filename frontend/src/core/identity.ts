/**
 * Who is playing, as far as this device knows.
 *
 * Play starts with a device-only record: a random ID and nothing else. The
 * record moves to a server only after a grown-up agrees (see enrolOnServer).
 *
 * The nickname never leaves the device: it is not sent to the server and is
 * not part of any evidence. The server (if there is one) knows only the
 * random learner ID. Whoever holds this record - the family - holds the link
 * between the child and their learning data.
 */
import { load, remove, save } from "./storage";

const KEY = "openpath.identity";

export interface Identity {
  learner_id: string;
  /** Present when evidence is kept on a server. */
  access_token?: string;
  /** Shown on this device only. */
  nickname: string;
  /** Set once a grown-up has agreed to the record being kept on a server. */
  consent: { given_by: "guardian"; confirmed_at: string } | null;
}

/** A learner record that exists only on this device. Nothing is sent anywhere. */
export function createLocalIdentity(): Identity {
  const identity: Identity = { learner_id: uuid(), nickname: "", consent: null };
  setIdentity(identity);
  return identity;
}

export const getIdentity = (): Identity | null => load<Identity | null>(KEY, null);
export const setIdentity = (identity: Identity): void => save(KEY, identity);
export const clearIdentity = (): void => remove(KEY);

export function uuid(): string {
  const random: Crypto = globalThis.crypto;
  if (typeof random.randomUUID === "function") return random.randomUUID();
  // randomUUID needs a secure context; plain http on a LAN address does not have it.
  const bytes = random.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
