---
title: Speed Stores and Converters
category: mechanics
summary: The augment rule, the moves that store speed and give it back, the moves that convert one kind of speed into another, and notes for finding new techs.
aliases:
  - speed converters
  - speed stores
  - augment
  - how to get more speed
  - finding new techs
  - new techs
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Speed Stores, Converters and Formulas

### The augment formula

Several moves use the same rule, called augment in this document:

```
direction = v.unit × max(0, |v| − |push|) + push
result    = direction.unit × max(|v|, |push|)
```

- If you are slower than the push, you get exactly the push.
- If you are faster, you **keep your full speed** and are turned toward the push direction (more strongly the closer the push is to your speed).

Used by: grapple pull, wall kick, mag bounce, zip pull release.

### Speed stores (moves that save speed and give it back later)

| Store | What is saved | When it is given back | Notes |
|---|---|---|---|
| Powerslide bank | sqrt(flat² + max(0, up)²) at slide start | Slide jump (horizontal) | Never decays; downward speed not saved |
| Wall entry | Full 3D speed, rotated into along-the-wall and up | Wall bounce (within 0.2 s) | Up part capped at 100 on return; falling part lost |
| Momentum stat | Run speed 12 to 32 | Every jump, wall jump, long jump, climb rate | Only changes on the ground |

### Converters (moves that turn one kind of speed into another)

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

### State setters and refills (what makes coyote possible again)

- Moves that leave you in **Falling while rising** (and therefore able to catch coyote time): wall jump, wall bounce, wall boost, wallrun jump-out, released jump, air grapple pull, zip pull, air mag jump, dropdown. Wall kick and mag bounce keep whatever state you had (Falling, if you were airborne).
- Moves that lock you in **Jumping while rising** (no coyote until your apex): holding jump, starting or riding a wall while rising, vault and springboard, ground grapple pull, ground mag jump.
- **Full refills mid-air:** coyote time, ledge climb, leaving a pipe.
- **Mag bounce refill:** also from starting a wallrun or wall climb, wall jump or bounce, wall boost and wall kick.

## Notes for Finding New Techs

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
