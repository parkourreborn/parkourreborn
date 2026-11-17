---
title: Alpha 1.73 Patch Notes
category: updates
summary: Alpha 1.73 was released on June 5, 2026 (build 266).
aliases:
  - alpha 1.73 patch notes
  - alpha 1.73
  - 1.73 alpha
  - update 1.73
  - 1.73 update
  - 1.73 patch notes
  - 1.73 changelog
tags:
  - updates
  - patch notes
  - alpha
wiki_aliases:
  - alpha 1.73 patch notes
  - alpha 1.73
  - 1.73 alpha
  - update 1.73
  - 1.73 update
  - 1.73 patch notes
  - 1.73 changelog
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.73 was released on June 5, 2026 (build 266).

## Major Optimizations
Welcome back, console players! Goodbye, memory usage!
By enabling Roblox's streaming feature, we were able to severely cut memory usage, allowing all console players to finally play the game unimpeded! To implement this properly took a lot of time and debugging, and we are so thankful for everyone's patience.
* Removed render distance setting (it is incompatible with streaming, we're sorry)
* Deprecated old in-house DetailLevel system
* Zooming in with binoculars now shows you the detail objects around that area

## Map Changes
We've revisited many parts of the map to give them interesting interiors, we will utilize them more later!
* The Crystal time trial building has been given an interior
* GL Tower has been reworked, given an interior, and been given the nearby respawn transceiver
* Mantra's (NPC) interior has been reworked and expanded
* The Wallboost trial building has been given an interior, the Dirwik Café
* A new Stack interior has been added, as well as two new, small Stack buildings
* Derek now has a workshop on the Solar time trial building
* Made changes to Connor's workshop and gave it an additional entrance
* Added fake out of bounds buildings to reduce the abruptness of the edge of the playable map
* Many rooftop lights have been added to Stack
* Some Stack buildings have been given the classic neon strip from old Stack's design
* Added many new props
* Fixed many environmental errors
* Specifically fixed those 2 panes of glass that acted weird in that one Fragment building, if you know you know

## Cosmetics
New cosmetics have been added, as well as more refinements to the system!
* Added the Worker and Shade bags which contain many new cosmetics, with a new highest rarity of Mythic
* Prefer slips are now consumed before opening cosmetics rather than before buying them (bags already assigned a gear in the past should work as intended)
* Cosmetic pity now displays properly
* Night Market cards are now colored according to the rarity of the cosmetic underneath
* Opening bags now plays a sound according to the rarity of the cosmetic you receive
* While previewing bag contents, you can now click on a cosmetic to learn more about it
* Holiday skins no longer appear in the Night Market outside of when they're usually available
* Fixed other miscellaneous cosmetic system bugs

## Chat Rework
Chat has been completely rewritten, squashing old bugs and adding new features!
* Added party chat channel
* Removed proximity chat channel
* Fixed system messages not appearing if you weren't within the respawn transceiver's range that they originated from
* Fixed private messages (whispers) not working
* Multiple badges may now display for each user in chat and will sync with leaderboard and playercard badges
* Added animation for new messages
* Press the up arrow in chat to repeat previous messages (useful for commands)

## Console Fixes
Since console users can now play thanks to both our optimizations and Roblox platform fixes, we addressed some long-standing issues for console players!
* Roblox's on-screen keyboard did not work, so we added one for console players to be able to chat
* Console players should now be able to zoom in with binoculars by using the DPad
* Console players should have an easier time talking to NPCs

## Medal.Tv Integration
We've partnered with Medal.tv! Our game now supports Medal's auto clip feature! If you have this enabled, Medal will automatically clip important moments for you, such as new records on time trials (Platinum+), beating advancement challenges, and more!

## Gear And Movement Tweaks
* You can now powerslide out of the end of a dropkick
* Coil and Dropkick are now obtained at level 2 and 5, respectively, and their obtainment books have been removed
* Performing a 0ms roll no longer cancels your slide (credits to v4ldt for the help!)
* Performing any move in the same frame that you afterboost no longer cancels the move (credits to v4ldt for the help!)
* Fixed ziplines capping your speed arbitrarily upon entry moving down the zipline
* Buffed Cable Glider I's powered duration (5s -> 7.5s)
* Buffed Cable Glider I's acceleration speed (25 -> 35)
* In specific circumstances where you accidentally clip an edge just after having chain jumped, your chain will no longer be lost
* Tweaked the wallrun arrow UI

## Npc & Mission Tweaks
Many of these changes were made in preparation for Beta and may not have a large impact on this update!
* Missions within a questline should now say "mission updated" rather than "mission completed" if they aren't the last stage of the questline
* Reworked UI for NPC text messages (and global announcements)
* NPC text messages can now stack multiple texts rather than replacing itself
* Refined Derek and Julian's dialog further
* Fully restructured all of their dialog on the backend
* You can no longer speak to Derek without first having completed Julian's initiation questline
* Mantra (NPC) has been given a design (she still does nothing, for now)
* Added a new NPC, Marcel (currently does nothing)
* NPC Lean animations have been reworked
* Fixed NPC Quest button not being recolored correctly
* Many upgrades to the mission backend that aren't used currently but will be very handy later on, such as:
  * The ability to take away items from players at the start/end of a mission
  * Direct purchasing of items through NPC dialog rather than the NPC shop
  * Missions can listen to gear part pickups on the map now
* Changed PetraUnlock quest name to be "Meet Petra" for each stage rather than the various titles it had before
* Fixed a bug where Petra would never give you her PetraUnlock mission if you didn't have a card

## Tweaks
* Valuables are now populated on join so you don't have to wait around for them to spawn
* For technical reasons, data resets will now also reset your cosmetic inventory and will have a 1 week cooldown (this was an unfortunate but necessary change)
* Adjusted Advancement Beta's starting timer following the addition of the Dirwik Café (15s -> 17s)
* "Window tweening" setting has been renamed to "environmental tweens", as it now also disables district atmosphere tweening for a very minor performance boost
* New edge sit loiter spot has been made
* Added a new edge sit loiter type
* Minor shop UI improvements
* Ordered inventory consumables tab 2nd rather than 1st for now
* Increased fence texture scaling
* Tweaked crane sitting animation
* Centered Mag Bounce crosshair properly
* Standardized UI popup text size to 24
* Gave rugged synthetics a fabric texture
* Tweaked cosmetic rolling UI
* Updated in-game credits
* Replaced Roblox Premium icon with Roblox Plus icon
* R6 avatar accessories should now always be high quality

## Bug Fixes
* Fixed the loading screen not actually displaying progress
* Fixed District and Tower badges being given when they weren't supposed to
* Fixed being unable to disable snow if it was on
* Fixed map dragging not stopping if you let go on top of a UI element
* Fixed glass shatter sound not working
* Fixed district ambience not changing correctly on the map if you zoomed too far out
* Fixed "Reset Binds" errors
* Fixed KeypadMinus and KeypadPlus showing up as "ERROR" on the keybinds display
* Fixed some UI taking you to an old version of the Token store that didn't work
* Fixed game vs the net "DistanceTraveled" statistic not using the same metric (km)
* Disabled claiming daily rewards in the testing place (as it would prevent you from claiming it in the main game)
* Fixed many collectible models (gear parts) floating above the ground
* Removed collision from Binoculars
* Fixed grappling through glass breaking the rope
* Fixed players randomly respawning at the world origin
* Fixed survive terminal velocity quest not completing

<!-- wiki:end -->
