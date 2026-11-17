---
title: Wall Movement Physics
category: mechanics
summary: How wallruns, wall climbs, wall boosts, wall kicks and wall clutches work, how wall contact converts your speed and which charges they use.
aliases:
  - wallrun
  - wall run physics
  - wall climb
  - wall boost
  - wcb
  - wall kick
  - wall clutch
  - wall jump
  - wall charges
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Walls: Wallrun, Wall Climb, Wall Jumps, Wall Bounce, Wall Boost, Wall Kick

### Wallrun or wall climb?

Pressing Ascend in the air near a wall starts either a wall climb or a wallrun. The game uses your **origin direction**: the camera direction if your camera is locked (shift lock or first person), otherwise your WASD input direction, otherwise the direction your character faces.

- It casts a ray 5 studs forward along that direction. If that hits a near-vertical wall **and** a 45° side ray also hits the same wall **and** you are facing more than 60° away from straight into it, you get a **wallrun**.
- If you are facing within 60° of straight into the wall (or the side ray does not see the same wall, for example on a narrow pillar), you get a **wall climb**.
- Wall climb requirements: a wall climb charge (or a Climbable-tagged surface), up speed above −75, and no more than 0.4 s spent falling (unless air dash with Wall Boost is active or the surface is Climbable). The wall must be nearly vertical (its normal tilted between slightly downward and 0.25 upward).
- Wallrun requirements: a wallrun charge, up speed above −75, and a wall that is not a Barrier.
- Charges: **2 wallruns** (3 with Drifter Glove I) and **1 wall climb** (2 with Climber Glove II), refilled on the ground (including coyote time), by ledge climbs and when leaving a pipe.
- **Same-wall restriction:** you cannot wallrun on a wall whose facing is within about 5° of the last wall you wallran on, and the same applies separately for wall climbs. Touching the ground (including coyote time) clears it.

### Wall entry: how your speed is converted

When a wallrun or wall climb starts, the game takes your velocity from this frame or the previous frame (whichever is larger, so the frame where the wall already stopped you does not count against you) and expresses it relative to the wall:

```
S      = your full 3D speed
along  = component of your velocity along the wall (horizontal)
up     = component of your velocity straight up
stored = (along, up) normalised, × S
```

**The part of your velocity going into the wall is not lost.** Your entire speed S is redistributed between "along the wall" and "up", in the same ratio as those two components. This stored value is what a wall bounce later returns.

On entry, your state is set to Jumping and your up speed is zeroed, and then:

- **Wallrun:** along-the-wall speed = stored along; up speed = min(0, stored up) + 12. If you were rising, you start the wallrun at +12; if you were falling, you keep part of the fall.
- **Wall climb:** sideways speed = stored along ÷ 4; up speed = min(10, stored up ÷ 2 + 40), so a climb always starts at 10 or less up speed. The rest of your speed is not lost; it waits in the stored value for a wall bounce.

### Wallrun

- **Duration:** 1 s base, 1.5 s with the Glove, 2.25 s with Drifter Glove I, and × 1.25 when the Mag Rail is equipped and the wall is on your left.
- **Vertical:** starts at min(0, entry up) + 12, then wall gravity of 20 per second, never falling faster than 25. The wallrun also ends if you drop more than 30 studs below where it started (480 with Drifter Glove I).
- **Horizontal:** the target speed is max(your current speed along the wall, your run speed), approached at a rate of 5 per second in your input direction along the wall (or forward if there is no input). **A wallrun keeps your entry speed for its entire duration.**
- **Drifter Glove II (float):** while falling faster than 10 at full wallrun speed, you gain 27.5 per second of upward speed, and when falling faster than 15, 0.75 of that is also added to your horizontal speed. This converts falling into horizontal speed.
- **Air dash during a wallrun:** the game automatically jumps you off the wall 0.2 s after the air dash.

Wallrun height over time:

| Entry up speed | Peak | At 0.6 s | At 1 s | At 1.5 s | At 2.25 s |
|---|---|---|---|---|---|
| 0 or rising | +3.55 | +3.6 | +1.9 | −4.6 | −22.2 |
| −10 | +0.09 | −2.5 | −8.1 | −19.4 | −38.1 |
| −30 | 0 | −13.8 | −23.8 | −36.3 | −55.1 |

