# Combat Lab specification

## Purpose

Prove that the tower-defense loop is readable, enjoyable on a touchscreen, technically portable, and stable enough to justify final campaign artwork.

## Player promise

In a short session, the player places approachable sci-fi defenses, reads increasingly durable alien threats, breaks armor and UFO shells, and survives ten escalating waves on Verdara.

## Acceptance criteria

- The project installs and builds from a clean checkout.
- The battle works with touch and mouse at common landscape phone and desktop sizes.
- A player can place Pulse and Cryo towers only on authored pads.
- Towers acquire eligible targets, attack, upgrade, sell, and change priority.
- Green, cyan, and violet enemies have visibly distinct durability and non-color identifiers.
- Scrap armor absorbs damage before body health and visibly breaks.
- A destroyed UFO releases its contained green alien at the same path progress.
- Ten waves can end in victory or integrity loss.
- Pause and 1x/2x speed do not break deterministic game rules.
- Best wave, victory count, sound choice, and reduced-motion choice survive refresh.
- The production build works from a GitHub repository subpath.
- The installed PWA can relaunch after its required assets have been cached.
- Automated tests cover damage ordering, color multipliers, wave validity, and targeting.
- No known critical runtime errors remain.

## Deliberately excluded

- Final campaign artwork and animation sheets
- Planets two through twelve
- Additional towers or tower branches
- Boss encounters
- Accounts, backend, cloud saves, leaderboards, analytics, ads, or purchases
- App Store and Play Store binaries
- Flutter/Flame implementation

## Playtest questions

1. Can a new player place a tower and start a wave without explanation?
2. Can players tell which enemies are tougher without relying on color alone?
3. Do armor breaks and UFO containment read instantly?
4. Is Cryo plus Pulse a satisfying and understandable combination?
5. Are losses attributable to a clear tactical or economy decision?
6. Does the game remain readable on a representative phone?
7. Does the ten-wave session make players want another planet?
