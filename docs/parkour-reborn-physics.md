# Parkour Reborn Movement Physics: Complete Technical Reference

This document explains how movement in PARKOUR Reborn works internally: the exact formulas, values, timing rules and interactions that make basic movement and advanced techs (Boing, Gumpy, DDT, Kogo, wall bounce flicks and so on) behave the way they do.

**Units.** Distances are in studs, speeds in studs per second, and times in seconds or milliseconds. "Up speed" means vertical velocity; "flat speed" or "horizontal speed" means speed ignoring the vertical component. Gravity in PARKOUR Reborn is **75 studs/s²** (the Roblox default is 196.2).

**Names.** Official move names (the in-game names, which match the "basics" and "concepts" in the tech list) are used wherever possible. "Coyote time" in this document always means the PARKOUR Reborn meaning: rising past a ledge and becoming grounded, also called extended coyote time. The classic behaviour of still being able to jump shortly after walking off an edge is called **ledge grace**, although players often call both "CT".

---

## 0. Summary of the Key Rules

These rules explain the large majority of advanced movement:

1. **"Grounded" is decided by your state, not by touching the floor.** The states Running, Walking, Idle and Sliding count as ground; Jumping and Falling count as air. You only switch to Falling once your up speed is zero or below **and** 0.08 seconds have passed since you were last grounded. If you become grounded for even one frame while moving upward, you stay in Running for as long as you keep rising. This is coyote time.
2. **While your state is Jumping, you can never become grounded.** A normal jump keeps you in Jumping until you release the jump key (after at least 0.05 seconds) or the float ends. Wall jumps, wall bounces and wall boosts force Falling. This is why coyote-based techs require a quick tap of the jump key.
3. **Being grounded during coyote time counts as real ground for almost everything.** You can jump, powerslide and dash, and it refills all of your charges (wallruns, wall climbs, wall kick, Mag Rail ammo and mag bounce, grappler ammo) and clears the same-wall restriction.
4. **Powerslide banks your speed.** When it starts, it stores your horizontal speed combined with your upward speed as a single 3D speed. Jumping during the slide launches you horizontally at that banked speed. The bank never decays; only the visible slide speed does.
5. **Jumping is additive but capped.** New up speed = current up speed + jump power (about 11 to 19), capped at 42, unless you were already rising faster than 42, in which case your up speed is kept unchanged. A jump never reduces upward speed.
6. **Velocity set by an ability is applied after that frame's ground check.** If you trigger an upward move on the exact frame you would land, the game grounds you first and then applies the upward velocity, which puts you into coyote time off the floor itself. This is the basis of Kogo, Bogo and Pogo.
7. **Walls also store your speed.** When you start a wall climb, your entire 3D speed is rotated into "along the wall" and "upward" components and saved. A wall bounce (jumping off within 0.2 seconds) returns it. The vertical part is capped at 100; the along-the-wall part is not. Hitting the wall at an angle keeps the excess as horizontal speed.
8. **Mag bounce adds speed while you are rising.** It points your entire 3D speed in your look direction, then restores your up speed to the higher of 40 and what you had before.
9. **"Augment" pushes never lose speed.** Grapple pulls, wall kicks and mag bounces use a formula that turns you toward the push while keeping whichever is larger: your current speed or the push.
10. **The game updates your state once per rendered frame, but Roblox moves your character in physics steps of about 60 per second.** A higher frame rate makes you Falling sooner after a jump tap (which is why DDT wants 100+ FPS), but techs that must happen on one specific landing frame (Kogo, Bogo) get a shorter window, and held jumps go slightly higher at 60 FPS than at 144.

---

## 1. How the Game Runs: Frames, FPS and Update Order

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
- Your vertical speed is updated every frame, but you only move on physics steps. At 60 FPS there is one speed update per move; at 144 FPS gravity has already reduced your speed two or three times before each move, so held jumps go slightly lower (about 0.26 studs at run speed 32). Jumps at 30 FPS are also slightly lower than at 60 (see section 8).

**Distance travelled between position checks** (one physics step at 60 FPS and above, one frame at 30 FPS):

| Speed | 30 FPS | 60 FPS and above |
|---|---|---|
| 20 | 0.67 | 0.33 |
| 32 | 1.07 | 0.53 |
| 44 (long jump) | 1.47 | 0.73 |
| 60 | 2.00 | 1.00 |
| 100 | 3.33 | 1.67 |
| 150 | 5.00 | 2.50 |

---

## 2. Core Values

| Quantity | Value | Notes |
|---|---|
| Gravity | 75 | The controller default is 196.5; PARKOUR Reborn sets 75 |
| Vertical speed limits | −210 to +500 | −210 is terminal fall speed |
| Base run speed | 12 | The momentum stat starts here |
| Momentum cap | 26 to 32 | Depends on level and the MomentumUsage setting (section 6) |
| Maximum run speed | 32 | Plus +2 dash bonus or +4 afterboost bonus on top |
| Jump power | 6 + 0.4 × run speed | 10.8 at 12, 16.4 at 26, 18.8 at 32 |
| Jump vertical cap | 42 | Unless you are already rising faster |
| Ledge grace | 0.08 s state delay + 0.15 s | About 0.23 s in total |
| Jump buffer | 0.075 s | 0.2 s if the jump key is still held |
| Powerslide cooldown | 1 s on the ground | Cleared when airborne past ledge grace |
| Powerslide minimum speed | 8 | |
| Slide | 12 to start, ends below 8 | |
| Vault minimum speed | 16 | |
| Wall bounce window | 0.2 s after touching the wall | |
| Wall boost window | 0.25 s | Requires air dash |
| Wall kick window | 0.2 s after air dash | |
| Automatic slope slide | Slopes steeper than 44° | You cannot walk up them |
| Maximum ground slope | 60° | Steeper surfaces are walls |
| Air drag | 0.1 per second, horizontal only | About 9.5% of horizontal speed lost per second |
| Ground drag | 10 per second at 24 speed or less, much lower at high speed | Section 7 |
| Fall damage threshold | 54.8 impact speed into the ground | |
| Fatal fall | 75.2 (unprepared) to 98.7 (perfect preparation) impact speed | Section 14 |
| Grapple range | 90 | ×1.35 Swing I, ×1.5 Swing III |
| Grapple pull | 35 | ×1.25 Yank I, ×1.5 Yank III |
| Mag bounce | Up speed set to max(40, current) | |
| Mag Rail launch | 75 | ×1.05 to ×1.15 with upgrades |

---

## 3. The Character Body: Collider, Ground Detector and Leg Clipping

The exact shape of the character matters a great deal for coyote time and frame-based techs:

- The **root** (HumanoidRootPart) is the centre of the character. Your feet are **3 studs below the root**.
- The **collider**, the part that physically bumps into walls and floors, consists of two spheres of diameter 2 joined by a cylinder, spanning **root − 1 to root + 2**. The bottom of your collision is therefore **2 studs above your feet**. Your legs have no collision.
- The **ground disc** is a flat cylinder 1 stud tall and 1.8 studs wide, centred on your feet (from feet − 0.5 to feet + 0.5). If it overlaps any collidable part, you are touching ground.
- The **ground rays** are four rays cast from the corners of a 1.25 × 1.25 square beneath you. They start at root − 0.9 (feet + 2.1) and extend 2.6 studs down (to feet − 0.5). If none of them hits, a 1.8-stud-wide disc is swept down over the same distance instead.
- You are **grounded** on a given frame if the disc overlaps something, the rays or swept disc find a surface of 60° or flatter, **and** your state is not Jumping.

