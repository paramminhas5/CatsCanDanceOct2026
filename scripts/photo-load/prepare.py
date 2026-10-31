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
 "41_Jatayu": ("jatayu", 1, [], [], False),
 "42_Long_Distances": ("long-distances", 2, [], [], False),
 "43_The_F16s": ("the-f16s", 1, [], [], False),
 "44_Anish_Kumar": ("anish-kumar", 1, [], [], False),
 "45_Madame_Gandhi": ("madame-gandhi", 2, [], [], False),
 "46_AAGUU": ("aaguu", 1, [], [], False),
 "48_Stain": ("stain", 1, [], [], False),
 "49_Anushka": ("anushka", None, [], [1, 2], True),
 "50_Sodhi": ("sodhi", None, [], [1, 2], True),
 "51_Hybrid_Protokol": ("hybrid-protokol", 3, [], [2], False),
 "53_Yung_Raj": ("yung-raj", 1, [], [], False),
 "54_MC_Soopy": ("mc-soopy", 2, [], [], False),
 "55_Shireen": ("shireen", 1, [], [], False),
 "56_Shama_Anwar": ("shama-anwar", 2, [], [1], False),
 "57_Thegreybox": ("thegreybox", 2, [], [], False),
 "58_Lush_Lata": ("lush-lata", 2, [], [1], False),
 "59_Okedo": ("okedo", 1, [], [], False),
 "60_Pulpy_Shilpy": ("pulpy-shilpy", 1, [], [], False),
 "61_Chhabb": ("chhabb", 1, [], [], False),
 "62_Abhi_Meer": ("abhi-meer", 1, [], [], False),
 "63_Nazira": ("nazira", 2, [], [], False),
 "64_Asquith": ("asquith", 2, [], [], False),
 "65_Photonz": ("photonz", 1, [], [3], False),
 "66_JBabe": ("jbabe", 1, [], [], False),
 "67_Jael": ("jael", 2, [], [], False),
 "68_Pariah": ("pariah", 1, [], [], False),
 "69_Spryk": ("spryk", 3, [], [], False),
 "70_Masalo": ("masalo", 2, [], [], False),
 "71_Kamma": ("kamma", 1, [], [], False),
 "72_Violet_PT": ("violet", 1, [], [], False),
 "73_ESA": ("esa", 1, [], [], False),
 "74_Electroson": ("electroson", 2, [1], [], False),
 "75_Nate08": ("nate08", 2, [], [], False),
 "76_Sijya": ("sijya", 2, [], [], False),
 "77_Disco_Arabesquo": ("disco-arabesquo", 1, [], [], False),
 "78_Kiss_Nuka": ("kiss-nuka", 1, [], [], False),
 "80_Gazzi": ("gazzi", None, [], [1, 2], True),
 "81_Mixtress": ("mixtress", 3, [], [2], False),
}
items, held, low = [], [], []
for dp, _dn, fns in sorted(os.walk(raw)):
    d = os.path.relpath(dp, raw)
    for f in sorted(x for x in fns if x.lower().endswith(".png")):
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
