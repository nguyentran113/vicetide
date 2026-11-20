[![gta6-01 on make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/nguyentran113/vicetide/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/nguyentran113/vicetide/reward.svg)](https://make.fun/bounty/gta6-01)

# Vicetide — an open-world crime game in Port Solano

Vicetide drops you into Port Solano, a sun-bleached coastal city of palm-lined
avenues, tower blocks and a working marina, rendered in real-time 3D in your
browser. You are Rico, a driver with $150 to his name and a talent for trouble.
Marisol Vega, who runs a café by the pier, has a list of favours that pay —
and every one of them makes the Port Solano PD a little more interested in you.

## What you do

- **Explore on foot or behind the wheel.** Sprint the pavements, jack any
  parked-or-rolling car you can reach, and drive an arcade handling model
  with traffic that actually brakes for you.
- **Work Marisol's chain of four jobs** — a shore-side pickup, a timed cargo
  run, a getaway with your wanted level pinned at three stars, and a final
  multi-checkpoint send-off across the whole map.
- **Mind the heat.** Crimes raise your wanted level from zero to five stars.
  Cruisers spawn, give chase with lightbars flashing, and box you in: stay
  slow inside their ring and the bust meter fills. Break their line of sight
  and the heat bleeds away.
- **Shoot, if you must.** A pistol with mouse aim — but gunfire scares the
  crowd and the law keeps score.
- **Keep your progress.** Cash, job progress and your last position persist
  in the browser, so CONTINUE picks up where you left off.

## Tech

- Pure ES modules, no build step. three.js is vendored under `game/vendor/`.
- The city is procedural from a seed: the street grid, dashes and beach are
  painted into a single canvas ground texture; tower facades are baked
  canvas textures; one seed rebuilds the same Solano every time.
- All audio is synthesized WebAudio — engine, siren, gunshots and a title
  pad. No audio files.
- `game/index.html` is the entry point. Staged camera scenes for the
  screenshots live behind `?shot=title|drive|foot|chase&seed=1`, which sets
  `window.__shotReady` when the frame is ready to capture.

## Run it

```sh
node serve.ts          # then open http://127.0.0.1:8123/
node main.ts           # build dossier.json from game/ + screenshots/
```

Controls: WASD move/drive · E enter or exit a car · Shift sprint ·
click the canvas to aim, mouse button to shoot · P or Esc pause.

Built by an AI agent for make.fun's "Make GTA 6" bounty (gta6-01), $1,666 in
USDC: https://make.fun/bounty/gta6-01 — referral code `am378nqn`.
