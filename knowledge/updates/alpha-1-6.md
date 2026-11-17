---
title: Alpha 1.6 Patch Notes
category: updates
summary: Alpha 1.6 was released on October 18, 2025 (build 197). It was the Halloween 2025 seasonal update.
aliases:
  - alpha 1.6 patch notes
  - alpha 1.6
  - 1.6 alpha
  - update 1.6
  - 1.6 update
  - 1.6 patch notes
  - 1.6 changelog
  - halloween 2025 update
tags:
  - updates
  - patch notes
  - alpha
  - halloween
wiki_aliases:
  - alpha 1.6 patch notes
  - alpha 1.6
  - 1.6 alpha
  - update 1.6
  - 1.6 update
  - 1.6 patch notes
  - 1.6 changelog
  - halloween 2025 update
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.6 was released on October 18, 2025 (build 197). It was the Halloween 2025 seasonal update.

## Halloween Haunting
It’s spooky season!
* The map has been decorated accordingly!
  * New Halloween props
  * Some props have been replaced with Halloween variants, like Checkpoints and Swing points
  * New Halloween ambiance, which changes with the time of day!
* New limited-time exploding pumpkins spawn randomly around the map! Have fun utilizing them while running!
* New limited-time candies spawn randomly around the map! Collecting them gives you XP, so make sure to get as many as you can!
* Bats now fly around the map
* The NPCs have dressed up for the occasion

## Tutorial Rework
We felt that the tutorial could be more effective in teaching the player how to play the game, so we redesigned it.. again! We generally made the tutorial easier and provided better explanations for movement. We’re still working on improving the new player experience and we will address more issues in future updates!
* The tutorial now better explains momentum, springboarding, and wallrunning
* The tutorial now has holograms showing how to complete areas that may be problematic
* The tutorial now has a better backend regarding checkpoints and fail zones, making future tweaks easier and more seamless
* For first-time players, made the explanation for Casual vs Traceur much more accurate
* Peaceful mode is now enabled while in tutorial

## Badges
At long last, achievements! Can you get all 14?
* Standard progression badges have been added
* Two limited-time Halloween badges have been added
* For those who have completed the requirements for a badge already, you should be given those badges retroactively!

## Grappler Tweaks
Why not revisit an old fan favorite?
* Grappler ropes can now be seen by everyone, not just yourself
* You can now grapple onto other players with Swing Grappler II
* Yes, you can chain multiple players grappling onto one another! Have fun!
* You can now directly use grappler off of a zipline and it will cancel the zipline
* You now rotate appropriately when swinging

## Time Trial Changes
We are continuing to refine the time trials on the map; we hope these changes are welcome! If you notice changes to your rank, this is why.
* You can now reset your time trial times and rank events in settings
* Fragment’s Needle has been replaced with a new time trial called ‘Thread’
* Needle times and rank events have been reset
* Celsius’ start point has moved, as a result the times have been reset and rebalanced
* Celsius’ difficulty has been reduced from ‘Advanced’ -> ‘Tough”
* Genesis times have been reset and rebalanced due to changes in the tutorial
* All unreleased and deleted trials have been wiped from player data and rank (Carbon, Fiber, Apollo)
* Improved visibility on several time trials, such as Grip and Martyr, by adding lights
* Gave several time trials guide arrows when the ending was obscured by geometry (mostly in Fragment)
* Slightly adjusted some geometry around the world record route for Grip (to minimize RNG)

## Optimizations
We are still a long way off from our optimization goals, but we’ve done a few things that we hope will hold you over in the meantime. Please note that we have not forgotten about console players who cannot load in! We will optimize the game for console players when we can, but this is an arduous process that takes a lot of time. Thank you for understanding.
* Added a toggle to Cast Shadow which significantly increases FPS at the cost of the beauty of the game
* Added a toggle to Textures which increases FPS at the cost of the beauty of the game
* Optimized many props by reducing draw calls, triangle count, part count, light count, collision fidelity, shadow fidelity, etc.
* Optimized snow script somewhat
* Optimized lights in tutorial
* Began optimizing buildings in Downtown by grouping them together

