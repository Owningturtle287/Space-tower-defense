# Cosmic Defense: Planetfall — Combat Lab

A mobile-first, installable HTML5 tower-defense prototype built with TypeScript, Phaser, and Vite.

This is the first controlled production milestone from the roadmap. It proves the combat loop before the twelve-planet campaign and final artwork are produced.

## Included

- One handcrafted Verdara battlefield
- Ten deterministic waves
- Green, cyan, and violet alien durability tiers
- Scrap armor and a UFO that releases a contained alien
- Pulse Cannon and Cryo Beacon towers
- Tower upgrades, selling, range preview, and target priorities
- Touch, mouse, and keyboard support
- Pause and 1x/2x speed controls
- Local progress and settings
- Responsive landscape presentation
- Installable PWA with offline caching
- GitHub Pages deployment workflow
- Automated combat and content tests

## Run locally

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For another device on the same network, run:

```bash
npm run dev -- --host
```

## Verify a production build

```bash
npm run check
npm run preview
```

## Put it on GitHub Pages

1. Create an empty GitHub repository.
2. Upload this entire folder, including `.github/workflows/deploy-pages.yml`.
3. In the repository, open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Push to `main`. The included workflow tests, builds, and deploys the game.

The Vite build uses relative asset paths, so it works from a repository subpath such as `https://username.github.io/repository-name/`.

## Install on a phone

After deployment, open the GitHub Pages URL:

- iPhone/iPad: Safari → Share → **Add to Home Screen**
- Android: Chrome → menu → **Install app**

This milestone is a PWA, not an App Store or Play Store binary. Capacitor packaging is intentionally scheduled after the web combat and offline behavior are proven.

## Controls

- Tap or click a tower card, then a glowing build pad
- Tap or click a placed tower to upgrade, sell, or change targeting
- `Space`: start the next wave
- `P`: pause or resume
- `1`: normal speed
- `2`: double speed
- `Esc`: cancel tower placement

## Project layout

```text
src/game/content.ts          Validated gameplay content
src/game/core/combat.ts      Pure damage and targeting rules
src/game/entities/           Runtime enemy and tower views
src/game/scenes/             Boot and battle orchestration
src/game/services/           Save and procedural sound adapters
src/game/tests/              Deterministic unit tests
public/                      PWA manifest, service worker, and icons
docs/                        Acceptance scope and testing notes
```

## Important production note

The current visuals are polished prototype vectors generated in-engine. They deliberately establish silhouette, palette, and feedback direction without pretending to be the final campaign art. Final character sheets, animation, environment paintovers, VFX atlases, audio, and licensing review begin after the Combat Lab playtest gate passes.
