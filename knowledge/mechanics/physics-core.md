---
title: Physics Core
category: mechanics
summary: The core rules of Parkour Reborn movement physics, including grounding, coyote time, jumps, the powerslide bank, wall bounces and frame rate.
aliases:
  - physics core
  - movement rules
  - movement physics
  - how movement works
tags:
  - mechanics
  - physics
---

# Parkour Reborn Physics Core

This is the always-loaded reference Reborn AI uses to understand movement. The full explanation with tables is in the movement physics guide. Rules are numbered so the step dictionary can point to them. Anything marked **Unconfirmed** must be presented as unconfirmed.

## C0. Vocabulary

- **Coyote time (CT, extended coyote time):** being treated as grounded while rising through the air, after the feet passed a ledge top or the floor (C5).
- **Ledge grace (also called CT by players):** the short window after leaving the ground in which you can still jump or powerslide (C6).
- **Run speed (momentum):** a stat from 12 to 32 that builds while running. It is not your actual velocity (C9).
- **Bank:** the speed a powerslide stores (C13).
- **Stored wall speed:** the speed a wall climb stores for a wall bounce (C15).
- **Up speed:** vertical velocity. **Flat speed:** horizontal speed.
- Units are studs and studs per second. Gravity is 75.

## C1. States and what counts as ground

The character has the states Idle, Running, Walking, Sliding, Jumping, Falling and NoPhysics. **The game treats you as on the ground whenever your state is Idle, Running, Walking or Sliding**, whether or not you are touching anything. Almost every ability checks this state, not physical contact.

## C2. Grounding check

- Your feet are 3 studs below your root. Your collision starts 2 studs above your feet; **your legs have no collision.**
- You become grounded on a frame when a surface top is between 0.5 studs below and 2.1 studs above your feet, you are over it horizontally (within roughly 0.6 to 0.9 studs of your centre), the surface is 60° or flatter, **and your state is not Jumping.**
- When you become grounded, downward velocity is zeroed but **upward velocity is kept.**
- Because the legs can clip in, you step up onto anything about 2 studs tall automatically.

## C3. State selection (once per frame)

1. Grounded on a slope steeper than 44° → Sliding (automatic slope slide; only one jump per second).
2. Grounded and nearly still → Idle.
3. **Up speed ≤ 0, not grounded, and at least 0.08 s since last grounded → Falling.**
4. Grounded → Running or Walking.
5. Otherwise the state does not change. **Not grounded but moving up means you stay Running.** This is coyote time.

## C4. What abilities do to your state

