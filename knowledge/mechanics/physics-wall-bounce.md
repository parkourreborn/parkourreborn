---
title: Wall Bounce and Flick Physics
category: mechanics
summary: The wall bounce formula, how the approach angle splits speed between up and along the wall, the 100 cap and how flicks steer the bounce.
aliases:
  - wall bounce
  - wallbounce
  - flick
  - wall bounce flick
  - bounce flick
  - stored wall speed
  - bounce angle
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Wall bounce and wall bounce flicks

A wall bounce is a jump off a wall climb within 0.2 s of touching the wall. The formula has three parts:

```
stored = (along, clamp(up, 0, 100))          from the wall entry (the Wall Movement Physics page)
push   = flat camera direction × 42 × α  +  (0, 26, 0)
         α = run speed ÷ 24 (maximum 1)
         without WASD: the camera direction is mirrored to point away from the wall
         with WASD held: the camera direction is used as is (into the wall if you look at it)
result = normalise(stored + push) × max(|stored|, |push|)
```

The size of the push is at most √(42² + 26²) = **49.4**.

**What each part means:**

1. **The wall stores your speed, much like a powerslide bank.** The climb itself moves you at only about 10 up, so nothing is lost while you are on the wall. The bounce returns the stored speed.
2. **The vertical part is capped at 100; the along-the-wall part has no cap.** Any vertical speed that was negative (falling into the wall) is clamped to zero and lost.
3. **Your final speed is the larger of the stored speed and the push**, pointed in the direction of their sum. When you are fast, the push cannot add speed; it only steers.

**Effect of the approach angle.** Example: 80 flat speed plus 40 up (89.4 in total, for instance after a mag bounce). "Angle" is how far your flat velocity is from straight into the wall.

| Angle | Stored along the wall | Stored up |
|---|---|---|
| 0° | 0 | 89.4 |
| 10° | 29.3 | 84.5 |
| 20° | 50.5 | 73.8 |
| 30° | 63.2 | 63.2 |
| 45° | 73.0 | 51.6 |
| 60° | 77.5 | 44.7 |

The total never changes; the angle only moves it between horizontal and vertical. **A larger angle gives more horizontal and less vertical.**

At high speed, the angle also avoids the vertical cap. Example: 150 flat plus 40 up (155.2 in total):

| Angle | Stored along | Stored up | Total after the 100 cap |
|---|---|---|---|
| 0° | 0 | 155.2 | **100** (55 lost) |
| 10° | 84.7 | 130.1 | 131.1 |
| 20° | 122.4 | 95.5 | **155.2** (nothing lost) |
| 30° | 137.0 | 73.1 | 155.2 |
| 45° | 145.3 | 54.8 | 155.2 |

So at high speed, a small angle (around 20° here) keeps the full vertical cap **and** keeps the excess as horizontal speed. This is the core of the wall bounce flick.

**Effect of where you look when you release (the flick).** The camera only changes the direction of the push, so it steers the final speed without changing its size. Results at level camera pitch (run speed ≥ 24, so α = 1):

80 flat + 40 up, 20° approach (total 89.4):

| Look at release | Horizontal | (along / outward) | Up |
|---|---|---|---|
| At the wall, no WASD | 49.2 | 37.8 / 31.4 out | 74.7 |
| At the wall, WASD held | 49.2 | 37.8 / 31.4 **into the wall** | 74.7 |
| 45° toward your direction of travel along the wall | 58.2 | 54.6 / 20.2 | 67.9 |
| Parallel to the wall, toward your direction of travel | 60.8 | 60.8 / 0 | 65.6 |
| 45° against your direction of travel | 30.5 | 17.5 / 25.0 | 84.1 |
| Parallel to the wall, against your direction of travel | 7.6 | 7.6 / 0 | 89.1 |

150 flat + 40 up, 20° approach (total 155.2):

| Look at release | Horizontal | Up |
|---|---|---|
| At the wall | 113.2 | 106.2 |
| 45° toward your direction of travel | 122.2 | 95.8 |
| Parallel, toward your direction of travel | 124.9 | 92.2 |
| 45° against your direction of travel | 97.1 | 121.1 |
| Parallel, against your direction of travel | 85.7 | 129.4 |

Rules that follow from this:

- **To keep horizontal speed, look along the wall in the same direction your speed is travelling along it.** Looking the other way converts horizontal into vertical.
- With a straight-on approach (0°), the look direction only decides where a fixed 30.6 of horizontal speed goes; it cannot add more.
- **Holding WASD while looking at the wall points the push into the wall**, and the wall's collision removes that part. Without WASD the push points away from the wall, which pushes you backwards (this is Wall Bounce Slide).
- Looking up or down shrinks the horizontal part of the push (by the cosine of the pitch), so a level camera steers the most.
- **Falling into the wall wastes speed:** the vertical share is clamped to zero. With 60 flat and 30 down, a bounce gives only 42 to 51 horizontal and 14 to 26 up, depending on the angle. Bounce while rising (jump into the wall first, or mag bounce, which sets 40 up).
- You must be facing within 60° of straight into the wall when you press Ascend, or you will get a wallrun instead (the Wall Movement Physics page). The flick is therefore a camera turn **after** the climb has started, inside the 0.2 s window.
