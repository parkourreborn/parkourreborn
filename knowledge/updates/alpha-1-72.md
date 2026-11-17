---
title: Alpha 1.72 Patch Notes
category: updates
summary: Alpha 1.72 was released on March 6, 2026 (build 226).
aliases:
  - alpha 1.72 patch notes
  - alpha 1.72
  - 1.72 alpha
  - update 1.72
  - 1.72 update
  - 1.72 patch notes
  - 1.72 changelog
tags:
  - updates
  - patch notes
  - alpha
wiki_aliases:
  - alpha 1.72 patch notes
  - alpha 1.72
  - 1.72 alpha
  - update 1.72
  - 1.72 update
  - 1.72 patch notes
  - 1.72 changelog
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.72 was released on March 6, 2026 (build 226).

## Swing Grappler Rebalances
Swing I and II are now viable competitors to Yank I and II, we hope!
* Swing I now refreshes ammo on drones/ziplines and has 35% additional rope length
* Swing II can now swing on any surface, but has only one ammo and only has 35% additional rope length

## Environmental Changes
Stack got many major refinements in many areas; we hope you enjoy!
* Reworked many areas in Stack to have better gameplay
* Added much more material variation in Stack
* Added a few more checkpoints in Stack
* New big drones that carry objects have been introduced in Stack
* Added distinct vent coloring for Stack-Highrise vents
* Added new interior in Downtown
* Added hitbox to all huge Stack pipes
* Added missing vent sounds to Stack vents
* Beautified hanging Stack wires and added more of them
* Added more delivery endpoints to the back of Stack
* Added hitbox to all climbable pipes in the game so you can't get stuck in them
* Optimization: Added DetailLevel to *tons* of props, almost all of them that didn't have it
* Optimization: Reduced tri count, draw calls, and texture memory size on *many* props
* Optimization: Removed unnecessary CastShadow and Collision from thousands of small objects
* Optimization: Removed many unnecessary lights, especially in the Southernmost Dirwik building
* Minor improvements to some places in districts other than Stack
* Fixed being able to sit in some chairs that were fallen over or stacked together
* Fixed many miscellaneous environment errors
* Returned all foliage to their Spring/Summer colors
* Fixed some ground decorations like grass, gravel, and fake tables being wiped by asset protection
* Refined district bounds between Stack and Fragment
* Removed Christmas decorations and NPC outfits
* Removed out-of-bounds development objects (RIP funnel)

## Cosmetics Refinements
Now introducing prefer slips, an improved version of gear assigning!
* Gear assigning has been replaced by a prefer slip system
  * Prefer slips can be purchased in the bags tab of the score, and are stored in your game inventory
  * Prefer slips allow you to assign gear to bags you intend to purchase with Credits, and allow us to give prefer slips out as items later if desired
