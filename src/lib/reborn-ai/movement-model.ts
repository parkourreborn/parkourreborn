import { parseStep } from '@/lib/pages/techlist';
import type { KbMove } from '@/lib/reborn-ai/kb-search';

export type MoveFact = Omit<KbMove, 'rules'>;

export type Breakdown = {
  links: string[];
  finish?: string;
  unknownSteps?: string[];
};

const key = (value: string) => value.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const marks = /->|=>|→|>|,|\bthen\b|\binto\b|\bfollowed by\b/i;
const splitter = /\s*(?:->|=>|→|>|,|\bthen into\b|\bthen\b|\binto\b|\bfollowed by\b)\s*/i;
const settersOfMag = 'the ground, coyote time, starting a wallrun or wall climb, a wall jump or wall bounce, a wall boost or a wall kick';

function link(a: KbMove, b: KbMove, before: KbMove | null): string | null {
  const from = a.name;
  const to = b.name;
  if (to === 'Coyote Time') {
    if (from === 'Coyote Time') return null;
    if (from === 'Wall Run' && before?.name === 'Air Dash') return 'the air dash makes the game jump you off the wallrun automatically 0.2 s later; that wall jump leaves you Falling and rising at 26, so passing a ledge top (or the floor on the frame you would land) gives coyote time.';
    if (from === 'Wall Run') return 'coyote time after a wallrun comes from jumping off it: the jump-out is a wall jump (26 up, Falling), so rising past a ledge top, or the floor on the frame you would land, gives coyote time. While still on the wall and rising you are in Jumping.';
    if (a.state === 'Jumping while held, then Falling' && before?.name === 'Dropdown') return 'the dropdown left your legs inside the same ledge\'s grounding band, so tapping Ascend (Falling about 55 to 67 ms after the jump) lets you catch coyote time on that ledge while still over it; at long jump speed this window is short, which is why higher FPS helps.';
    if (a.state === 'Jumping while held, then Falling') return 'tap Ascend: you only turn Falling about 55 to 67 ms after the jump, and coyote time cannot start before that.';
    if (a.state === 'Jumping') return `${from} leaves you in Jumping, which blocks grounding, so coyote time can only start once your up speed reaches 0 or a later move sets Falling.`;
    if (a.state === 'Jumping from the ground, Falling in the air') return `from the ground ${from} sets Jumping (only ledge grace is left), in the air it sets Falling, so rising past a ledge top gives coyote time.`;
    if (a.vertical === 'rising') return `${from} leaves you rising without the Jumping state, so a ledge top entering your grounding band gives coyote time (or the floor, if it happens on the frame you would land).`;
    return `coyote time needs you to be rising and not in Jumping; ${from} does not make you rise by itself.`;
  }
  if (from === 'Coyote Time' && to === 'Powerslide') return 'a powerslide during coyote time banks your flat speed plus your current upward speed.';
  if (from === 'Coyote Time' && to === 'Jump') return 'a jump during coyote time adds jump power to your upward speed (capped at 42, or kept if already above 42); it counts as at an edge while rising faster than 8.';
  if (from === 'Coyote Time' && to === 'Buffer Dash') return 'coyote time counts as the ground, so a held Dash fires as a ground dash the moment its cooldown allows.';
  if (from === 'Powerslide' && to === 'Jump') return 'this is a slide jump: you launch horizontally at the bank, in your input direction within 60° of the slide, with the normal additive jump vertically. Hold a direction.';
  if (from === 'Powerslide' && to === 'Grapple') return 'the bank stays while the grapple pulls you; jump within ledge grace (0.15 s) while the powerslide is still active to use it.';
  if ((from === 'Powerslide' || from === 'Afterboost') && to === 'Dropdown') return `powersliding toward an edge turns into the dropdown, which keeps ledge grace active the whole time${from === 'Afterboost' ? '; being afterboosted makes the jump out of it a long jump' : ''}.`;
  if (to === 'Afterboost' && (from === 'Jump' || from === 'Long Jump' || from === 'Flail Jump')) return 'an afterboost right after this jump would happen in mid-air; a mid-air afterboost is unconfirmed (if it works it multiplies the launch by 1.15).';
  if (to === 'Afterboost') return 'afterboost needs a dash held at least 0.5 s and released; pressing Dash again within 0.2 s multiplies your velocity by 1.15 and makes your next jump at an edge a long jump.';
  if (from === 'Buffer Dash') return 'with the dash active, the jump that follows counts as an edge jump (a flail jump, or a long jump if afterboosted), and the chain continues if one is running.';
  if (from === 'Grapple' && to === 'Jump') return 'a pull that lifts you off the ground leaves you in Jumping, so this jump comes from ledge grace (0.15 s): it adds jump power to the pull\'s upward speed, up to 42.';
  if (from === 'Dropdown' && to === 'Jump') return 'a jump during the dropdown is allowed by ledge grace and counts as at an edge, so with dash or afterboost it becomes a flail jump or long jump.';
  if (from === 'Air Dash' && to === 'Wall Run') return 'wallrunning during an air dash makes the game jump you off the wall automatically 0.2 s after the air dash (26 up, Falling).';
  if (from === 'Wall Run' && to === 'Wall Run') return 'a wallrun on a different wall face keeps your full speed; the same-wall restriction does not apply.';
  if (from === 'Wall Run' && to === 'Wall Bounce') return 'climbing a wall ahead while the wallrun is still rising (about the first 0.6 s) turns your wallrun speed into stored upward speed for the bounce.';
  if (from === 'Mag Bounce' && to === 'Wall Bounce') return 'the mag bounce aims your speed at the wall (choosing the approach angle) and gives at least 40 up, which the wall stores for the bounce.';
  if ((from === 'Wall Climb' || from === 'Wall Clutch') && to === 'Wall Bounce') return 'the bounce must come within 0.2 s of touching the wall.';
  if (to === 'Wall Bounce') return `the wall stores the speed you hit it with (speed into the wall is redirected up and along it), so hit it while rising; falling speed is lost. ${from} leaves you ${a.vertical ?? 'moving'}.`;
  if (to === 'Wall Kick') return 'a wall kick needs an air dash pressed within 0.2 s before it and a wall behind you; it keeps your speed, turns it toward your facing direction and sets 28 up.';
  if (to === 'Mag Bounce') return `a mag bounce needs geometry near you and an available charge (refreshed by ${settersOfMag}).`;
  if (to === 'Wall Run' && (from === 'Mag Bounce' || from === 'Wall Kick')) return 'the wallrun entry redirects your whole speed along the wall, so the speed from the previous move carries into the wallrun.';
  return null;
}