## Miscellaneous Tweaks
* Long jumping out of a powerslide or dropdown no longer reduces velocity
* New binoculars animation
* Connor the NPC now has a speaking animation
* New Connor dialog if you have Base Springhook or an upgraded variant
* Added a popup for when you get gifted Tokens
* Added credits to the community billboards
* You can now reset your player data in settings
* Fragment now has night time windows
* Disabled time of day and snow from everyone for this version so that they can enjoy the Halloween ambiance differences (you can still toggle them if you want)
* Tweaked several locations in Fragment to have more paths to parkour on
* Renamed the ‘Swag (no way dude)’ checkpoint to ‘Swag Cheese’
* Renamed the ‘Autograph’ checkpoint to ‘Heartbreak’
* Removed being able to change loadout while not grounded
* The ‘shift’ keybind graphic now visually says ‘shift’
* The ‘return to spawn’ button in settings has had the wait time reduced to 10 seconds
* Improved hitboxes for cylinder ACs in Fragment, small vents in Downtown, and trees
* Updated title screen Credits list
* Moved Coil ability book
* Disabled fidgeting while using Binoculars
* New graffitis and art placed around some parts of the map
* Removed %fix and %join from Content Creators
## Bug Fixes
* Patched wall clipping, mostly
* Fixed black shapes appearing in reflections when fake 1st person shadows are on
* Fixed /e hiding your messages (still working on fixing emotes!)
* Removed %bye access from the general public because most people didn’t know it deletes your data from that session
* Fixed Cable Glider not allowing you to change direction more than once or sometimes not at all
* Made it impossible to set any menu keybinds to left click
* Fixed the ‘owned’ tag not updating if you purchased gear in the premium store
* Fixed many decals not loading in
* Fixed your torso and head disappearing in the map view when zooming in or out
* Fixed being able to use prompts while using the map
* Fixed daily rewards highlighting incorrectly
* Fixed Cable Glider I showing up in the gear store with the Zipline Hook model
* Fixed many environmental errors
* Fixed sliding down pipe animation overriding Mag Rail climb animation
* Fixed camera snapping when looking down on a zipline
* Fixed Mag Rail arrow not disappearing on Mag Rail unequip
* Fixed Climb Vertigo mission not being assigned
* Fixed snow piles appearing inside of some buildings
* Fixed some trees not turning white with snow, and some trees turning snowy when you didn’t enable snow
* The ‘playing now’ popup should no longer appear if you have music muted
* Fixed footstep sounds for grass, gravel, and water
* Fixed being unable to grapple onto grass, gravel, water, and some Fragment billboard grates
* Some waterfalls in Fragment have been given their SFX which was missing
* Waterfall SFX has been added to the ambiance slider
* Fall speed should no longer be affected by FPS above 60
* Fixed fall cancelling when holding the exit button of a time trial
* Fixed gaining combo in time trials
* Fixed glass unable to be broken after restarting a time trial
* Fixed zooming out on death making torso and head invisible
* Fixed force blocky body setting resetting on respawn
* Fixed avatar items or the body re-appearing if you died in first person
* Fixed right side bar not closing when it should in some cases
* Fixed time trial timer being invisible in some cases
* Fixed time trial timer not always displaying as 0 before beginning
* Fixed downward Grappler swings killing you randomly
* Fixed being able to go out of bounds by ledge grabbing or using Swing Grappler
* Fixed accessory VFX setting not saving
* Fixed weird cloud zipline VFX
* Fixed a bug where the time would rapidly change in the middle of the night
* Fixed a weird bug where the playermodel would rotate after loitering sometimes
* Fixed seats on couches and chairs being improperly placed
* Fixed infinite loading caused by old missions, trials, or challenges being improperly handled when deleted by us (for real this time)
* Potentially fixed some checkpoints not allowing you to sync to them
* Fixed deliveries appearing in time trials
* Fixed capital letters breaking navigator search
* Fixed district title stacking
* Fixed loadout highlight disappearing
* Fixed wind being extremely loud in some cases when lagging
* Removed Herobrine

<!-- wiki:end -->
