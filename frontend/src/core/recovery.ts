/**
 * Recovery files: how a family keeps (and restores) the link between their
 * child and a learner record. The file is theirs to store; nothing here is
 * sent anywhere.
 */
import { type Identity, setIdentity } from "./identity";
import { load, save } from "./storage";

const FORMAT = "openpath-recovery/1";

export function recoveryFile(identity: Identity): unknown {
  return {
    format: FORMAT,
    note: "Keep this file private. Anyone who has it can read and add to this learner's record.",
    identity,
    // Present only when evidence lives on this device rather than a server.
    device_sessions: identity.access_token ? undefined : load(`openpath.sessions.${identity.learner_id}`, []),
  };
}

export function restoreFromFile(text: string): Identity {
  const file = JSON.parse(text);
  if (file?.format !== FORMAT || typeof file.identity?.learner_id !== "string") {
    throw new Error("That is not an OpenPath recovery file.");
  }
  const identity = file.identity as Identity;
  setIdentity(identity);
  if (Array.isArray(file.device_sessions)) save(`openpath.sessions.${identity.learner_id}`, file.device_sessions);
  return identity;
}

export function download(filename: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
