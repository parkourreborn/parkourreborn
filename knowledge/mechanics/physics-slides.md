---
title: Powerslide and Slide Physics
category: mechanics
summary: The powerslide bank, slide jumps, powerslide decay and cooldown, the normal slide on slopes and slide landings.
aliases:
  - powerslide
  - bank
  - powerslide bank
  - slide jump
  - slide physics
  - infinite slide
  - coil slide
  - slide landing
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Slides: Powerslide (the Bank), Slide and Slide Landing

### Powerslide

**Starting a powerslide:**

- Press Descend while on the ground by state (so coyote time counts), moving faster than 8 (3D speed), with the Powerslide ability. You must also be on the ground or inside ledge grace.
- **The cooldown is 1 s after your previous powerslide ended**, but **being in the air beyond ledge grace resets the cooldown to zero.**

**What it stores (the bank):**

```
bank = sqrt(horizontal speed² + max(0, up speed)²)
```

- Upward speed counts; **downward speed does not.** Powerslide while still rising.
- The bank does not change for the entire slide.

**Visible slide speed:**

- It starts at **1.5 × bank**. If your previous powerslide started less than about 0.53 s earlier, the multiplier is lower: 1.07 at 0.1 s, 1.17 at 0.2 s, 1.27 at 0.3 s, 1.37 at 0.4 s and 1.5 from 0.53 s onward.
- There is no friction for the first 0.2 s. After that, the speed is divided by (1 + 2 × dt) every 1/60 s, losing about 86% per second.
- WASD is ignored while powersliding: you cannot steer, and you face the slide direction.

| Bank | Starts at | After 0.5 s | After 1 s | After 2 s | Duration (held, until below 8) | Distance |
|---|---|---|---|---|---|---|
| 16 | 24 | 13.3 | 5.0 | — | 0.78 s | 13 |
| 26 | 39 | 21.6 | 8.1 | — | 1.03 s | 24 |
| 32 | 48 | 26.6 | 9.9 | — | 1.13 s | 30 |
| 50 | 75 | 41.6 | 15.5 | 2.2 | 1.37 s | 50 |
| 80 | 120 | 66.5 | 24.9 | 3.5 | 1.60 s | 82 |
| 120 | 180 | 99.8 | 37.3 | 5.2 | 1.80 s | 125 |

**A powerslide ends when:** you leave the ground and ledge grace; the visible speed drops below 8; your actual speed drops below 8; you release Descend after 0.5 s (so a tap still slides for 0.5 s); any parkour move starts; or you land without holding Descend.

**Slide jump.** Jumping while the powerslide is active launches you horizontally at max(normal jump horizontal, **bank**), in your input direction within ±60° of the slide direction (hold a direction), with the normal additive vertical jump. Jumping ends the powerslide.

**Why the bank can feel like it fades.** The slide you see slows down considerably, but the number the jump uses (the bank) does not change. A slide jump after 1 s gives exactly the same launch as one after 0.1 s, as long as the slide has not ended.

**Powerslide into slide-under or slide.** Every 1/60 s the game checks a box 0.25 s of travel ahead of you. If there is a low obstacle (it blocks at head height but not at foot height), or the ground becomes steeper than 30°, the powerslide converts into a normal slide at speed max(min(bank + 8 if it was an obstacle, 32), bank).

**Powerslide into dropdown.** Powersliding toward an edge triggers dropdown, provided your speed is under 48 or your bank is 34 or less.

### Slide (coil slide, infinite slide)

The normal slide is a separate system from the powerslide.

**How a slide starts:** a powerslide meeting a low obstacle or a steep slope (as above), or **landing while coiled with Descend held** while moving faster than 6 (a coil slide).

**Physics (fixed 60 Hz):**

- The slide speed starts at your speed when the slide began.
- Downhill acceleration: 75 × sin(slope angle) × (how directly you point downhill), capped at 300.
- Friction: 5 + 0.35 × slide speed, per second.
- Your direction gradually turns toward downhill, faster on steeper slopes and the longer you have been heading downhill.
- On slopes of 6° or more it presses you onto the ground so that small bumps do not launch you.
- There is no bank: a jump from a slide is a normal jump using your current flat speed.

**Top speed on slopes** (where downhill acceleration equals friction): 10° gives 22.9, 15° gives 41.2, 20° gives 59.0, 30° gives 92.9 and 44° gives 134.6.

**Infinite slide.** On any slope steeper than about 6°, the slide never drops below the end speed of 8 while you hold Descend, so it continues indefinitely. Below about 6° it slows to a stop.

**On flat ground:**

| Starting speed | Drops below 8 after | Distance |
|---|---|---|
| 20 | 1.23 s | 17 |
| 32 | 2.08 s | 38 |
| 50 | 3.03 s | 76 |
| 80 | 4.12 s | 146 |

**A slide ends when:** speed is 3 or less on a slope under 44°; you are off the ground for 0.12 s; you are airborne for more than 0.3 s; you jump; you release Descend; or your actual speed drops below 8.

### Slide landing

If you land (an impact of 34.6 or more into the ground counts as a landing) while **holding Descend, moving, and arriving at a shallow angle** (your speed into the ground is less than about 0.49 of your total speed, which on flat ground means roughly 29° or flatter, or landing along a slope), you go straight into a **powerslide** instead of a roll. That powerslide banks your speed at that moment. Your downward speed has already been zeroed by the landing, so the bank is essentially your flat speed.
