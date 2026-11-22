---
title: Step Dictionary
category: mechanics
summary: What every move and input on the tech list does to your speed and state, with numbers, requirements and what it leads into.
aliases:
  - step dictionary
  - move dictionary
  - what each move does
  - movement steps
tags:
  - mechanics
  - movement
---

# Parkour Reborn Step Dictionary

One entry for every step name used on the tech list (inputs, basics, concepts, the Slide Jump ending and Buffer Dash). Reborn AI uses these entries to understand a tech from its sequence of steps. Rules in brackets such as (C13) refer to `physics-core.md`.

**Format.** Every entry uses the same fields so code can read them:

- **Aliases:** other names for the step.
- **Kind:** input, basic, concept or step.
- **Inputs:** the keys involved.
- **Needs:** what must be true to use it.
- **Effect:** what it does to your movement.
- **Speed:** the key numbers.
- **State after:** one of `Jumping`, `Falling`, `Jumping while held, then Falling`, `Jumping from the ground, Falling in the air`, `Unchanged`, `Ground`, `Attached`.
- **Vertical after:** one of `rising`, `not rising`, `kept`, `varies`.
- **Stores / Uses:** speed it saves or consumes.
- **Refreshes:** charges it refills.
- **Leads into:** steps it commonly sets up and why.
- **Mistakes:** common reasons it fails.
- **Rules:** core rules it depends on.


---

## Inputs

## Ascend
- **Aliases:** jump key, upmove
- **Kind:** input
- **Effect:** Context dependent, first match wins. On the ground by state (coyote time included): vault or mantle, then pipe, then jump. In the air: vault or mantle, then pipe, then jump (only during ledge grace), then wallrun or wall climb, then a buffered jump. While air dashing: wall climb, then wall kick, then wallrun, then vault or mantle, then pipe, then jump. On a wall: releasing it (with the default hold-to-climb setting) or pressing it again jumps off. Held after a jump: the high jump float.
- **Rules:** C5, C11

## Descend
- **Aliases:** crouch key, downmove
- **Kind:** input
- **Effect:** On the ground by state and moving faster than 8: powerslide (or dropdown without the Powerslide ability; a powerslide toward an edge becomes a dropdown). In the air with up speed above −15: coil. Held when landing: prepares the landing (Impact). Held with Ascend in free fall: fall stabilization. On a pipe: slide down. A tap during a wall climb or wallrun lets go of the wall.
- **Rules:** C13

## Dash
- **Aliases:** dash key
- **Kind:** input
- **Effect:** On the ground (or within 0.1 s after landing, or while vaulting): dash. Pressed again within 0.2 s of releasing a charged dash: afterboost. In the air: air dash (needs Wall Boost or Wall Kick unlocked). Holding it during the cooldown buffers it.
- **Rules:** C12

## Use Augment
- **Aliases:** augment key, useaugment
- **Kind:** input
- **Effect:** Grappler: tap to pull, hold on a swing point to swing. Mag Rail: during a wallrun, mag launch; in the air near geometry, mag bounce; in the air aiming at a swing point away from geometry, mag pull; on a pipe, zoop up at 56.
- **Rules:** C18

## Attack
- **Aliases:** attack key
- **Kind:** input
- **Effect:** While coiling or swinging in the air: dropkick.

---

## Basics

## Afterboost
- **Aliases:** none
- **Kind:** basic
- **Inputs:** Dash (hold at least 0.5 s, release), then Dash again within 0.2 s
- **Needs:** Afterboost unlocked; a dash charged for more than 0.5 s and released less than 0.2 s ago; moving input; not already afterboosted.
- **Effect:** Multiplies your whole velocity by 1.15 instantly, adds +4 run speed for 0.2 s, and on the ground cuts ground drag and steering to 0.15 (you glide). Your next jump at an edge becomes a Long Jump.
- **Speed:** ×1.15 velocity; +4 run speed bonus.
- **State after:** Unchanged
- **Vertical after:** kept
- **Leads into:** Long Jump (jump at an edge), Chain.
- **Mistakes:** pressing the second Dash later than 0.2 s starts a new dash instead; the first dash must be held at least 0.5 s.
- **Rules:** C12
- **Unconfirmed:** it may also work in mid-air within 0.2 s of releasing a charged dash, which would multiply an airborne launch by 1.15.

