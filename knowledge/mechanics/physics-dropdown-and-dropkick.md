---
title: Dropdown and Dropkick Physics
category: mechanics
summary: How dropdown hops you over an edge while keeping ledge grace, and how a dropkick changes your velocity.
aliases:
  - dropdown
  - drop down
  - dropdown physics
  - dropkick physics
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Dropdown and Dropkick

### Dropdown

- **Triggers:** powersliding toward an edge (checked at 60 Hz during the powerslide), or pressing Descend on the ground if you do not have Powerslide.
- **Requirements:** your speed is under 48 or your powerslide bank is 34 or less; the game finds the edge by scanning 4 to 8 studs ahead (8 when moving at 8 or more); there is a drop of at least 4.5 studs past it.
- **What happens:**
  - Your state is set to Falling and ground detection is turned off.
  - You are moved over the edge toward a point about 0.55 to 0.75 studs past it, at a flat speed of at least (distance ÷ 0.5 s). Your up speed is held at 0, and you are lowered up to 2 studs as you approach the target point.
  - Then you move down at 8 until you are 1.5 studs below the ledge top (at most 0.2 s), after which normal physics resumes.
- **Ledge grace is active for the whole dropdown**, so you can jump out of it (and it counts as an edge jump, so dash or afterboost turns it into a flail jump or long jump).
- Fall damage after a dropdown: the effective height is reduced by 5 and the damage threshold is raised by 10.
- Dropdown freezes the chain hold timer (it preserves the chain).

### Dropkick

- Coil, then press Attack (or press Attack while swinging on the grappler). The cooldown is 1 s and recovery takes 0.85 s.
- After a 0.167 s windup, your velocity becomes:
  - **horizontal:** max(flat speed, min(32, up, flat) + min(excess up, 12)), so some upward speed is converted into forward speed;
  - **vertical:** up to 16; anything above 16 is reduced to 16 + (excess ÷ 5).
  - While swinging: you detach and get max(flat + 12, flat × 1.1) in your facing direction.
- When the hitbox starts, your own velocity is cut sharply: the dropkick's flat speed is divided by about 16, so a dropkick launching at 30 flat and 10 up is slowed to roughly 2 flat and 3 up. The kick stalls you in the air.
- Dropkicks knock other players back based on your velocity (disabled by the Peaceful setting).
