---
title: Alpha 1.7 Patch Notes
category: updates
summary: Alpha 1.7 was released on December 20, 2025 (build 213). It was the Christmas 2025 seasonal update.
aliases:
  - alpha 1.7 patch notes
  - alpha 1.7
  - 1.7 alpha
  - update 1.7
  - 1.7 update
  - 1.7 patch notes
  - 1.7 changelog
  - christmas 2025 update
tags:
  - updates
  - patch notes
  - alpha
  - christmas
wiki_aliases:
  - alpha 1.7 patch notes
  - alpha 1.7
  - 1.7 alpha
  - update 1.7
  - 1.7 update
  - 1.7 patch notes
  - 1.7 changelog
  - christmas 2025 update
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.7 was released on December 20, 2025 (build 213). It was the Christmas 2025 seasonal update.

## Stack
The highly anticipated factory district has released! Enjoy the discovery!
* 6 additional time trials have been added to the game, all found in Stack
* Advancement Gamma can be found in Stack to progress your prestige beyond rank 30
* New fan mechanic in Stack (and Fragment)
* New conveyor belts in Stack
* We've decorated the district with YOUR community artwork, submitted through our communications server! Thank you for so many wonderful submissions!

## Tier Ii Gloves
Drifter Glove II and Climber Glove II are now obtainable! Buy them in the premium store for instant access, or find the parts around Stack and buy the rest from Derek!
* Rephrased descriptions on Drifter Glove to be more clear

## Gear Cosmetics
Gear cosmetics are here! Ooh, shiny..
* Buy bags in the shop with Credits or Tokens, then test your luck
* A pity system exists, as well as the opportunity to choose what gear you get from a bag
* Alternatively, the Night Market allows you to directly purchase cosmetics for Tokens. It resets every week
* Equip cosmetics in the new cosmetic inventory in the menu
* For now, you cannot get duplicate cosmetics, instead you will be refunded at least half of your currency back if you get a duplicate from a bag
* All gear models have been optimized and retextured to work with cosmetics
* The rarity tierlist goes common (white), uncommon (green), rare (cyan), epic (purple), legendary (yellow), ultimate (red), mythic (pink), there are currently no ultimate or mythic cosmetics
* Grappler now uses the same display model in the inventory as the model on your character to properly display the cosmetic on it
* Hiding your gear models from your loadout now only does so on your client
* Resetting your data will not reset your cosmetics and you will not be refunded Tokens spent on bags or cosmetics (the data reset UI specifies this)

## Controllable Cranes
Mess up your friends' routes by sitting in the cockpit of a crane and taking control! While this was not initially planned and was only added to the Stack teaser for visual effect, you guys loved it so much that we decided to implement it!
* Cranes have been reworked and optimized to accomodate for this change
* Cranes stay at their original location during time trials, challenges, and the tutorial

## Movement Changes
* Increased angle at which powerslide will automatically transition to a slide - steeper slopes can now be powerslided on
* Wall bouncing on infinite climb grate materials no longer depletes your speed
* Fall stabilization has been made more consistent, easier, and rewarding for beginners and veterans alike
  * Stabilization is now all that is necessary to survive terminal velocity when landing on fall stop objects
  * Stabilizing and performing a perfect landing will now prevent hard falls at terminal velocity when landing on fall stop objects

## Christmas
'Tis the season!
* Limited Christmas cosmetic bag in the shop
* New scenery at Crystal
* The NPCs are feeling jolly and have dressed up for the occasion
* Enjoy a free Christmas bag for logging in this update, and one of each bag for free if you log on during Christmas Eve or Christmas day!
* Snow now automatically turns on in December and turns off in March
* Many snow optimizations and improvements
* Relocated snow toggle to be under 'World' instead of 'Graphics"

