---
title: Tech Mechanics
category: mechanics
summary: How every multi-step tech works physically, family by family: wall bounce, wall boost, wallrun and wall kick, Mag Rail, Grappler, dropdown and coil techs.
aliases:
  - tech mechanics
  - how techs work
  - why techs work
  - boing
  - gumpy
  - wumpy
  - ddt
  - dropdown trimp
  - kogo
  - pogo
  - coil trimp
  - trimp
  - wavedash
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Techs Explained

Notation: official step names from the tech list, with `→` between steps. Steps in brackets are optional. Most techs end by catching coyote time, and what you do in it is the tech's **ending**. The tech list names each tech's usual ending (the one its clip shows), written here after a comma; every ending works on every tech that ends in coyote time. A tech is defined by its launcher and where it catches coyote time (a ledge top, or the floor on the landing frame); the ending varies.

**The endings.** In the final coyote time you can:

- **Powerslide:** the bank is your flat speed combined with your current up speed, and the slide starts at up to 1.5 × the bank, slowing quickly after 0.2 s. Your up speed is kept, the slide lasts through coyote time and ledge grace, and you can slide jump at any point while it lasts.
- **Jump:** adds jump power to your up speed (up to the 42 cap, or kept if already above 42) and keeps your flat speed. Hold it to float higher; tap it if you need coyote time again.
- **Slide jump:** powerslide, then jump while holding a direction. You are launched horizontally at the bank, and because the jump is additive, you keep your up speed (raised toward 42 if it was lower). This converts upward speed into horizontal speed without losing the upward speed.
- **Nothing:** carry your speed on, with the refills and ledge grace coyote time gives.

With mostly flat speed and little up speed, a powerslide keeps you low and fast and a jump mostly adds height. With a lot of up speed, a slide jump gives the most forward speed and a held jump the most height. At run speed 32, a catch at 60 flat and 28 up (a wall kick) gives: powerslide, a bank of 66 sliding at up to 99, keeping 28 up; jump, 60 flat and 42 up; slide jump, 66 flat and 42 up. A catch at almost no flat speed and 42 up (a wall boost) gives: jump, 32 flat and 42 up; slide jump, 42 flat and 42 up; both float higher when held.

### Concepts

**Coyote Time (Extended Coyote Time).** Section 5.1.

**Ledge Grace.** Section 5.2.

**Trimp** — Coyote Time → Jump → Coyote Time. Catch coyote time on a ledge, jump (additive, up to the 42 cap), tap the key so you become Falling within about 55 to 67 ms, then catch coyote time again on the next, higher ledge. Each step chains rising speed into the next catch.

### Wall bounce family

**Boing** — Wall Bounce → Coyote Time, ending with a Slide Jump. Hit a wall while rising, bounce within 0.2 s. The bounce returns your stored speed (vertical part up to 100) and sets Falling. Rise past the top of the wall or a nearby ledge, catch coyote time, then slide jump.
*Example:* hitting a wall at 50 total speed, mostly upward, gives a bounce of about 50 up. Passing the top at about 40 up, a powerslide banks about 40 plus your flat speed, and the slide jump turns that into horizontal speed while keeping about 40 up.

**Bogo** — Jump → Wall Bounce → Coyote Time, ending with a Powerslide. A wall bounce right at the ground with an instant tap, so there is essentially no climb before it. Starting a climb sets Jumping, which blocks grounding, so the climb start and the release must resolve on the landing frame (or as close to it as possible). The game then grounds you first and applies the bounce afterwards (the Coyote Time and Ledge Grace page), which gives you coyote time off the floor itself. It is frame-perfect like Kogo and easier at low FPS. If you hit the wall while falling, the bounce's vertical part comes only from the push (26 up), but your along-the-wall speed is kept.

**Wall Bounce Slide (Bounce Trimp)** — Coyote Time → Wall Bounce → Coyote Time → (Powerslide → Jump). Wall bounce with no WASD held, so the push points away from the wall (up to 42 outward plus 26 up), carrying you backwards over a ledge behind you. You are Falling and rising, so you catch coyote time there. The first coyote catch refills your wall climb and clears the same-wall restriction, which is what allows bouncing off the same wall again.

**Wall Bounce Flick.** Approach the wall at an angle, start the wall climb (facing within 60° of the wall), turn the camera so you look along the wall in the direction your speed is travelling, and release within 0.2 s. The angle keeps your vertical up to the 100 cap and stores the excess as along-the-wall speed; the look direction steers more of the result into horizontal. Tables in the Wall Bounce and Flick Physics page.
*Example:* 150 flat + 40 up at 20°, looking along your direction of travel, gives 124.9 horizontal and 92.2 up, compared with about 31 horizontal and 95 up when bouncing straight on.

