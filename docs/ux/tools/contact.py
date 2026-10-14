"""Usage: python3 -I contact.py <out.jpg> <img>...  Stacks images vertically at 1600px wide, labelled, for quick review."""
import sys
from PIL import Image, ImageDraw
out, fs = sys.argv[1], sys.argv[2:]
W = 1600
ims = []
for f in fs:
    i = Image.open(f).convert("RGB"); i = i.resize((W, int(W * i.height / i.width)))
    c = Image.new("RGB", (W, i.height + 30), "white"); c.paste(i, (0, 30))
    ImageDraw.Draw(c).text((8, 6), f.rsplit("/", 1)[-1], fill="black"); ims.append(c)
H = sum(i.height for i in ims); sheet = Image.new("RGB", (W, H), "white"); y = 0
for i in ims: sheet.paste(i, (0, y)); y += i.height
sheet.save(out, quality=75)
