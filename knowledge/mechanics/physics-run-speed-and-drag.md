---
title: Run Speed, Steering and Drag
category: mechanics
summary: How run speed (momentum) builds and decays, the momentum cap, steering, air and ground drag, slopes and automatic step-up.
aliases:
  - run speed
  - momentum
  - momentum cap
  - how momentum works
  - drag
  - air control
  - friction
  - slopes
  - speed decay
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Momentum: Run Speed Versus Actual Velocity

There are two different "speeds" in the game, and confusing them is the most common source of wrong explanations:

- **Run speed** (the momentum bar) is a stat between 12 and 32 that builds while you run. It is your walk speed, and it determines jump power, wall jump strength, wall climb push rate, wall boost height, long jump speed and more.
- **Actual velocity** is how fast you are really moving. It can be far above 32 (slide jumps, wall bounces and Mag Rail techs regularly exceed 100). The run speed stat does not limit it.

### Building run speed

Run speed only builds while you are on the ground (coyote time counts), moving faster than 8, and moving at close to your run speed (within 2 of it). Per second it gains:

`max(0.25, (1 − circularOut(x)) × 42 × (2 while dashing))` × health factor, where x is your progress from 12 to 32 (0 to 1).

This means it rises quickly at first and very slowly near the top:

| Reach | Without dash | Holding dash |
|---|---|---|
| 16 | 0.17 s | 0.08 s |
| 20 | 0.50 s | 0.25 s |
| 24 | 1.23 s | 0.62 s |
| 26 | 2.00 s | 0.98 s (dash stops accelerating at 26) |
| 28 | 3.57 s | — |
| 30 | 8.22 s | — |
| 32 | about 15.8 s | — |

- **Health factor:** ×1 at 40 health or more, ×0.35 at 15 health, linear in between. Low health means slow momentum gain.
- **Dash** doubles acceleration up to 26 and adds a +2 bonus while held (ramping in over 0.5 s). Afterboost adds +4.

### The momentum cap

Run speed cannot exceed your momentum cap: `26 + 6 × ((level − 1) / 19)²`, using the lower of your MomentumUsage setting and your level.

| Level | 1 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|
| Cap | 26.0 | 26.3 | 27.3 | 29.3 | 32.0 |

### Losing run speed

- Moving at 8 or slower for more than 0.2 s: run speed returns toward 12 at a rate of 8 per second (fast).
- Moving more than 2 below your run speed (sharp turns, bumping into walls): you lose 0.25 to 1 per second.
- Landing on all fours: run speed is pulled toward 24.
- Taking fall damage: −3.
- Hard landing: reset to 12.
- In the air, run speed does not change at all.

### Speed boost

Vaulting, mantling and climbing, wall kicks, long jumps, stumble landings and a few other actions give a speed boost, which adds min(1.25, (cap − current) ÷ 25) spread over 0.2 s. It is small, but it lets you top up momentum without running.

### Health regeneration

If you have not taken damage for 3 s (or you are moving slowly), you heal `30 × (1 − 0.95 × your progress from 12 to 24 run speed)` per second: 30 per second when standing still, about 1.5 per second at full sprint.

## Moving Around: Steering, Drag and Slopes

### Steering

Each frame, if you are holding a direction:

- If your flat speed is **at or below** your run speed, your velocity is pulled toward (input direction × run speed) at a rate of 20 × influence × frame time. Influence is 0.6 on the ground and 0.25 in the air, and both decrease at high speed.
- If your flat speed is **above** your run speed, the pull is scaled by `1 − dot(velocity direction, input direction)`. Holding the direction you are already moving gives zero, so there is no pull and your momentum is untouched. Holding sideways or backwards gives full pull toward run speed in that direction, which bleeds speed quickly.

**Holding the key that matches your direction of travel preserves speed. Strafing or turning while fast in the air costs speed.** Releasing WASD removes the steering pull entirely; only drag remains.

Influence (on the ground and in the air) is multiplied by a factor k that is 1 at 24 flat speed or below and falls exponentially at higher speeds: 0.51 at 50, 0.14 at 100 and about 0.011 at 200 or more. For 0.25 s after a long jump it also ramps from 0 back up. At high speed, air control is almost gone, which also means you cannot accidentally kill your own speed.

### Drag

- **Air:** 0.1 per second, horizontal only: about 9.5% of horizontal speed lost per second. There is no vertical drag.
- **Ground:** 10 × k per second, horizontal only, with k falling at high speed as described above. Ground drag is **not** applied during the first 0.1 s after you become grounded (air drag is used instead). Those 0.1 s are your window to jump or slide out of a landing without losing speed.
- **Rolling:** ground drag drops to 0.5 per second while the roll animation plays, so rolls preserve speed.
- **Afterboost on the ground:** drag and steering influence are multiplied by 0.15.

Ground drag by speed, and the remaining speed after one second of coasting on flat ground (no slide) compared with one second in the air:

| Speed | Ground drag per second | After 1 s on the ground | After 1 s in the air |
|---|---|---|---|
| 12 to 24 | 10.0 | about 0 | ×0.905 |
| 32 | 8.15 | about 0 | 29.0 |
| 50 | 5.14 | about 0 | 45.2 |
| 75 | 2.71 | about 0 | 67.9 |
| 100 | 1.43 | about 0 | 90.5 |
| 150 | 0.40 | 9.8 | 135.7 |
| 200 | 0.11 | 170.8 | 181.0 |

When you hold a direction on the ground, you do not drop to zero; you are dragged down to your run speed and stay there. The practical rule is that **on the ground, any speed above your run speed is lost quickly unless you are sliding, rolling or moving faster than about 150.**

### Slopes

- Surfaces up to 60° count as ground; steeper surfaces are walls. Between 44° and 60° you are grounded but slide automatically.
- **On slopes steeper than 44° (when not Jumping) you slide automatically** (state Sliding). The slope pushes you downhill at `(1 − cos(angle)) × 75 × 2.616` per second (2.616 = 196.2 / 75, the slide speed scale), and your sideways speed receives slide drag.
- The slope push uses a frame time capped at 1/60 s, so **below 60 FPS the automatic slope slide accelerates more slowly** (at 30 FPS, half as fast per second). Above 60 FPS it is unaffected.
- On an automatic slope slide you can only jump **once per second**.
- Player-initiated slides (normal slide, coil slide) use separate physics, described in the Powerslide and Slide Physics page.

### Automatic step-up

Anything up to about 2 studs above your feet that you run over, you are lifted onto automatically: your legs have no collision, the rays find the top, and you are snapped up (see the Grounding and Movement States page).
