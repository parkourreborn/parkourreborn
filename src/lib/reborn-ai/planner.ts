// Turns "what the question is about" (routes from the router, entities from
// the text) into the concrete tool calls to run. Pure, so it is tested
// directly.

import type { Entities } from './entities.ts';

export const routeNames = [
  'records',
  'trials',
  'leaderboards',
  'players',
  'stats',
  'calculator',
  'movement',
  'mechanics',
  'crafting',
  'lore',
  'game_knowledge',
  'community',
] as const;

export type RouteName = typeof routeNames[number];

export type ToolName =
  | 'search_knowledge'
  | 'search_techs'
  | 'search_community'
  | 'get_time_trials'
  | 'get_world_records'
  | 'get_wr_history'
  | 'get_trial_leaderboard'
  | 'get_overall_leaderboard'
  | 'get_combo_leaderboard'
  | 'get_player'
  | 'get_player_analytics'
  | 'get_trial_stats'
  | 'get_site_stats'
  | 'get_recent_runs'
  | 'get_wasans_announcements'
  | 'wasans_score'
  | 'time_for_score'
  | 'tier_for_score'
  | 'time_gaps'
  | 'xp_progress';

export type ToolCall = { name: ToolName; args: Record<string, unknown>; routes: RouteName[] };

export type RouteHandling = 'lookup' | 'conversation' | 'unclear' | 'unsupported';

export function plainConversation(message: string) {
  return /^(?:hi|hey|hello|yo|sup|thanks|thank you|thx|ty|lol|lmao|nice|cool|ok|okay|bye|gn|gm)[!?.\s]*$/i.test(message.trim());
}

