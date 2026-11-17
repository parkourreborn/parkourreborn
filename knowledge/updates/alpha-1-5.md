---
title: Alpha 1.5 Patch Notes
category: updates
summary: Alpha 1.5 was released on August 4, 2025 (build 185).
aliases:
  - alpha 1.5 patch notes
  - alpha 1.5
  - 1.5 alpha
  - update 1.5
  - 1.5 update
  - 1.5 patch notes
  - 1.5 changelog
tags:
  - updates
  - patch notes
  - alpha
wiki_aliases:
  - alpha 1.5 patch notes
  - alpha 1.5
  - 1.5 alpha
  - update 1.5
  - 1.5 update
  - 1.5 patch notes
  - 1.5 changelog
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.5 was released on August 4, 2025 (build 185).

## Highrise
Fragment’s Highrise sector has been unlocked for exploration!

## New Gear & Models
Gear now appears physically on your body, and can be toggled individually within the loadout menu! The following gear and their respective upgrades have been added:
* Mag Rail (Augment): With rail-bound magnetic coils strapped to your arm and dangerous strides in modern technology, you can propel yourself by creating speed out of thin air and bounce off any nearby surfaces.
  * Launch Rail I and II are now craftable!
* Cable Glider I (Compound): A newly purchasable upgrade to the well known Zipline Hook that allows the user to glide upwards on ziplines for a short while before overheating.

## Apollo Rework
Apollo has been reworked! It focuses on being both an interior and exterior climb that’s accessible at any given point!

## Dirwik Renovations
Dirwik has received major changes to its overall structure of buildings, impacting the district’s overall flow in a positive manner! Particularly, its southern half has been the most impacted.

## Neon Bold Revamp
The area surrounding the Neon Bold time trial has been revamped! The time trial itself also has received changes to its medal times, as well as the start and end points of it.

## Environmental Improvements
Tons of areas on the map have been detailed and/or improved in some form, including the addition of multiple new props! Many previously barren spots that lead to nowhere now have paths and such; this includes interiors as well! Additionally, a multitude of environment errors have been fixed.

## Spectating
If someone is within fog of war segments you have discovered, you’ll be able to click on them in the player list and select ‘Spectate’ to look into their Point of View!

## Time Trial Rebalances
These time trials have received changes to either their times, start/end points, or both:
* Neon Bold: 20 -> 25 (Platinum) {{!}} start/end
* Solar: 19.5 -> 18 (Platinum)
* Umbrel: 21 -> 23 (Platinum) {{!}} 24 -> 27 (Gold) {{!}} 28 -> 31 (Silver) {{!}} 32 -> 35 (Bronze) {{!}} end
* Glass: 10.25 -> 12.5 (Platinum) {{!}} 12 -> 17 (Gold) {{!}} 16 -> 23 (Silver) {{!}} 20 -> 30 (Bronze) {{!}} end

## Bug Fixes
Hopefully fixed all of the remaining major memory leaks this time.

* Fixed the one-way elevator at Vertigo
* Fixed a grate material in Fragment not having the infinite wall climb property
* Fixed being randomly forced to run forward with no input
* Fixed animation/movement errors happening if you immediately pressed play after loading in, notably with forms of vaulting and ledge grabbing
* Fixed the zipline riding animation breaking if you grappled during it
* Fixed the dash animation persisting if you stood still after initiating it
* Fixed the underside of certain grate textures being invisible
* Fixed loiters being non-interactable if a player left while interacting with one
* Fixed randomly clutching onto an object (pipes, ladders, etc.) from way farther than intended
* Fixed certain blue tarps on the map being non-collidable
* Fixed chat bubbles appearing way above your head
* Fixed the Grappler’s rope length not updating properly depending on the upgrade when equipped
* Fixed the Grappler’s rope attaching onto a pane of broken glass way up in the sky
* Fixed being able to open up map view in the title screen through its menu button
* Fixed swinging into a pane of breakable glass canceling out all of your velocity
* Fixed spawning inside of buildings and/or falling to your death upon joining due to unloaded assets
* Fixed the chain counter not properly breaking when dying
* Fixed Static Chaining: performing a move which set your velocity to 0 while having chain active, then repeatedly jumping
* Fixed freefalling when/where you shouldn’t
* Fixed sliding on slopes varying in speed depending on your FPS
* Fixed the shadows casted by your avatar accessories disappearing permanently after dying once
* Fixed constantly taking damage and regenerating health back if your body fell past the death barrier while already dead
* Fixed the Grappler not being able to pull you after performing a move which set your velocity to 0
* Fixed the climbing animation for objects not being aligned with their physical angle
* Fixed certain pieces of text clipping into things that were beneath them
* Fixed the UI effects of talking to an NPC persisting if you reset during the interaction
* Fixed window lights not being in tandem with your own time
* Fixed fog of war in map view not updating
* Fixed dragging and dropping resources in the crafting menu not working sometimes
* Fixed not being able to craft after specific scenarios occurred
* Fixed music not muting on focus loss if the setting was enabled

## Miscellaneous
* Moved the Dropper challenge into the new interior for the building it was on top of
* Robloxian 1.0 (Blocky) is now forced by default and can be manually disabled in settings
* Removed the tutorial menu for high jump opening when pressing right-Alt
* Swinging no longer sinks you in-place when grounded, allowing you to move around normally
* Player cards’ radius in which they start to appear at has been slightly increased
* Placement times in PvP races now visually show down to milliseconds (3 decimals)
* Loitering while the ‘Return to Spawn’ debug option is active will automatically cancel it to prevent a weird bug from occurring
* Disabled loitering while in a race to prevent a weird bug from occurring
* Going out-of-bounds with a combo active will now end it
* Sprayed lots of graffiti for more Important People™️ plus general updates to graffiti previously placed
* Added VFX to the Zipline Hook and Grappler
* Put flowers in flower beds lol
* Vertigo has its name on itself again
* Made the road you could walk on in Fragment non-collidable due to players abusing it for insane combos
* Grate material now properly lets you scale it indefinitely instead of a very high finite number of “steps”
* The ‘Hide UI’ keybind now hides all UI elements (with the exception of game information at the bottom)
* The accent color on certain props now matches with the surrounding area instead of using white always
* Leaving the crafting menu while having resources slotted into it will eject them automatically
* Most resources now have a proper model instead of using the placeholder cube
* Artemis’ holographic logo effect at its light pole is now shared with the other challenge towers
* Improved LOD on a few props
* Bucket.

## Previously Undocumented
* Fixed your viewmodel appearing in first-person when certain actions were performed
* Removed a random invisible part in Downtown and fixed an extended hitbox at Vertigo
* Fixed Downtown Gish’s door being blocked by the very wall it’s attached to
* Finally attached that one pipe inside a warehouse within Downtown properly
* The Binoculars now display what level of zoom they are at when scrolling

<!-- wiki:end -->
