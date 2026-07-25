# Testing guide

## Automated checks

```bash
npm run test
npm run build
```

The test suite validates pure combat rules and all authored wave references. The production build also performs strict TypeScript checking.

## Required manual matrix

- Small notched iPhone in landscape
- Large iPhone in landscape
- Representative mid-tier Android phone
- Large Android phone
- iPad or Android tablet
- Desktop Safari, Chrome, Firefox, and Edge

## Manual smoke test

1. Launch from a fresh browser profile.
2. Deploy into the Combat Lab.
3. Place one Pulse Cannon and one Cryo Beacon.
4. Start wave one and verify both towers attack.
5. Select a tower; upgrade, change target priority, and sell a tower.
6. Reach an armored wave and verify the shell visibly breaks first.
7. Destroy a UFO and verify a green alien ejects at the same path position.
8. Pause, resume, switch to 2x, background the app, and return.
9. Refresh and verify the saved best wave and settings.
10. Install the PWA, go offline, and relaunch.
11. Complete wave ten and verify the victory result.
12. Restart and intentionally allow integrity to reach zero.

## Playtest reporting

Record device, browser, screen orientation, wave reached, first confusion point, first leak cause, preferred tower, performance symptoms, and whether the player wanted another level.
