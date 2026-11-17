---
title: Developer Devlogs
category: miscellaneous
summary: Monthly text devlogs from the A Mongoose Studio Discord about what the team is working on for Beta (July to November 2026).
aliases:
  - devlogs
  - devlog
  - dev log
  - latest devlog
  - progress update
  - what are the devs working on
  - beta progress
  - foundry
  - plates
  - swing poles
  - ability trials
tags:
  - updates
  - devlogs
  - beta
---

<!-- wiki:start page="Upcoming Content" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->

The developers post a text devlog in the PARKOUR Reborn Discord around the 10th of each month. They describe work in progress for the Beta update and never include release dates.

## 10 November 2026 Devlog

Happy November! Time for a progress update :)

Playerlist Rework + Plates 🪪

The playerlist has finally received a revamp! Several bugs have been fixed and the UI has overall been tweaked in a few ways to look much nicer. Additionally, we've added tweens (animations) for the UI to feel clean. And, with that, of course, comes the potential for a new type of cosmetic: plates!

Plates are a way to decorate your playerlist entry. They also appear above your head when other players look at you. Some are even animated! They can be purchased directly from the shop with Tokens, provided they are in the current shop rotation. If you've played Legacy recently, they should be very familiar to you already, the concept is very similar.

Foundry Progress 🚧

Foundry is coming along very well thanks to Fanatix! It is currently a very long, very fun tower with plenty of dynamic elements. However, we will still not disclose too much; it is best experienced blind. Just know: we're excited for you all to experience it, like the rest of Beta.

Missions and Quests 🏴

Further progress on the Introductory quest rework has been made! We're almost done, with only a few features left to patch to finish this questline up, and a few more dialog trees to consider and write out. We're confident that the new Introductory quest should prepare the player much more than before, equipping them with abilities, a basic gear, and introducing them to more of the game's mechanics before throwing them into the world. Also, it's fun!

Quality of Life ✨

Lately, we have had a lot more work be done in a short amount of time thanks to Lunari! She has powered through and started to pick up on a lot of work that has remained unfinished for months. We're happy to bring many quality of life features to Beta, such as lighting improvements, many bug fixes, improvements to ladders and pipes, the aforementioned playerlist features, and mission enhancements! She has much left planned to accomplish before Beta and we are very pleased to have her on the team 💜

Thank you to everyone who continues to play the game and support us. The end of Beta's development hell seems to be in sight now, even if we aren't quite at the finish line yet. Things have been starting to come together one feature at a time, and hopefully the remaining wait won't be too unbearable. ❤️

## 10 October 2026 Devlog

Hello! It's the 10th! Happy October!

Foundry Progress ⚙️

Foundry, Stack's challenge tower, has been shaping up nicely thanks to the work put in by Fanatix! We're all starting to get quite excited as we see the tower come together. We still have lots of work under our belt, but the building work has progressed significantly! At this time, we're waiting on the required scripting part of Foundry to come in. We have some puzzle features done, but many more that are underway, which will be what separates the Foundry experience from any other part of the game, currently.

Swing Poles!?

We're adding swing poles to Reborn! In fact, they've already been done for a while in Beta! Some very keen-eyed members spotted glimpses of their models in our previous teasers, which were overlooked before we sent them out. These swing poles will be usable as part of the game's base kit, just like other dynamic props such as pipes. We hope you're as satisfied as we are with them, we took the time to make them feel just right. We still have a few minor tweaks to make to them, but we're overall happy with where they are!

Stack Work 🚧

With more work on Foundry being done, we've taken the time to touch up a few areas of Stack. We want to continue working on problematic areas of Stack as long as we have the time to do so. For now, this is confined to a few buildings and a few areas in Stack; we don't intend for it to progress to a full rework like Fragment did. (But who knows?)

Halloween 🎃

We've been working on making Halloween automatic every year! We plan to release an update for you guys with all of last year's Halloween effects and gimmicks. This time, things are automatically updated every year during October so we won't have to lose any more time manually pushing everything next year. Yay!

We are so grateful for your patience during this update drought. We're just as eager as you to get it out, but there are still many things unfinished unfortunately. We hope that you can agree the wait will be worth it once Beta is finally ready! ❤️

## 10 September 2026 Devlog

Hi everyone! It's devlog time again! Yay!

District Popup Animations🐦‍⬛

During the month, I took the time to learn how our district popups are animated (for Downtown and Fragment). I then vastly improved the system so that the animations are much easier to make for us, taking many fewer hours to complete. Because of this, I was able to complete new animations for Dirwik and Stack, as well as some minor improvements to the other districts. Let us know if that's something you're interested in seeing as a sneak peek, or if you'd rather it be a surprise for Beta!

Ability Trial Reworks Finished🎖️

Over the month, we finalized and refined all of the ability trials in the game! Every single one has been improved in one way or another, whether it be completely moving and redesigning the entire trial, or just updating it with our new tutorial systems. We're confident that these changes will aid the player much more than before, and they shouldn't need any further help from outside sources to understand how abilities work. Importantly, both Chain and Coil have now been made into ability trials, so players can learn how to properly use them!

Quest Progress❓

More progress on new quests have been made! This is important as quests are our solution for ability and gear acquisition. Players will be guided through unique and fun interactions with NPCs in order to discover and unlock abilities and gear. While we don't expect all gears' acquisition to be transferred over to quests before Beta is released, we should be able to get a few in! The reason we probably won't be able to have all of them done is because missions, NPCs, and questlines all take a lot of time and effort to plan out, write, add supporting features, implement, and test! However, we hope these will be well received, and they are a crucial part of our plan to fix the game's poor progression while adding new content!

