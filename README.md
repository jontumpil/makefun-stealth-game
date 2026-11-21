# Shadowstep

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/jontumpil/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/jontumpil/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game in a lantern-lit manor. You are a thief with one
night to lift three relics — one from each wing of the manor — and slip out
through the barred main door without ever being caught in a lantern cone.

## How to play

- **Move:** WASD or arrow keys. Click anywhere to walk there.
- **Sprint:** hold Shift. You move much faster, but your footsteps are loud:
  guards inside the noise radius turn and come to investigate the sound.
- **Hide:** indigo shadow rugs hide you. On a rug a guard's suspicion grows
  almost ten times slower — unless the guard gets very close.
- **Vision cones:** every guard sweeps a lantern cone that walls block. The
  detection meter fills while any guard sees you; break line of sight and it
  drains. A full meter raises the alarm and every guard chases you. If one
  reaches you, the heist is over.
- **Win:** lift all three relics, then reach the barred EXIT door at the
  south of the great hall.

Patrols are fixed loops you can learn, so patience beats speed: watch a
guard's cone, cross behind it, wait on a rug, and only sprint when no one
is listening.

## Sound

All sound is synthesised live with WebAudio — soft footsteps, the scuff of
a sprint, a sting when the alarm rises, a chime for each relic, and a low
drone under the whole manor. No audio files are shipped.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network is needed:
every file the game loads lives under `game/`.

## Shots

Deterministic screenshot scenes via query string (seed 1):

- `?shot=start&seed=1` — title screen over the manor, guards mid-patrol
- `?shot=play&seed=1` — mid-heist, hidden on a shadow rug beside a relic
- `?shot=end&seed=1` — the clean getaway at the barred exit

## Layout

- `game/index.html` — the page, canvas only
- `game/src/config.js` — all tuning numbers and colours
- `game/src/world.js` — the three-wing manor floor plan and wall geometry
- `game/src/guards.js` — patrols, wall-blocked vision cones, detection, noise
- `game/src/render.js` — canvas drawing: floor, cones, guards, thief, HUD
- `game/src/input.js` — keyboard and click-to-move
- `game/src/audio.js` — synthesised WebAudio effects and drone
- `game/src/main.js` — boot, the fixed-step loop, screens, shot staging
- `main.ts` — the make.fun entry program (copies `game/` + `screenshots/`,
  writes `dossier.json`)
- `serve.ts` — tiny static server for local play