// Keyword routing. It is the whole router when Jev is unavailable and a
// floor under it when Jev is there: a route found here is never dropped.
export function ruleRoutes(message: string, entities: Entities): { routes: RouteName[]; handling: RouteHandling } {
  const text = message.toLowerCase();
  if (plainConversation(text)) return { routes: [], handling: 'conversation' };

  const routes = new Set<RouteName>();
  if (/\b(world records?|wrs?|record holders?|fastest (?:run|time|ever)|holds? the record)\b/.test(text)) routes.add('records');
  if (/\b(time ?trials?|tts?|bronze|silver|gold|platinum|plat|medals?|trial route)\b/.test(text) && !/\b(leaderboard|lb)\b/.test(text)) routes.add('trials');
  if (/\b(leaderboards?|lb|top \d+|top players?|rankings?|ranked|placing|place on|position on|number one|#1|best players?|who'?s (?:first|best|top))\b/.test(text)) routes.add('leaderboards');
  if (entities.combo || /\bcombo (?:leaderboard|lb|record|top)\b/.test(text)) routes.add('leaderboards');
  if (entities.players.length || entities.me || /\b(personal bests?|profile|player stats)\b/.test(text)) routes.add('players');
  if (/\b(stats|statistics|how many (?:runs|players|submissions)|most active|activity|recent runs|latest runs|newest runs|grinders?|announcements?|wasans news)\b/.test(text)) routes.add('stats');
  if ((entities.trials.length && entities.times.length) || entities.score !== null || entities.levels.length
    || /\b(how much xp|xp (?:to|for|needed)|wasans score|what score|what tier|how far (?:off|from)|gap to)\b/.test(text)) routes.add('calculator');
  if (/\b(tech|techs|technique|tutorial|steps?|combo|chain)\b/.test(text) && !entities.combo) routes.add('movement');
  if (/\b(mechanic|physics|momentum|velocity|coyote)\b/.test(text)) routes.add('mechanics');
  if (/\b(craft|recipe|ingredient|resource|upgrade)\b/.test(text) || /\b(?:make|build|get)\b.*\b(?:grappler|glove|mag ?rail|springhook|binoculars?)\b/.test(text)) routes.add('crafting');
  if (/\b(lore|story|npc|vendor|character|district|location|where is|who is)\b/.test(text) && !entities.players.length) routes.add('lore');
  if (/\b(gif|meme|discord|community (?:file|link)|invite link)\b/.test(text)) routes.add('community');

  if (/\b(my (?:inventory|level|xp|credits|tokens|save|skins?)|join my game|teleport|buy it for me|give me (?:credits|tokens|robux))\b/.test(text)) {
    return { routes: Array.from(routes), handling: 'unsupported' };
  }

  if (!routes.size) routes.add('game_knowledge');
  return { routes: Array.from(routes), handling: 'lookup' };
}

type PlanInput = {
  routes: RouteName[];
  entities: Entities;
  message: string;
  query: string;
  maxKnowledge: number;
};

const has = (pattern: RegExp, text: string) => pattern.test(text.toLowerCase());

// Who a player question is about: a named player first, then the asker.
function target(entities: Entities) {
  if (entities.players.length) return entities.players[0];
  return entities.me ? 'me' : null;
}

export function planTools({ routes, entities, message, query, maxKnowledge }: PlanInput): ToolCall[] {
  const calls: ToolCall[] = [];
  const add = (route: RouteName, name: ToolName, args: Record<string, unknown> = {}) => {
    const key = `${name}:${JSON.stringify(args)}`;
    const existing = calls.find((call) => `${call.name}:${JSON.stringify(call.args)}` === key);
    if (existing) {
      if (!existing.routes.includes(route)) existing.routes.push(route);
      return;
    }
    calls.push({ name, args, routes: [route] });
  };

  const trial = entities.trials[0];
  const who = target(entities);
  const top = entities.top ?? 10;

  for (const route of routes) {
    if (route === 'records') {
      if (entities.trials.length) {
        for (const name of entities.trials.slice(0, 4)) add(route, 'get_world_records', { trial: name, limit: 4 });
      } else {
        add(route, 'get_world_records', { limit: 25, summary: true });
      }
      if (trial && has(/\b(history|progress(?:ion)?|before|previous|used to|held|first|over time|old|older|changed|beaten)\b/, message)) {
        add(route, 'get_wr_history', { trial });
      }
    }

    if (route === 'trials') add(route, 'get_time_trials', { query, limit: 4 });

    if (route === 'leaderboards') {
      if (entities.combo || has(/\bcombos?\b/, message)) {
        add(route, 'get_combo_leaderboard', { ...(entities.combo ? { category: entities.combo } : {}), limit: Math.min(top, 25) });
      } else if (trial) {
        add(route, 'get_trial_leaderboard', { trial, limit: top, ...(who ? { player: who } : {}) });
      } else {
        add(route, 'get_overall_leaderboard', { limit: top, ...(who ? { player: who } : {}) });
      }
    }

    if (route === 'players') {
      if (who) {
        add(route, 'get_player', { player: who });
        if (has(/\b(percentile|peak|history|improv\w*|last pb|average|compare|best trial|worst|weakest|strongest|grind|should i|focus|progress)\b/, message)) {
          add(route, 'get_player_analytics', { player: who });
        }
        if (trial) add(route, 'get_trial_leaderboard', { trial, limit: 3, player: who });
      } else {
        add(route, 'get_overall_leaderboard', { limit: top });
      }
    }

    if (route === 'stats') {
      const range = entities.range ?? '30d';
      if (has(/\b(recent|latest|newest|just|today|lately|last \d+ runs?|new runs?)\b/, message)) {
        add(route, 'get_recent_runs', { ...(who ? { player: who } : {}), ...(trial ? { trial } : {}), limit: 8 });
      }
      if (has(/\b(announcements?|news)\b/, message)) add(route, 'get_wasans_announcements');
      if (trial) add(route, 'get_trial_stats', { trial, range });
      else if (!calls.some((call) => call.name === 'get_recent_runs' || call.name === 'get_wasans_announcements')) add(route, 'get_site_stats', { range });
    }

    if (route === 'calculator') {
      if (trial && entities.times.length) {
        for (const time of entities.times.slice(0, 3)) add(route, 'wasans_score', { trial, time });
      }
      if (trial && entities.score !== null && has(/\b(what time|how fast|need|needed|to get|for a|for an|for)\b/, message)) {
        add(route, 'time_for_score', { trial, score: entities.score });
      }
      if (entities.score !== null && !entities.times.length) add(route, 'tier_for_score', { score: entities.score });
      if (trial && (entities.times.length || has(/\b(gap|gaps|off|away|behind|difference|from wr|to wr|to plat|to gold)\b/, message))) {
        add(route, 'time_gaps', { trial, ...(entities.times[0] ? { time: entities.times[0] } : {}) });
      }
      if (entities.levels.length || has(/\b(xp|exp)\b/, message)) {
        const [current, goal] = entities.levels;
        add(route, 'xp_progress', {
          ...(current ? { level: current } : {}),
          ...(goal ? { target: goal } : {}),
          ...(entities.percent !== null ? { percent: entities.percent } : {}),
          ...(entities.multiplier !== null ? { multiplier: entities.multiplier } : {}),
          vip: entities.vip,
        });
      }
      if (who && has(/\b(my|tier|rank|score)\b/, message) && entities.score === null) add(route, 'get_player', { player: who });
    }

    if (route === 'movement' || route === 'mechanics') add(route, 'search_techs', { query, limit: 4 });
    if (route === 'crafting' || route === 'lore' || route === 'game_knowledge' || route === 'mechanics') {
      add(route, 'search_knowledge', { query, limit: maxKnowledge });
    }
    // A general question can still name a tech; only an exact name match counts.
    if (route === 'game_knowledge' && !calls.some((call) => call.name === 'search_techs')) {
      add(route, 'search_techs', { query, exact: true, limit: 4 });
    }

    if (route === 'community') {
      const type = has(/\b(gif|meme)\b/, message) ? 'gif' : has(/\b(file|document|pdf)\b/, message) ? 'file' : has(/\b(link|discord|invite)\b/, message) ? 'link' : undefined;
      const browse = has(/\b(any|random|something|surprise me)\b/, message);
      add(route, 'search_community', { ...(browse ? {} : { query }), ...(type ? { type } : {}), limit: 3 });
    }
  }

  return calls;
}