Of course, we have been hard at work on many other features not mentioned above. You know about some (Foundry progress, Fragment renovations, a ton more optimizations), some we cannot disclose at this time, and some aren't big enough to write a paragraph about (many improvements to glass shattering). The team has been up and running well lately and we made a lot of progress toward Beta this month! Let's hope to keep up the momentum for next month.

As always, your patience and support is greatly appreciated. Thank you all for believing in us. ❤️

## 12 August 2026 Devlog

Hi everyone, it's time for another update on development! Let's get straight into it!

As usual, our  have known about most of these things for much longer, and have far more details about development. To be the first to hear about news and to have closer communication with the developers, consider subscribing!

Major Map Optimizations 🏙️

As you may have seen, Instance has been hard at work creating a new render distance setting! While we cannot allow players to control the streaming target radius due to Roblox limitations, we can still control what structures are persistent at any given moment. Buildings that are outside of our persistence radius are replaced with a super low-poly blockout version of this which is generated on server start. Take a look here:

In a poll, all (9) responding playtesters reported better FPS, with 88% (8) being fully satisfied with the FPS improvements 🐐 Let's hope it translates well into the main game with larger servers!

Fragment Rework 🏙️

Fragment is continuing to receive more and more work by our volunteer builder Fanatix! His work is fantastic and has completely transformed Fragment into a place that you really want to find yourself in. He's still not done and is continuing to refine places that he's not satisfied with. Everyone please say "thank you " because we honestly don't deserve him he's great :]
Additionally, we'll be replacing a few of Fragment's time trials due to their areas being changed so dramatically. Can you guess which ones? Guess you'll have to find out later. Even we don't really know yet!

Ability Trial Reworks 👟

We have completed our first few full reworks of the ability challenges - or should I say, ability trials! Instead of challenges, these are now much more geared towards being tutorials. Stress no more about time limits, they're gone! You're also given significantly more information about how to do moves, and moves are required to be completed before you can finish the trial - ensuring you actually know how to use them. We still have several ability trials left to rework. This is one of our steps toward making the game friendlier, more accessible, and more rewarding for newer players.

Team Updates 🤝

I have been on vacation for two weeks, slowing down some management-related parts of development and some development tasks that I specifically work on. Due to some internal complications, one of our developers has ceased working temporarily and was unable to complete any work this month. We are actively addressing this and hope to have them back to work shortly!

We appreciate everyone's patience. We hope these devlogs help you feel more in the loop about what's going on, and we'll see you again next month with another! Beta still seems a decent ways out, but once it arrives, it will be something really special. ❤️

## 10 July 2026 Devlog

Hi guys, we're interested in trying something new: monthly text-based devlogs to keep you all updated on what's generally happening with development. While @Premium Members get a monthly QnA session with loads of details, gameplay footage, and directly answering almost any question they have, we wanted to provide a little something more than sneak peeks to the rest of you! Please note that these devlogs will not disclose release estimations or dates, and may contain however much or however little information we wish to divulge. Anyway, let's get on with it! ☄️

Reworking Races 🥇

Time trials, advancement challenges, ability challenges, and PvP races all fall under the "Races" category. We are adding a new race type, of which we will not yet disclose. Rornor, the developer in charge of this, decided to go ahead and rework how races are structured and built on the backend. This means that players should not notice any difference, but the code is fully rewritten.
Why? This helps keep everything cohesive and organized, helping with very easily adding new race types in the future. It also simplifies how races are built, making it easier for us to keep track of them all and to add new ones on a whim. This rework has taken quite some time, but is working nicely now and we're excited to put it to good use! We're always looking to rewrite systems to have a more clean and maintainable codebase.

Fragment Renovations 🏙️

We are very grateful to have recently onboarded a new volunteer onto the team, who you might recognize, @FanatiX #1 Verna Fan! He chose to start working on making Fragment prettier, more interesting, and more fun to play in! Fragment is one of those districts that I personally have overlooked for some time. In hindsight, it really needs some more love. It's nice to be able to say that I hardly recognize some spots in Fragment, and it feels completely fresh thanks to Fanatix's work!

More Optimizations 📈

You're probably tired of hearing about this, but yes, we are working on even more optimizations. I was recently made aware of a plugin to allow you to add custom collision to mesh props, thank you wae! Without getting too technical, this essentially reduces the number of parts that are in the workspace since some of our meshes had collision made from transparent parts. This should help a little bit with frame times. I also have optimized a bunch of billboards into meshes which should help a little with frame times too. On the scripting side, we've identified a few concerning areas for memory and FPS that we're patching up as well, but I don't have more details at this time.

Wait, how's Stack's tower going?! ⛪

We have been working on Stack's tower, which is named Foundry! It has indeed been taking longer than predicted, since we wanted to add some new and exciting features to the tower, which we don't want to spoil yet. All you need to know is that we finally got some working systems down that can be used in the tower. New props are being worked on for Stack interiors, which will help Foundry feel more believeable. We've made some progress on a few more rooms and fleshed out some more ideas that we'll implement soon as well.

Other Miscellaneous Work 🐛

We recently had to fix a bug related to players being unable to load into the lobby game. We've also had to fix a bug related to respawning no longer working properly, and we're aware of a bug causing VIP status to not always detect properly for some players. These kind of miscellaneous bugs always delay us from working on the big exciting features that we want, but of course they are critical to address first.

Thank you everyone for your patience as we work on the next updates for this game. Many of our team members are taking time off during the summer for holidays and vacation, but we're still trying to get things done at a reasonable pace.

<!-- wiki:end -->
