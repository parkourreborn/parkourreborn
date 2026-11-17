---
title: Coyote Time and Ledge Grace
category: mechanics
summary: Exactly how coyote time (rising past a ledge while grounded) and ledge grace work, how long they last, how frame rate affects them and the landing-frame rule.
aliases:
  - coyote time
  - ct
  - extended coyote time
  - ledge grace
  - landing frame
  - how to get coyote time
  - tap space
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Coyote Time and Ledge Grace

### Coyote time (extended coyote time)

**Definition.** You are moving upward and your feet pass the top of a ledge. For at least one frame the ledge is inside your grounding band, so you become grounded and your state becomes Running. On the next frame you are no longer touching anything, but because you are still moving upward the state machine changes nothing, and you remain in Running while in the air. This lasts until your up speed reaches zero, at which point you switch to Falling.

**Requirements:**

- Your state must **not** be Jumping while your feet are in the band (see the table in the Grounding and Movement States page).
- You must be over the ledge horizontally (within roughly 0.6 to 0.9 studs of your centre).
- The ledge top must be inside the band (from feet − 0.5 to feet + 2.1) on a frame where the game checks.

**What it gives you:**

- Jumping (additive; see the Jump Physics page).
- Powerslide, which banks your current speed **including** the upward component.
- Ground dash, and a held (buffered) dash fires.
- All charges refilled and the same-wall restriction cleared.
- Run speed continues to build.
- When it ends (you switch to Falling), you also get the normal 0.15 s of ledge grace.

**Duration.** From the catch until your up speed reaches zero. With gravity 75, catching coyote time while rising at speed V gives about **V / 75 seconds** of coyote time, followed by **0.15 s** of ledge grace for jumping and powersliding. For example, a catch at 40 up speed gives about 0.53 s plus 0.15 s; a catch at 20 gives about 0.27 s plus 0.15 s. Gravity still acts on you throughout; only the state is preserved.

**Maximum rise speed for a reliable catch.** The band is about 2.6 studs tall. Your position only changes on physics steps (about 60 per second), so the number of position checks you get inside the band is 2.6 × checks per second ÷ rise speed, with 30 checks per second at 30 FPS and 60 at 60 FPS or above:

| Rise speed | 30 FPS | 60 FPS and above |
|---|---|---|
| 20 | 3.9 | 7.8 |
| 40 | 1.95 | 3.9 |
| 60 | 1.3 | 2.6 |
| 80 | 0.97 | 1.95 |
| 100 | 0.78 | 1.56 |
| 150 | 0.52 | 1.04 |
| 200 | 0.39 | 0.78 |

Values below 1.0 mean you can pass through the band without the game ever checking you inside it. A catch is guaranteed below a rise speed of **78 at 30 FPS and 156 at 60 FPS or above**.

If you only overlap the ledge for the top part of the band (for example, when arriving from the side late, so you are over the ledge only for the last 0.5 studs), the guaranteed limits drop to **15 at 30 FPS and 30 at 60 FPS or above**. A frame rate above 60 does not add position checks; it changes how soon you can be Falling after a jump (the Jump Physics page) and which position the first check after that sees (Dropdown Trimp, the Tech Mechanics page).

### Ledge grace

When you run off an edge:

1. You stay in Running for at least 0.08 s, because Falling requires 0.08 s without ground (checked once per frame).
2. After that, ledge grace lasts another 0.15 s after the last frame you were landed.
3. Throughout this period you can jump (if you still have your jump charge) and powerslide.

| FPS | Running phase | Total grace | Distance at 32 speed |
|---|---|---|---|
| 30 | 100 ms | 250 ms | 8.0 studs |
| 60 | 83.3 ms | 233 ms | 7.5 studs |
| 144 | 83.3 ms | 233 ms | 7.5 studs |
| 240 | 83.3 ms | 233 ms | 7.5 studs |

**Dropdown also counts as ledge grace** for its entire duration.

**Powerslide cooldown reset.** Whenever you are in the air beyond the ledge grace window, the game sets your powerslide cooldown to zero. If you slide, leave the ground for more than about 0.23 s and then touch ground again, you can powerslide again immediately. On the ground the cooldown is 1 s. This is part of how Coil Trimp works.

### The landing-frame rule (Kogo, Bogo, Pogo)

As described in the Frame Rate and Update Order page, a velocity change from an ability does not take effect immediately. It is stored and applied at the end of PostSimulation, **after** the ground check and **before** the new state is chosen.

On the frame where you would land, this happens:

1. The simulation moves you down into the floor's grounding band using last frame's falling velocity.
2. The ground check finds the floor and grounds you (provided your state is not Jumping).
3. Your ability's new velocity (for example +28 up from a wall kick) is applied.
4. The state is selected: grounded, so **Running**, with +28 up speed.

You are now in coyote time off a flat floor while rising.

**The timing constraint.** The ability must be used during the exact frame in which you would touch down. One frame earlier, the upward velocity is applied before you reach the floor, so you never touch it. One frame later, you are already Running and landed, and most air moves (wall kick, wall climb) cannot be used from the ground. The window is therefore **one frame**: 33.3 ms at 30 FPS, 16.7 ms at 60 FPS, 6.9 ms at 144 FPS and 4.2 ms at 240 FPS. This is why Kogo is easier at low frame rates, which matches player experience.

The rule applies to: wall kick (Kogo), a wallrun jump-out near the floor (Pogo), and wall bounce (Bogo, where both the climb start and the release must resolve in that frame, because starting a climb sets Jumping). It applies to any move that sets velocity without setting Jumping.

It does **not** apply to a normal jump, because a jump sets the Jumping state, which blocks grounding.

**Pogo's second route.** If the wallrun has already put you on the floor (you are Running), it continues for up to 0.1 s before it ends. A jump-out during that time sets Falling and 26 up speed, and the ground check that follows still sees you on the floor before the new velocity applies, so you are grounded while rising at 26 straight away. This route does not depend on frame rate and is far less strict than Kogo.
