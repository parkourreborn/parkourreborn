---
title: Vault, Ledge Grab and Climbing Physics
category: mechanics
summary: Vaults and vault jumps, mantles, ledge grabs, the Springhook launch, pipes and ladders, coil and Coil Trimp.
aliases:
  - vault physics
  - mantle
  - ledge grab
  - springboard
  - springhook launch
  - pipe climbing
  - climb leap
  - climb jump
  - coil
  - coil trimp
tags:
  - mechanics
  - physics
---

<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->
## Ledges, Vaults, Climbing and Coil

### Vault

- Press Ascend while running at a low obstacle: the waist-height ray (about 6 studs, longer above 64 speed) hits, the head-height ray is clear, and there is room behind it. Requires speed of at least 16 (otherwise, or if the obstacle is too close, it becomes a mantle).
- **Vault speed = max(12, |(flat velocity, max(0, up))|, run speed, 24)**, overridden by a fixed vault speed on some objects. **Vaulting converts upward speed into forward speed.**
- During the vault you move forward at the vault speed with +7 up for 0.175 to 0.5 s, in the Jumping state. Your charges are refilled and you get a speed boost.
- **Holding Ascend at the end of a vault performs a vault jump:**
  - with no input: **springboard**, direction × max(10, speed ÷ 3.2) + **45 up** (13.5 studs high);
  - with input: **leap**, direction × max(run speed × 1.379, vault speed) + **32 up** (6.8 studs high).

### Mantle and fast mantle

Used when a vault is not possible (no room behind the obstacle, or too slow and too close). Above run speed 20 it is a fast mantle. Holding Ascend with **no** movement input during a mantle performs a springboard at the end (45 up).

### Ledge grab and climb

- This happens when a wall climb reaches the top, or when you press Ascend near a ledge you can reach.
- **Reach:** a ledge top up to about 5 studs above your waist (the height of the forward ray). With a Springhook, this becomes 7 when you are rising slower than 24 or wallrunning, and 8 with Powered Springhook.
- **Maximum fall speed to grab:** 75 without a Springhook. With a Springhook the limit is multiplied by 1.5, 1.6 (Powered I) or 1.7 (Powered II), giving 112.5, 120 and 127.5 (+50%, +60% and +70%).
- During the climb your physics is paused and you are moved onto the ledge. The animation lasts about 0.633 ÷ (1.25 + 0.75 × sine-in(run speed progress)) seconds: 0.51 s at run speed 12 down to 0.32 s at 32.
- **A ledge climb refills all charges** and gives a speed boost.
- On exit you are in Running, moving along the ledge direction at your run speed if you are holding a direction.
- If there is no floor behind the ledge top, you get a barrier vault and drop down the other side.

### Springhook launch

With a Springhook equipped, holding Ascend during a ledge grab launches you instead of climbing:

- **Horizontal (with input):** input direction × max(10, P × transfer + 10), where P = max(run speed, max(flat speed, |vertical speed|) before the grab) and transfer = 0.6 (base), 0.85 (Powered I) or 0.95 (Powered II); the +10 becomes +7 at level 2.
- **Vertical:** max(P × camera pitch ÷ 1.4, 40) with the camera's upward component clamped to 0.6 (0.8 Powered I, 0.95 Powered II); at level 2, max(P × pitch ÷ 1.2, 52).
- **Without input:** extra vertical speed from your speed before the grab, up to 25 (base) or 40 (Powered).
- **Your fall speed before the grab is fed into the launch.** This is the "velocity transfer" the upgrades improve.

### Pipes and climbables

- **Climb:** you grab a pipe or ladder within 7.5 studs horizontally. Holding forward climbs at 16 up (rising to 18.4 after holding forward for a while); sliding down (holding Descend) is about 36 down. Grabbing while falling faster than 75 keeps you sliding down while you slow.
- **Climb Leap:** pressing Ascend while facing the pipe leaps you 16 studs up it over about 1.5 s, with a 2.5 s cooldown.
- **Climb Jump:** pressing Ascend while not facing the pipe (or at its top) jumps you off it with a wall jump in your camera direction at 28 horizontal and 26 up.
- **Mag Rail on a pipe ("zoop"):** you shoot up at 16 × 3.5 = **56** and leave the pipe at 56 up.
- At the top of a pipe you automatically climb onto the ledge if there is one.
- **Leaving a pipe refills all charges.** The state is picked from your velocity at the moment you leave, which reads 0 while you are attached, so in practice you leave in Falling. The zoop exit is always Falling while rising at 56, so it can catch coyote time.

### Coil and Coil Trimp

**Coil:** press Descend in the air (up speed above −15, not during another parkour move). Your character's root is moved **up by 1.5 studs** over 0.15 s (10 studs per second) and your collider becomes the low shape. This raises your feet and gives you slightly more upward reach. When the coil ends **while you are still in the air**, the root is moved **back down by 1.5 studs** over 0.15 s. If you land while coiled, it does not move back down.

**Coil slide:** landing while coiled with Descend held and moving faster than 6 starts a slide (the Powerslide and Slide Physics page).

**Coil Trimp, step by step:**

1. Jump, then coil.
2. Press jump before you land so it is buffered (the Jump Physics page). The buffered jump fires as part of the landing, **on the same frame you land**.
3. That jump stops the coil animation and marks you as airborne. The coil then sees "coil ended and in the air" and **moves your root down 1.5 studs over 0.15 s**, while your jump is moving you up at about 13 to 19.
4. The pull-down keeps your feet inside the floor's grounding band. As soon as you release jump (at least 0.05 s in), your state becomes Falling, and the next ground check grounds you again **while you are still rising**. That is coyote time off flat ground.
5. Powerslide during that coyote time (it banks your speed, including the upward part).
6. When the coyote time ends while you are in the air, the powerslide stops, and because you are airborne beyond ledge grace the powerslide cooldown is cleared. The next time you touch ground you can powerslide again immediately, instead of waiting 1 s.

**Why the jump must be buffered:** a normal jump pressed one frame after landing is too late. By then the coil has already registered the landing, finished, and skipped the pull-down.