## Air Dash
- **Aliases:** none
- **Kind:** basic
- **Inputs:** Dash (in the air)
- **Needs:** airborne; Wall Boost or Wall Kick unlocked; cooldown 0.5 s (1 s after a wall kick).
- **Effect:** Gives no velocity. While held (up to 2 s) it is a mode that allows Wall Kick (within 0.2 s of pressing Dash), turns a wall climb into a Wall Clutch (which allows Wall Climb Boost), makes Ascend check walls first, and makes a wallrun jump you off automatically 0.2 s after the air dash.
- **State after:** Unchanged
- **Vertical after:** kept
- **Leads into:** Wall Kick, Wall Clutch, Wall Climb Boost, Wall Run (automatic jump-off, used by the Double Jump tech).
- **Rules:** C12, C17

## Chain
- **Aliases:** chain jump
- **Kind:** basic
- **Inputs:** Ascend (at an edge, right after landing from a long jump)
- **Needs:** Chain unlocked; a Long Jump started the chain; jump off another edge while the 0.2 s chain window is still open (it only counts down while on the ground; powerslide and dropdown pause it).
- **Effect:** Another long jump with a larger multiplier: run speed × (1.379 + 0.5 − 0.5 / n), where n is the chain count.
- **Speed:** at run speed 32: 44.1 (long jump), 52.1 (chain 2), 54.8 (chain 3), 56.9 (chain 5), limit 60.1.
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Mistakes:** chaining long jumps less than about 0.45 s apart builds strain, and at 4 strain the chain count resets to 1.
- **Rules:** C11, C12

## Climb
- **Aliases:** pipe climb, ladder climb
- **Kind:** basic
- **Inputs:** Forward or backward while holding onto a climbable (pipe or ladder)
- **Needs:** a pipe or ladder within 7.5 studs horizontally.
- **Effect:** Attaches you to the climbable and refills all charges. Holding forward climbs at 16 per second (up to 18.4 after holding it for a while); holding backward, or Descend, slides you down at about 36 per second. Grabbing while falling faster than 75 keeps you sliding down while slowing. At the top you climb onto the ledge if there is room.
- **State after:** Attached
- **Vertical after:** varies
- **Refreshes:** everything (C8), on grab and on leaving.
- **Leads into:** Climb Leap, Climb Jump, Mag Rail zoop (56 up, Falling, can catch coyote time), Ledge Grab at the top.
- **Rules:** C8

## Climb Jump
- **Aliases:** pipe jump, pipe jump-off
- **Kind:** basic
- **Inputs:** Ascend (while climbing, not facing the climbable, or at its top)
- **Effect:** Jumps you off the climbable with a wall jump in your camera direction. If you are facing the climbable, Ascend does a Climb Leap instead.
- **Speed:** 28 flat and 26 up.
- **State after:** Falling
- **Vertical after:** rising
- **Refreshes:** everything (leaving a pipe).
- **Leads into:** Coyote Time (rising in Falling), Wall Run, Wall Climb.
- **Rules:** C4, C8

## Climb Leap
- **Aliases:** pipe leap, pipe hop
- **Kind:** basic
- **Inputs:** Ascend (while climbing, facing the climbable)
- **Effect:** Leaps you 16 studs up the climbable over about 1.5 s while staying attached. There is a 2.5 s cooldown between leaps.
- **State after:** Attached
- **Vertical after:** rising

