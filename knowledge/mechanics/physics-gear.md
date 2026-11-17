---
title: Gear Physics
category: mechanics
summary: Grappler pulls and swings, Mag Rail slaps, launches, bounces and pulls, and what the Glove, Springhook and Zipline Hook change.
aliases:
  - gear physics
  - grappler physics
  - grapple pull
  - mag rail physics
  - mag bounce
  - mag launch
  - mag pull
  - glove upgrades
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Gear

### Grappler

- **Range:** 90 (× 1.35 with Swing I, × 1.5 with Swing III). **Windup:** 0.2 s. **Hook travel speed:** 300 studs per second (× 2 with Yank II).
- **Tap (pull):** `velocity = augment(velocity, direction to the point × pull)`, with pull = **35**, **43.75** (Yank I) or **52.5** (Yank III). Slower than the pull strength, you are set to exactly that speed toward the point. Faster, you keep your speed and are redirected toward the point. From the ground with upward velocity the state becomes Jumping; in the air it becomes Falling.

| Speed before the pull | Speed after a 35 pull |
|---|---|
| 0 | 35 |
| 20 | 35 |
| 35 | 35 |
| 50 | 50 (redirected toward the point) |
| 80 | 80 (redirected) |

- **Swing (hold on a swing point, or on any surface with Swing II):** you become a rope pendulum with gravity 75 and air drag. Releasing keeps the pendulum velocity. Jumping while swinging releases you with a pull. While attached, you can jump off the ground once.
- **Charges:** 1 (2 with Yank I or Swing III). Refilled on the ground (Yank III: even while the grapple is in use). With Swing I, swinging on a swing point refills it.
- **Zip pull (level 4, test-only):** reels you toward the point starting at max(your speeds) + 55, accelerating at 180 per second for at most 1.6 s. Releasing at the end gives augment(look direction × 72 + 46 up).

### Mag Rail

- **Base (no upgrade): mag slap**, only while wallrunning. You are launched along your facing direction, with the camera pitch clamped to between about −17° and +9°, at max(**75**, your flat speed). The wallrun's state is kept.
- **Launch Rail** (level 1 launches outward at 45°, level 2 at 90°, +1 ammo, and a wallrun charge refilled on use):
  - **Wallrun launch:** away from the wall and in your look direction, at 75 × 1.05 (level 1), × 1.1 (level 2), or × 1.05 to 1.15 by speed (level 3: 1.15 above 30, 1.1 above 28), or your flat speed if higher.
  - **Mag bounce** (in the air, not wallrunning, near geometry):
    - Requirements: a 7 × 5 × 7 stud box around you touches a wall or object, up speed above −100, and mag bounce is available. A press up to 0.15 s early is buffered and fires when you get close.
    - `v = augment(velocity, look direction × flat speed)`, then **up speed = max(40, your up speed before the bounce)**.
    - In practice, your horizontal speed becomes approximately your **entire 3D speed** in your look direction, and your vertical speed is put back. **While rising, this increases your total speed.**
    - Looking level to slightly down gives the most: the look's downward component cancels the leftover upward part of the augment.
    - Mag bounce is refreshed by the ground or coyote time, **and** by starting any wallrun or wall climb, any wall jump or wall bounce, a wall boost, or a wall kick.
  - **Mag jump / mag pull** (in the air, aiming at a swing point within 100, or 125 at level 2): velocity = aim direction × max(75 (85 at level 2), flat speed).
- **Ammo:** 1 (2 with Launch Rail II). Refilled on the ground.

Mag bounce examples:

| Before | After (look level) | Total |
|---|---|---|
| 60 flat, 0 up | 60 flat, 40 up | 60 → 72.1 |
| 60 flat, 30 down | 67 flat, 40 up | 67.1 → 78.0 |
| 124.9 flat, 92.2 up (after a flick) | 153.7 flat, 92.2 up | 155.2 → 179.3 |
| Same, looking 8° down | 155.2 flat, 92.2 up | 155.2 → 180.6 |

### Glove

| Version | Effects |
|---|---|
| Glove | Wallrun lasts 1.5 s; wall climb is not capped at run speed 26 |
| Climber Glove I | Wall boost height 18 to 24 studs instead of 11 to 17; extra 1.5 × push when your climb starts falling |
| Climber Glove II | +1 wall climb charge (2) |
| Drifter Glove I | Wallrun lasts 2.25 s; +1 wallrun charge (3); wallrun fall limit 480 instead of 30 |
| Drifter Glove II | Float: falling during a wallrun is converted into upward and horizontal speed |

### Springhook

See the Vault, Ledge Grab and Climbing Physics page. Powered Springhook increases the fall speed at which you can grab, the grab reach and the velocity transfer.

### Zipline Hook and Cable Glider

Ziplines can be grabbed within 10 studs. Speed builds toward a maximum of 90; mechanized ziplines run at 50, and friction is 5. The Cable Glider adds braking and riding upward (see the gear pages for level details).