**Practical consequences:**

- A surface counts as ground if its top lies anywhere from **0.5 studs below your feet to 2.1 studs above your feet**, and you are over it horizontally (within roughly 0.6 to 0.9 studs of your centre). The grounding band is therefore about **2.6 studs tall**.
- Because the collider starts 2 studs above your feet, your legs can sink up to about 2 studs into a ledge and still become grounded on its top. When you are grounded and not moving upward, the game moves you up onto the surface (the correction is effectively instant).
- For the same reason, **you automatically step up onto anything about 2 studs tall** that you run into: your legs pass into it, the rays find its top, and you are snapped onto it.
- When you become grounded, **downward velocity is set to zero but upward velocity is kept.** This single rule is what makes coyote time possible.
- The collider has three shapes. **Default:** root − 1 to root + 2. **Low** (sliding, coiling, rolling, landing on all fours): a single sphere from root − 2.5 to root − 0.5, so your collision bottom is only 0.5 studs above your feet and your legs cannot clip deep into geometry. **High** (vaulting, dropdown): root + 1 to root + 3.

---

## 4. States and What "Grounded" Means to the Game

The custom humanoid has seven states: **NoPhysics, Idle, Running, Walking, Jumping, Falling and Sliding**.

**The game treats you as on the ground whenever your state is Idle, Running, Walking or Sliding.** The game keeps a ground flag for this, an air flag that is its opposite, and a landed flag that means "not in the air". Almost every ability checks these flags rather than whether you are physically touching the floor.

**State selection each frame, in priority order:**

1. Grounded on a slope steeper than 44° and not Jumping → **Sliding** (automatic slope slide).
2. Grounded and moving slower than 1 → **Idle**.
3. Up speed of zero or less, not grounded, and at least 0.08 s since last grounded → **Falling**.
4. Grounded → **Walking** or **Running**.
5. **None of the above → the state does not change.** This is the coyote time loophole: if you are not grounded but moving upward, no rule fires, so you remain in Running.

Abilities also set the state directly. This table is essential for understanding coyote time:

| Sets **Jumping** (blocks grounding) | Sets **Falling** (grounding possible) | Leaves the state unchanged |
|---|---|---|
| Normal jump (until release or float end) | Releasing jump (at least 0.05 s after jumping) | Wall kick |
| Starting a wallrun or wall climb | Wall jump, wall bounce, wall boost, pipe jump-off | Mag bounce |
| Rising while on a wall | Dropdown | Mag slap and mag launch (the wallrun's state is kept) |
| Vault, vault jump, springboard, Springhook launch | Grapple pull or zip release **in the air** | Dropkick |
| Grapple pull or zip release **from the ground** while moving up | Zip pull | Powerslide |
| Mag jump from the ground while moving up | Mag jump in the air | |
| | Breaking through a fall stopper, leaving a pipe | |

Jumping always turns into Falling on its own once your up speed reaches zero (rule 3 above), so being locked in Jumping only lasts until the top of your arc.

**Effects of being on the ground (including during coyote time):**

- A full refill happens: it refills your jump, wallrun charges, wall climb charges, wall kick, Mag Rail ammo, mag bounce, mag jump and grappler ammo (the grappler only refills when you are not mid-grapple, unless you have Yank III).
- The **same-wall restriction** is cleared. Normally you cannot wallrun or climb a wall facing the same direction (within about 5°) twice in a row.
- The wall kick and jump flags are reset.
- Run speed can build if you are moving.
- The landing check runs on the frame you switch from air to ground. The landing animation and damage part requires up speed below 10, so a fast-rising coyote catch skips that part and only performs the jump buffer check.
- The chain hold timer counts down.

**Restrictions while grounded in mid-air during coyote time:** pressing Ascend uses the ground action list, which is vault or mantle, then pipe climb, then jump. During coyote time, Ascend therefore jumps (or vaults or mantles if something is in front of you). A wallrun or wall climb cannot start until you are Falling. Pressing Descend powerslides (or triggers dropdown) instead of coiling.

---

## 5. Coyote Time and Ledge Grace

### 5.1 Coyote time (extended coyote time)

**Definition.** You are moving upward and your feet pass the top of a ledge. For at least one frame the ledge is inside your grounding band, so you become grounded and your state becomes Running. On the next frame you are no longer touching anything, but because you are still moving upward the state machine changes nothing, and you remain in Running while in the air. This lasts until your up speed reaches zero, at which point you switch to Falling.

**Requirements:**

- Your state must **not** be Jumping while your feet are in the band (see the table in section 4).
- You must be over the ledge horizontally (within roughly 0.6 to 0.9 studs of your centre).
- The ledge top must be inside the band (from feet − 0.5 to feet + 2.1) on a frame where the game checks.

**What it gives you:**

- Jumping (additive; see section 8).
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

If you only overlap the ledge for the top part of the band (for example, when arriving from the side late, so you are over the ledge only for the last 0.5 studs), the guaranteed limits drop to **15 at 30 FPS and 30 at 60 FPS or above**. A frame rate above 60 does not add position checks; it changes how soon you can be Falling after a jump (section 8.4) and which position the first check after that sees (Dropdown Trimp, section 18).

### 5.2 Ledge grace

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

### 5.3 The landing-frame rule (Kogo, Bogo, Pogo)

As described in section 1, a velocity change from an ability does not take effect immediately. It is stored and applied at the end of PostSimulation, **after** the ground check and **before** the new state is chosen.

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

---

## 6. Momentum: Run Speed Versus Actual Velocity

There are two different "speeds" in the game, and confusing them is the most common source of wrong explanations:

- **Run speed** (the momentum bar) is a stat between 12 and 32 that builds while you run. It is your walk speed, and it determines jump power, wall jump strength, wall climb push rate, wall boost height, long jump speed and more.
- **Actual velocity** is how fast you are really moving. It can be far above 32 (slide jumps, wall bounces and Mag Rail techs regularly exceed 100). The run speed stat does not limit it.

### 6.1 Building run speed

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

### 6.2 The momentum cap

Run speed cannot exceed your momentum cap: `26 + 6 × ((level − 1) / 19)²`, using the lower of your MomentumUsage setting and your level.

| Level | 1 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|
| Cap | 26.0 | 26.3 | 27.3 | 29.3 | 32.0 |

### 6.3 Losing run speed

- Moving at 8 or slower for more than 0.2 s: run speed returns toward 12 at a rate of 8 per second (fast).
- Moving more than 2 below your run speed (sharp turns, bumping into walls): you lose 0.25 to 1 per second.
- Landing on all fours: run speed is pulled toward 24.
- Taking fall damage: −3.
- Hard landing: reset to 12.
- In the air, run speed does not change at all.

### 6.4 Speed boost

Vaulting, mantling and climbing, wall kicks, long jumps, stumble landings and a few other actions give a speed boost, which adds min(1.25, (cap − current) ÷ 25) spread over 0.2 s. It is small, but it lets you top up momentum without running.

### 6.5 Health regeneration

If you have not taken damage for 3 s (or you are moving slowly), you heal `30 × (1 − 0.95 × your progress from 12 to 24 run speed)` per second: 30 per second when standing still, about 1.5 per second at full sprint.

---

## 7. Moving Around: Steering, Drag and Slopes

### 7.1 Steering

Each frame, if you are holding a direction:

- If your flat speed is **at or below** your run speed, your velocity is pulled toward (input direction × run speed) at a rate of 20 × influence × frame time. Influence is 0.6 on the ground and 0.25 in the air, and both decrease at high speed.
- If your flat speed is **above** your run speed, the pull is scaled by `1 − dot(velocity direction, input direction)`. Holding the direction you are already moving gives zero, so there is no pull and your momentum is untouched. Holding sideways or backwards gives full pull toward run speed in that direction, which bleeds speed quickly.

**Holding the key that matches your direction of travel preserves speed. Strafing or turning while fast in the air costs speed.** Releasing WASD removes the steering pull entirely; only drag remains.

Influence (on the ground and in the air) is multiplied by a factor k that is 1 at 24 flat speed or below and falls exponentially at higher speeds: 0.51 at 50, 0.14 at 100 and about 0.011 at 200 or more. For 0.25 s after a long jump it also ramps from 0 back up. At high speed, air control is almost gone, which also means you cannot accidentally kill your own speed.

### 7.2 Drag

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

### 7.3 Slopes

- Surfaces up to 60° count as ground; steeper surfaces are walls. Between 44° and 60° you are grounded but slide automatically.
- **On slopes steeper than 44° (when not Jumping) you slide automatically** (state Sliding). The slope pushes you downhill at `(1 − cos(angle)) × 75 × 2.616` per second (2.616 = 196.2 / 75, the slide speed scale), and your sideways speed receives slide drag.
- The slope push uses a frame time capped at 1/60 s, so **below 60 FPS the automatic slope slide accelerates more slowly** (at 30 FPS, half as fast per second). Above 60 FPS it is unaffected.
- On an automatic slope slide you can only jump **once per second**.
- Player-initiated slides (normal slide, coil slide) use separate physics, described in section 10.

### 7.4 Automatic step-up

Anything up to about 2 studs above your feet that you run over, you are lifted onto automatically: your legs have no collision, the rays find the top, and you are snapped up (see section 3).


---

## 8. Jump, High Jump and Buffered Jump

### 8.1 Conditions

You need your jump charge (refilled whenever you are on the ground) and you must either be on the ground (by state) or within ledge grace. You also must not be frozen, in the dropkick landing animation, or within 0.5 s of breaking through a fall stopper. On a steep automatic-slide slope you can only jump once per second.

### 8.2 Vertical formula

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

### 8.3 Horizontal component

- **Normal jump:** horizontal speed = max(your flat speed, your run speed if you are holding a direction). Jumping from a standstill while holding W instantly gives you run speed.
- **Direction:** if you are holding a direction **and** moving slower than 12, you jump in your input direction. Otherwise you jump in **the direction you are already moving**. Jumps do not redirect you when you are fast.
- **Flail (edge) jump and long jump:** horizontal = max(run speed × multiplier, your flat speed). See section 9.
- **Slide jump (while powersliding):** horizontal = max(normal jump horizontal, **your powerslide bank**). The direction is your input direction clamped to within **60° either side** of the slide direction. **With no input, the bank is applied along the slide's 3D direction**, so if most of the bank was vertical (you slid while rising fast), only its flat portion becomes horizontal speed. **Always hold a direction for a slide jump.**

### 8.4 High jump (the float)

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

### 8.5 Buffered jump

Pressing Ascend in the air when no other action is available (no vault, mantle, pipe or wall) stores a buffered jump. The next time you go from air to ground (**including coyote catches**), if the press was within **0.075 s** (or **0.2 s if you are still holding the key**), you jump on that exact frame. At very low frame rates the window is at least one frame (100 ms at 10 FPS).

The buffered jump fires as part of the landing itself, on the landing frame. This same-frame timing is what makes Coil Trimp work (section 12.6).

---

## 9. Dash, Flail Jump, Afterboost, Long Jump, Chain and Air Dash

### 9.1 Dash (on the ground)

- Hold Dash on the ground while moving. It also works while vaulting, within 0.1 s after landing, or inside the afterboost window.
- It lasts up to **2 s** while held and has a **1 s cooldown** after release. Holding Dash during the cooldown waits and fires it the moment it becomes available (this is a "buffer dash").
- Effects: **run speed acceleration × 2** (only up to 26), a **+2 run speed bonus** that ramps in over 0.5 s (the dash bar charging), and **jumping off a ledge while dashing performs a flail jump** (also called an edge jump).
- Pressing Dash during coyote time counts as a ground dash, because you are on the ground by state.

### 9.2 Flail jump (edge jump)

A flail jump happens when you jump while Dash is held (or within 0.2 s of releasing it, or while the chain hold timer is active) **and** you are at an edge. "At an edge" means any of: no floor 2 studs ahead within 4 studs down, rising faster than 8, or being in a dropdown. **Any jump during coyote time while rising faster than 8 therefore also counts as an edge jump.**

- Horizontal = max(run speed × **1.246**, your flat speed).
- Vertical = jump power + 1.3.

### 9.3 Afterboost

- Dash for more than 0.5 s (the bar is charged), release, then press Dash again **within 0.2 s** (while the dash bar is red).
- Your entire velocity is instantly multiplied by **1.15**, you gain +4 bonus run speed for 0.2 s, and while you are on the ground, ground drag and steering are multiplied by 0.15 (you glide with it).
- Jumping off a ledge while afterboosted performs a **long jump**.

### 9.4 Long jump

- Horizontal = max(run speed × **1.379**, your flat speed), plus the chain bonus.
- Vertical = jump power + 2 (20.8 at run speed 32).
- It starts or continues a chain if you have the Chain ability.
- Air steering is disabled immediately afterwards and ramps back in over 0.25 s.

### 9.5 Chain

- After a long jump you have a **0.2 s hold timer**. It only counts down while you are on the ground, not powersliding, not early in a roll, and either grounded or rising faster than 16. **Powerslide and dropdown freeze it**, which is how they "preserve the chain".
- Jumping off another edge while the timer is still running performs another long jump (the afterboost flag stays set until you start a new dash), and the chain count increases by 1.
- The chain adds **0.5 − 0.5 / n** to the multiplier: +0.25 at n = 2, +0.333 at n = 3, +0.4 at n = 5, with a limit of +0.5.
- **Strain:** each long jump adds 1 strain (maximum 8). If strain is 4 or more when you long jump, your chain count resets to 1. Strain drains at 4 per second once 0.2 s have passed since your last long jump. **Long jumps spaced at least 0.45 s apart never reset the chain**; spamming them faster eventually does.

Horizontal launch speeds (before taking the maximum with your current flat speed):

| Run speed | Normal | Flail (edge) | Long | Chain 2 | Chain 3 | Chain 5 | Chain limit |
|---|---|---|---|---|---|---|---|
| 26 | 26 | 32.4 | 35.9 | 42.4 | 44.5 | 46.3 | 48.9 |
| 32 | 32 | 39.9 | 44.1 | 52.1 | 54.8 | 56.9 | 60.1 |

### 9.6 Air dash

- Hold Dash in the air (requires Wall Boost or Wall Kick to be unlocked). The cooldown is **0.5 s** (1 s after a wall kick).
- **Air dash gives no velocity.** It is a mode. While it is active (up to 2 s while held):
  - wall kick is possible (within 0.2 s of pressing Dash);
  - hitting a wall turns your climb into a **wall clutch**, which allows a wall boost;
  - Ascend checks walls first: wall climb, then wall kick, then wallrun, then vault or mantle, then jump;
  - **if you are wallrunning, the game automatically jumps you off the wall 0.2 s after the air dash.** The "Double Jump" tech uses this.

---

## 10. Slides: Powerslide (the Bank), Slide and Slide Landing

### 10.1 Powerslide

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

### 10.2 Slide (coil slide, infinite slide)

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

### 10.3 Slide landing

If you land (an impact of 34.6 or more into the ground counts as a landing) while **holding Descend, moving, and arriving at a shallow angle** (your speed into the ground is less than about 0.49 of your total speed, which on flat ground means roughly 29° or flatter, or landing along a slope), you go straight into a **powerslide** instead of a roll. That powerslide banks your speed at that moment. Your downward speed has already been zeroed by the landing, so the bank is essentially your flat speed.


---

## 11. Walls: Wallrun, Wall Climb, Wall Jumps, Wall Bounce, Wall Boost, Wall Kick

### 11.1 Wallrun or wall climb?

Pressing Ascend in the air near a wall starts either a wall climb or a wallrun. The game uses your **origin direction**: the camera direction if your camera is locked (shift lock or first person), otherwise your WASD input direction, otherwise the direction your character faces.

- It casts a ray 5 studs forward along that direction. If that hits a near-vertical wall **and** a 45° side ray also hits the same wall **and** you are facing more than 60° away from straight into it, you get a **wallrun**.
- If you are facing within 60° of straight into the wall (or the side ray does not see the same wall, for example on a narrow pillar), you get a **wall climb**.
- Wall climb requirements: a wall climb charge (or a Climbable-tagged surface), up speed above −75, and no more than 0.4 s spent falling (unless air dash with Wall Boost is active or the surface is Climbable). The wall must be nearly vertical (its normal tilted between slightly downward and 0.25 upward).
- Wallrun requirements: a wallrun charge, up speed above −75, and a wall that is not a Barrier.
- Charges: **2 wallruns** (3 with Drifter Glove I) and **1 wall climb** (2 with Climber Glove II), refilled on the ground (including coyote time), by ledge climbs and when leaving a pipe.
- **Same-wall restriction:** you cannot wallrun on a wall whose facing is within about 5° of the last wall you wallran on, and the same applies separately for wall climbs. Touching the ground (including coyote time) clears it.

### 11.2 Wall entry: how your speed is converted

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

### 11.3 Wallrun

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

### 11.4 Wall climb

- Starts at 10 or less up speed (section 11.2). The first push happens immediately, then you are pushed up by **+22.75** at an interval of 0.4 s at run speed 12 down to 0.3125 s at run speed 32. Wall gravity is 90 per second.
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

- Within **0.2 s** of touching the wall: **wall bounce** (section 11.5).
- After 0.2 s: a weak jump of 14.7 outward and 26 up.

With the default Hold To Wall Climb setting, releasing Ascend is what triggers the jump.

### 11.5 Wall bounce and wall bounce flicks

A wall bounce is a jump off a wall climb within 0.2 s of touching the wall. The formula has three parts:

```
stored = (along, clamp(up, 0, 100))          from the wall entry (section 11.2)
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
- You must be facing within 60° of straight into the wall when you press Ascend, or you will get a wallrun instead (section 11.1). The flick is therefore a camera turn **after** the climb has started, inside the 0.2 s window.

### 11.6 Wall boost (Wall Climb Boost, WCB)

- Air dash, hit the wall (this starts a "wall clutch" climb), then press Ascend again **within 0.25 s** while **looking upward** and roughly facing the wall.
- Your velocity is set to **straight up** at `sqrt(2 × 75 × (11 + 6a))`, where a is your run speed progress from 12 to 32 (0 to 1). This is exactly enough to rise **11 to 17 studs**: 40.6 up at run speed 12, 45.8 at 22 and 50.5 at 32.
- **Climber Glove I:** `18 + 6a` studs, which is 52.0 to 60.0 up.
- No horizontal speed at all. The state is set to Falling. If the conditions are not met, the boost fails and the climb ends.

### 11.7 Wall clutch

A wall climb started while air dash is active. It allows a wall boost. While you are falling on any wall climb (including a clutch), wall gravity is divided by 3 and you hold on longer.

### 11.8 Wall kick

- **Requirements:** in the air, air dash active, within **0.2 s** of pressing Dash, a wall within 6 studs **behind** you (at waist height), up speed above −75, and a wall kick charge (refilled on the ground).
- **Effect:** `velocity = augment(velocity, facing direction × push)`, then **up speed = 28**. The push is 18 at run speed 12 and up to 30 at run speed 24 or more. Your facing direction is the origin direction from section 11.1.
- Because of `augment` (section 16.1), the kick never makes you slower; it turns you toward your facing direction. Afterwards the air dash cooldown is 1 s.
- **The state is not changed**, so you stay in Falling and can catch coyote time while rising (Kogo, Wall Kick Wumpy).

### 11.9 Summary of wall resources

| Resource | Base | Upgrade | Refilled by |
|---|---|---|---|
| Wallrun | 2 | 3 (Drifter I) | Ground or coyote time, ledge climb, leaving a pipe |
| Wall climb | 1 | 2 (Climber II) | Same |
| Wall kick | 1 | — | Same |
| Same-wall restriction | — | — | Cleared by ground or coyote time |
| Mag bounce | 1 use | — | Ground or coyote time, **and** starting any wallrun or wall climb, any wall jump or wall bounce, wall boost, wall kick |

---

## 12. Ledges, Vaults, Climbing and Coil

### 12.1 Vault

- Press Ascend while running at a low obstacle: the waist-height ray (about 6 studs, longer above 64 speed) hits, the head-height ray is clear, and there is room behind it. Requires speed of at least 16 (otherwise, or if the obstacle is too close, it becomes a mantle).
- **Vault speed = max(12, |(flat velocity, max(0, up))|, run speed, 24)**, overridden by a fixed vault speed on some objects. **Vaulting converts upward speed into forward speed.**
- During the vault you move forward at the vault speed with +7 up for 0.175 to 0.5 s, in the Jumping state. Your charges are refilled and you get a speed boost.
- **Holding Ascend at the end of a vault performs a vault jump:**
  - with no input: **springboard**, direction × max(10, speed ÷ 3.2) + **45 up** (13.5 studs high);
  - with input: **leap**, direction × max(run speed × 1.379, vault speed) + **32 up** (6.8 studs high).

### 12.2 Mantle and fast mantle

Used when a vault is not possible (no room behind the obstacle, or too slow and too close). Above run speed 20 it is a fast mantle. Holding Ascend with **no** movement input during a mantle performs a springboard at the end (45 up).

### 12.3 Ledge grab and climb

- This happens when a wall climb reaches the top, or when you press Ascend near a ledge you can reach.
- **Reach:** a ledge top up to about 5 studs above your waist (the height of the forward ray). With a Springhook, this becomes 7 when you are rising slower than 24 or wallrunning, and 8 with Powered Springhook.
- **Maximum fall speed to grab:** 75 without a Springhook. With a Springhook the limit is multiplied by 1.5, 1.6 (Powered I) or 1.7 (Powered II), giving 112.5, 120 and 127.5 (+50%, +60% and +70%).
- During the climb your physics is paused and you are moved onto the ledge. The animation lasts about 0.633 ÷ (1.25 + 0.75 × sine-in(run speed progress)) seconds: 0.51 s at run speed 12 down to 0.32 s at 32.
- **A ledge climb refills all charges** and gives a speed boost.
- On exit you are in Running, moving along the ledge direction at your run speed if you are holding a direction.
- If there is no floor behind the ledge top, you get a barrier vault and drop down the other side.

### 12.4 Springhook launch

With a Springhook equipped, holding Ascend during a ledge grab launches you instead of climbing:

- **Horizontal (with input):** input direction × max(10, P × transfer + 10), where P = max(run speed, max(flat speed, |vertical speed|) before the grab) and transfer = 0.6 (base), 0.85 (Powered I) or 0.95 (Powered II); the +10 becomes +7 at level 2.
- **Vertical:** max(P × camera pitch ÷ 1.4, 40) with the camera's upward component clamped to 0.6 (0.8 Powered I, 0.95 Powered II); at level 2, max(P × pitch ÷ 1.2, 52).
- **Without input:** extra vertical speed from your speed before the grab, up to 25 (base) or 40 (Powered).
- **Your fall speed before the grab is fed into the launch.** This is the "velocity transfer" the upgrades improve.

### 12.5 Pipes and climbables

- **Climb:** you grab a pipe or ladder within 7.5 studs horizontally. Holding forward climbs at 16 up (rising to 18.4 after holding forward for a while); sliding down (holding Descend) is about 36 down. Grabbing while falling faster than 75 keeps you sliding down while you slow.
- **Climb Leap:** pressing Ascend while facing the pipe leaps you 16 studs up it over about 1.5 s, with a 2.5 s cooldown.
- **Climb Jump:** pressing Ascend while not facing the pipe (or at its top) jumps you off it with a wall jump in your camera direction at 28 horizontal and 26 up.
- **Mag Rail on a pipe ("zoop"):** you shoot up at 16 × 3.5 = **56** and leave the pipe at 56 up.
- At the top of a pipe you automatically climb onto the ledge if there is one.
- **Leaving a pipe refills all charges.** The state is picked from your velocity at the moment you leave, which reads 0 while you are attached, so in practice you leave in Falling. The zoop exit is always Falling while rising at 56, so it can catch coyote time.

### 12.6 Coil and Coil Trimp

**Coil:** press Descend in the air (up speed above −15, not during another parkour move). Your character's root is moved **up by 1.5 studs** over 0.15 s (10 studs per second) and your collider becomes the low shape. This raises your feet and gives you slightly more upward reach. When the coil ends **while you are still in the air**, the root is moved **back down by 1.5 studs** over 0.15 s. If you land while coiled, it does not move back down.

**Coil slide:** landing while coiled with Descend held and moving faster than 6 starts a slide (section 10.2).

**Coil Trimp, step by step:**

1. Jump, then coil.
2. Press jump before you land so it is buffered (section 8.5). The buffered jump fires as part of the landing, **on the same frame you land**.
3. That jump stops the coil animation and marks you as airborne. The coil then sees "coil ended and in the air" and **moves your root down 1.5 studs over 0.15 s**, while your jump is moving you up at about 13 to 19.
4. The pull-down keeps your feet inside the floor's grounding band. As soon as you release jump (at least 0.05 s in), your state becomes Falling, and the next ground check grounds you again **while you are still rising**. That is coyote time off flat ground.
5. Powerslide during that coyote time (it banks your speed, including the upward part).
6. When the coyote time ends while you are in the air, the powerslide stops, and because you are airborne beyond ledge grace the powerslide cooldown is cleared. The next time you touch ground you can powerslide again immediately, instead of waiting 1 s.

**Why the jump must be buffered:** a normal jump pressed one frame after landing is too late. By then the coil has already registered the landing, finished, and skipped the pull-down.

---

## 13. Dropdown and Dropkick

### 13.1 Dropdown

- **Triggers:** powersliding toward an edge (checked at 60 Hz during the powerslide), or pressing Descend on the ground if you do not have Powerslide.
- **Requirements:** your speed is under 48 or your powerslide bank is 34 or less; the game finds the edge by scanning 4 to 8 studs ahead (8 when moving at 8 or more); there is a drop of at least 4.5 studs past it.
- **What happens:**
  - Your state is set to Falling and ground detection is turned off.
  - You are moved over the edge toward a point about 0.55 to 0.75 studs past it, at a flat speed of at least (distance ÷ 0.5 s). Your up speed is held at 0, and you are lowered up to 2 studs as you approach the target point.
  - Then you move down at 8 until you are 1.5 studs below the ledge top (at most 0.2 s), after which normal physics resumes.
- **Ledge grace is active for the whole dropdown**, so you can jump out of it (and it counts as an edge jump, so dash or afterboost turns it into a flail jump or long jump).
- Fall damage after a dropdown: the effective height is reduced by 5 and the damage threshold is raised by 10.
- Dropdown freezes the chain hold timer (it preserves the chain).

### 13.2 Dropkick

- Coil, then press Attack (or press Attack while swinging on the grappler). The cooldown is 1 s and recovery takes 0.85 s.
- After a 0.167 s windup, your velocity becomes:
  - **horizontal:** max(flat speed, min(32, up, flat) + min(excess up, 12)), so some upward speed is converted into forward speed;
  - **vertical:** up to 16; anything above 16 is reduced to 16 + (excess ÷ 5).
  - While swinging: you detach and get max(flat + 12, flat × 1.1) in your facing direction.
- When the hitbox starts, your own velocity is cut sharply: the dropkick's flat speed is divided by about 16, so a dropkick launching at 30 flat and 10 up is slowed to roughly 2 flat and 3 up. The kick stalls you in the air.
- Dropkicks knock other players back based on your velocity (disabled by the Peaceful setting).

---

## 14. Landing and Fall Damage

### 14.1 When a landing counts

The landing logic (animations, damage, landing types) runs when you go from air to ground with up speed below 10, after at least 0.1 s in the air, and at least 0.5 s after the previous processed landing. The impact is measured as an **equivalent fall height**: `h = (your speed into the ground)² ÷ 150`. Only the part of your speed going into the ground counts, so landing along a slope is much softer than landing straight down.

- h > 8 (impact faster than 34.6): counts as a real landing (sound, landing type).
- h > 20 (impact faster than 54.8): damage (h > 30, impact faster than 67.1, after a dropdown).

### 14.2 Preparing (pressing Descend before landing)

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

### 14.3 Landing types

For a real landing (h > 8):

| Situation | Result |
|---|---|
| Prepared, at least 175 ms early, and not facing your input direction | **Straight** landing |
| Prepared, moving, shallow angle (section 10.3) | **Slide** landing (automatic powerslide) |
| Prepared, moving, precise (less than 90 ms), h above 16 | **Roll** (drag 0.5 per second while rolling, so speed is kept) |
| Prepared and moving otherwise | **On all fours** (run speed pulled toward 24) |
| Prepared, not moving | Straight landing |
| Not prepared, h below 20 | **Stumble** (gives a small speed boost) |
| Not prepared, h of 20 or more | **Hard** landing: run speed reset to 12, briefly frozen, combo reset |

### 14.4 Pillows, fall stabilization and fall stoppers

- **Pillows** (cushion objects): landing on one cancels damage from any damaging or fatal fall. The exception is landing at near-terminal speed (falling faster than 205): then you need fall stabilization of at least 0.5, or you take full damage.
- **Fall stabilization:** while free falling (faster than 135 down) hold **Ascend and Descend together**. Stabilization builds at 1 per second up to 1 and drains at 1 per second when you stop. It also straightens your falling pose.
- **Fall stoppers** (breakable awnings and similar): if the fall would be fatal or kill you, you break through. Damage is halved (maximum 90), you keep falling with your velocity divided by 1.5 to 3.5 (more reduction at lower speeds), and you cannot jump for 0.5 s.

---

## 15. Gear

### 15.1 Grappler

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

### 15.2 Mag Rail

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

### 15.3 Glove

| Version | Effects |
|---|---|
| Glove | Wallrun lasts 1.5 s; wall climb is not capped at run speed 26 |
| Climber Glove I | Wall boost height 18 to 24 studs instead of 11 to 17; extra 1.5 × push when your climb starts falling |
| Climber Glove II | +1 wall climb charge (2) |
| Drifter Glove I | Wallrun lasts 2.25 s; +1 wallrun charge (3); wallrun fall limit 480 instead of 30 |
| Drifter Glove II | Float: falling during a wallrun is converted into upward and horizontal speed |

### 15.4 Springhook

See sections 12.3 and 12.4. Powered Springhook increases the fall speed at which you can grab, the grab reach and the velocity transfer.

### 15.5 Zipline Hook and Cable Glider

Ziplines can be grabbed within 10 studs. Speed builds toward a maximum of 90; mechanized ziplines run at 50, and friction is 5. The Cable Glider adds braking and riding upward (see the gear pages for level details).


---

## 16. Speed Stores, Converters and Formulas

### 16.1 The augment formula

Several moves use the same rule, called augment in this document:

```
direction = v.unit × max(0, |v| − |push|) + push
result    = direction.unit × max(|v|, |push|)
```

- If you are slower than the push, you get exactly the push.
- If you are faster, you **keep your full speed** and are turned toward the push direction (more strongly the closer the push is to your speed).

Used by: grapple pull, wall kick, mag bounce, zip pull release.

### 16.2 Speed stores (moves that save speed and give it back later)

| Store | What is saved | When it is given back | Notes |
|---|---|---|---|
| Powerslide bank | sqrt(flat² + max(0, up)²) at slide start | Slide jump (horizontal) | Never decays; downward speed not saved |
| Wall entry | Full 3D speed, rotated into along-the-wall and up | Wall bounce (within 0.2 s) | Up part capped at 100 on return; falling part lost |
| Momentum stat | Run speed 12 to 32 | Every jump, wall jump, long jump, climb rate | Only changes on the ground |

### 16.3 Converters (moves that turn one kind of speed into another)

| Move | Converts | Section |
|---|---|---|
| Slide jump | Upward speed (via the bank) into horizontal speed | 10.1 |
| Wall bounce | Into-the-wall speed into upward and along-the-wall speed | 11.5 |
| Mag bounce | Everything into horizontal in your look direction, then restores up speed (min 40) | 15.2 |
| Wall kick | Any direction into your facing direction (speed kept), up set to 28 | 11.8 |
| Grapple pull | Any direction toward the point (speed kept) | 15.1 |
| Vault | Upward speed into forward speed (vault speed uses up speed) | 12.1 |
| Springhook launch | Fall or flat speed into a launch | 12.4 |
| Dropkick | Some upward speed into forward speed | 13.2 |
| Drifter Glove II float | Falling during a wallrun into horizontal speed | 11.3 |
| Wallrun entry | Into-the-wall speed into along-the-wall speed (full magnitude) | 11.2 |
| Jump in ledge grace | Erases fall speed entirely | 8.2 |

### 16.4 State setters and refills (what makes coyote possible again)

- Moves that leave you in **Falling while rising** (and therefore able to catch coyote time): wall jump, wall bounce, wall boost, wallrun jump-out, released jump, air grapple pull, zip pull, air mag jump, dropdown. Wall kick and mag bounce keep whatever state you had (Falling, if you were airborne).
- Moves that lock you in **Jumping while rising** (no coyote until your apex): holding jump, starting or riding a wall while rising, vault and springboard, ground grapple pull, ground mag jump.
- **Full refills mid-air:** coyote time, ledge climb, leaving a pipe.
- **Mag bounce refill:** also from starting a wallrun or wall climb, wall jump or bounce, wall boost and wall kick.

---

## 17. Frame Rate: Everything That Depends on FPS

| Mechanic | Effect of higher FPS | Values |
|---|---|---|
| Catching coyote time while rising fast | Easier at 60 FPS than at 30; **no further gain above 60** (your position only changes about 60 times per second) | Guaranteed below 78 / 156 rise speed at 30 / 60+ FPS (section 5.1) |
| Catching coyote time when only clipping the top of a ledge | Same as above | Guaranteed below 15 / 30 rise speed at 30 / 60+ FPS |
| Becoming Falling after releasing jump | Slightly **earlier** | 66.7 / 66.7 / 55.6 / 54.2 ms |
| Landing-frame techs (Kogo, Bogo, first Pogo route) | **Harder** (the window is one frame) | 33.3 / 16.7 / 6.9 / 4.2 ms |
| Pogo when the wallrun already put you on the floor | **No effect** | Up to 0.1 s window at any FPS |
| DDT | **Easier**, effectively requires 100+ FPS | You become Falling sooner and the first check sees an earlier position (section 18) |
| Jump height | **Highest at 60 FPS**, slightly lower at 30 and above 60 | Held jump at run speed 32: 5.22 / 5.33 / 5.07 / 5.06 studs |
| Ledge grace | 30 FPS gets about 17 ms more | 250 / 233 / 233 / 233 ms |
| Jump buffer | Only matters below about 13 FPS | At least one frame |
| Powerslide friction, auto-dropdown, slide physics | **No effect** (fixed 60 Hz) | — |
| Automatic slope slide (steeper than 44°) | Slower below 60 FPS; no change above | At 30 FPS the push is half as strong per second |
| Wallrun movement | Essentially no effect (120 Hz sub-steps) | — |

---

## 18. Techs Explained

Notation: official step names from the tech list, with `→` between steps. Steps marked as optional (`*` in the tech list) are usually the coyote time finish: a powerslide, a jump, a slide jump, or nothing. A tech is defined by its launcher and the coyote catch; the finish varies.

**The common finish (Coyote Time → Powerslide → Jump):** get into coyote time while rising, powerslide (the bank is your flat speed combined with your current up speed), then jump while holding a direction. You are launched horizontally at the bank, and because the jump is additive, you keep your up speed (raised toward 42 if it was lower). This converts upward speed into horizontal speed without losing the upward speed.

### Concepts

**Coyote Time (Extended Coyote Time).** Section 5.1.

**Ledge Grace.** Section 5.2.

**Trimp** — Coyote Time → Jump → Coyote Time. Catch coyote time on a ledge, jump (additive, up to the 42 cap), tap the key so you become Falling within about 55 to 67 ms, then catch coyote time again on the next, higher ledge. Each step chains rising speed into the next catch.

### Wall bounce family

**Boing** — Wall Bounce → Coyote Time → (Powerslide → Jump). Hit a wall while rising, bounce within 0.2 s. The bounce returns your stored speed (vertical part up to 100) and sets Falling. Rise past the top of the wall or a nearby ledge, catch coyote time, then slide jump.
*Example:* hitting a wall at 50 total speed, mostly upward, gives a bounce of about 50 up. Passing the top at about 40 up, a powerslide banks about 40 plus your flat speed, and the slide jump turns that into horizontal speed while keeping about 40 up.

**Bogo** — Jump → Wall Bounce → Coyote Time → (Powerslide → Jump). A wall bounce right at the ground with an instant tap, so there is essentially no climb before it. Starting a climb sets Jumping, which blocks grounding, so the climb start and the release must resolve on the landing frame (or as close to it as possible). The game then grounds you first and applies the bounce afterwards (section 5.3), which gives you coyote time off the floor itself. It is frame-perfect like Kogo and easier at low FPS. If you hit the wall while falling, the bounce's vertical part comes only from the push (26 up), but your along-the-wall speed is kept.

**Wall Bounce Slide (Bounce Trimp)** — Coyote Time → Wall Bounce → Coyote Time → (Powerslide → Jump). Wall bounce with no WASD held, so the push points away from the wall (up to 42 outward plus 26 up), carrying you backwards over a ledge behind you. You are Falling and rising, so you catch coyote time there. The first coyote catch refills your wall climb and clears the same-wall restriction, which is what allows bouncing off the same wall again.

**Wall Bounce Flick.** Approach the wall at an angle, start the wall climb (facing within 60° of the wall), turn the camera so you look along the wall in the direction your speed is travelling, and release within 0.2 s. The angle keeps your vertical up to the 100 cap and stores the excess as along-the-wall speed; the look direction steers more of the result into horizontal. Tables in section 11.5.
*Example:* 150 flat + 40 up at 20°, looking along your direction of travel, gives 124.9 horizontal and 92.2 up, compared with about 31 horizontal and 95 up when bouncing straight on.

**Mag Boing** — Mag Bounce → Wall Bounce → Coyote Time → (Powerslide → Jump). The mag bounce sets 40 up and points your whole speed where you look, so in one input you choose both your approach angle and your upward entry speed. This makes it the best setup for a flick. Starting the wall climb refreshes mag bounce, so you can mag bounce again at the edge of the wall: with level look, your horizontal speed becomes roughly your full 3D speed while your vertical speed is kept (155.2 total becomes about 180 in the section 15.2 example).

**Gumpy (Grappler Enhanced Wumpy)** — Grapple → Wall Bounce → Coyote Time → (Powerslide → Jump). Grapple toward the wall: the pull never slows you and gives at least 35 (43.75 or 52.5 with Yank) toward the point, so you hit the wall with much more speed. The wall stores it and the bounce returns it.

**Dropbounce** — Dropdown → Wall Bounce → Coyote Time → (Powerslide → Jump). Dropdown off an edge, then bounce off a wall below or across. Dropdown keeps you in ledge grace and sets Falling, so the bounce and coyote rules apply as usual.

**Bounce Kick (Dragon Bounce)** — Wall Bounce → Wall Kick. Bounce off a wall, air dash, then wall kick off the same wall (now behind you). The kick keeps your full bounce speed, turns it toward your facing direction, and sets 28 up.

### Wall boost family

**Wumpy (Long Jump Boost)** — Wall Climb Boost → Coyote Time → (Powerslide → Jump). The wall boost launches you straight up at 40.6 to 50.5 (52 to 60 with Climber Glove I) and sets Falling. Rise past the top, catch coyote time and slide jump. **Slide Wumpy** is the same with the slide-jump finish.
*Example:* a boost at run speed 32 (50.5 up) passing a ledge 5 studs above the boost point is still rising at about 42.4. Powerslide banks about 42.4, and the slide jump gives about 42 horizontal while keeping about 42 up.

**Boost Kick** — Wall Climb Boost → Wall Kick. Boost up, air dash, kick off the wall. Example: boost at 50 up, kick with a push of 30: augment turns most of it toward your facing direction (about 41.6 flat), then up is set to 28.

### Wallrun and wall kick family

**Wavedash** — Wall Run → Wall Bounce → Coyote Time → (Powerslide → Jump). A wallrun keeps your speed along the wall. Run into a second wall ahead (a corner) while the wallrun is still rising (within the first 0.6 s) and start a wall climb: your speed is now mostly into the new wall, so the entry conversion rotates it almost entirely into upward speed (up to the 100 cap). The bounce launches you up, then you catch coyote time and slide jump. If the wallrun is already falling when you hit the second wall, the vertical share is clamped to zero and lost.

**Grapple Wavedash** — Grapple → Wall Run → Wall Bounce → Coyote Time → (Powerslide → Jump). As Wavedash, using the grapple to bring more speed into the wallrun.

**Mag Wavedash** — Wall Run → Mag Launch → Mag Bounce → Wall Bounce → Coyote Time → (Powerslide → Jump). A mag launch (75 or more) off the wallrun, then a mag bounce (40 up, speed aimed at the next wall), then the bounce.

**Pogo** — Wall Run → Coyote Time → (Powerslide → Jump). End the wallrun near the ground with a jump-out (26 up, wallrun speed horizontally, Falling). Either the jump-out happens on the frame you would touch the floor (landing-frame rule, one frame), or the wallrun has already put you on the floor and you jump out within the 0.1 s before it ends (this works at any frame rate). Either way you are grounded while rising at 26 and can jump (up to 42) or slide jump.

**Kogo** — Wall Kick → Coyote Time → (Powerslide). Wall kick on the exact frame you would land. The kick keeps your state (Falling), so the game grounds you and then applies the kick (28 up plus the facing push): coyote time off the floor. It is a one-frame window (16.7 ms at 60 FPS, 6.9 ms at 144 FPS), which is why it is easier at low FPS.

**Wall Kick Wumpy** — Wall Kick → Coyote Time → (Powerslide → Jump). Wall kick (28 up, state unchanged) toward a ledge in front of you, rise past it, catch coyote time.

**Wall Run Wumpy** — Wall Run → Coyote Time → (Powerslide → Jump). Wallrun jump-out (26 up, Falling) past a ledge, catch coyote time.

**Double Jump (tech)** — Air Dash → Wall Run → Coyote Time → (Powerslide → Jump). Air dash, then wallrun: the game automatically jumps you off the wall 0.2 s after the air dash (26 up, wallrun speed, Falling). Use that hop to rise past a ledge and catch coyote time.

**Corner Cut** — Wall Run → Wall Run. Wallrun around a corner onto the next face. The new face points a different way (so the same-wall restriction does not apply), and the wallrun entry carries your full speed onto it.

**Wall Kick Wall Run (Gravity Kick)** — Wall Kick → Wall Run. Kick to redirect your speed, then wallrun the next wall; the entry conversion keeps your full speed along it.

### Mag Rail family

**Mag Pogo (Mogo) / Speedvault** — Mag Bounce → Coyote Time → (Powerslide → Jump). A mag bounce next to a ledge sets at least 40 up and aims your speed where you look. The state is unchanged (Falling), so you rise past the ledge and catch coyote time. The bank is roughly sqrt(flat² + up²), so this is a reliable way to bank 40 or more of upward speed.

**Dropdash (Speedvault)** — Mag Bounce → Wall Run → Mag Launch → Mag Bounce → Powerslide. Aim a mag bounce into a wall for a fast wallrun (the entry keeps your full speed along the wall), mag launch off it (75 or more), mag bounce again near the ground or a ledge to aim everything forward (plus 40 up), then powerslide to bank it.

**Crossdash** — Mag Bounce → Wall Run. Mag bounce aimed at a wall at an angle: the bounce makes your horizontal speed roughly equal to your full speed, and the wallrun entry keeps all of it along the wall.

**Mag Kick** — Mag Bounce → Wall Kick. Mag bounce, then kick off the wall behind you (augment keeps the speed and turns it toward your facing direction; up becomes 28).

**Mag Fall Cancel** — Mag Pull → Mag Bounce. Mag pull toward a swing point (75 or more), then mag bounce near it: up speed is set to at least 40, cancelling the fall.

### Grappler family

**Grappler High Jump** — Grapple → Coyote Time → (Powerslide → Jump). Grapple upward while standing on the ground. The pull sets Jumping (you are leaving the ground while rising), so you cannot catch coyote time, but you still have the 0.15 s of ledge grace and your jump. Jumping adds jump power on top of the pull, up to the 42 cap, or keeps the pull's up speed if it is already above 42. A pull slower than 35 replaces your velocity with 35 toward the point, so most of your horizontal speed can be lost.

**Gronkler** — Powerslide → Grapple → Jump. Grappler High Jump with a powerslide first. The slide jump's horizontal speed comes from the bank, so the horizontal speed lost to the pull does not matter. You get the pull's vertical speed (plus the jump, up to 42) and your banked speed horizontally. The jump must happen within the 0.15 s ledge grace after the pull lifts you, while the powerslide is still active.

**Slingshot** — Powerslide → Grapple → Coyote Time → Jump → Coyote Time → (Powerslide → Jump). A Gronkler-style start, then the rise carries you into coyote time on a ledge; jump, tap to become Falling, catch coyote time again, and finish with a slide jump.

**Grappler Fall Extension** — Grapple → Impact. Grappling a point above you just before landing redirects your downward speed toward the point (augment), which reduces your speed into the ground. Combined with a prepared landing (Impact), this lets you survive longer falls.

### Dropdown and coil family

**Dropdown Trimp (DDT)** — Powerslide → Afterboost → Dropdown → Jump → Coyote Time → (Buffer Dash) → Powerslide → Jump → (Afterboost).

1. **Powerslide toward an edge, with afterboost.** The powerslide triggers dropdown at the edge.
2. **Long jump out of the dropdown.** Dropdown counts as ledge grace and as an edge, and you are afterboosted. The jump is a long jump: horizontal max(run speed × 1.379, flat speed), about 44 at run speed 32, with 20.8 up.
3. **Catch coyote time on the same ledge.** Dropdown lowered you up to 2 studs while moving you over the edge, so your legs are still inside the ledge's grounding band. Tap jump so you become Falling as early as possible (about 55 to 67 ms). The next ground check that happens while you are still over the ledge grounds you while rising: coyote time.
4. **Buffer dash (optional):** holding Dash makes a ground dash fire the moment you are grounded, which keeps the edge or long jump multiplier active.
5. **Powerslide, then jump:** bank your speed plus the upward part, slide jump. With the chain active, the jump counts as another long jump, and the chain continues.

**Why it needs 100+ FPS.** At about 44 studs/s you move about 0.73 studs per physics step, and the ledge's ground footprint only extends about 0.9 studs past its edge from your centre. You cannot be Falling until the first frame after 0.05 s: 66.7 ms at 60 FPS, but 55.6 ms at 144 FPS and 54.2 ms at 240 FPS. At high frame rates that frame usually comes before the next physics step, so the ground check sees your position from the previous step. At 144 FPS the first eligible check therefore sees where you were at about 50 ms, while at 60 FPS it sees where you are at 66.7 ms: about 0.7 studs further from the ledge, which is often the difference between catching coyote time on the same ledge and missing it.

**Coil Trimp** — Jump → Coil → buffered Jump (release immediately) → Coyote Time → Powerslide → fall off → Powerslide. Section 12.6 explains it step by step: the buffered jump fires on the landing frame, the coil's 1.5-stud pull-down keeps you inside the floor's band while you rise, releasing jump makes you Falling, and you are grounded again while rising. The first powerslide happens in the air during coyote time. When coyote time ends in the air, the powerslide cooldown is cleared, so you can powerslide again as soon as you touch ground.

---

## 19. Notes for Finding New Techs

The patterns that most techs are built from:

1. **Get upward speed while in the Falling state** (bounce, boost, wall jump-out, kick, mag bounce, air grapple pull, released jump).
2. **Get your feet into a grounding band while rising**: past a ledge top, or on the landing frame for a floor.
3. **Use what coyote time unlocks**: a jump (additive, 42 cap), a powerslide (banks upward speed), a dash, full refills and a cleared same-wall restriction.
4. **Convert:** slide jump (vertical to horizontal), wall bounce (any to vertical and along the wall), mag bounce (any to horizontal while keeping vertical), wall kick and grapple (redirect without loss).

Mechanics that may be worth testing in combinations:

- **Afterboost in the air.** Afterboost's activation check allows it within 0.2 s of releasing a charged dash even while airborne, and it multiplies your **entire** velocity (vertical included) by 1.15. Releasing a dash during a slide jump and pressing it again may scale the launch.
- **Mag bounce adds speed whenever you are rising**, and it is refreshed by every wall interaction. Chains such as mag bounce → wall climb → bounce → mag bounce gain speed at each mag bounce.
- **Coyote time refills Mag Rail and grappler ammo mid-air**, so a catch in the middle of a route resets gear charges.
- **Ledge climbs and pipe exits refill everything.**
- **Wall entry uses the larger of this frame's and last frame's speed**, so speed lost in a collision on the contact frame does not count.
- **A jump during ledge grace erases fall speed completely.**
- **Vaults convert upward speed into forward speed** (vault speed includes up speed), and a vault jump (leap) launches at max(run speed × 1.379, vault speed).
- **The Springhook launch converts fall speed** into launch speed.
- **Rolling keeps speed** (ground drag 0.5 per second instead of up to 10).
- **The first 0.1 s on the ground has no ground friction**, so any jump or slide inside that window keeps all of your speed.

---

## 20. Glossary

| Name | Meaning |
|---|---|
| Ascend | Jump key |
| Descend | Crouch, slide or coil key |
| Use Augment | Grappler or Mag Rail key |
| Coyote Time (CT), Extended Coyote Time | Grounded while rising past a ledge |
| Ledge Grace (also called CT) | Grace period after leaving the ground |
| Run speed, momentum | The 12 to 32 stat |
| Bank | Powerslide stored speed |
| Stored wall speed | Wall entry speed |
| Flail jump, edge jump | Dash-held jump off an edge |
| Long jump | Afterboosted jump off an edge |
| Wall Climb Boost (WCB), wall boost | Boost straight up during a wall clutch |
| Wall clutch | Wall climb started during air dash |
| Wall bounce | Jump off a wall climb within 0.2 s |
| Wall jump | Jump off a wall |
| Ledge grab | Climbing onto a ledge |
| Climb | Climbing a pipe or ladder |
| Climb Leap | Leaping up a pipe or ladder while attached |
| Climb Jump | Jumping off a pipe or ladder |
| Mag slap or launch | Mag Rail on a wallrun |
| Mag bounce | Mag Rail bounce near geometry |
| Mag pull, mag jump | Mag Rail jump toward a swing point |
| Zoop | Mag Rail on a pipe |
