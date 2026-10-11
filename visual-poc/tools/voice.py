"""Placeholder voice: synthesise Amma's Tamil lines and derive the lip-sync tracks.

Needs the small `say` helper (tools/tts/say.c, built against eSpeak NG). The generated
files are committed, so this only has to run when a line changes.

  SAY=/path/to/say python3 tools/voice.py  ->  public/assets/voice_*.wav + voices.json
"""
import json, os, subprocess, wave
import numpy as np

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out = os.path.join(root, "public/assets")
SAY = os.environ.get("SAY", "say")
VOICE, RATE, PITCH = "ta+f3", "132", "60"

LINES = {
    # id: (Tamil, transliteration, meaning)
    "main": ("வா செல்லம், கடைக்குப் போகலாம்!", "Vaa chellam, kadaikku pogalaam!", "Come, darling, let's go to the shop!"),
    "enna": ("என்ன செல்லம்?", "Enna chellam?", "What is it, darling?"),
    "ithanai": ("இத்தனை ஆப்பிள் வேண்டும்!", "Ithanai apple vendum!", "We need this many apples!"),
}

def mouth(ph):
    p = ph.lstrip("',%=")
    if p.startswith("_"): return ("rest", 0.0)
    if p[:2] in ("a:", "aI", "aU"): return ("a", 1.0)
    if p[0] in "aV": return ("a", 0.7)
    if p[0] in "eEiI": return ("e", 0.9)
    if p[0] in "oOuU": return ("o", 0.9)
    if p[0] in "mpb": return ("m", 0.0)
    if p[0] in "vfw": return ("m", 0.2)
    return ("e", 0.5)  # other consonants: teeth showing, nearly closed

voices = {}
for vid, (text, translit, meaning) in LINES.items():
    wav, js = os.path.join(out, f"voice_{vid}.wav"), f"/tmp/voice_{vid}.json"
    subprocess.run([SAY, VOICE, RATE, PITCH, wav, js, text], check=True)
    ev = json.load(open(js))
    with wave.open(wav) as w:
        sr, n = w.getframerate(), w.getnframes()
        pcm = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    # trim trailing silence, normalise, and write back
    loud = np.where(np.abs(pcm) > 0.01)[0]
    end = min(len(pcm), loud[-1] + int(sr * 0.12))
    pcm = pcm[:end] * (0.89 / max(1e-6, np.abs(pcm).max()))
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    hop = sr // 50
    env = [float(np.sqrt(np.mean(pcm[i:i + hop] ** 2))) for i in range(0, len(pcm), hop)]
    peak = max(env) or 1.0
    track, stress = [], []
    for t, ph in ev["events"]:
        if ph.startswith("#"): continue
        m, o = mouth(ph)
        if track and track[-1][1] == m and abs(track[-1][2] - o) < 0.01: continue
        track.append([round(t / 1000, 3), m, o])
        if ph.startswith("'"): stress.append(round(t / 1000, 3))
    voices[vid] = {"file": f"voice_{vid}.wav", "dur": round(len(pcm) / sr, 3), "text": text, "translit": translit, "meaning": meaning,
                   "mouth": track, "stress": stress, "env": [round(min(1.0, e / peak), 2) for e in env]}
    print(vid, voices[vid]["dur"], "s,", len(track), "mouth keys")
json.dump(voices, open(os.path.join(out, "voices.json"), "w"), ensure_ascii=False, separators=(",", ":"))
