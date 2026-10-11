"""Pack the baked character parts into one atlas and encode all textures as WebP.

  python3 tools/pack.py   ->  public/assets/{mom.webp, l_*.webp, atlas.json}
"""
import json, os, sys
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
raw = os.path.join(root, "build/raw")
out = os.path.join(root, "public/assets")
os.makedirs(out, exist_ok=True)
meta = json.load(open(os.path.join(raw, "meta.json")))
PAD = 3

items = []
for pid, m in meta["parts"].items():
    im = Image.open(os.path.join(raw, f"p_{pid}.png")).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 2 else 0).getbbox()
    if bb is None:
        raise SystemExit(f"part {pid} baked empty")
    if m["strip"]:
        bb = (bb[0], 0, bb[2], im.height)  # strips keep their full length so the spine maps exactly
    bb = (max(0, bb[0] - 2), max(0, bb[1] - 2), min(im.width, bb[2] + 2), min(im.height, bb[3] + 2))
    crop = im.crop(bb)
    s = m["scale"]
    # the rectangle this image covers, in the part's own drawing units
    rect = [m["box"]["x"] + bb[0] / s, m["box"]["y"] + bb[1] / s, crop.width / s, crop.height / s]
    items.append((pid, crop, rect, m))

# shelf packing, tallest first
ATLAS_W = 2048
items.sort(key=lambda it: -it[1].height)
x = y = shelf = 0
place = {}
for pid, im, rect, m in items:
    if x + im.width + PAD > ATLAS_W:
        x, y, shelf = 0, y + shelf + PAD, 0
    place[pid] = (x, y)
    x += im.width + PAD
    shelf = max(shelf, im.height)
ATLAS_H = y + shelf
atlas = Image.new("RGBA", (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
frames = {}
for pid, im, rect, m in items:
    px, py = place[pid]
    atlas.paste(im, (px, py))
    frames[pid] = {"f": [px, py, im.width, im.height], "r": [round(v, 3) for v in rect], "p": m["pivot"], "s": m["scale"], "g": m["group"]}
atlas.save(os.path.join(out, "mom.webp"), "WEBP", quality=92, method=6, exact=False)

layers = {}
for lid, m in meta["layers"].items():
    im = Image.open(os.path.join(raw, f"l_{lid}.png")).convert("RGBA")
    opaque = im.getchannel("A").getextrema()[0] == 255
    name = f"l_{lid}.webp"
    (im.convert("RGB") if opaque else im).save(os.path.join(out, name), "WEBP", quality=86 if lid not in ("shafts", "vignette", "fg") else 80, method=6)
    layers[lid] = {"file": name, "box": m["box"], "s": m["scale"], "depth": m["depth"], "blend": m["blend"], "at": m["at"]}

json.dump({"ground": meta["ground"], "world": meta["world"], "atlas": {"file": "mom.webp", "w": ATLAS_W, "h": ATLAS_H}, "frames": frames, "layers": layers},
          open(os.path.join(out, "atlas.json"), "w"), separators=(",", ":"))
total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
print(f"atlas {ATLAS_W}x{ATLAS_H}, {len(frames)} frames, {len(layers)} layers, {total/1024:.0f} kB total")