## Environmental Changes
* Each district now has unique lighting and ambiance!
* The day/night cycle is now much shorter - day time lasts 12 minutes, while night time lasts 10
* Night time is now slightly brighter, and your night-time torso light is also slightly brighter
* Vertigo and Zephyr have received a lighting overhaul! They are now much more optimized, and look much better on lower graphics
* Added detail to an empty room in Vertigo
* Fixed Vertigo's one-way elevator not working
* All non-interactable elevators now have blue buttons to distinguish them from interactable green ones
* Removed fake hitboxes on storage shelves in Vertigo
* Added a new checkpoint in Zephyr, "Zephyr Faculty Lounge"
* All Fragment turbines (large fans) now use the new fan mechanic introduced in Stack
* Pure black Fragment buildings have been made slightly less dark for visibility purposes
* Minor map changes near Thread time trial
* Minor map changes in Dirwik and Fragment
* Optimized more props, fixed collision on some props
* Fragment window night lights are now slightly orange
* Foliage has been recolored to be appropriate for winter
* Coil ability moved from a crane to the "Greenhouse" in Downtown
* Removed a checkpoint from a crane in Downtown
* Relocated an XP router on a crane in Downtown to GL Tower
* Added fake out of bounds buildings beyond Stack and Fragment to give the world a little more depth

## Credit Economy Changes
* Added one-time cap to credits: If you have over 5 million credits, your credits will be set to 5 million, but you can get more credits afterward
  * This is specifically because of past expoits allowing cheaters to get millions upon millions of credits - we're sorry, but it's necessary! This should affect only a small amount of users!
  * Valuables were not reset, since there was no exploit that we know of related to them
* Rebalanced NPC sell multipliers
* Rebalanced some valuable sell amounts
* Removed some valuable spawn "hot spots"
* Added more valuable spawn locations around dead zones in Dirwik

## Tweaks
* Blacklisted autoslide from some props to prevent unintended behavior
* You can now break horizontal glass from below
* New option to disable combo coverage point ping
* Menu UI has been reworked to fit better on all screen sizes
* Currency UI has been reworked to properly display larger currency amounts
* Advancement Alpha has been made easier
* The Net button has been hidden for now - you can still access the Net with keybinds or via the playerlist, though
* Data Reset UI have been reworked to scale better on all screen sizes
* Store button text color is now always white instead of changing with UI theme
* Staff and system messages now disappear after 30 seconds (excluding global messages)
* Added system message popup to announce if the server gets locked/unlocked by staff
* Tweaked Fragment district title popup colors
* Free access players are now informed that the game is normally paid access and that their access is temporary
* Viewports now better center all gear models
* Game credits UI on title screen now scrolls back up after it has hit the bottom
* Automatic fidget time increased from 1 to 3 seconds
* Chain's ability description now informs the player that using powerslide and dropdown perserve your chain
* Harper now has the correct hourglass torso instead of the blocky one

## Bug Fixes
* Executive Runner gamepass no longer grants double Tokens in daily rewards
* Attempted a fix for the random pipe teleporting
* Fixed being unable to type in access keys to redeem them (only pasting worked)
* Fixed being able to open doors while dead
* Fixed being able to powerslide in loiters
* Fixed map icons overlapping the chat
* Permanently fixed being able to fall through the ground when respawning at checkpoints with detail levelled floors
* Zipline prompts now appear later than you can attach to them instead of earlier
* Attempted a fix for time trial ​cube flashes being out of sync
* Fixed viewports/icons sometimes overlapping on premium store items
* Torso light now turns on during client night-time instead of server night-time
* Fixed being able to gain combo by teleporting with the map
* Fixed spinning while spectating
* Fixed rapid NPC look-at camera movement when standing above them
* Attempted to fix sound volume being high when lagging
* Chain counter no longer appears if you don't have the chain ability
* Time trial UI should no longer appear outside of time trials
* Fixed bushes allowing you to grapple onto them
* Fixed touch screen laptop users being recognized as mobile users

## Previously Undocumented
* Fixed being unable to sync to checkpoints randomly
* Fixed checkpoint colors not displaying as blue on join if you've synced to them before
* Fixed an error regarding infinitely loading to the game if you had old missions that we've removed
* If you were never assigned the ClimbVertigo mission properly while the mission was broken, you should now be rewarded it retroactively (and finally able to attain max rank)

<!-- wiki:end -->
