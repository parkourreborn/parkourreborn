---
title: Alpha 1.54 Patch Notes
category: updates
summary: Alpha 1.54 was released on September 19, 2025 (build 191).
aliases:
  - alpha 1.54 patch notes
  - alpha 1.54
  - 1.54 alpha
  - update 1.54
  - 1.54 update
  - 1.54 patch notes
  - 1.54 changelog
tags:
  - updates
  - patch notes
  - alpha
wiki_aliases:
  - alpha 1.54 patch notes
  - alpha 1.54
  - 1.54 alpha
  - update 1.54
  - 1.54 update
  - 1.54 patch notes
  - 1.54 changelog
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.54 was released on September 19, 2025 (build 191).

## Movement Tweaks
We made a few changes to movement! Let us know how they feel:

* Wallruns now have a 200ms input buffer
* Rolling now carries your chain
* Rolling is now almost frictionless
* Powersliding off of a ledge has been nerfed

## Springhook Changes
Springhook felt bad if you used it without holding an input keybind. You would just lose all of your speed and not go very high up with it. Now, you will be launched upwards according to your vertical and horizontal velocity!

## Optimizations
* Patched a few memory leaks
* Optimized many props by reducing their draw calls or tri count
* Optimized collisions on some trees
* Removed hundreds of unnecessary lights causing lag in Neon Bold and Highrise areas
* Removed CanQuery from ~25,000 objects without collision
* Removed CastShadow and Collision from thousands of small detail objects

## Miscellaneous Tweaks
* Moved one of Connor’s dumpster locations to be more visible (it didn’t go far!)
* Added new SFX for vaulting, springboarding, and landing on fences
* Added footstep SFX to many gravel spots in Dirwik where it was not working before

## Bug Fixes
* Fixed infinite loading
* Fixed Token gifting not showing who you’re gifting Tokens to
* Fixed Token gifting not giving the Tokens to the selected user sometimes (join our server and open a ticket if you experienced this issue!)
* Fixed daily rewards highlighting improperly
* Fixed map pins not always updating according to your UI theme
* Fixed couches and chairs sitting animations being off
* Fixed new fly glitch
* Fixed many miscellaneous environment errors
{{Hotfix|date=September 19, 2025}}
* A hotfix to patch not being able to teleport from the map.

<!-- wiki:end -->