## Coil
- **Aliases:** tuck
- **Kind:** basic
- **Inputs:** Descend (in the air)
- **Needs:** airborne, up speed above −15, not in another move.
- **Effect:** Raises your character 1.5 studs over 0.15 s and uses the low collider, so you clear obstacles and reach slightly higher. If the coil ends while you are still in the air, you are lowered 1.5 studs again over 0.15 s. Landing while coiled with Descend held and moving faster than 6 starts a Slide (coil slide).
- **State after:** Unchanged
- **Vertical after:** kept
- **Leads into:** Dropkick (Attack while coiling), Slide (coil slide), Coil Trimp (a buffered jump on landing fires before the coil notices you landed, so the 1.5-stud lowering keeps your feet in the floor's grounding band while you rise; release jump and you are grounded again while rising).
- **Rules:** C2, C11

## Dash
- **Aliases:** sprint
- **Kind:** basic
- **Inputs:** Dash (hold, on the ground)
- **Needs:** on the ground (or within 0.1 s after landing, or vaulting) and moving; 1 s cooldown after the previous release.
- **Effect:** Lasts up to 2 s while held. Doubles run speed acceleration up to 26 and adds a +2 run speed bonus that ramps in over 0.5 s (the dash bar). Jumping at an edge while dashing is a Flail Jump.
- **Speed:** +2 run speed; jump power rises by 0.8 accordingly.
- **State after:** Unchanged
- **Vertical after:** kept
- **Leads into:** Flail Jump, Afterboost.
- **Rules:** C9, C12

## Dropdown
- **Aliases:** drop down
- **Kind:** basic
- **Inputs:** Descend (powersliding toward an edge)
- **Needs:** Dropdown unlocked; speed under 48 or a powerslide bank of 34 or less; an edge found 4 to 8 studs ahead with a drop of at least 4.5 studs.
- **Effect:** Ends the powerslide and hops you over the edge: you move to about 0.55 to 0.75 studs past it at a flat speed of at least distance ÷ 0.5 s, with up speed held at 0 while you are lowered up to 2 studs; then you move down at 8 until you are 1.5 studs below the ledge top (at most 0.2 s). Ground detection is off during it. **Ledge grace stays active the whole time**, and it pauses the chain window.
- **Speed:** keeps your flat speed; fall damage afterwards counts 5 studs less height and starts 10 later.
- **State after:** Falling
- **Vertical after:** not rising
- **Leads into:** Jump during the dropdown (counts as at an edge, so a flail jump or long jump with dash or afterboost); the long jump can catch Coyote Time on the same ledge because your legs are still inside its grounding band (Dropdown Trimp); Wall Bounce (Dropbounce).
- **Rules:** C6, C12

## Dropkick
- **Aliases:** drop kick
- **Kind:** basic
- **Inputs:** Descend, then Attack (or Attack while swinging)
- **Needs:** Dropkick unlocked; coiling or swinging; airborne; 1 s cooldown.
- **Effect:** After a 0.167 s windup, converts some upward speed into forward speed: flat = max(flat speed, min(32, up speed, flat speed) + min(up speed above 16, 12)); up speed above 16 is reduced to 16 + (excess ÷ 5). While swinging it detaches you with max(flat + 12, flat × 1.1) in your facing direction. When the hitbox starts, your own velocity is cut sharply (the flat part is divided by about 16), so the kick stalls you in the air. Knocks other players back based on your velocity. Recovery 0.85 s.
- **State after:** Unchanged
- **Vertical after:** varies

## Fall Stabilization
- **Aliases:** stabilize
- **Kind:** basic
- **Inputs:** Descend and Ascend held together
- **Needs:** free falling faster than 135 down.
- **Effect:** Builds stabilization from 0 to 1 at 1 per second (drains at 1 per second when released) and straightens your pose. At 0.5 or more you survive landing on a pillow even near terminal speed (above 205). It does not change your velocity.
- **State after:** Unchanged
- **Vertical after:** kept

## Flail Jump
- **Aliases:** edge jump
- **Kind:** basic
- **Inputs:** Dash (held), then Ascend at an edge
- **Needs:** Dash held or released less than 0.2 s ago; at an edge (no floor 2 studs ahead within 4 studs down, or rising faster than 8, or in a dropdown); not afterboosted.
- **Effect:** A jump with extra flat speed and height.
- **Speed:** flat = max(run speed × 1.246, flat speed) (39.9 at run speed 32); up = jump power + 1.3 (additive and capped as in C11).
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Rules:** C11, C12

## Grapple
- **Aliases:** grapple pull, yank
- **Kind:** basic
- **Inputs:** Use Augment (tap)
- **Needs:** Grappler equipped; a target within range (90; ×1.35 Swing I; ×1.5 Swing III); a grapple charge (1, or 2 with Yank I or Swing III).
- **Effect:** After a 0.2 s windup plus hook travel (300 studs per second, twice as fast with Yank II), pulls you with augment toward the point: slower than the pull you get exactly the pull, faster you keep your speed and turn toward the point.
- **Speed:** 35 (43.75 Yank I, 52.5 Yank III).
- **State after:** Jumping from the ground, Falling in the air
- **Vertical after:** varies
- **Refreshes:** charges are refilled on the ground (Yank III also while in use).
- **Leads into:** Jump within ledge grace after a ground pull (Grappler High Jump, Gronkler); Wall Bounce (more entry speed, Gumpy); Coyote Time after an air pull; Wall Run (Grapple Wavedash).
- **Mistakes:** a ground pull sets Jumping, so it cannot catch coyote time until its apex; a pull slower than 35 replaces your flat speed.
- **Rules:** C14, C18

## High Jump
- **Aliases:** held jump, float
- **Kind:** basic
- **Inputs:** Ascend (held)
- **Effect:** Holding jump reduces gravity by 3 × jump power, fading at 64 per second, for up to 0.51 / 0.77 / 0.88 s at run speed 12 / 26 / 32.
- **Speed:** peak about 5.3 studs at run speed 32 (about 2.8 tapped) and about 3.5 at run speed 26 (about 2.1 tapped) at 60 FPS; about 5% lower at 144 FPS.
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Mistakes:** holding blocks coyote time for the whole float; tap instead when a coyote catch must follow.
- **Rules:** C11

## Impact
- **Aliases:** prepared landing, precise landing, perfect landing, roll
- **Kind:** basic
- **Inputs:** Descend (pressed just before landing)
- **Effect:** Prepares the landing. Pressed less than 90 ms before impact: no fall damage unless the fall is fatal, a run speed bonus of (impact ÷ 110 × 1.25)⁵, healing and a dash reset; moving and landing high enough gives a roll, which keeps speed (drag 0.5 per second). Landing at a shallow angle while moving with Descend held gives a slide landing (an automatic powerslide).
- **Speed:** fatal impact speed: 75.2 unprepared, 85.5 (more than 175 ms early), 88.3 (90 to 175 ms), 96.2 (50 to 90 ms), 98.7 (50 ms or less). Damage starts at 54.8 into the ground. Unprepared landings at 54.8 or more are hard landings (run speed reset to 12).
- **State after:** Ground
- **Vertical after:** not rising

## Jump
- **Aliases:** tap jump
- **Kind:** basic
- **Inputs:** Ascend (tap)
- **Needs:** a jump charge and being on the ground by state or within ledge grace.
- **Effect:** Up speed = min(max(0, current up) + jump power, max(42, current up)): additive, capped at 42, keeps up speed above 42, discards falling speed. Flat speed = max(flat speed, run speed if holding a direction), in your current direction of travel (input direction only below 12 flat speed). Ends a powerslide (slide jump, see Powerslide) and a dropdown.
- **Speed:** jump power 10.8 to 18.8 (run speed 12 to 32); in coyote time rising at 30 with run speed 32, a jump gives 42 up.
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Leads into:** Coyote Time (only after it turns Falling: tap, 55 to 67 ms), Wall Climb or Wall Run in the air, Trimp.
- **Mistakes:** holding jump keeps you in Jumping, which blocks coyote time.
- **Rules:** C11

## Ledge Grab
- **Aliases:** climb up, ledge climb
- **Kind:** basic
- **Inputs:** Ascend (near a ledge, or automatic at the top of a wall climb)
- **Needs:** a ledge top up to about 5 studs above your waist (7, or 8 with Powered Springhook, when rising slower than 24 or wallrunning with a Springhook); falling slower than 75 (112.5 / 120 / 127.5 with Springhook / Powered I / Powered II).
- **Effect:** Pauses physics and pulls you onto the ledge over 0.51 s (run speed 12) to 0.32 s (run speed 32). **Refills all charges.** You leave in Running, moving along the ledge at your run speed if holding a direction. With a Springhook, holding Ascend launches you instead, feeding your speed before the grab (including fall speed) into the launch.
- **State after:** Ground
- **Vertical after:** not rising
- **Refreshes:** everything (C8).
- **Leads into:** Springboard (hold Ascend with no input on a mantle), Jump, Vault.
- **Rules:** C8

## Long Jump
- **Aliases:** none
- **Kind:** basic
- **Inputs:** Dash, Dash (afterboost), then Ascend at an edge
- **Needs:** afterboosted; at an edge (no floor 2 studs ahead within 4 studs down, or rising faster than 8, or in a dropdown).
- **Effect:** A long jump; starts a chain if Chain is unlocked. Air steering is off right after and returns over 0.25 s.
- **Speed:** flat = max(run speed × 1.379 + chain bonus, flat speed) (44.1 at run speed 32); up = jump power + 2 (20.8 at run speed 32).
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Leads into:** Chain; Coyote Time on the same ledge after a dropdown (Dropdown Trimp).
- **Rules:** C11, C12

## Mag Bounce
- **Aliases:** mag redirect
- **Kind:** basic
- **Inputs:** Use Augment (in the air near a wall or object)
- **Needs:** Launch Rail; airborne and not wallrunning; a 7 × 5 × 7 stud box around you touching geometry; up speed above −100; mag bounce available (refreshed by the ground, coyote time, starting any wallrun or wall climb, any wall jump or bounce, wall boost and wall kick). A press up to 0.15 s early is buffered.
- **Effect:** Points your whole 3D speed in your look direction (augment with a push equal to your flat speed), then sets up speed to max(40, your up speed before). Your flat speed becomes close to your full 3D speed. **While rising, this increases your total speed.** Looking level or slightly down gives the most flat speed.
- **Speed:** 60 flat, 0 up becomes 60 flat, 40 up; 155 total rising (125 flat, 92 up) becomes about 155 flat, 92 up.
- **State after:** Unchanged
- **Vertical after:** rising
- **Leads into:** Wall Bounce (sets the approach angle and 40 up, Mag Boing), Coyote Time (Mag Pogo), Wall Run (full speed along the wall, Crossdash), Wall Kick (Mag Kick).
- **Rules:** C14, C16, C18

## Mag Launch
- **Aliases:** mag slap, wallrun launch
- **Kind:** basic
- **Inputs:** Use Augment (during a wallrun)
- **Needs:** Mag Rail; wallrunning; Mag Rail ammo (1, or 2 with Launch Rail II).
- **Effect:** Ends the wallrun and launches you. Base Mag Rail: along your facing with the camera pitch limited to about −17° to +9°. Launch Rail: outward from the wall at an angle toward your look (wider at level 2), and Launch Rail II refills one wallrun charge.
- **Speed:** max(75, flat speed) base; 75 × 1.05 (Launch Rail I), × 1.1 (Launch Rail II), × 1.05 to 1.15 by speed (level 3); up to about 11 up.
- **State after:** Unchanged
- **Vertical after:** varies
- **Mistakes:** launching while the wallrun is still rising keeps the wallrun's Jumping state, which blocks coyote time until your apex.
- **Leads into:** Mag Bounce, Wall Bounce, Wall Run.
- **Rules:** C18

## Mag Pull
- **Aliases:** mag jump
- **Kind:** basic
- **Inputs:** Use Augment (aiming at a swing point)
- **Needs:** Launch Rail; airborne; not near geometry (otherwise you mag bounce); a swing point within 100 (125 at level 2) near your aim.
- **Effect:** Sets your velocity toward the point.
- **Speed:** max(75 (85 at level 2), flat speed).
- **State after:** Falling
- **Vertical after:** varies
- **Leads into:** Mag Bounce near the point (Mag Fall Cancel).
- **Rules:** C18

## Mantle
- **Aliases:** fast mantle
- **Kind:** basic
- **Inputs:** Ascend (at an obstacle you cannot vault)
- **Needs:** an obstacle too tall or with no room behind it to vault, or you are too slow and close.
- **Effect:** Climbs over it (a fast mantle above run speed 20). Refills all charges. Holding Ascend with no movement input turns the end into a Springboard.
- **State after:** Ground
- **Vertical after:** not rising
- **Refreshes:** everything (C8).
- **Leads into:** Springboard.

## Powerslide
- **Aliases:** power slide
- **Kind:** basic
- **Inputs:** Descend (on the ground or in coyote time)
- **Needs:** Powerslide unlocked; on the ground by state or within ledge grace; moving faster than 8; cooldown 1 s after the last powerslide ended (cleared by being airborne past ledge grace).
- **Effect:** Stores the **bank** = sqrt(flat² + max(0, up)²) and slides you forward at 1.5 × bank, losing about 86% per second after the first 0.2 s. You cannot steer. **Jumping during it launches you at the bank horizontally (slide jump)** in your input direction within 60° of the slide direction, with a normal additive jump vertically. Converts into a Slide at a low obstacle or a slope steeper than 30°, and into a Dropdown at an edge.
- **Speed:** bank 32 slides 48 at first, 26.6 after 0.5 s, 9.9 after 1 s; the bank stays 32.
- **State after:** Unchanged
- **Vertical after:** kept
- **Stores / Uses:** stores the bank; a slide jump uses it.
- **Leads into:** Jump (slide jump), Dropdown, Slide.
- **Mistakes:** sliding while falling banks only flat speed; slide jumping with no direction held only uses the flat part of the bank; the bank does not fade even though the slide slows.
- **Rules:** C13

## Slide
- **Aliases:** Coil Slide, Infinite Slide
- **Kind:** basic
- **Inputs:** Descend (held)
- **Needs:** started by a powerslide meeting a low obstacle or a slope steeper than 30°, or by landing while coiled with Descend held and moving faster than 6.
- **Effect:** A separate slide with real slope physics (fixed 60 Hz): downhill acceleration 75 × sin(slope), friction 5 + 0.35 × speed per second, turning toward downhill. On slopes steeper than about 6° it never stops while Descend is held (infinite slide). Jumping from it is a normal jump using your current flat speed; there is no bank.
- **Speed:** top speed 22.9 at 10°, 41.2 at 15°, 59 at 20°, 92.9 at 30°, 134.6 at 44°; on flat ground 50 drops below 8 after about 3 s.
- **State after:** Ground
- **Vertical after:** not rising
- **Mistakes:** releasing Descend, jumping, or being airborne for more than 0.3 s ends it.

## Springboard
- **Aliases:** springboard jump
- **Kind:** basic
- **Inputs:** Ascend (held through a mantle or vault with no movement input)
- **Effect:** Launches you mostly upward.
- **Speed:** direction × max(10, speed ÷ 3.2) flat and 45 up (about 13.5 studs high).
- **State after:** Jumping
- **Vertical after:** rising
- **Mistakes:** sets Jumping, so it cannot catch coyote time until its apex.

## Swing
- **Aliases:** grapple swing
- **Kind:** basic
- **Inputs:** Use Augment (held)
- **Needs:** Grappler; a swing point (or any surface with Swing II).
- **Effect:** Turns you into a rope pendulum with gravity 75 and air drag. Releasing keeps the swing velocity. Jumping while swinging releases you with a pull toward the point, which sets Falling in the air. With Swing I, swinging on a swing point refills your grapple charge. You can dropkick while swinging.
- **State after:** Unchanged
- **Vertical after:** varies
- **Rules:** C18

## Vault
- **Aliases:** none
- **Kind:** basic
- **Inputs:** Ascend (running at a low obstacle)
- **Needs:** speed of at least 16; a low obstacle with clear space above and room behind.
- **Effect:** Carries you over at the **vault speed** = max(12, |flat + upward speed|, run speed, 24) plus 7 up for 0.175 to 0.5 s. **Vaulting converts upward speed into forward speed.** Refills all charges and gives a small run speed boost. Holding Ascend at the end: Springboard with no input, or a leap with input: direction × max(run speed × 1.379, vault speed) and 32 up.
- **State after:** Jumping
- **Vertical after:** rising
- **Refreshes:** everything (C8).

## Wall Bounce
- **Aliases:** wallbounce
- **Kind:** basic
- **Inputs:** Ascend (released, or pressed again) within 0.2 s of starting a Wall Climb
- **Needs:** a Wall Climb started less than 0.2 s ago.
- **Effect:** Returns the stored wall speed. Result = the larger of (stored speed with its vertical part clamped to 0 to 100) and a push (flat look × 42 × min(1, run speed ÷ 24) plus 26 up), pointed along their sum. Without WASD the push points away from the wall; with WASD held it follows your camera (into the wall if you look at it). The approach angle splits stored speed between up (capped at 100) and along the wall (uncapped); the look at release (the flick) steers the result toward horizontal when you look the way your speed runs along the wall.
- **Speed:** 80 flat + 40 up hitting at 20°, looking along the wall: about 61 flat, 66 up. 150 flat + 40 up at 20°: about 125 flat, 92 up.
- **State after:** Falling
- **Vertical after:** rising
- **Stores / Uses:** uses the stored wall speed.
- **Refreshes:** mag bounce.
- **Leads into:** Coyote Time (Boing), Wall Kick with an air dash (Bounce Kick), Mag Bounce.
- **Mistakes:** hitting the wall while falling wastes the falling share; holding WASD while looking at the wall wastes the push; facing more than 60° off the wall when pressing Ascend gives a wallrun instead of a climb.
- **Rules:** C15, C16

## Wall Climb
- **Aliases:** wallclimb
- **Kind:** basic
- **Inputs:** Ascend (in the air, facing a wall within 60°)
- **Needs:** a wall climb charge; up speed above −75; no more than 0.4 s spent falling (unless air dashing with Wall Boost); a different wall facing from the last climb unless you touched the ground since.
- **Effect:** **Stores your whole speed** as stored wall speed (C15), then climbs: starts at 10 or less up, pushed +22.75 every 0.4 s (run speed 12) to 0.31 s (run speed 32) while not sliding down. Reaching the top climbs the ledge. Jumping off within 0.2 s is a Wall Bounce; later it is a weak jump (14.7 out, 26 up).
- **Speed:** climb height about 10 (run speed 12) to 19 studs (run speed 32 with Glove).
- **State after:** Jumping
- **Vertical after:** rising
- **Stores / Uses:** stores the wall speed.
- **Refreshes:** mag bounce (on start).
- **Leads into:** Wall Bounce, Ledge Grab, Wall Climb Boost (if air dashing).
- **Rules:** C15

## Wall Climb Boost
- **Aliases:** WCB, wall boost
- **Kind:** basic
- **Inputs:** Dash (air dash), Ascend (wall clutch), Ascend again
- **Needs:** Wall Boost unlocked; a Wall Clutch; the second Ascend within 0.25 s, looking upward and roughly facing the wall.
- **Effect:** Launches you straight up with no flat speed.
- **Speed:** 40.6 (run speed 12) to 50.5 (run speed 32) up, rising 11 to 17 studs; 52 to 60 up (18 to 24 studs) with Climber Glove I.
- **State after:** Falling
- **Vertical after:** rising
- **Refreshes:** mag bounce.
- **Leads into:** Coyote Time at the top of the wall (Wumpy), Wall Kick (Boost Kick).
- **Mistakes:** not looking up or pressing after 0.25 s makes the boost fail.
- **Rules:** C17

## Wall Clutch
- **Aliases:** clutch
- **Kind:** basic
- **Inputs:** Dash (air dash), then Ascend at a wall
- **Needs:** air dash active; Wall Boost unlocked.
- **Effect:** A wall climb started during an air dash. It allows Wall Climb Boost and can be started even after falling for more than 0.4 s. While sliding down on any wall climb, wall gravity is divided by 3.
- **State after:** Jumping
- **Vertical after:** varies
- **Stores / Uses:** stores the wall speed like any wall climb.
- **Leads into:** Wall Climb Boost.
- **Rules:** C15, C17

## Wall Jump
- **Aliases:** walljump, wallrun jump
- **Kind:** basic
- **Inputs:** Ascend (on a wall)
- **Effect:** Jumps off the wall. From a wallrun: flat speed = your wallrun speed in your camera direction mirrored away from the wall, 26 up. From a wall climb after the 0.2 s bounce window: 14.7 outward, 26 up. Cancels ledge grace.
- **Speed:** 26 up (about 4.5 studs higher).
- **State after:** Falling
- **Vertical after:** rising
- **Refreshes:** mag bounce.
- **Leads into:** Coyote Time (rising in Falling: Wall Run Wumpy, Pogo), Wall Run, Wall Climb.
- **Rules:** C4, C15

## Wall Kick
- **Aliases:** wallkick
- **Kind:** basic
- **Inputs:** Dash (air dash), then Ascend with your back to a wall
- **Needs:** Wall Kick unlocked; air dashing and within 0.2 s of pressing Dash; a wall within 6 studs behind you; up speed above −75; a wall kick charge.
- **Effect:** Augment toward your facing direction (keeps your speed, turns it), then sets up speed to 28.
- **Speed:** push 18 (run speed 12) to 30 (run speed 24 or more); 28 up (about 5.2 studs higher).
- **State after:** Unchanged
- **Vertical after:** rising
- **Refreshes:** mag bounce; the air dash cooldown becomes 1 s.
- **Leads into:** Coyote Time (Wall Kick Wumpy; on the landing frame, Kogo), Wall Run (Gravity Kick).
- **Rules:** C7, C14, C17

## Wall Run
- **Aliases:** wallrun
- **Kind:** basic
- **Inputs:** Ascend (in the air, a wall beside you or ahead at more than 60° off)
- **Needs:** a wallrun charge (2, or 3 with Drifter Glove I); up speed above −75; a different wall facing from the last wallrun unless you touched the ground since.
- **Effect:** **Keeps your full speed along the wall** (speed into the wall is redirected along it). Up starts at min(0, entry up) + 12 with wall gravity 20 (rising for about the first 0.6 s). Lasts 1 s (1.5 s Glove, 2.25 s Drifter Glove I, × 1.25 with the Mag Rail on a left wall). Drifter Glove II converts falling into speed. An air dash makes the game jump you off 0.2 s later.
- **Speed:** flat speed kept; peak about 3.5 studs above the start.
- **State after:** Jumping
- **Vertical after:** rising
- **Refreshes:** mag bounce (on start).
- **Leads into:** Wall Jump (Wall Run Wumpy, Pogo), Mag Launch, Wall Run on the next face (Corner Cut), Wall Climb on a wall ahead (Wavedash).
- **Rules:** C15

---

## Concepts

## Coyote Time
- **Aliases:** CT, Extended Coyote Time
- **Kind:** concept
- **Needs:** rising in a state other than Jumping, with a ledge top (or, on the landing frame, the floor) entering your grounding band on a checked frame.
- **Effect:** You are grounded and Running while still rising, until your up speed reaches 0. It allows a jump (additive), a powerslide that banks upward speed, a ground dash, refills all charges and clears the same-wall restriction. Ascend acts as on the ground (vault or mantle, pipe, jump), so walls cannot be started until you are Falling.
- **Speed:** lasts about (up speed when caught ÷ 75) s, then 0.15 s of ledge grace. Guaranteed catch below 78 rise speed at 30 FPS and 156 at 60 FPS or above (much lower if only the top of the ledge is overlapped).
- **State after:** Ground
- **Vertical after:** rising
- **Leads into:** the tech's ending: Powerslide, Jump or Slide Jump (C20); Jump (Trimp); Buffer Dash.
- **Rules:** C2, C3, C5, C7, C20

## Ledge Grace
- **Aliases:** Coyote Time (classic meaning)
- **Kind:** concept
- **Effect:** After leaving the ground you can still jump and powerslide for about 0.23 s (0.08 s still Running plus 0.15 s). Dropdown counts as ledge grace throughout. A jump in ledge grace discards your fall speed. A wall jump cancels it.
- **State after:** Unchanged
- **Vertical after:** varies
- **Rules:** C6

## Trimp
- **Aliases:** none
- **Kind:** concept
- **Inputs:** Coyote Time, Jump, Coyote Time
- **Effect:** Jump inside coyote time (adds jump power, up to the 42 cap), tap so you turn Falling 55 to 67 ms later, then catch coyote time again on the next, higher ledge. Each catch refills charges and allows the next jump.
- **State after:** Ground
- **Vertical after:** rising
- **Rules:** C5, C11

---

## Steps

## Slide Jump
- **Aliases:** slidejump
- **Kind:** step
- **Inputs:** Powerslide, then Ascend while holding a direction
- **Needs:** a powerslide that is still going (on the ground, in coyote time or in ledge grace).
- **Effect:** Launches you at the larger of a normal jump's flat speed and the bank, in your input direction within 60° of the slide direction, with the normal additive jump vertically. As a coyote ending it turns your upward speed into forward speed while keeping the upward speed (raised toward 42).
- **Speed:** caught at 60 flat and 28 up with run speed 32: bank 66, launch 66 flat and 42 up.
- **State after:** Jumping while held, then Falling
- **Vertical after:** rising
- **Stores / Uses:** uses the bank.
- **Mistakes:** with no direction held only the flat part of the bank is used; once the powerslide has ended it is a normal jump.
- **Rules:** C11, C13, C20

## Buffer Dash
- **Aliases:** buffered dash
- **Kind:** step
- **Inputs:** Dash (held)
- **Needs:** on the ground by state (coyote time counts); the dash still on its 1 s cooldown.
- **Effect:** Holding Dash during the cooldown makes the dash start the instant the cooldown ends, as long as you keep holding. With the dash active, your next jump at an edge (including in coyote time while rising faster than 8) is a Flail Jump, or a Long Jump if afterboosted, and you gain the +2 run speed bonus. Pressing Dash while Falling gives an Air Dash instead.
- **State after:** Unchanged
- **Vertical after:** kept
- **Rules:** C12
