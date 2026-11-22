"""Bundle this lesson into one self-contained offline document."""
import base64
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text()
css = (root / "scene.css").read_text()
entry = (root / "play.mjs").read_text()
story = (root / "story.mjs").read_text().replace("export ", "")
assert entry.startswith("import ") and "'./story.mjs';" in entry.splitlines()[0]
voice = (root / "voice.mjs").read_text().replace("export ", "")
assert "'./voice.mjs';" in entry.splitlines()[1]
entry = story + voice + entry.split("\n", 2)[2]
audio = []
for path in sorted((root / "assets/voice").glob("*.mp3")):
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    audio.append(f'<script type="application/octet-stream" id="offline-audio-{path.stem}">data:audio/mpeg;base64,{encoded}</script>')
assert len(audio) == 12, "Missing narration or broadcast track"
html = html.replace('<audio id="voice"', "".join(audio) + '<audio id="voice"')

for name in ("desk", "maidan", "street", "radio"):
    path = f"assets/{name}.webp"
    image = base64.b64encode((root / path).read_bytes()).decode("ascii")
    css = css.replace(f"./{path}", f"data:image/webp;base64,{image}")

html = html.replace('<link rel="stylesheet" href="./scene.css">', f"<style>{css}</style>")
html = html.replace('<script type="module" src="./play.mjs"></script>', f'<script type="module">{entry}</script>')
assert 'url(\'./assets/' not in html and 'src="./play.mjs"' not in html
Path(sys.argv[1]).write_text(html, encoding="utf-8")
