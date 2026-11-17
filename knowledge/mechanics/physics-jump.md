---
title: Jump Physics
category: mechanics
summary: The jump formula, the 42 cap, held versus tapped jumps by frame rate, the high jump float and the buffered jump.
aliases:
  - jump
  - jump physics
  - high jump
  - jump height
  - tap jump
  - hold jump
  - jump buffer
  - buffered jump
  - jump cap
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Jump, High Jump and Buffered Jump

### Conditions

You need your jump charge (refilled whenever you are on the ground) and you must either be on the ground (by state) or within ledge grace. You also must not be frozen, in the dropkick landing animation, or within 0.5 s of breaking through a fall stopper. On a steep automatic-slide slope you can only jump once per second.

### Vertical formula

```
new up speed = min( max(0, current up speed) + jumpPower + edgeBonus ,  max(42, current up speed) )
jumpPower    = 6 + 0.4 × run speed     (10.8 at 12, 16.4 at 26, 18.8 at 32, 19.6 at 32 + dash bonus)
edgeBonus    = 1.3 for a flail (edge) jump, 2 for a long jump, 0 otherwise
```

Consequences:

- **The jump is additive.** Jumping while already rising adds jump power on top.
- **It is capped at 42.** Rising at 30 and jumping at run speed 32 would give 48.8, which is capped to 42.
- **If you are already rising faster than 42, your up speed is kept** (nothing is added and nothing is removed).
- **Falling speed is discarded.** Because of `max(0, current up speed)`, a jump during ledge grace while already falling throws your fall speed away and gives you a fresh jump. A ledge grace jump is always a full jump, regardless of how fast you had started falling.

### Horizontal component

- **Normal jump:** horizontal speed = max(your flat speed, your run speed if you are holding a direction). Jumping from a standstill while holding W instantly gives you run speed.
- **Direction:** if you are holding a direction **and** moving slower than 12, you jump in your input direction. Otherwise you jump in **the direction you are already moving**. Jumps do not redirect you when you are fast.
- **Flail (edge) jump and long jump:** horizontal = max(run speed × multiplier, your flat speed). See the Dash, Afterboost and Long Jump Physics page.
- **Slide jump (while powersliding):** horizontal = max(normal jump horizontal, **your powerslide bank**). The direction is your input direction clamped to within **60° either side** of the slide direction. **With no input, the bank is applied along the slide's 3D direction**, so if most of the bank was vertical (you slid while rising fast), only its flat portion becomes horizontal speed. **Always hold a direction for a slide jump.**

### High jump (the float)

Holding the jump key makes the jump floatier. Immediately after jumping, your gravity is reduced by `jumpPower × 3`, and that reduction decreases by 64 per second while you keep holding. The float therefore lasts at most `jumpPower × 3 / 64` seconds: **0.51 s at run speed 12, 0.77 s at 26 and 0.88 s at 32**. At the start of a jump at run speed 32, your gravity is only 75 − 56.4 = 18.6.

If you release the key (and at least 0.05 s has passed since the jump), the float ends immediately, gravity returns to 75 and **your state becomes Falling**. While you hold the key, your state remains Jumping, so you cannot be grounded and cannot catch coyote time. **This is the reason coyote techs require a quick tap of the jump key.**

**Jump height on flat ground, fully held versus tapped (released as early as possible), by frame rate** (with your character moved about 60 times per second, which matches in-game testing):

| Run speed | Jump power | FPS | Held: peak | Held: airtime | Tapped: peak | Tapped: airtime |
|---|---|---|---|---|---|---|
| 12 | 10.8 | 30 | 1.03 | 0.400 s | 0.80 | 0.300 s |
| 12 | 10.8 | 60 | 1.06 | 0.400 s | 0.87 | 0.317 s |
| 12 | 10.8 | 144 | 0.94 | 0.389 s | 0.74 | 0.306 s |
| 12 | 10.8 | 240 | 0.93 | 0.383 s | 0.74 | 0.300 s |
| 26 | 16.4 | 30 | 3.40 | 0.767 s | 1.97 | 0.467 s |
| 26 | 16.4 | 60 | 3.48 | 0.767 s | 2.12 | 0.483 s |
| 26 | 16.4 | 144 | 3.27 | 0.736 s | 1.92 | 0.472 s |
| 26 | 16.4 | 240 | 3.26 | 0.733 s | 1.93 | 0.467 s |
| 32 | 18.8 | 30 | 5.22 | 0.967 s | 2.62 | 0.533 s |
| 32 | 18.8 | 60 | 5.33 | 0.950 s | 2.83 | 0.567 s |
| 32 | 18.8 | 144 | 5.07 | 0.917 s | 2.59 | 0.535 s |
| 32 | 18.8 | 240 | 5.06 | 0.917 s | 2.61 | 0.533 s |

Jumps are low without momentum: a jump at base run speed reaches only about 1 stud. **The frame rate difference is small, and 60 FPS jumps highest.** A fully held jump at run speed 32 peaks at 5.33 studs at 60 FPS, 5.22 at 30 FPS and about 5.07 at 144 or 240 FPS (about 5% lower than at 60). Tapped jumps follow the same pattern. Above 60 FPS, gravity reduces your vertical speed several times between physics steps, so each step moves you with a slightly lower speed than it would at 60 FPS.

**Effect of how long the key is held (run speed 32):**

| Held for | 30 FPS | 60 FPS | 144 FPS | 240 FPS |
|---|---|---|---|---|
| Tap | 2.62 | 2.83 | 2.59 | 2.61 |
| 0.1 s | 3.35 | 3.39 | 3.13 | 3.16 |
| 0.2 s | 4.22 | 4.28 | 4.00 | 4.01 |
| 0.3 s | 4.81 | 4.88 | 4.63 | 4.61 |
| 0.5 s or longer | 5.22 | 5.33 | 5.07 | 5.06 |

Holding for longer than about 0.5 s adds nothing, because you have already reached the top of the arc.

**Earliest moment you can be Falling after a jump** (the earliest you can catch coyote time or be grounded again):

| FPS | Frame | Time |
|---|---|---|
| 30 | 2nd | 66.7 ms |
| 60 | 4th | 66.7 ms |
| 144 | 8th | 55.6 ms |
| 240 | 13th | 54.2 ms |

**Example: jumping in coyote time (a jump boost).** You catch coyote time rising at 30 and tap jump at run speed 32. 30 + 18.8 = 48.8, capped to **42**. That jump alone carries you about 13 studs above the point where you jumped, compared with about 3 studs on flat ground. This is why jumping during coyote time is so strong.

### Buffered jump

Pressing Ascend in the air when no other action is available (no vault, mantle, pipe or wall) stores a buffered jump. The next time you go from air to ground (**including coyote catches**), if the press was within **0.075 s** (or **0.2 s if you are still holding the key**), you jump on that exact frame. At very low frame rates the window is at least one frame (100 ms at 10 FPS).

The buffered jump fires as part of the landing itself, on the landing frame. This same-frame timing is what makes Coil Trimp work (the Vault, Ledge Grab and Climbing Physics page).
