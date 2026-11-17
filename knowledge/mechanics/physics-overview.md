---
title: Movement Physics Overview
category: mechanics
summary: The key rules behind Parkour Reborn movement, the core values (gravity, speeds, windows, caps) and a glossary of movement terms.
aliases:
  - movement physics
  - physics overview
  - physics summary
  - key movement rules
  - core movement values
  - movement glossary
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
This document explains how movement in PARKOUR Reborn works internally: the exact formulas, values, timing rules and interactions that make basic movement and advanced techs (Boing, Gumpy, DDT, Kogo, wall bounce flicks and so on) behave the way they do.

**Units.** Distances are in studs, speeds in studs per second, and times in seconds or milliseconds. "Up speed" means vertical velocity; "flat speed" or "horizontal speed" means speed ignoring the vertical component. Gravity in PARKOUR Reborn is **75 studs/s²** (the Roblox default is 196.2).

**Names.** Official move names (the in-game names, which match the "basics" and "concepts" in the tech list) are used wherever possible. "Coyote time" in this document always means the PARKOUR Reborn meaning: rising past a ledge and becoming grounded, also called extended coyote time. The classic behaviour of still being able to jump shortly after walking off an edge is called **ledge grace**, although players often call both "CT".

## Summary of the Key Rules

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

## Core Values

| Quantity | Value | Notes |
|---|---|
| Gravity | 75 | The controller default is 196.5; PARKOUR Reborn sets 75 |
| Vertical speed limits | −210 to +500 | −210 is terminal fall speed |
| Base run speed | 12 | The momentum stat starts here |
| Momentum cap | 26 to 32 | Depends on level and the MomentumUsage setting (the Run Speed, Steering and Drag page) |
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

## Glossary

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