- **Set Jumping (blocks grounding until your up speed reaches 0):** a jump while the jump key is held, starting a wallrun or wall climb, rising while on a wall, vault, vault jump, springboard, Springhook launch, a grapple pull or zip release that starts from the ground going up, a mag pull from the ground going up.
- **Set Falling (grounding possible while rising):** releasing jump (at least 0.05 s after jumping), wall jump, wall bounce, wall boost, leaving a pipe (including Climb Jump and the Mag Rail zoop exit at 56 up), dropdown, grapple pull or zip release in the air, zip pull, mag pull in the air, breaking a fall stopper.
- **Leave the state unchanged:** wall kick, mag bounce, mag slap and mag launch (the wallrun's own state stays), dropkick, powerslide.

## C5. Coyote time (the Parkour Reborn meaning)

- **How it happens:** you are rising in a state other than Jumping, a ledge top (or the floor) enters your grounding band on a checked frame, you become grounded and turn Running, and because you keep rising, nothing turns you back to Falling until your up speed reaches 0.
- **What it gives:** a jump (additive, C11), a powerslide that banks upward speed (C13), a ground dash, **all charges refilled** (C8) and the same-wall restriction cleared. Run speed can build.
- **What it does not allow:** Ascend acts as on the ground (vault or mantle, pipe, or jump), so a wallrun or wall climb cannot start until you are Falling. Descend powerslides instead of coiling.
- **Duration:** about (up speed when caught) ÷ 75 seconds, then 0.15 s of ledge grace.
- **Frame rate:** the band is about 2.6 studs tall, and your position only changes on physics steps (about 60 per second). A catch is guaranteed below a rise speed of 78 at 30 FPS and 156 at 60 FPS or above, but if you only overlap the top 0.5 studs, only below 15 and 30. A frame rate above 60 adds no position checks.

## C6. Ledge grace

- After leaving the ground you stay Running for at least 0.08 s, then you have 0.15 s more: about **0.23 s** in total (0.25 s at 30 FPS).
- You can jump (if you still have your jump) and powerslide during it. **Dropdown counts as ledge grace for its whole duration.**
- **A jump during ledge grace throws away your fall speed** and gives a full jump.
- Wall jumps cancel ledge grace.
- **Powerslide cooldown:** being airborne beyond ledge grace resets the powerslide cooldown to 0, so you can powerslide again as soon as you touch ground (on the ground the cooldown is 1 s).

## C7. Landing-frame rule

Velocity that an ability sets is applied after that frame's ground check. If an upward move that does not set Jumping (wall kick, wall bounce resolved in one frame, wallrun jump-out) is used on the exact frame you would touch down, you are grounded first and then launched upward, so you get coyote time off the floor itself. The window is **one frame**: 33.3 / 16.7 / 6.9 / 4.2 ms at 30 / 60 / 144 / 240 FPS, so these techs are easier at low FPS. A normal jump cannot do this because it sets Jumping.

## C8. Refills

Being on the ground by state (including coyote time) refills your jump, wallrun charges (2, or 3 with Drifter Glove I), wall climb charges (1, or 2 with Climber Glove II), wall kick, Mag Rail ammo and mag bounce, mag pull and grappler ammo, and clears the same-wall restriction (you cannot wallrun or climb a wall facing within about 5° of the previous one). A ledge climb and leaving a pipe also refill everything. Mag bounce is also refreshed by starting any wallrun or wall climb, any wall jump or wall bounce, a wall boost and a wall kick.

## C9. Run speed versus velocity

- Run speed (12 to 32) is your walk speed and sets jump power, wall jump strength, wall climb rate, wall boost height and long jump speed. Actual velocity can far exceed 32.
- **Jump power = 6 + 0.4 × run speed** (10.8 at 12, 16.4 at 26, 18.8 at 32).
- Run speed only builds on the ground while moving near it: 12 → 26 takes about 2 s (about 1 s while dashing), 32 takes about 16 s. The cap is 26 at level 1 rising to 32 at level 20. It does not change in the air.
- Dash adds +2 while held, afterboost +4.

## C10. Steering and drag

- Holding the direction you are already moving keeps your speed. Holding sideways or backwards while faster than your run speed bleeds speed quickly. Air control nearly vanishes at high speed.
- Air drag removes about 9.5% of flat speed per second. There is no vertical drag.
- On the ground, speed above your run speed is lost quickly (10 per second at low speed, much less above 100) **unless** you are sliding, rolling (drag 0.5 per second), or within the first 0.1 s after becoming grounded (no ground friction yet).

## C11. Jump

- **Up speed after a jump = min(max(0, current up) + jump power + bonus, max(42, current up)).** The bonus is 1.3 for a flail jump and 2 for a long jump. A jump adds to upward speed, is capped at 42, keeps upward speed above 42, and discards falling speed.
- **Flat speed after a jump** = the larger of your flat speed and (your run speed, if holding a direction). The direction stays your current direction of travel unless you are slower than 12.
- **Holding jump (high jump):** gravity is reduced by 3 × jump power, fading at 64 per second while held (lasting at most 0.51 / 0.77 / 0.88 s at run speed 12 / 26 / 32). You stay in Jumping while you hold it.
- **Tapping jump:** releasing at least 0.05 s after the jump ends the float and sets Falling, on the first frame after 0.05 s (66.7 ms at 30 or 60 FPS, 55.6 ms at 144, 54.2 ms at 240). **Tap jump whenever you need coyote time afterwards.**
- Jump height on flat ground at run speed 32: about 5.3 studs held and 2.8 tapped at 60 FPS (about 5.1 and 2.6 at 144 FPS). At run speed 12 it is only about 1 stud.
- **Buffered jump:** Ascend pressed in the air with nothing else to do fires on the next air-to-ground change (coyote catches included) if pressed within 0.075 s, or 0.2 s if still held. It fires on the landing frame itself.

## C12. Dash, flail jump, long jump and chain

- **Edge:** "at an edge" means no floor 2 studs ahead within 4 studs down, rising faster than 8, or in a dropdown. A coyote-time jump while rising faster than 8 counts as at an edge.
- **Flail jump:** jump at an edge while Dash is held (or within 0.2 s of releasing it): flat speed = max(run speed × 1.246, current flat speed); up = jump power + 1.3.
- **Afterboost:** dash at least 0.5 s, release, press Dash again within 0.2 s: your **whole velocity is multiplied by 1.15**, +4 run speed for 0.2 s.
- **Long jump:** jump at an edge while afterboosted: flat speed = max(run speed × 1.379 + chain bonus, current flat speed); up = jump power + 2.
- **Chain:** after a long jump, another long jump within the 0.2 s chain window (counted only on the ground; powerslide and dropdown freeze it) adds 0.5 − 0.5 / n to the multiplier. Long jumps closer than about 0.45 s apart build strain and eventually reset the chain.
- **Air dash** gives no velocity. It enables wall kick, wall clutch and wall boost, changes Ascend priority to walls first, and makes a wallrun jump you off automatically 0.2 s after the air dash.

## C13. Powerslide and the bank

- Starts with Descend while on the ground by state (coyote counts) moving faster than 8. Cooldown 1 s after the last powerslide ends, reset to 0 by being airborne past ledge grace.
- **Bank = sqrt(flat speed² + max(0, up speed)²)** at the moment it starts. Upward speed counts, downward does not. **The bank never decays.**
- The visible slide speed starts at 1.5 × bank (less if the previous powerslide started under about 0.53 s ago), has no friction for 0.2 s, then loses about 86% per second. You cannot steer.
- **Slide jump:** jumping while powersliding launches you at max(normal jump flat speed, bank) flat, plus the normal additive jump vertically. **The direction is your movement input limited to within 60° of the slide direction. With no input, only the flat part of the bank is used, so always hold a direction.**
- It ends when you leave the ground and ledge grace, slow below 8, release Descend after 0.5 s, start another move, or land without Descend held.

## C14. Augment (redirect without losing speed)

Grapple pull, wall kick, mag bounce and zip release use: result speed = max(your speed, push speed), pointed between your direction and the push (closer to the push the closer the two speeds are). Slower than the push: you get the push. Faster: you keep your speed and turn toward the push.

## C15. Walls: entry

- Ascend in the air near a wall: a **wall climb** if you face within 60° of straight into it, otherwise a **wallrun** (if a 45° side ray sees the same wall). Facing means camera direction with shift lock or first person, else movement input, else character facing.
- **On contact, your whole 3D speed (the larger of this frame and last frame) is rotated into "along the wall" and "up" in proportion to those two components. Speed into the wall is not lost.** This is the stored wall speed.
- **Wallrun:** keeps the along-the-wall speed for its whole duration (1 s, 1.5 s with Glove, 2.25 s with Drifter Glove I); up starts at min(0, entry up) + 12 with wall gravity 20. Jump-out: flat = wallrun speed in your camera direction mirrored away from the wall, up = 26, state Falling.
- **Wall climb:** starts at 10 or less up and pushes +22.75 every 0.4 s (run speed 12) to 0.31 s (run speed 32) while not sliding down; reaches about 10 to 19 studs. Without a Glove, climb run speed is capped at 26.

## C16. Wall bounce

- A jump off a wall climb within **0.2 s** of touching the wall.
- Result speed = the larger of (stored wall speed, with its vertical part clamped to 0 to 100) and a push (flat look direction × 42 × min(1, run speed ÷ 24) plus 26 up), pointed along their sum. Without WASD the look direction is mirrored to point away from the wall; with WASD held it is used as is, so looking at the wall pushes into it and is wasted.
- **Approach angle** splits the stored speed: straight on puts it all into up speed (capped at 100, the rest lost); at an angle the extra goes along the wall, uncapped. Example, 80 flat + 40 up: 0° gives 0 along / 89 up, 20° gives 50 / 74, 45° gives 73 / 52.
- **Flick:** looking along the wall in the direction your speed travels along it at release steers more of the result into horizontal; looking the other way steers it into vertical. The look cannot add speed when you are fast.
- Falling into the wall wastes the falling share (clamped to 0). Bounce while rising.
- State after: Falling.

## C17. Wall boost and wall kick

- **Wall boost (wall climb boost):** during a wall clutch (wall climb started while air dashing), press Ascend again within 0.25 s while looking up: straight up at 40.6 (run speed 12) to 50.5 (run speed 32), rising 11 to 17 studs; 52 to 60 (18 to 24 studs) with Climber Glove I. No flat speed. State Falling.
- **Wall kick:** while air dashing, within 0.2 s of pressing Dash, with a wall within 6 studs behind you and up speed above −75: augment toward your facing direction with a push of 18 (run speed 12) to 30 (run speed 24+), then up speed = 28. State unchanged.

## C18. Gear essentials

- **Grapple pull:** after a 0.2 s windup plus hook travel (300 studs per second), augment toward the point with 35 (43.75 Yank I, 52.5 Yank III). Range 90. From the ground going up it sets Jumping (ledge grace still allows a jump); in the air it sets Falling.
- **Mag bounce (Launch Rail):** in the air near geometry (a 7 × 5 × 7 box touches something), up speed above −100: your whole 3D speed is pointed in your look direction, then up speed = max(40, your up speed before). While rising this increases your total speed. State unchanged. A press up to 0.15 s early is buffered.
- **Mag launch / slap:** only during a wallrun: about 75 (to 86 with upgrades) along your facing, or your flat speed if higher, with up to about 11 up.
- **Mag pull:** in the air, not near geometry, aiming at a swing point within 100 (125): aim direction × max(75 (85), flat speed).

## C19. Frame rate

The grounding check, state changes, gravity, the jump float and the jump release check run once per rendered frame, but Roblox moves your character in physics steps of about 60 per second (in-game testing: held jumps reach slightly higher at 60 FPS than at 144). Powerslide and slide physics run at a fixed 60 Hz and wallruns at 120 Hz, so those do not depend on FPS.
- **Higher FPS:** you become Falling sooner after a jump tap (55.6 ms at 144 FPS against 66.7 ms at 60), and the first check after that sees an earlier position; this is why Dropdown Trimp wants 100+ FPS. It adds no extra position checks for coyote catches, and held jumps are slightly lower (about 5.1 studs at 144 FPS against 5.3 at 60, run speed 32).
- **Lower FPS:** easier one-frame landing techs (C7). At 30 FPS there are only 30 position checks per second, jumps are slightly lower than at 60, and automatic slope slides push more weakly.

## C20. Reading a tech from its steps

- Techs are sequences of basics and concepts in order (`>`). Each basic is a set of inputs. Markers: `*` optional (usually the coyote-time finish), `+` advanced version only, `-` not in the advanced version.
- **The common finish "Coyote Time > Powerslide > Jump"**: catch coyote time while rising, powerslide (banks flat + upward speed), jump holding a direction: launched horizontally at the bank while keeping the upward speed (raised toward 42). It converts upward speed into horizontal speed.
- To explain a sequence, track after each step: the state (Jumping or Falling), whether you are rising, any stored speed (bank, stored wall speed), and which charges are spent or refilled. A step can only lead into Coyote Time if it leaves you **rising in a state other than Jumping** near a ledge top, or on the landing frame for the floor.
- A tech is defined by its launcher and the coyote catch; the finish after coyote time (powerslide, jump, slide jump or nothing) can vary.

## C21. Truthfulness

- Use only these rules, the step dictionary, the physics guide pages and the tech list. When a guide page conflicts with these rules about how movement works, these rules win.
- Never add, drop, merge or reorder a tech's steps.
- Do not state numbers that are not in the reference or this turn's facts.
- **Unconfirmed (say so if relevant):** afterboost in mid-air multiplying a launch; the exact FPS threshold of Dropdown Trimp (players report 100+ FPS).
- **Not in the game yet:** unreleased gear (for example the Boost Belt and the Charge Rail) has no confirmed movement behaviour. Do not describe how it works.
