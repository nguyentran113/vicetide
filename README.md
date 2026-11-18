# VICETIDE — Port Solano

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nguyentran113/vicetide/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nguyentran113/vicetide/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**VICETIDE** is an original 3D open-world crime game set in **Port Solano**, a fictional sun-drenched coastal city — golden-hour light, palm-lined boulevards, a procedural downtown of towers, a beach, a marina and open sea. You are **Rico Marín**, a broke wheelman. Marina fixer **Marisol Vega** offers a chain of **4 story missions** — collect a parcel, beat the clock on a golden-hour delivery, shake a 3-star police heat, and make the final run to the last boat out — paying cash for every job.

Everything is original: city, names, story and art are created for this game. It runs 100% offline in a desktop browser (three.js is vendored), with keyboard + mouse controls and fully procedural WebAudio sound (engine, sirens, gunshots, reward chimes, synth music — no audio files).

## Features

- Procedural city: road grid with sidewalks, varied towers with lit windows, palms, street lamps, beach, sea and marina
- Third-person on-foot play and arcade driving in any car, with a chase camera and speedometer
- AI traffic on the road grid, parked cars, and pedestrians who stroll — and flee danger
- 0–5 star wanted system: police cruisers spawn, chase and ram you; get pinned and you're **BUSTED**, lose your health and you're **WASTED**; hide long enough and the heat cools
- Pistol combat on foot (raycast, muzzle flash, hit sparks), player health
- Full HUD: 2D canvas minimap (roads, player arrow, cars, police, mission marker), cash, health bar, wanted stars, mission objective line, speedometer
- Title / pause / BUSTED / WASTED / ending screens, and progress saved in `localStorage` (cash + mission) with a Continue button
- Seeded RNG so screenshot scenes (`?shot=title|drive|foot|chase&seed=1`) are reproducible

## Controls

| Key | Action |
|---|---|
| W A S D / arrows | Move / drive |
| Shift | Run |
| E or F | Enter / exit car |
| Mouse click | Shoot pistol (on foot) |
| P or Esc | Pause |
| M | Mute / unmute |

## Run locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

<sub>Entered on [make.fun](https://make.fun/?ref=am378nqn&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
