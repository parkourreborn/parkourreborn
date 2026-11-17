---
title: Landing and Fall Damage Physics
category: mechanics
summary: When a landing counts, fall damage and fatal speeds, precise and perfect landings, landing types, pillows, fall stabilization and fall stoppers.
aliases:
  - fall damage
  - landing physics
  - precise landing
  - perfect landing
  - roll
  - impact
  - fall stabilization
  - fatal fall
  - pillows
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Landing and Fall Damage

### When a landing counts

The landing logic (animations, damage, landing types) runs when you go from air to ground with up speed below 10, after at least 0.1 s in the air, and at least 0.5 s after the previous processed landing. The impact is measured as an **equivalent fall height**: `h = (your speed into the ground)² ÷ 150`. Only the part of your speed going into the ground counts, so landing along a slope is much softer than landing straight down.

- h > 8 (impact faster than 34.6): counts as a real landing (sound, landing type).
- h > 20 (impact faster than 54.8): damage (h > 30, impact faster than 67.1, after a dropdown).

### Preparing (pressing Descend before landing)

How long before the impact you pressed Descend determines your fatal height:

| Timing | Fatal equivalent height | Fatal impact speed |
|---|---|---|
| Not prepared | 37.7 | 75.2 |
| Prepared more than 175 ms early | 48.8 | 85.5 |
| 90 to 175 ms early | 52.0 | 88.3 |
| 50 to 90 ms early | 61.8 | 96.2 |
| 50 ms or less early (perfect) | 65.0 | 98.7 |

**Damage** = 20 + cubic(how far you are from 20 toward your fatal height) × 80 (so 20 at the threshold, rising steeply to 100 at the fatal height), then multiplied by a timing factor:

- **Pressed less than 90 ms before impact (precise): no damage at all**, unless the fall exceeds your fatal height, in which case you die.
- 90 to 500 ms early: × 0.35 to × 1.
- Not prepared: × 1.

Unprepared damage by impact speed: 55 → 20, 60 → 21, 65 → 28, 70 → 49, 75 → 97.

**Precise and perfect landings** (less than 90 ms, with h > 8) also give a run speed bonus of (impact ÷ 110 × 1.25)⁵ (unless afterboosted), heal (impact ÷ 110 × 3)³, and reset your dash. Speed bonus: 40 → +0.02, 60 → +0.15, 80 → +0.62, 100 → +1.89, 120 → +4.72. Heal: 40 → 1.3, 60 → 4.4, 80 → 10.4, 100 → 20.3.

### Landing types

For a real landing (h > 8):

| Situation | Result |
|---|---|
| Prepared, at least 175 ms early, and not facing your input direction | **Straight** landing |
| Prepared, moving, shallow angle (the Powerslide and Slide Physics page) | **Slide** landing (automatic powerslide) |
| Prepared, moving, precise (less than 90 ms), h above 16 | **Roll** (drag 0.5 per second while rolling, so speed is kept) |
| Prepared and moving otherwise | **On all fours** (run speed pulled toward 24) |
| Prepared, not moving | Straight landing |
| Not prepared, h below 20 | **Stumble** (gives a small speed boost) |
| Not prepared, h of 20 or more | **Hard** landing: run speed reset to 12, briefly frozen, combo reset |

### Pillows, fall stabilization and fall stoppers

- **Pillows** (cushion objects): landing on one cancels damage from any damaging or fatal fall. The exception is landing at near-terminal speed (falling faster than 205): then you need fall stabilization of at least 0.5, or you take full damage.
- **Fall stabilization:** while free falling (faster than 135 down) hold **Ascend and Descend together**. Stabilization builds at 1 per second up to 1 and drains at 1 per second when you stop. It also straightens your falling pose.
- **Fall stoppers** (breakable awnings and similar): if the fall would be fatal or kill you, you break through. Damage is halved (maximum 90), you keep falling with your velocity divided by 1.5 to 3.5 (more reduction at lower speeds), and you cannot jump for 0.5 s.
