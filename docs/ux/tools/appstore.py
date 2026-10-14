"""Usage: python3 -I appstore.py "<search term>" <out.jpg> [n=5]
Looks up an iOS app via the iTunes Search API and saves its first n real App Store
screenshots side by side as one strip image. Prints app name, seller and store URL."""
import io, json, sys, urllib.parse, urllib.request
from PIL import Image

term, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 5
q = urllib.parse.urlencode({"term": term, "entity": "software", "country": "ch", "limit": 1})
app = json.load(urllib.request.urlopen(f"https://itunes.apple.com/search?{q}"))["results"][0]
urls = app["screenshotUrls"][:n]
ims = [Image.open(io.BytesIO(urllib.request.urlopen(u).read())).convert("RGB") for u in urls]
h = 1200
ims = [i.resize((int(i.width * h / i.height), h)) for i in ims]
gap = 24
strip = Image.new("RGB", (sum(i.width for i in ims) + gap * (len(ims) + 1), h + 2 * gap), "#f2f2f2")
x = gap
for i in ims:
    strip.paste(i, (x, gap)); x += i.width + gap
strip.save(out, quality=85)
print(f"{app['trackName']} | {app['sellerName']} | {app['trackViewUrl'].split('?')[0]}")
