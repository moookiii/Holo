<div align="center">

<h1>✦ &nbsp; H O L O &nbsp; ✦</h1>

<p>
  <kbd>TypeScript</kbd> &nbsp; <kbd>Three.js / TSL</kbd> &nbsp; <kbd>WebGPU / WebGL 2</kbd> &nbsp; <kbd>Vite</kbd>
</p>

<p>
  <a href="https://moookiii.github.io/Holo/"><strong>Enter the older demo studio ↗</strong></a>
  &nbsp; · &nbsp;
  <a href="https://moookiii.github.io/Holo/artifacts/">View artifacts</a>
</p>

</div>

---

### Holographic Cards

Holo is an interactive, browser-based studio for exploring collectible cards and the surfaces that make them cool. Tilt a card, move the light, watch foil, reflections, and etched detail respond in real time. The collection spans Pokémon (high quality etched cards and foils), Yu-Gi-Oh! (scuffed artwork exists), Magic: The Gathering (Alpha and some bulk), and original designs.

The renderer combines clean card fronts with separate coverage, protection, roughness, and normal maps. Card-specific material profiles shape how each finish catches light, from vintage Cosmos motifs to modern etched foil. The visual direction favors precision, depth, controlled highlights, and responsive motion.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>01 · The viewer</h3>
      <p>Rotate, flip, and zoom into individual cards. Change lighting and holographic treatments for each surface.</p>
    </td>
    <td width="50%" valign="top">
      <h3>02 · The gallery</h3>
      <p>Master collection of all cards in catalogued with search and filters for game, set, rarity, and finish. Compare cards together under shared lighting.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>03 · Pack opening</h3>
      <p>Choose a pack and reveal its cards through a simulated pack opening.</p>
    </td>
    <td width="50%" valign="top">
      <h3>04 · Holo Lab</h3>
      <p>Tune material parameters and surface profiles. Import local card maps and fronts to add your own cards.</p>
    </td>
  </tr>
</table>

<details>
<summary><strong>Complete sets · 93</strong></summary>

Full local card checklists with implemented surfaces. Partial showcases, browse-only catalogs, and sets with known missing assets or unfinished card treatments are omitted.

#### Pokémon · 91 sets

| Era / collection | Complete sets |
| --- | --- |
| **Classic** | Jungle<br>Fossil<br>Base Set 2<br>Team Rocket |
| **Gym** | Gym Heroes<br>Gym Challenge |
| **Neo** | Neo Genesis<br>Neo Discovery<br>Southern Islands<br>Neo Destiny |
| **Legendary Collection** | Legendary Collection |
| **e-Card** | Pokémon e-Card Sample Set<br>Skyridge |
| **Black &amp; White** | Black &amp; White<br>Emerging Powers<br>Noble Victories<br>Next Destinies<br>Dark Explorers<br>Dragons Exalted<br>Dragon Vault<br>Boundaries Crossed<br>Plasma Storm<br>Plasma Freeze<br>Plasma Blast<br>Legendary Treasures |
| **XY** | XY Base Set<br>Flashfire<br>Furious Fists<br>Phantom Forces<br>Primal Clash<br>Double Crisis<br>Roaring Skies<br>Ancient Origins<br>BREAKthrough<br>BREAKpoint<br>Generations<br>Fates Collide<br>Steam Siege<br>Evolutions |
| **Sun &amp; Moon** | Sun &amp; Moon<br>Guardians Rising<br>Burning Shadows<br>Shining Legends<br>Crimson Invasion<br>Ultra Prism<br>Forbidden Light<br>Celestial Storm<br>Dragon Majesty<br>Lost Thunder<br>Team Up<br>Detective Pikachu<br>Unbroken Bonds<br>Unified Minds<br>Hidden Fates (including Shiny Vault)<br>Cosmic Eclipse |
| **Sword &amp; Shield** | Sword &amp; Shield<br>Rebel Clash<br>Darkness Ablaze<br>Champion's Path<br>Vivid Voltage<br>Shining Fates<br>Battle Styles<br>Chilling Reign<br>Evolving Skies<br>Fusion Strike<br>Brilliant Stars<br>Astral Radiance<br>Pokémon GO<br>Lost Origin<br>Silver Tempest<br>Crown Zenith |
| **Scarlet &amp; Violet** | Scarlet &amp; Violet<br>Paldea Evolved<br>Obsidian Flames<br>151<br>Paradox Rift<br>Paldean Fates<br>Temporal Forces<br>Twilight Masquerade<br>Shrouded Fable<br>Stellar Crown<br>Surging Sparks<br>Prismatic Evolutions<br>Journey Together<br>Destined Rivals |
| **Mega Evolution** | Mega Evolution<br>Phantasmal Flames<br>Ascended Heroes<br>Perfect Order<br>Chaos Rising<br>Pitch Black |

#### Yu-Gi-Oh!

- **Legend of Blue Eyes White Dragon** — complete 126-card checklist and booster implementation.

#### Magic: The Gathering

- **Limited Edition Alpha** — complete 295-card checklist and booster implementation.

Sources: [Pokémon catalogs](src/pokemon/), [pack readiness](src/pokemon/availability.ts), [Legend of Blue Eyes catalog](src/yugioh/sets/LegendOfBlueEyesCatalog.ts), and [Alpha catalog](src/magic/AlphaCatalog.ts).

</details>

### Installation and use

Use **Node.js 22.12 or newer** and **Git LFS**. Card images and material maps are stored with LFS; download them before starting the app.

```sh
git clone https://github.com/moookiii/Holo.git
cd Holo
git lfs install
git lfs pull
npm ci
npm run dev
```

Open **[localhost:5173](http://127.0.0.1:5173)** in a browser with hardware acceleration and WebGPU or WebGL 2 support. Drag to rotate, click a card to flip it, and scroll or pinch to zoom. Use **Shift + drag** to reposition it.

<details>
<summary><strong>Under the surface · repository guide</strong></summary>

- **`src/`** — rendering, material profiles, card catalogs, gallery, packs, and lab.
- **`public/`** — runtime card fronts, PNG masks, material maps, and pack artwork.
- **`scripts/`** — offline asset preparation, registration, and capture tools.
- **`docs/`** — source evidence, implementation notes, and visual reviews, including the [etched-card reference](docs/sylveon-156.md).
- **`tests/`** — automated checks; run with `npm test`.

Run `npm run build` for a TypeScript check and production bundle, then `npm run preview` to inspect it locally at `/Holo/`.

</details>

---

<p align="center"><sub>PRECISION &nbsp; / &nbsp; RESTRAINT &nbsp; / &nbsp; DEPTH &nbsp; / &nbsp; LIGHT</sub></p>