const finishNote = 'Ends with the coyote time finish: catch coyote time while rising, powerslide to bank your flat plus upward speed, then jump holding a direction to launch horizontally at the bank while keeping your upward speed.';
const optionalNote = 'Steps marked optional are the usual finish after coyote time and can vary: a powerslide, a jump, a slide jump or nothing.';

export function createMovementModel(moves: KbMove[]) {
  const named = new Map<string, KbMove>();
  const inputs = new Map<string, KbMove>();
  for (const aliases of [false, true]) {
    for (const move of moves) {
      const target = move.kind === 'input' ? inputs : named;
      for (const name of aliases ? move.aliases : [move.name]) {
        const id = key(name);
        if (id && !target.has(id)) target.set(id, move);
      }
    }
  }

  const find = (label: string, input = false) => {
    const id = key(label);
    return (input ? inputs.get(id) ?? named.get(id) : named.get(id) ?? inputs.get(id)) ?? null;
  };

  const fact = (move: KbMove) => Object.fromEntries(Object.entries(move).filter(([name]) => name !== 'rules')) as MoveFact;

  function breakdown(steps: string[], input = false) {
    const parsed = steps.map((step) => parseStep(step));
    const found = parsed.map((step) => find(step.label, input));
    const links: string[] = [];
    for (let index = 1; index < found.length; index++) {
      const a = found[index - 1];
      const b = found[index];
      const note = a && b ? link(a, b, found[index - 2] ?? null) : null;
      if (a && b && note) links.push(`${a.name} → ${b.name}: ${note}`);
    }
    const chain = ` ${found.map((move) => move?.name).filter((name) => name !== 'Buffer Dash').join(' > ')} `;
    const optional = parsed.some((step) => step.optional);
    const finish = [chain.includes('Coyote Time > Powerslide > Jump') ? finishNote.replace('Ends with', 'Uses') : '', optional ? optionalNote : ''].filter(Boolean).join(' ');
    const unknownSteps = parsed.filter((_, index) => !found[index]).map((step) => step.label);
    const result: Breakdown = { links };
    if (finish) result.finish = finish;
    if (unknownSteps.length) result.unknownSteps = unknownSteps;
    return { result, moves: found.filter((move): move is KbMove => Boolean(move)) };
  }

  function longest(part: string) {
    const text = ` ${key(part)} `;
    let best: KbMove | null = null;
    let size = 0;
    for (const [id, move] of named) {
      if (id.length > size && text.includes(` ${id} `)) {
        best = move;
        size = id.length;
      }
    }
    return best;
  }

  function sequenceIn(text: string) {
    if (!marks.test(text)) return null;
    const labels = text.split(splitter).map(longest).filter((move): move is KbMove => Boolean(move)).map((move) => move.name);
    return labels.length >= 2 ? labels.slice(0, 12) : null;
  }

  return { find, fact, breakdown, sequenceIn };
}