**Wallrun jump-out** (release Ascend with Hold To Wall Run enabled, or press it again otherwise): the direction is your camera direction mirrored to point away from the wall; **horizontal speed = your wallrun speed** (whichever is larger of your along-the-wall speed and your run speed), **up speed = 26** (an extra 4.5 studs of height). The state is set to Falling.

**Corner Cut:** wallrunning from one wall onto the next face around a corner. The new wall faces a different direction, so the same-wall restriction does not apply, and the entry conversion carries your full speed onto it.

### Wall climb

- Starts at 10 or less up speed (this page). The first push happens immediately, then you are pushed up by **+22.75** at an interval of 0.4 s at run speed 12 down to 0.3125 s at run speed 32. Wall gravity is 90 per second.
- **Pushes only happen while you are not sliding down.** As soon as your climb speed drops below zero, the climb becomes a clutch: no more pushes, and wall gravity is divided by 3 (you slide down slowly). A faster run speed means shorter push intervals, which keeps you above zero for more pushes.
- **Without a Glove, climb run speed is capped at 26.**
- It lasts at most 4 s. It ends early if you have been hanging (speed of 5 or less) for 1 s, if you slide 5 studs below where you started, or when you reach the top, in which case the game automatically mantles or climbs the ledge if there is room.
- **Climber Glove I:** one extra push of 1.5 × 22.75 = 34.1 when your climb starts to fall ("extra push at the peak").

Climb height:

| Run speed | Push interval | Peak height | Ends after |
|---|---|---|---|
| 12 | 0.400 s | 10.3 | 1.17 s |
| 20 | 0.365 s | 10.8 | 1.17 s |
| 26 | 0.339 s | 14.5 | 1.43 s |
| 32 (Glove) | 0.313 s | 19.1 | 1.69 s |

**Jumping off a wall climb:**

- Within **0.2 s** of touching the wall: **wall bounce** (the Wall Bounce and Flick Physics page).
- After 0.2 s: a weak jump of 14.7 outward and 26 up.

With the default Hold To Wall Climb setting, releasing Ascend is what triggers the jump.

### Wall boost (Wall Climb Boost, WCB)

- Air dash, hit the wall (this starts a "wall clutch" climb), then press Ascend again **within 0.25 s** while **looking upward** and roughly facing the wall.
- Your velocity is set to **straight up** at `sqrt(2 × 75 × (11 + 6a))`, where a is your run speed progress from 12 to 32 (0 to 1). This is exactly enough to rise **11 to 17 studs**: 40.6 up at run speed 12, 45.8 at 22 and 50.5 at 32.
- **Climber Glove I:** `18 + 6a` studs, which is 52.0 to 60.0 up.
- No horizontal speed at all. The state is set to Falling. If the conditions are not met, the boost fails and the climb ends.

### Wall clutch

A wall climb started while air dash is active. It allows a wall boost. While you are falling on any wall climb (including a clutch), wall gravity is divided by 3 and you hold on longer.

### Wall kick

- **Requirements:** in the air, air dash active, within **0.2 s** of pressing Dash, a wall within 6 studs **behind** you (at waist height), up speed above −75, and a wall kick charge (refilled on the ground).
- **Effect:** `velocity = augment(velocity, facing direction × push)`, then **up speed = 28**. The push is 18 at run speed 12 and up to 30 at run speed 24 or more. Your facing direction is the origin direction from this page.
- Because of `augment` (the Speed Stores and Converters page), the kick never makes you slower; it turns you toward your facing direction. Afterwards the air dash cooldown is 1 s.
- **The state is not changed**, so you stay in Falling and can catch coyote time while rising (Kogo, Wall Kick Wumpy).

### Summary of wall resources

| Resource | Base | Upgrade | Refilled by |
|---|---|---|---|
| Wallrun | 2 | 3 (Drifter I) | Ground or coyote time, ledge climb, leaving a pipe |
| Wall climb | 1 | 2 (Climber II) | Same |
| Wall kick | 1 | — | Same |
| Same-wall restriction | — | — | Cleared by ground or coyote time |
| Mag bounce | 1 use | — | Ground or coyote time, **and** starting any wallrun or wall climb, any wall jump or wall bounce, wall boost, wall kick |
