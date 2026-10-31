"""Upload prepared images and attach them to artists.
Usage: OPS_TOKEN=... python3 load.py <web_dir> [--dry]
Uses the artist-photo-upload edge function (ops token guarded) and the ops_set_artist_photos RPC.
Safe to re-run: files are overwritten in place, existing profile photos are kept, gallery rows are deduped."""
import base64, json, os, sys, urllib.request
BASE = "https://jybloszaucgqlbkzquqw.supabase.co"
ANON = "sb_publishable_LklrPFlR8TjDoT9ZV8PizA_wkIL9uNR"  # public key
d, dry = sys.argv[1], "--dry" in sys.argv
tok = os.environ.get("OPS_TOKEN", "")
if not tok and not dry: sys.exit("set OPS_TOKEN")
def post(path, body):
    r = urllib.request.Request(BASE + path, json.dumps(body).encode(), {"Content-Type": "application/json", "apikey": ANON, "Authorization": "Bearer " + ANON})
    return json.load(urllib.request.urlopen(r, timeout=120))
man = json.load(open(os.path.join(d, "manifest.json")))["items"]
rows = {}
for it in man:
    url = f"{BASE}/storage/v1/object/public/artist-media/{it['slug']}/{it['name']}.webp"
    if not dry:
        res = post("/functions/v1/artist-photo-upload", {"token": tok, "slug": it["slug"], "name": it["name"], "content_type": "image/webp", "data_base64": base64.b64encode(open(os.path.join(d, it["file"]), "rb").read()).decode()})
        assert res.get("ok"), (it["file"], res)
        url = res["url"]
    print("ok" if not dry else "dry", it["file"], it["role"])
    r = rows.setdefault(it["slug"], {"slug": it["slug"], "photo_url": None, "gallery": [], "posters": []})
    if it["role"] == "hero" and not it["gallery_only"]: r["photo_url"] = url
    (r["posters"] if it["role"] == "poster" else r["gallery"]).append(url)
batch1 = [{"slug": r["slug"], "photo_url": r["photo_url"], "gallery": r["gallery"]} for r in rows.values()]
batch2 = [{"slug": r["slug"], "gallery": r["posters"], "source": "Poster"} for r in rows.values() if r["posters"]]
if dry: print(json.dumps(batch1)[:600]); sys.exit()
for b in (batch1, batch2): print(post("/rest/v1/rpc/ops_set_artist_photos", {"p_token": tok, "p_rows": b, "p_overwrite": False}))
