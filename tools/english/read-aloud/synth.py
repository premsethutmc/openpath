"""
Synthetic recordings for testing Read aloud (frontend/src/english/logic/read-aloud): espeak-ng speaks a text into a
16 kHz mono WAV. Robotic voices, not children: good for checking the pipeline end to end and for comparing settings,
not for claiming accuracy on real children.

  pip install espeakng-loader          (bundles libespeak-ng and its data; ffmpeg must be on PATH)
  python synth.py "<text>" <voice> <speed> <out.wav>      e.g. "the cat sat down" en-us 150 /tmp/cat.wav
  python synth.py --jobs jobs.json                         [{"say", "voice", "speed", "out"}, ...]
"""
import ctypes, json, struct, subprocess, sys, tempfile, wave

import espeakng_loader as el

lib = ctypes.cdll.LoadLibrary(el.get_library_path())
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
buf: list[int] = []


def _cb(wav, n, _ev):
    if wav and n > 0:
        buf.extend(wav[:n])
    return 0


_cbp = CB(_cb)
RATE = lib.espeak_Initialize(1, 0, el.get_data_path().encode(), 0)  # AUDIO_OUTPUT_RETRIEVAL
lib.espeak_SetSynthCallback(_cbp)


def say(text: str, voice: str, speed: int, out: str) -> None:
    buf.clear()
    lib.espeak_SetVoiceByName(voice.encode())
    lib.espeak_SetParameter(1, speed, 0)  # espeakRATE
    t = text.encode()
    lib.espeak_Synth(t, len(t) + 1, 0, 0, 0, 0x1000, None, None)  # espeakCHARS_AUTO|ENDPAUSE
    lib.espeak_Synchronize()
    with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
        with wave.open(raw.name, "wb") as w:
            w.setnchannels(1), w.setsampwidth(2), w.setframerate(RATE)
            w.writeframes(struct.pack(f"<{len(buf)}h", *buf))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw.name, "-ar", "16000", "-ac", "1", out], check=True)


if __name__ == "__main__":
    if sys.argv[1] == "--jobs":
        for j in json.load(open(sys.argv[2])):
            say(j["say"], j["voice"], j["speed"], j["out"])
    else:
        say(sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4])
