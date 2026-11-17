---
title: Alpha 1.31 Patch Notes
category: updates
summary: Alpha 1.31 was released on October 11, 2024 (build 149).
aliases:
  - alpha 1.31 patch notes
  - alpha 1.31
  - 1.31 alpha
  - update 1.31
  - 1.31 update
  - 1.31 patch notes
  - 1.31 changelog
tags:
  - updates
  - patch notes
  - alpha
wiki_aliases:
  - alpha 1.31 patch notes
  - alpha 1.31
  - 1.31 alpha
  - update 1.31
  - 1.31 update
  - 1.31 patch notes
  - 1.31 changelog
---

<!-- wiki:start page="Update Logs" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

Alpha 1.31 was released on October 11, 2024 (build 149).

## Changes

* Implemented several potential fixes for the memory leaks
* New setting to lock the time of day and choose what time to lock it to (client-side)
* Added a couple new interiors in Fragment
* Fixed compass sway glitching out at low framerates as well as compass sway inconsistencies
* Experimental new wall run animations
* A new party can now be created without inviting anyone by clicking on yourself
* Fixed a few bugs with parties

We still don't know why the world highlighting bug happens. We know it happens when characters are taken out of the world and placed back in, but we're pretty sure it's a Roblox issue. The parent and adornee of the Highlight object is normal when and after the character is placed back into the world, but it just decides to highlight the entire world forsome reason.

For some Windows players, maximizing certain programs and then tabbing directly into Roblox significantly improves framerate. Programs such as 'Task Scheduler' and 'Phone Link' have been confirmed to work. We have absolutely no idea why this happens. Thank you Roblox.

<!-- wiki:end -->
