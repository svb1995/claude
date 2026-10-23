"""Build Cryptic's bundled assets from PokeAPI sources.

The artifact sandbox can't fetch PokeAPI at runtime, so everything the game
needs is packed into a handful of static files under cryptic/data/.

Usage: python3 build_assets.py <raw_dir> <out_dir>
  raw_dir/csv     PokeAPI CSVs (pokemon, pokemon_types, types, pokemon_species, pokemon_species_names)
  raw_dir/cries   clone of github.com/PokeAPI/cries
  raw_dir/art     official-artwork/{id}.png
  raw_dir/mini    sprites/pokemon/{id}.png
"""
import base64, csv, io, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

MAX_ID = 1025
PACK = 64
raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def rows(name):
    with open(os.path.join(raw, "csv", name + ".csv"), newline="") as f:
        return list(csv.DictReader(f))

types = {r["id"]: r["identifier"] for r in rows("types")}
names = {r["pokemon_species_id"]: r["name"] for r in rows("pokemon_species_names") if r["local_language_id"] == "9"}
gens = {r["id"]: int(r["generation_id"]) for r in rows("pokemon_species")}
ptypes = {}
for r in sorted(rows("pokemon_types"), key=lambda r: int(r["slot"])):
    ptypes.setdefault(r["pokemon_id"], []).append(types[r["type_id"]])

dex = [[names[str(i)], gens[str(i)], ptypes[str(i)]] for i in range(1, MAX_ID + 1)]
with open(os.path.join(out, "dex.json"), "w") as f:
    json.dump(dex, f, ensure_ascii=False, separators=(",", ":"))

def mp3(path):
    if not os.path.exists(path):
        return None
    return subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "22050", "-b:a", "48k", "-f", "mp3", "-"],
        capture_output=True, check=True).stdout

def webp(path):
    im = Image.open(path).convert("RGBA")
    im.thumbnail((360, 360), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=78, method=6)
    return buf.getvalue()

def b64(data):
    return base64.b64encode(data).decode() if data else None

def build_pack(start):
    ids = range(start, min(start + PACK, MAX_ID + 1))
    pack = {}
    for i in ids:
        latest = mp3(os.path.join(raw, "cries/cries/pokemon/latest", f"{i}.ogg"))
        legacy = mp3(os.path.join(raw, "cries/cries/pokemon/legacy", f"{i}.ogg"))
        pack[i] = {"c": b64(latest), "l": b64(legacy), "a": b64(webp(os.path.join(raw, "art", f"{i}.png")))}
    with open(os.path.join(out, f"pack-{start // PACK}.json"), "w") as f:
        json.dump(pack, f, separators=(",", ":"))

with ThreadPoolExecutor(8) as ex:
    list(ex.map(build_pack, range(1, MAX_ID + 1, PACK)))

# Mini sprites: one sheet, 32 columns of 96px cells, id 1 at cell 0.
COLS, CELL = 32, 96
sheet = Image.new("RGBA", (COLS * CELL, -(-MAX_ID // COLS) * CELL))
for i in range(1, MAX_ID + 1):
    im = Image.open(os.path.join(raw, "mini", f"{i}.png")).convert("RGBA")
    if im.size != (CELL, CELL):
        im = im.resize((CELL, CELL), Image.NEAREST)
    sheet.paste(im, (((i - 1) % COLS) * CELL, ((i - 1) // COLS) * CELL))
sheet.save(os.path.join(out, "minis.webp"), "WEBP", lossless=True, method=6)
