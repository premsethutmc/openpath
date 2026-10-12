"""Review aid: tile stills into one contact sheet.  python3 tools/contact.py <dir> <out.png> [cols] [width]"""
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
cw = int(sys.argv[4]) if len(sys.argv) > 4 else 480
files = sorted(f for f in os.listdir(d) if f.startswith("t") and f.endswith(".png"))
ims = [Image.open(os.path.join(d, f)).convert("RGB") for f in files]
ch = int(cw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw + (cols + 1) * 6, rows * ch + (rows + 1) * 6), (24, 14, 12))
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = 6 + (i % cols) * (cw + 6), 6 + (i // cols) * (ch + 6)
    sheet.paste(im.resize((cw, ch), Image.LANCZOS), (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + 6), f[1:-4].lstrip("0") + " s", fill=(255, 255, 255))
sheet.save(out)
print(out, sheet.size)
