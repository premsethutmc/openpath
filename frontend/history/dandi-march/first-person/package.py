"""Make a single HTML file with embedded local style, media and script."""
import base64
from pathlib import Path
import sys

here = Path(__file__).resolve().parent
html = (here / 'index.html').read_text()
css = (here / 'walk.css').read_text()
script = (here / 'walk.mjs').read_text()

for name, mime in {
    'opening.mp4': 'video/mp4',
    'opening.webm': 'video/webm',
    'aslali.webp': 'image/webp',
    'salt.webp': 'image/webp',
    'walk.mp3': 'audio/mpeg',
    'salt.mp3': 'audio/mpeg',
}.items():
    data = base64.b64encode((here / 'assets' / name).read_bytes()).decode('ascii')
    url = f'data:{mime};base64,{data}'
    html = html.replace(f'./assets/{name}', url)
    css = css.replace(f'./assets/{name}', url)

html = html.replace('<link rel="stylesheet" href="./walk.css">', f'<style>{css}</style>')
html = html.replace('<script type="module" src="./walk.mjs"></script>', f'<script type="module">{script}</script>')
assert './assets/' not in html
Path(sys.argv[1]).write_text(html, encoding='utf-8')