**Mag Boing** — Mag Bounce → Wall Bounce → Coyote Time → (Powerslide → Jump). The mag bounce sets 40 up and points your whole speed where you look, so in one input you choose both your approach angle and your upward entry speed. This makes it the best setup for a flick. Starting the wall climb refreshes mag bounce, so you can mag bounce again at the edge of the wall: with level look, your horizontal speed becomes roughly your full 3D speed while your vertical speed is kept (155.2 total becomes about 180 in the the Gear Physics page example).

**Gumpy (Grappler Enhanced Wumpy)** — Grapple → Wall Bounce → Coyote Time, ending with a Slide Jump. Grapple toward the wall: the pull never slows you and gives at least 35 (43.75 or 52.5 with Yank) toward the point, so you hit the wall with much more speed. The wall stores it and the bounce returns it.

**Dropbounce** — Dropdown → Wall Bounce → Coyote Time → (Powerslide → Jump). Dropdown off an edge, then bounce off a wall below or across. Dropdown keeps you in ledge grace and sets Falling, so the bounce and coyote rules apply as usual.

**Bounce Kick (Dragon Bounce)** — Wall Bounce → Wall Kick. Bounce off a wall, air dash, then wall kick off the same wall (now behind you). The kick keeps your full bounce speed, turns it toward your facing direction, and sets 28 up.

### Wall boost family

**Wumpy (Long Jump Boost)** — Wall Climb Boost → Coyote Time, ending with a Jump. The wall boost launches you straight up at 40.6 to 50.5 (52 to 60 with Climber Glove I) and sets Falling. Rise past the top, catch coyote time and jump; hold it to float higher. **Slide Wumpy** ends with a slide jump instead, which turns the upward speed into forward speed.
*Example:* a boost at run speed 32 (50.5 up) passing a ledge 5 studs above the boost point is still rising at about 42.4. A jump keeps the 42.4 up and gives 32 flat while holding a direction; a slide jump banks about 42.4 and gives about 42 horizontal while keeping about 42 up.

**Boost Kick** — Wall Climb Boost → Wall Kick. Boost up, air dash, kick off the wall. Example: boost at 50 up, kick with a push of 30: augment turns most of it toward your facing direction (about 41.6 flat), then up is set to 28.

### Wallrun and wall kick family

**Wavedash** — Wall Run → Wall Bounce → Coyote Time, ending with a Slide Jump. A wallrun keeps your speed along the wall. Run into a second wall ahead (a corner) while the wallrun is still rising (within the first 0.6 s) and start a wall climb: your speed is now mostly into the new wall, so the entry conversion rotates it almost entirely into upward speed (up to the 100 cap). The bounce launches you up, then you catch coyote time and slide jump. If the wallrun is already falling when you hit the second wall, the vertical share is clamped to zero and lost.

**Grapple Wavedash** — Grapple → Wall Run → Wall Bounce → Coyote Time, ending with a Slide Jump. As Wavedash, using the grapple to bring more speed into the wallrun.

**Mag Wavedash** — Wall Run → Mag Launch → Mag Bounce → Wall Bounce → Coyote Time, ending with a Slide Jump. A mag launch (75 or more) off the wallrun, then a mag bounce (40 up, speed aimed at the next wall), then the bounce.

**Pogo** — Wall Run → Coyote Time, ending with a Jump. End the wallrun near the ground with a jump-out (26 up, wallrun speed horizontally, Falling). Either the jump-out happens on the frame you would touch the floor (landing-frame rule, one frame), or the wallrun has already put you on the floor and you jump out within the 0.1 s before it ends (this works at any frame rate). Either way you are grounded while rising at 26 and jump (up to 42), or use another ending.

**Kogo** — Wall Kick → Coyote Time, ending with a Powerslide. Wall kick on the exact frame you would land. The kick keeps your state (Falling), so the game grounds you and then applies the kick (28 up plus the facing push): coyote time off the floor. It is a one-frame window (16.7 ms at 60 FPS, 6.9 ms at 144 FPS), which is why it is easier at low FPS.

**Wall Kick Wumpy** — Wall Kick → Coyote Time, ending with a Jump. Wall kick (28 up, state unchanged) toward a ledge in front of you, rise past it, catch coyote time. It is Kogo caught on a ledge instead of the floor.

**Wall Run Wumpy** — Wall Run → Coyote Time, ending with a Jump. Wallrun jump-out (26 up, Falling) past a ledge, catch coyote time. It is Pogo caught on a ledge instead of the floor.

**Double Jump (tech)** — Air Dash → Wall Run → Coyote Time, ending with a Jump. Air dash, then wallrun: the game automatically jumps you off the wall 0.2 s after the air dash (26 up, wallrun speed, Falling). Use that hop to rise past a ledge and catch coyote time.

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