* Added a button on the inventory item card to take you to your cosmetics
* Night Market cards are now colored according to the rarity of the skin after reveal
* Changed format of system messages about cosmetics
* All items now spin in the same direction and at the same rate (including all other viewport items such as the player inventory!)
* Added sounds to opening bags
* Added UI so that players can see the pity they have on bags (pity already existed but UI didn't inform you of it!)
  * Pity is a system which ensures that a player will get a skin of a certain rarity if they open enough bags in a row without getting one; pity always guarantees that you get the best skin possible from that roll and won't override higher tier skins just to fulfill pity demands
* Pressing skip no longer closes the rolling frame UI instantly - just skips the rolling animation
* Fixed being able to accidentally buy two bags at once by spamming the buy button
* After purchasing a bag, you are immediately directed to your cosmetic inventory so you can open it (for players who are not in regions where paid random items are restricted)
* Fixed some skins not loading properly on first spawn
* If you don't have enough currency to buy a bag, the game now informs you of that

## Extended Cosmetic Refinements
* If you don't have enough currency to buy a bag, the game now informs you of that
* Fixed Cable Glider using Zipline Hook skin if you didn't have a Cable Glider skin equipped but you did have a Zipline Hook skin equipped
* Fixed Night Market cards sometimes being black after flipping them over
* Fixed having to reveal the same bag multiple times as a player in a region where paid random items are restricted
* You can now visually see that you selected a skin in your cosmetic inventory
* *Many* other miscellaneous UI improvements (this changelog is long enough already)
* Retired Christmas bags until next December

## Valuables Rework
Valuables have been buffed, in multiple ways!
* Made valuables unable to be stolen by other players (they are effectively "client side")
* Buffed some valuable sell rates slightly

## Mission Improvements
* Added "in mission area" feature. Now when you have a mission and you are in the area, the waypoint disappears and your compass indicates that you are in the required area, encouraging you to explore the area rather than be confused about the waypoint
* Made mission tracker UI show you what stage of the mission you're on
* Improved Julian's introductory quest by making the tasks and dialog clearer
* Added a small XP reward for completing the Learn Coil mission
* Improved Learn Coil mission description
* Fixed mission tabs displaying nonexistent rewards in some cases
* Fixed mission tracking not working properly
* The mission exclamation point will no longer go away unless you have no current missions to do
* Fixed a dialog error from Connor when you show him your Springhook(s)
* Improved UI for locked NPC shop items
* Made it possible to lock NPC shop items by player level or rank (for later)
* Fixed NPC shop items not using their specific layout order
* Fixed mission progress numbers not being rounded, causing weird numbers in some instances

## Navigation Improvements
* You can now use the cursor to pan the map in addition to using movement keys
* Added a player icon that looks in the direction of the player
* If you do not have the Warp Core, checkpoints are now shaded and a tooltip informs you that you cannot teleport to them
* Added an "exit" button to the map
* The map is no longer affected by fog/atmospheric density changes

## Tweaks
* Re-added roblox emotes with /e and /emote, as well as our /e sit
* New Fragment district title card animation
* Added an easter egg :}
* If you have an unclaimed daily reward, a flash will appear on screen after pressing Run to remind you to claim them
* Added a UI to show how many times you've attempted a time trial or challenge
* Unified and improved many UI across the game such as the inventory, race, loadout, debug, etc.
* Added new sound when using dynamic fans in Stack
* Made dynamic props such as openable doors, breakable glass, and breakable vents not able to be affected by other players during time trials/challenges
* Improved crane sitting animation
* Removed Christmas outfits from NPCs
* Renamed 'Development Playtester' to 'Playtester' under leaderboard tooltip
* Playtester icons should now only appear for active playtesters and won't appear for retired ones
* Added different icon and tooltip for Engineers versus Developers in chat/leaderboard
* Changed Drifter glove descriptions again to be more clear
* Made it so you can close the player list invite menu when clicking the same player again on the player list
* Increased NPC dialog distance to prevent accidentally walking out of range and skipping dialog
* Lowered volume of ambient vents
* Renamed checkpoint "Preperation" to "Preparation"
* Added a command bar for Content Creators and Admins who don't have access to chat, press 4 or 5 to access it
* Updated title screen credits

## Bug Fixes
* Fixed the Stack badge being granted incorrectly
* Fixed wall climb over wall run priority even if ammo is not present to be used
* Fixed mag drone pull being able to used on ziplines
* Being able to stay in pipe climb animation and do a pipe launch with mag when teleporting with map
* Button prompts should no longer flash on your screen when dead
* Fixed grappling on players while loitering
* Fixed dash UI stroke being white at first
* Fixed being able to use the map during coyote time
* Fixed Night Market button covering up Upgrade Gears button in premium store
* Fixed many text elements scaling poorly if you used Roblox's text size setting
* Fixed a duplicate XP router name in Stack
* Fixed district title cards sometimes being in the wrong spot
* Removed being able to save your spawn location in a crane, causing you to spawn in the air if the crane was subsequently moved
* Fixed loiter spots always defaulting to say "Loiter" instead of specified prompt texts "Sit," "Lay," etc.
* Closing the leftbar menu while talking to an NPC no longer closes the NPC dialog

Public testing began: March 2, 2025

<!-- wiki:end -->
