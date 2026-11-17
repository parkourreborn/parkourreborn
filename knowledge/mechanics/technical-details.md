---
title: Technical Details
category: mechanics
aliases:
  - technical details
  - technical
  - game engine details
tags:
  - mechanics
  - technical
wiki_aliases:
  - technical
---

<!-- wiki:start page="Technical" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Not to be confused with techniques. This page is for various technical aspects of the game.

## Debug Menu

The Debug Menu can be opened by pressing 5 on a keyboard. Doing so will display various utility options.

* visualize rays shows red and green rays around the player, presumably for lighting or physics purposes.

* respawn all destructibles allows you to regenerate objects that have been broken, namely glass.

* reload character reloads your character.

* debug mode displays different statistics, a movement feed, and your character's hitboxes.

* ghost editor opens a window that lets you record your movement and play it back as a ghost. It includes options to adjust the playback FPS, and multiple playback controls with dedicated keybinds. Players can also export recordings as a JSON file for later use/sharing. The window can be moved around the screen.

* Content Creators and Admins without chat access can open the command bar using 4 or 5. This feature is restricted to those roles.

## Momentum

Numbers are measured in Roblox walkspeed (ws).

* Starts at 12ws, even though it's displayed as an empty bar.

* Your level cap begins at 26ws at level 1, and increases up to 32ws at level 20.

* This isn't linear—it increases much faster closer to level 20.

* It is hard capped at 32ws, and cannot be surpassed.

* This means that dashing at the hard cap doesn't make you any faster.

* temporary momentum, indicated by red parts of the bar, is added on top. It resets if you touch the ground (unless you jump, which only works once per chain jump), or your dash ends. It can exceed your level cap, but not the hard cap.

* dash adds 2ws, and afterboost adds another 2ws.

* Dash + Afterboost can reach the hard cap past level 12.

* Dash alone can reach the hard cap past level 17.

* Dashing prevents your momentum from building past 26ws (+2ws from the Dash), but builds it faster up to that point.

* chain speed/power increases separately from momentum, but is affected by it.

* There is a small buffer before losing momentum from standing still.

### Bar

* It appears empty at 12ws, and full at your level cap.

* Your momentum appears to get "snapped" to your level cap, but it actually just scales the bar faster. Your momentum does not increase any faster.

* The reason it feels faster is because your FOV increases when momentum is at its level cap.

* The bar's scale decreases with level—i.e. 26ws is displayed as much less at level 20 than level 1.

## Collisions

* You have three hitboxes that are active at all times.

* The floor hitbox is a cylinder that extends up to around your waist. It checks for valid floors or slopes, and snaps you up or down to them.

* The collision hitbox is a floating capsule above the ground check. It collides with walls and ceilings.

* The nearby wall/climbable hitbox is a large cylinder around you that extends from above your ankles. It checks for valid walls, and allows you to wall run, wall climb, wall kick, and ledge grab on them depending on what angle the wall is at relative to you. It also allows you to clutch onto pipes and ladders.

* Coil moves all three hitboxes up by 2 studs, and also shrinks the collision hitbox down to a sphere.

* When you Mantle, Ledge Grab, or Barrier Vault your position instantly snaps up to the top, then your model "catches up".

* Vault and Vault Jump do not do this.

* If you cancel a Barrier Vault, it moves again to be on top of the object.

* Springboard from Vault doesn't do this. Springboard from Mantle seems to do either.

* To stop you from getting snagged on them, many small details have their collisions disabled or wrapped in invisible boxes. Some places don't have this by accident—these should be reported as a bug in Reborn's Discord server.

## Jumping

* Float time lowers gravity while holding jump. This increases with momentum, and is cancelled by releasing jump. Known as a High Jump.

* Jump Buffer lets you jump if you inputted before touching the ground.

* Coyote Time allows you to jump for a short moment even after leaving the ground.

* Long Jump checks if a ledge is in front of you, or if you're in Coyote Time.

* Jumping does not set your Velocity, it adds to it. This means that if you're already moving upwards, jumping will boost it. This is referred to as Additive Jump Velocity, or Jump Boost.

* Wumpy uses both of these combined. By using Wall Boost, you can clip the ledge for just long enough to activate Coyote Time. You can then Long Jump to combine it with the Velocity from Wall Boost.

## Animation

* Ledge Grab has two variants. Check its Movement entry for more information.

* Vault Jump currently uses the same animation that Springboard does.

## FOV

* Due to how it's implemented in Roblox, the setting determines vertical FOV in degrees.

* FOV is increased during Dash, Afterboost, and while momentum is at your level cap.

<!-- wiki:end -->
