import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreForTime, tierInfo, timeGaps, timeNeededForScore, xpProgress } from './reborn-ai/calculators.ts';
import { extractEntities, findPlayers, findTrials } from './reborn-ai/entities.ts';
import { planTools, ruleRoutes } from './reborn-ai/planner.ts';
import { nextTier, tierForScore, timeForScore, wasansScore } from './wasans-data.ts';

const players = ['jahz', 'sinydrol', '-Fhyre-', 'K15A6', 'RumbleStumpleton', 'flow'];

test('trials are found by name, ordinary words only with trial context', () => {
  assert.deepEqual(findTrials('wr on crystal and neon bold'), ['Crystal', 'Neon Bold']);
  assert.deepEqual(findTrials('whats the rustbelt record'), ['Rust Belt']);
  assert.deepEqual(findTrials('how do i grip the wall'), []);
  assert.deepEqual(findTrials('top 10 on grip'), ['Grip']);
  assert.deepEqual(findTrials('vestibule'), ['Vestibule']);
});

test('entities pull out times, scores, levels and who is asked about', () => {
  const run = extractEntities('what wasans score is 7.2 on crystal');
  assert.deepEqual(run.trials, ['Crystal']);
  assert.deepEqual(run.times, [7.2]);

  assert.equal(extractEntities('what tier is a 0.65 score').score, 0.65);
  assert.deepEqual(extractEntities('how much xp from level 20 to 35 with x1.5 multiplier and vip').levels, [20, 35]);
  assert.equal(extractEntities('how much xp from level 20 to 35 with x1.5 multiplier').multiplier, 1.5);
  assert.equal(extractEntities('lvl 40 and 50% through, vip').percent, 50);
  assert.equal(extractEntities('lvl 40 and 50% through, vip').vip, true);
  assert.equal(extractEntities('top 5 on glass').top, 5);
  assert.equal(extractEntities('what is my pb on crystal').me, true);
  assert.equal(extractEntities('what is a wallbounce').me, false);
  assert.equal(extractEntities('top mag combo').combo, 'mag');
  assert.deepEqual(extractEntities('when did 1.73 come out').times, []);
  assert.equal(extractEntities('runs this month').range, '30d');
});

test('player names are matched carefully', () => {
  assert.deepEqual(findPlayers('what are jahz pbs', players), ['jahz']);
  assert.deepEqual(findPlayers('how good is K15A6', players), ['K15A6']);
  assert.deepEqual(findPlayers('is rumblestumpleton the goat', players), ['RumbleStumpleton']);
  // "flow" is a player and a trial and a word: needs player context.
  assert.deepEqual(findPlayers('how does combo flow work', players), []);
  assert.deepEqual(findPlayers("what is flow's rank", players), ['flow']);
});

test('a short player name next to a run word counts, apostrophe or not', () => {
  // These used to work only when an unrelated "'s" (as in "what's") was present.
  assert.deepEqual(findPlayers('whats jahz time on ascension', players), ['jahz']);
  assert.deepEqual(findPlayers('jahz times on glass?', players), ['jahz']);
  assert.deepEqual(findPlayers('what trials has jahz done', players), ['jahz']);
  assert.deepEqual(findPlayers('what did jahz get on crystal', players), ['jahz']);
  assert.deepEqual(findPlayers('jahz best on celsius', players), ['jahz']);
  // "time" on its own, or "time trial", is not a sign of a player.
  assert.deepEqual(findPlayers('is there a random time trial', [...players, 'random']), []);
  assert.deepEqual(findPlayers('how far can i jump in time', [...players, 'far']), []);

  const text = 'whats jahz time on ascension';
  const entities = extractEntities(text, players);
  const calls = planTools({ routes: ruleRoutes(text, entities).routes, entities, message: text, query: text, maxKnowledge: 10 });
  assert.deepEqual(calls.find((call) => call.name === 'get_player')?.args, { player: 'jahz' });
  assert.deepEqual(calls.find((call) => call.name === 'get_trial_leaderboard')?.args, { trial: 'Ascension', limit: 3, player: 'jahz' });
});

test('keyword routes cover the new data', () => {
  const routes = (text) => ruleRoutes(text, extractEntities(text, players)).routes.sort();
  assert.deepEqual(routes('hi'), []);
  assert.deepEqual(routes('wr on crystal'), ['records']);
  assert.deepEqual(routes('top 10 on crystal'), ['leaderboards']);
  assert.ok(routes('what are jahz pbs').includes('players'));
  assert.ok(routes('what is my rank').includes('players'));
  assert.ok(routes('what wasans score is 7.2 on crystal').includes('calculator'));
  assert.ok(routes('how much xp to level 50').includes('calculator'));
  assert.ok(routes('show me recent runs').includes('stats'));
  assert.ok(routes('top mag combo').includes('leaderboards'));
  assert.deepEqual(routes('how do i wallbounce'), ['game_knowledge']);
  assert.equal(ruleRoutes('show me my inventory', extractEntities('')).handling, 'unsupported');
});

const allCalls = (text, routes) => planTools({ routes, entities: extractEntities(text, players), message: text, query: text, maxKnowledge: 10 })
  .map((call) => `${call.name} ${JSON.stringify(call.args)}`);
