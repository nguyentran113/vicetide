# VICETIDE — Port Solano

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/nguyentran113/vicetide/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/nguyentran113/vicetide/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**VICETIDE** drops you into **Port Solano**, a made-up coastal city baked in permanent golden hour: palm-shaded avenues, a downtown of procedurally raised towers, a working marina, a beach and open water. You play **Rico Marín**, a wheelman with empty pockets. Down by the marina, fixer **Marisol Vega** has work for you — **4 story missions** that pay cash: fetch a parcel, run a delivery against the clock, lose a 3-star police tail, and floor it to the last boat out of town.

Nothing here is borrowed: the city, the people, the story and the look were all created for this game. It plays entirely offline in a desktop browser (three.js ships in the repo), is driven with keyboard and mouse, and every sound — engine, sirens, gunfire, the little cash-register chime, the synth score — is synthesised live with WebAudio. There are no audio files.

## What's in the game

- A city generated at load: street grid with sidewalks, towers of varying heights with lit windows, palms, lamps, beach, sea and marina
- On-foot third-person play plus arcade driving in any car you can reach, chase camera and speedometer included
- Traffic that cruises the grid, cars parked at the kerb, and pedestrians who stroll the sidewalks — and scatter when things get loud
- A 0–5 star wanted system: cruisers roll in, chase and ram; pinned means **BUSTED**, an empty health bar means **WASTED**, and staying out of sight lets the heat bleed off
- Pistol fights on foot (hitscan with muzzle flash and impact sparks) and a health system
- A full HUD: canvas minimap with roads, the player arrow, traffic, police and the mission marker; cash, health bar, wanted stars, the current objective and a speedometer
- Title, pause, BUSTED, WASTED and ending screens; your cash and mission progress persist in `localStorage` behind a Continue button
- A seeded generator, so the screenshot scenes (`?shot=title|drive|foot|chase&seed=1`) render identically every time

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
