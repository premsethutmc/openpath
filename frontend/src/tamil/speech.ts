/** icse-tamil@2: the device's own Tamil voice for listening questions. Nothing is recorded. No Tamil voice → listening is not offered. */
export async function tamilVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const pick = () => speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ta")) ?? null;
  const now = pick();
  if (now) return now;
  return new Promise((resolve) => {
    const done = () => resolve(pick());
    speechSynthesis.addEventListener?.("voiceschanged", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

export function say(text: string, voice: SpeechSynthesisVoice | null) {
  if (!voice || !("speechSynthesis" in window)) return;
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.8;
  speechSynthesis.resume?.();
  speechSynthesis.speak(u);
}
