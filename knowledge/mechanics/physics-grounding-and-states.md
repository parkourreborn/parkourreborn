---
title: Grounding and Movement States
category: mechanics
summary: The character collider and ground detector, the movement states (Running, Jumping, Falling and so on) and what counts as being on the ground.
aliases:
  - grounding
  - grounded
  - movement states
  - falling state
  - jumping state
  - collider
  - hitbox
  - step up
  - refills
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## The Character Body: Collider, Ground Detector and Leg Clipping

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

## States and What "Grounded" Means to the Game

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
