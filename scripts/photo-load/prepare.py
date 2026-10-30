"""Convert the raw batch into web-sized webp files plus manifest.json.
Usage: python3 prepare.py <raw_dir> <out_dir>
Roles: hero = profile photo and first gallery image, gallery = photos, poster = event flyers (gallery, captioned Poster),
hold = not loaded (third-party branded graphic, unclear identity)."""
import json, os, re, sys
from PIL import Image
raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
# file prefix -> (slug, hero file number, poster numbers, hold numbers, gallery_only (no profile photo))
M = {
 "01_Indo_Warehouse": ("indo-warehouse", 1, [3], [], False),
 "02_Nikki_Nair": ("nikki-nair", 1, [], [4], False),
 "03_Kohra": ("kohra", 1, [2], [], False),
 "04_Sheral": ("sheral", 1, [], [], False),
 "05_Prismer": ("prismer", 2, [1], [], False),
 "07_AK_SPORTS": ("ak-sports", 1, [], [], True),
 "08_Midnight_Traffic": ("midnight-traffic", 2, [4], [], False),
 "09_SUCHI": ("suchi", 2, [], [], False),
 "10_Murthovic": ("murthovic", 1, [], [], True),
 "11_Kandy_Kuri": ("kandy-kuri", 1, [], [], False),
 "12_DJ_Sartek": ("dj-sartek", 2, [], [1], False),
 "13_Anish_Sood_Anyasa": ("anish-sood", 1, [], [], False),
 "14_Lost_Stories": ("lost-stories", 2, [], [], False),
 "15_Dualist_Inquiry": ("dualist-inquiry", None, [1], [], True),
 "16_DJ_Ravetek": ("dj-ravetek", 1, [], [], False),
 "17_Project_91": ("project-91", None, [], [1], True),
 "18_DJ_Ravator": ("dj-ravator", 1, [], [], False),
 "19_Monophonik": ("monophonik", 1, [], [], False),
 "20_Kaleekarma": ("kaleekarma", 1, [], [], False),
 "21_Sid_Vashi": ("sid-vashi", 1, [], [], False),
 "22_Sandunes": ("sandunes", 1, [], [], False),
 "23_Karan_Kanchan": ("karan-kanchan", 1, [], [], False),
 "24_Komorebi": ("komorebi", 1, [], [], False),
 "25_Prabh_Deep": ("prabh-deep", 2, [], [1], False),
 "26_Stalvart_John": ("stalvart-john", 1, [], [], True),
 "27_CHRMS": ("chrms", 1, [], [], False),
 "28_Sickflip": ("sickflip", 3, [], [], False),
 "29_Dotdat": ("dotdat", None, [], [1], True),
 "30_Aayna": ("aayna", 2, [], [], False),
}
items, held, low = [], [], []
for d in sorted(os.listdir(raw)):
    for f in sorted(os.listdir(os.path.join(raw, d))):
        m = re.match(r"(.+)_(\d\d)\.png$", f)
        pre, n = m.group(1), int(m.group(2))
        slug, hero, posters, hold, gonly = M[pre]
        if n in hold: held.append(f); continue
        im = Image.open(os.path.join(raw, d, f)).convert("RGB")
        if max(im.size) < 400: low.append(f)
        im.thumbnail((1600, 1600))
        name = f"{pre.split('_',1)[1].lower()}-{n:02d}".replace("_", "-")
        name = re.sub(r"[^a-z0-9-]", "", name)
        fn = f"{slug}__{name}.webp"
        im.save(os.path.join(out, fn), "WEBP", quality=82, method=6)
        items.append({"slug": slug, "file": fn, "name": name, "role": "poster" if n in posters else ("hero" if n == hero else "gallery"), "gallery_only": gonly, "low_res": f in low})
json.dump({"items": items, "held": held}, open(os.path.join(out, "manifest.json"), "w"), indent=1)
print(len(items), "files;", "held:", held, "low-res:", low)
