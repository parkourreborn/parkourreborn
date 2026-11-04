---
title: Wasans Score and Tiers
category: wasans
summary: Each trial scores 0 (bronze) to 0.300 (platinum) to 1.000 (the world record); a player's Wasans score is the average over every counted trial, and it decides their tier and Discord role.
aliases:
  - wasans score
  - how wasans score works
  - wasans tiers
  - wasans ranks
  - score tiers
  - router tier
  - elite tier
  - master tier
  - diamond tier
  - number in username
tags:
  - wasans
  - score
  - tiers
  - roles
  - leaderboard
questions:
  - how does the wasans score work
  - what are the wasans tiers
  - what score do i need for elite
  - what does the number in people's names mean
  - why did my score go down
  - does an unplayed trial count
related:
  - wasans/wasans-overview
  - wasans/wasans-medal-cutoffs
  - wasans/wasans-discord-and-staff
  - wasans/wasans-origin-and-lore
---

## How the score works

* **Each trial scores 0 to 1.** A bronze time scores 0.000, platinum scores 0.300, and the current world record scores 1.000. Slower than bronze is 0. Between bronze and platinum the score rises in a straight line up to 0.300. Past platinum it climbs on a curve, so the last tenths of a second near the world record are worth the most.
* **Your score is the average.** Your trial scores are averaged across every active trial. A trial you have not submitted counts as 0, so a time on every trial always helps.
* **It moves when world records move.** Everything is measured against the current world records. When a new world record is approved, everyone's score on that trial is recalculated, usually a little lower.
* Higher is better. 1.000 would mean holding every current world record.

The Wasans bronze and platinum cutoffs for each trial are listed in Wasans Medal Cutoffs.

The formula for one trial, with the current world record time (wr), the run's time, and that trial's Wasans bronze and platinum cutoffs:

* slower than bronze: 0
* between platinum and bronze: 0.3 × (bronze − time) ÷ (bronze − platinum)
* platinum or faster: 0.3 + 0.7 × ((wr ÷ time)³ − (wr ÷ platinum)³) ÷ (1 − (wr ÷ platinum)³)
* a time faster than the world record would be the new record, so it scores 1

## The number in people's names

The number in people's Discord nicknames is their Wasans score, from their time-trial results compared to the current world records.

## Tiers

Your score puts you in a tier. Each tier is also a role in the Discord server, given out automatically. You are in the highest tier whose minimum you have reached.

| Tier | Discord role | Score |
| :---- | :---- | ----: |
| Router | @router | 0.900+ |
| Elite | @elite | 0.800+ |
| Master I | @master I | 0.700+ |
| Master II | @master II | 0.600+ |
| Master III | @master III | 0.500+ |
| Diamond | @diamond | 0.400+ |
| Platinum | @platinum | 0.300+ |
| Unranked | @unranked | Everyone |

A Platinum tier score (0.300) means about platinum on every trial on average.

## When trials are added, removed or changed

Trials can be added, retired or changed (when a course changes in the game). Each change has a 7-day grace period:

* A newly added trial does not count toward anyone's average until 7 days after it was added.
* A removed trial keeps counting as before for 7 days, then drops out of the average entirely.
* A changed trial: runs made on the old version keep counting for 7 days after the change, then only runs on the current version count.

Runs are never deleted by any of this; only whether they count changes.

## Tools for your score

* The Calculator on the Wasans website lets you type what-if times ("what would 2% off my PB be worth?", "what if I got platinum on a trial I haven't run?") and put two players side by side, trial by trial.
* Your profile shows your score over time, your rank over time and your best rank.
