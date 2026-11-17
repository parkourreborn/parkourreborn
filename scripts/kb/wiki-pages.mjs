// Which parkourreborn.wiki pages feed which knowledge docs (see sync-wiki.mjs).
//
// path      the doc under knowledge/ that holds the page's text
// title     doc title, category, aliases, tags and summary are only used when
// category  the doc is created; after that its frontmatter is yours to edit
// aliases   (aliases from the wiki are added to it, never removed)
// tags
//
// Pages left out on purpose: the wiki's own rules, style guide and copyright
// pages, the main page, and the sneak peek gallery.

export const wikiPages = {
  'A Mongoose Studio': { path: 'miscellaneous/a-mongoose-studio.md', title: 'A Mongoose Studio', category: 'miscellaneous', aliases: ['a mongoose studio', 'mongoose studio', 'parkour dev', 'developers of parkour reborn', 'studio'], tags: ['studio', 'developers'] },
  'PARKOUR Reborn': { path: 'miscellaneous/about-parkour-reborn.md', title: 'About PARKOUR Reborn', category: 'miscellaneous', aliases: ['parkour reborn', 'reborn', 'about the game', 'release date', 'visits', 'vr support'], tags: ['game', 'history'] },
  'Introductory Information': { path: 'guides/introductory-information.md', title: 'Introductory Information', category: 'guides', aliases: ['introductory information', 'beginner guide', 'new player guide', 'how to get access', 'free to play', 'free-to-play periods', 'casual or traceur', 'runners', 'cpd', 'civil protections department', 'commands', 'reset data', 'player list badges', 'day night cycle', 'jorb'], tags: ['guides', 'basics', 'lore'], infobox: false },
  'PARKOUR Reborn Wiki:About': { path: 'miscellaneous/parkour-reborn-wiki.md', title: 'PARKOUR Reborn Wiki', category: 'miscellaneous', aliases: ['wiki', 'parkourreborn.wiki', 'the wiki', 'wiki history'], tags: ['wiki', 'community'] },
  Apollo: { path: 'locations/apollo.md' },
  Artemis: { path: 'locations/artemis.md' },
  Crest: { path: 'locations/crest.md' },
  'Main Spawn': { path: 'locations/main-spawn.md' },
  'PRK Tech': { path: 'locations/prk-tech.md' },
  Tutorial: { path: 'locations/tutorial.md' },
  Vertigo: { path: 'locations/vertigo.md' },
  Zephyr: { path: 'locations/zephyr.md' },
  'Legacy Foundation': { path: 'locations/legacy-foundation.md', title: 'Legacy Foundation', category: 'locations', aliases: ['legacy foundation'], tags: ['locations', 'downtown'] },
  Nimbus: { path: 'locations/nimbus.md', title: 'Nimbus', category: 'locations', aliases: ['nimbus'], tags: ['locations'] },
  'Transitional Buildings': { path: 'locations/transitional-buildings.md', title: 'Transitional Buildings', category: 'locations', aliases: ['transitional buildings'], tags: ['locations'] },
  Neon: { path: 'districts/neon.md', title: 'Neon', category: 'districts', aliases: ['neon', 'neon dlc', 'neon city'], tags: ['districts', 'cancelled'] },
  Binoculars: { path: 'gear/binoculars.md' },
  Glove: { path: 'gear/glove.md', dropSections: ['Crafting'] },
  Grappler: { path: 'gear/grappler.md', dropSections: ['Crafting'] },
  'Mag Rail': { path: 'gear/mag-rail.md', dropSections: ['Crafting'] },
  Springhook: { path: 'gear/springhook.md', dropSections: ['Crafting'] },
  'Zipline Gear': { path: 'gear/zipline-hook-and-cable-glider.md' },
  Quickbelt: { path: 'gear/quickbelt.md', title: 'Quickbelt', category: 'gear', aliases: ['quickbelt', 'quick belt'], tags: ['gear', 'utility'] },
  'Runner Phone': { path: 'gear/runner-phone.md', title: 'Runner Phone', category: 'gear', aliases: ['runner phone', 'phone'], tags: ['gear', 'key item'] },
  Marketplace: { path: 'gear/marketplace.md', title: 'Marketplace', category: 'gear', aliases: ['marketplace', 'item list'], tags: ['gear', 'items'] },
  Connor: { path: 'npcs/connor.md' },
  Derek: { path: 'npcs/derek.md' },
  Harper: { path: 'npcs/harper.md' },
  Julian: { path: 'npcs/julian.md' },
  Mantra: { path: 'npcs/mantra.md' },
  Marcel: { path: 'npcs/marcel.md' },
  Mike: { path: 'npcs/mike.md' },
  Petra: { path: 'npcs/petra.md' },
  Dirwik: { path: 'districts/dirwik.md' },
  Downtown: { path: 'districts/downtown.md' },
  Fragment: { path: 'districts/fragment.md' },
  Stack: { path: 'districts/stack.md' },
  'Dirwik/Sites': { path: 'districts/dirwik-sites.md', title: 'Dirwik Sites', category: 'districts', aliases: ['dirwik sites', 'dirwik buildings', 'dirwik points of interest'], tags: ['districts', 'dirwik', 'sites'] },
  'Downtown/Sites': { path: 'districts/downtown-sites.md', title: 'Downtown Sites', category: 'districts', aliases: ['downtown sites', 'downtown buildings', 'downtown points of interest'], tags: ['districts', 'downtown', 'sites'] },
  'Fragment/Sites': { path: 'districts/fragment-sites.md', title: 'Fragment Sites', category: 'districts', aliases: ['fragment sites', 'fragment buildings', 'fragment points of interest'], tags: ['districts', 'fragment', 'sites'] },
  'Stack/Sites': { path: 'districts/stack-sites.md', title: 'Stack Sites', category: 'districts', aliases: ['stack sites', 'stack buildings', 'stack points of interest'], tags: ['districts', 'stack', 'sites'] },
  Locations: { path: 'districts/map-overview.md' },
  Corporations: { path: 'lore/corporations.md', title: 'Corporations', category: 'lore', aliases: ['corporations', 'companies', 'brands'], tags: ['lore', 'corporations'] },
  Cosmetics: { path: 'cosmetics/cosmetics-guide.md', title: 'Cosmetics Guide', category: 'cosmetics', aliases: ['cosmetics guide', 'how cosmetics work', 'night market', 'prefer slips', 'pity'], tags: ['cosmetics', 'skins', 'bags'], handler: 'cosmetics' },
  Crafting: { path: 'crafting/crafting-resources.md', title: 'Crafting Resources', category: 'crafting', aliases: ['crafting resources', 'all resources', 'resource list', 'crafting guide'], tags: ['crafting', 'resources'], handler: 'crafting' },
  Currency: { path: 'progression/currency-guide.md', title: 'Currency Guide', category: 'progression', aliases: ['currency guide', 'how to get credits', 'how to get tokens'], tags: ['progression', 'currency'] },
  Checkpoints: { path: 'locations/checkpoints.md', handler: 'checkpoints' },
  'Easter Eggs & Badges': { path: 'easter-eggs/easter-eggs-and-badges.md', title: 'Easter Eggs and Badges', category: 'easter-eggs', aliases: ['easter eggs and badges', 'all easter eggs', 'badges', 'roblox badges', 'graffiti', 'billboards', 'posters'], tags: ['easter-eggs', 'badges', 'graffiti'], handler: 'gallery' },
  Missions: { path: 'missions/missions-guide.md', title: 'Missions Guide', category: 'missions', aliases: ['missions guide', 'all missions', 'quests'], tags: ['missions', 'quests'] },
  Movement: { path: 'mechanics/movement-guide.md', title: 'Movement Guide', category: 'mechanics', aliases: ['movement guide', 'all movement', 'abilities', 'movement abilities', 'combat', 'dropkick', 'techniques'], tags: ['movement', 'mechanics', 'abilities'], handler: 'abilities' },
  'Movement/Community Techniques': { path: 'mechanics/community-techniques.md', title: 'Community Techniques', category: 'mechanics', aliases: ['community techniques', 'community techs', 'tech list wiki'], tags: ['movement', 'techniques'], handler: 'abilities' },
  Multipliers: { path: 'progression/multipliers-and-combos.md', title: 'Multipliers and Combos', category: 'progression', aliases: ['multipliers', 'xp multiplier', 'combo multiplier', 'combos'], tags: ['progression', 'xp', 'combo'] },
  Races: { path: 'time-trials/races-guide.md', title: 'Races Guide', category: 'time-trials', aliases: ['races guide', 'all time trials', 'challenges list', 'pvp races'], tags: ['time-trials', 'races', 'challenges'], handler: 'races' },
  Recurrences: { path: 'gameplay/recurring-objects.md', title: 'Recurring Objects', category: 'gameplay', aliases: ['recurring objects', 'objects', 'scenery', 'structures', 'dummy'], tags: ['gameplay', 'objects'] },
  'Spawn Regions': { path: 'gameplay/spawn-regions.md', title: 'Spawn Regions', category: 'gameplay', aliases: ['spawn regions', 'respawn transceivers', 'terminals'], tags: ['gameplay', 'respawning'] },
  Store: { path: 'progression/store-guide.md', title: 'Store Guide', category: 'progression', aliases: ['store guide', 'game passes', 'developer products'], tags: ['progression', 'store', 'robux'], handler: 'store' },
  'Tab Menu': { path: 'guides/tab-menu.md' },
  Technical: { path: 'mechanics/technical-details.md', title: 'Technical Details', category: 'mechanics', aliases: ['technical details', 'technical', 'game engine details'], tags: ['mechanics', 'technical'] },
  'The Net': { path: 'gameplay/the-net.md' },
  'Upcoming Content': { path: 'miscellaneous/upcoming-content.md', infobox: false, handler: 'upcoming' },
  'Update Logs/Seasonal': { path: 'updates/seasonal-events.md', title: 'Seasonal Events', category: 'updates', aliases: ['seasonal events', 'halloween event', 'christmas event', 'hidden harvest', 'hidden harvest pumpkins', 'pumpkin locations', 'jack o lanterns', 'holiday event'], tags: ['updates', 'seasonal', 'events'], handler: 'seasonal' },
};

// Split out of Upcoming Content into a doc of their own.
export const devlogsDoc = {
  path: 'miscellaneous/devlogs.md',
  title: 'Developer Devlogs',
  category: 'miscellaneous',
  summary: 'Monthly text devlogs from the A Mongoose Studio Discord about what the team is working on for Beta.',
  aliases: ['devlogs', 'devlog', 'dev log', 'latest devlog', 'progress update', 'what are the devs working on', 'beta progress', 'latest news'],
  tags: ['updates', 'devlogs', 'beta'],
};