// Leaves out the small guide search that rides along with every live lookup.
const plan = (text, routes) => allCalls(text, routes).filter((call) => !call.endsWith(',"limit":3}') || !call.startsWith('search_knowledge'));

test('a small guide search rides along with live lookups, a full one stands alone', () => {
  assert.deepEqual(allCalls('wr on crystal', ['records']), ['get_world_records {"trial":"Crystal","limit":4}', 'search_knowledge {"query":"wr on crystal","limit":3}']);
  assert.deepEqual(allCalls('how does the wasans score work', ['calculator']), ['search_knowledge {"query":"how does the wasans score work","limit":10}']);
  assert.deepEqual(allCalls('hi', []), []);
});

test('the planner picks the tools a question needs', () => {
  assert.deepEqual(plan('wr on crystal', ['records']), ['get_world_records {"trial":"Crystal","limit":4}']);
  assert.deepEqual(plan('who has the most wrs', ['records']), ['get_world_records {"limit":25,"summary":true}']);
  assert.ok(plan('crystal wr history', ['records']).includes('get_wr_history {"trial":"Crystal"}'));
  assert.deepEqual(plan('top 5 on glass', ['leaderboards']), ['get_trial_leaderboard {"trial":"Glass","limit":5}']);
  assert.deepEqual(plan('where do i place on crystal leaderboard', ['leaderboards']), ['get_trial_leaderboard {"trial":"Crystal","limit":10,"player":"me"}']);
  assert.deepEqual(plan('top mag combo', ['leaderboards']), ['get_combo_leaderboard {"category":"mag","limit":10}']);
  assert.deepEqual(plan('overall leaderboard', ['leaderboards']), ['get_overall_leaderboard {"limit":10}']);
  assert.deepEqual(plan('what are jahz pbs', ['players']), ['get_player {"player":"jahz"}']);
  assert.ok(plan('what is my weakest trial', ['players']).includes('get_player_analytics {"player":"me"}'));
  assert.ok(plan('what wasans score is 7.2 on crystal', ['calculator']).includes('wasans_score {"trial":"Crystal","time":7.2}'));
  assert.ok(plan('what time do i need for a 0.8 score on crystal', ['calculator']).includes('time_for_score {"trial":"Crystal","score":0.8}'));
  assert.deepEqual(plan('what tier is 0.65 score', ['calculator']), ['tier_for_score {"score":0.65}']);
  assert.deepEqual(plan('xp from level 20 to 35', ['calculator']), ['xp_progress {"level":20,"target":35,"vip":false}']);
  assert.deepEqual(plan('recent runs on glass', ['stats']), ['get_recent_runs {"trial":"Glass","limit":8}', 'get_trial_stats {"trial":"Glass","range":"30d"}']);
  assert.deepEqual(plan('how do i wallbounce', ['game_knowledge']), ['search_knowledge {"query":"how do i wallbounce","limit":10}', 'search_techs {"query":"how do i wallbounce","exact":true,"limit":4}']);
});

test('wasans scores match the site formula', () => {
  assert.equal(wasansScore('Crystal', 5.9, 5.951), 1);
  assert.equal(wasansScore('Crystal', 30, 5.951), 0);
  assert.equal(Number(wasansScore('Crystal', 17.75, 5.951).toFixed(3)), 0.15);
  assert.equal(wasansScore('Crystal', 10.5, 5.951).toFixed(3), '0.300');
  const mid = wasansScore('Crystal', 7, 5.951);
  assert.ok(mid > 0.3 && mid < 1);
  assert.ok(Math.abs(wasansScore('Crystal', timeForScore('Crystal', 0.75, 5.951), 5.951) - 0.75) < 1e-6);
  assert.equal(tierForScore(0.65).name, 'Master II');
  assert.equal(tierForScore(0.95).name, 'Router');
  assert.deepEqual(nextTier(0.72), { name: 'Elite', min: 0.8, needed: 0.08 });
  assert.equal(nextTier(0.95), null);
});

test('calculators hand back finished, formatted numbers', () => {
  const run = scoreForTime('Crystal', 7, 5.951);
  assert.equal(run.time, '7.000');
  assert.equal(run.behindWorldRecord, '+1.049');
  assert.match(run.note, /platinum and the world record/);
  assert.equal(timeNeededForScore('Crystal', 1, 5.951).timeNeeded, '5.951');
  assert.deepEqual(tierInfo(0.72), { score: '0.720', tier: 'Master I', tierStartsAt: '0.700', nextTier: 'Elite', nextTierAt: '0.800', scoreNeeded: '0.080' });

  const medals = { bronze: '25', silver: '18', gold: '14', platinum: '10.5' };
  const gaps = timeGaps('Crystal', medals, 5.951, 12);
  assert.equal(gaps.bestMedal, 'gold');
  assert.equal(gaps.versus.platinum, '+1.500');
  assert.equal(timeGaps('Crystal', medals, 5.951).recordUnder.platinum, '4.549');

  const xp = xpProgress({ level: 20, target: 21 });
  assert.equal(xp.targetLevel, 21);
  assert.deepEqual(xp.assumed, ['0% into the current level', 'an XP multiplier of 1']);
  assert.equal(xpProgress({}), null);
});
