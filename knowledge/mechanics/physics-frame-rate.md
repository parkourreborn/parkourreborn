---
title: Frame Rate and Update Order
category: mechanics
summary: How each frame is processed, what runs once per frame or at a fixed rate, and everything in movement that depends on FPS.
aliases:
  - fps
  - frame rate
  - does fps matter
  - 60 fps vs 144 fps
  - best fps
  - update order
  - physics steps
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## How the Game Runs: Frames, FPS and Update Order

PARKOUR Reborn does not use Roblox's built-in Humanoid. It has its own character controller, which handles grounding, states, gravity, drag and steering, with the movement abilities and your stats built on top of it. Roblox's physics engine still moves your body and resolves collisions, but the custom controller overwrites your velocity every frame.

**Order of operations in each frame:**

1. **Input and render step.** Key presses are handled and abilities fire (jump, wall climb, powerslide, wall kick and so on). The character update refreshes your stats, ground and air flags and run speed, followed by the wallrun and movement updates. The jump float loop, the dropdown loop and the coil raise and lower also advance here.
2. **Roblox physics simulation.** Roblox moves your body using last frame's velocity and applies its own gravity (workspace gravity is also 75) to your position while doing so. In-game testing (a held jump reaches slightly higher at 60 FPS than at 144 FPS) shows that Roblox moves your character in physics steps of about 60 per second, independent of your frame rate. Above 60 FPS, some frames have no physics step, and your position does not change in them.
3. **PostSimulation.** The character controller's physics step runs. It:
   - discards whatever Roblox did to your vertical velocity and restores last frame's value,
   - subtracts gravity × frame time from your vertical velocity,
   - performs the **ground check** for this frame,
   - applies drag and your WASD steering,
   - **then** applies any velocity an ability set during this frame (an ability's velocity change is only stored until this point),
   - **then** selects your new state (Running, Falling and so on).

**Update rates of each system:**

| System | Update rate |
|---|---|
| Ground check, state machine, gravity, drag, steering | Once per rendered frame (variable time step, capped at 0.1 s) |
| Jump float and the "jump released" check | Once per rendered frame |
| Dropdown hop, coil raise and drop, grapple and zip pull loops | Once per rendered frame |
| Character update (ground and air flags, run speed, landing) | Once per rendered frame |
| Powerslide friction, automatic dropdown check, slide-under check | Fixed 60 Hz (catches up below 60 FPS, never runs faster above it) |
| Slide physics (slopes and friction) | Fixed 60 Hz |
| Wallrun and wall climb movement | 120 Hz sub-steps, executed each frame |
| Glass smash check | Fixed 60 Hz |
| Bash and door check | 15 Hz |

**Consequences for frame rate:**

- Your position only changes on physics steps, so above 60 FPS the game does not check your position more often than at 60 FPS: frames without a physics step re-check the same position. Below 60 FPS (for example at 30), each check covers two physics steps, so there are fewer checks per second.
- Anything that must happen on one specific frame (Kogo, Bogo) has a window of exactly one frame: 33.3 ms at 30 FPS, 16.7 ms at 60 FPS, 6.9 ms at 144 FPS and 4.2 ms at 240 FPS. These techs become harder, measured in milliseconds, at high frame rates.
- The switch from Jumping to Falling after releasing jump is checked once per frame after a 0.05-second minimum. It therefore happens at 66.7 ms at 30 and 60 FPS, but at 55.6 ms at 144 FPS and 54.2 ms at 240 FPS.
- Your vertical speed is updated every frame, but you only move on physics steps. At 60 FPS there is one speed update per move; at 144 FPS gravity has already reduced your speed two or three times before each move, so held jumps go slightly lower (about 0.26 studs at run speed 32). Jumps at 30 FPS are also slightly lower than at 60 (see the Jump Physics page).

**Distance travelled between position checks** (one physics step at 60 FPS and above, one frame at 30 FPS):

| Speed | 30 FPS | 60 FPS and above |
|---|---|---|
| 20 | 0.67 | 0.33 |
| 32 | 1.07 | 0.53 |
| 44 (long jump) | 1.47 | 0.73 |
| 60 | 2.00 | 1.00 |
| 100 | 3.33 | 1.67 |
| 150 | 5.00 | 2.50 |

## Frame Rate: Everything That Depends on FPS

| Mechanic | Effect of higher FPS | Values |
|---|---|---|
| Catching coyote time while rising fast | Easier at 60 FPS than at 30; **no further gain above 60** (your position only changes about 60 times per second) | Guaranteed below 78 / 156 rise speed at 30 / 60+ FPS (the Coyote Time and Ledge Grace page) |
| Catching coyote time when only clipping the top of a ledge | Same as above | Guaranteed below 15 / 30 rise speed at 30 / 60+ FPS |
| Becoming Falling after releasing jump | Slightly **earlier** | 66.7 / 66.7 / 55.6 / 54.2 ms |
| Landing-frame techs (Kogo, Bogo, first Pogo route) | **Harder** (the window is one frame) | 33.3 / 16.7 / 6.9 / 4.2 ms |
| Pogo when the wallrun already put you on the floor | **No effect** | Up to 0.1 s window at any FPS |
| DDT | **Easier**, effectively requires 100+ FPS | You become Falling sooner and the first check sees an earlier position (the Tech Mechanics page) |
| Jump height | **Highest at 60 FPS**, slightly lower at 30 and above 60 | Held jump at run speed 32: 5.22 / 5.33 / 5.07 / 5.06 studs |
| Ledge grace | 30 FPS gets about 17 ms more | 250 / 233 / 233 / 233 ms |
| Jump buffer | Only matters below about 13 FPS | At least one frame |
| Powerslide friction, auto-dropdown, slide physics | **No effect** (fixed 60 Hz) | — |
| Automatic slope slide (steeper than 44°) | Slower below 60 FPS; no change above | At 30 FPS the push is half as strong per second |
| Wallrun movement | Essentially no effect (120 Hz sub-steps) | — |
