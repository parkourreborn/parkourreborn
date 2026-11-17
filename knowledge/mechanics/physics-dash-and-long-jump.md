---
title: Dash, Afterboost and Long Jump Physics
category: mechanics
summary: Dash, flail jump, afterboost, long jump, chain and air dash, with launch speeds and windows.
aliases:
  - dash physics
  - afterboost
  - long jump
  - flail jump
  - edge jump
  - chain jump
  - chain strain
  - air dash
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Dash, Flail Jump, Afterboost, Long Jump, Chain and Air Dash

### Dash (on the ground)

- Hold Dash on the ground while moving. It also works while vaulting, within 0.1 s after landing, or inside the afterboost window.
- It lasts up to **2 s** while held and has a **1 s cooldown** after release. Holding Dash during the cooldown waits and fires it the moment it becomes available (this is a "buffer dash").
- Effects: **run speed acceleration × 2** (only up to 26), a **+2 run speed bonus** that ramps in over 0.5 s (the dash bar charging), and **jumping off a ledge while dashing performs a flail jump** (also called an edge jump).
- Pressing Dash during coyote time counts as a ground dash, because you are on the ground by state.

### Flail jump (edge jump)

A flail jump happens when you jump while Dash is held (or within 0.2 s of releasing it, or while the chain hold timer is active) **and** you are at an edge. "At an edge" means any of: no floor 2 studs ahead within 4 studs down, rising faster than 8, or being in a dropdown. **Any jump during coyote time while rising faster than 8 therefore also counts as an edge jump.**

- Horizontal = max(run speed × **1.246**, your flat speed).
- Vertical = jump power + 1.3.

### Afterboost

- Dash for more than 0.5 s (the bar is charged), release, then press Dash again **within 0.2 s** (while the dash bar is red).
- Your entire velocity is instantly multiplied by **1.15**, you gain +4 bonus run speed for 0.2 s, and while you are on the ground, ground drag and steering are multiplied by 0.15 (you glide with it).
- Jumping off a ledge while afterboosted performs a **long jump**.

### Long jump

- Horizontal = max(run speed × **1.379**, your flat speed), plus the chain bonus.
- Vertical = jump power + 2 (20.8 at run speed 32).
- It starts or continues a chain if you have the Chain ability.
- Air steering is disabled immediately afterwards and ramps back in over 0.25 s.

### Chain

- After a long jump you have a **0.2 s hold timer**. It only counts down while you are on the ground, not powersliding, not early in a roll, and either grounded or rising faster than 16. **Powerslide and dropdown freeze it**, which is how they "preserve the chain".
- Jumping off another edge while the timer is still running performs another long jump (the afterboost flag stays set until you start a new dash), and the chain count increases by 1.
- The chain adds **0.5 − 0.5 / n** to the multiplier: +0.25 at n = 2, +0.333 at n = 3, +0.4 at n = 5, with a limit of +0.5.
- **Strain:** each long jump adds 1 strain (maximum 8). If strain is 4 or more when you long jump, your chain count resets to 1. Strain drains at 4 per second once 0.2 s have passed since your last long jump. **Long jumps spaced at least 0.45 s apart never reset the chain**; spamming them faster eventually does.

Horizontal launch speeds (before taking the maximum with your current flat speed):

| Run speed | Normal | Flail (edge) | Long | Chain 2 | Chain 3 | Chain 5 | Chain limit |
|---|---|---|---|---|---|---|---|
| 26 | 26 | 32.4 | 35.9 | 42.4 | 44.5 | 46.3 | 48.9 |
| 32 | 32 | 39.9 | 44.1 | 52.1 | 54.8 | 56.9 | 60.1 |

### Air dash

- Hold Dash in the air (requires Wall Boost or Wall Kick to be unlocked). The cooldown is **0.5 s** (1 s after a wall kick).
- **Air dash gives no velocity.** It is a mode. While it is active (up to 2 s while held):
  - wall kick is possible (within 0.2 s of pressing Dash);
  - hitting a wall turns your climb into a **wall clutch**, which allows a wall boost;
  - Ascend checks walls first: wall climb, then wall kick, then wallrun, then vault or mantle, then jump;
  - **if you are wallrunning, the game automatically jumps you off the wall 0.2 s after the air dash.** The "Double Jump" tech uses this.
