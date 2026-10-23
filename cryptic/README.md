# Cryptic

Who's that cry? Elke dag één Pokémon, te raden aan zijn cry: van 0,1 seconde tot het volledige geluid.

- **Open**: typ zelf de naam (autocomplete). Bij stap 5 en 6 krijg je het type, de generatie en een silhouet.
- **Keuze**: kies uit vier Pokémon uit dezelfde generatie.
- **Training**: willekeurige Pokémon, met een filter per generatie.

Open `index.html` via een lokale server (bijv. `python3 -m http.server`), want de data wordt met `fetch` geladen.

## Data

`data/` bevat alles wat het spel nodig heeft, zodat het zonder externe API's draait:

- `dex.json`: naam, generatie en types van #1–1025
- `pack-N.json`: cries (nieuw + 8-bit, mp3) en officiële artwork (webp) per 64 Pokémon
- `minis.webp`: spritesheet voor de autocomplete en de keuzekaarten

Opnieuw bouwen kan met `tools/build_assets.py` (zie de docstring). Bron: [PokéAPI](https://pokeapi.co).

Fan-project. Pokémon © Nintendo / Game Freak / The Pokémon Company.
