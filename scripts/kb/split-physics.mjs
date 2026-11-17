// Splits docs/parkour-reborn-physics.md into the knowledge/mechanics/physics-*.md
// pages Reborn AI searches. The long document stays the place to edit; run
// npm run kb:physics after changing it.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = [
  {
    file: 'physics-overview',
    title: 'Movement Physics Overview',
    summary: 'The key rules behind Parkour Reborn movement, the core values (gravity, speeds, windows, caps) and a glossary of movement terms.',
    aliases: ['movement physics', 'physics overview', 'physics summary', 'key movement rules', 'core movement values', 'movement glossary'],
    sections: ['intro', '0', '2', '20'],
  },
  {
    file: 'physics-frame-rate',
    title: 'Frame Rate and Update Order',
    summary: 'How each frame is processed, what runs once per frame or at a fixed rate, and everything in movement that depends on FPS.',
    aliases: ['fps', 'frame rate', 'does fps matter', '60 fps vs 144 fps', 'best fps', 'update order', 'physics steps'],
    sections: ['1', '17'],
  },
  {
    file: 'physics-grounding-and-states',
    title: 'Grounding and Movement States',
    summary: 'The character collider and ground detector, the movement states (Running, Jumping, Falling and so on) and what counts as being on the ground.',
    aliases: ['grounding', 'grounded', 'movement states', 'falling state', 'jumping state', 'collider', 'hitbox', 'step up', 'refills'],
    sections: ['3', '4'],
  },
  {
    file: 'physics-coyote-time',
    title: 'Coyote Time and Ledge Grace',
    summary: 'Exactly how coyote time (rising past a ledge while grounded) and ledge grace work, how long they last, how frame rate affects them and the landing-frame rule.',
    aliases: ['coyote time', 'ct', 'extended coyote time', 'ledge grace', 'landing frame', 'how to get coyote time', 'tap space'],
    sections: ['5'],
  },
  {
    file: 'physics-run-speed-and-drag',
    title: 'Run Speed, Steering and Drag',
    summary: 'How run speed (momentum) builds and decays, the momentum cap, steering, air and ground drag, slopes and automatic step-up.',
    aliases: ['run speed', 'momentum', 'momentum cap', 'how momentum works', 'drag', 'air control', 'friction', 'slopes', 'speed decay'],
    sections: ['6', '7'],
  },
  {
    file: 'physics-jump',
    title: 'Jump Physics',
    summary: 'The jump formula, the 42 cap, held versus tapped jumps by frame rate, the high jump float and the buffered jump.',
    aliases: ['jump', 'jump physics', 'high jump', 'jump height', 'tap jump', 'hold jump', 'jump buffer', 'buffered jump', 'jump cap'],
    sections: ['8'],
  },
  {
    file: 'physics-dash-and-long-jump',
    title: 'Dash, Afterboost and Long Jump Physics',
    summary: 'Dash, flail jump, afterboost, long jump, chain and air dash, with launch speeds and windows.',
    aliases: ['dash physics', 'afterboost', 'long jump', 'flail jump', 'edge jump', 'chain jump', 'chain strain', 'air dash'],
    sections: ['9'],
  },
  {
    file: 'physics-slides',
    title: 'Powerslide and Slide Physics',
    summary: 'The powerslide bank, slide jumps, powerslide decay and cooldown, the normal slide on slopes and slide landings.',
    aliases: ['powerslide', 'bank', 'powerslide bank', 'slide jump', 'slide physics', 'infinite slide', 'coil slide', 'slide landing'],
    sections: ['10'],
  },
  {
    file: 'physics-walls',
    title: 'Wall Movement Physics',
    summary: 'How wallruns, wall climbs, wall boosts, wall kicks and wall clutches work, how wall contact converts your speed and which charges they use.',
    aliases: ['wallrun', 'wall run physics', 'wall climb', 'wall boost', 'wcb', 'wall kick', 'wall clutch', 'wall jump', 'wall charges'],
    sections: ['11'],
    skip: ['11.5'],
  },
  {
    file: 'physics-wall-bounce',
    title: 'Wall Bounce and Flick Physics',
    summary: 'The wall bounce formula, how the approach angle splits speed between up and along the wall, the 100 cap and how flicks steer the bounce.',
    aliases: ['wall bounce', 'wallbounce', 'flick', 'wall bounce flick', 'bounce flick', 'stored wall speed', 'bounce angle'],
    sections: ['11.5'],
  },
  {
    file: 'physics-ledges-and-climbing',
    title: 'Vault, Ledge Grab and Climbing Physics',
    summary: 'Vaults and vault jumps, mantles, ledge grabs, the Springhook launch, pipes and ladders, coil and Coil Trimp.',
    aliases: ['vault physics', 'mantle', 'ledge grab', 'springboard', 'springhook launch', 'pipe climbing', 'climb leap', 'climb jump', 'coil', 'coil trimp'],
    sections: ['12'],
  },
  {
    file: 'physics-dropdown-and-dropkick',
    title: 'Dropdown and Dropkick Physics',
    summary: 'How dropdown hops you over an edge while keeping ledge grace, and how a dropkick changes your velocity.',
    aliases: ['dropdown', 'drop down', 'dropdown physics', 'dropkick physics'],
    sections: ['13'],
  },
  {
    file: 'physics-landing',
    title: 'Landing and Fall Damage Physics',
    summary: 'When a landing counts, fall damage and fatal speeds, precise and perfect landings, landing types, pillows, fall stabilization and fall stoppers.',
    aliases: ['fall damage', 'landing physics', 'precise landing', 'perfect landing', 'roll', 'impact', 'fall stabilization', 'fatal fall', 'pillows'],
    sections: ['14'],
  },
  {
    file: 'physics-gear',
    title: 'Gear Physics',
    summary: 'Grappler pulls and swings, Mag Rail slaps, launches, bounces and pulls, and what the Glove, Springhook and Zipline Hook change.',
    aliases: ['gear physics', 'grappler physics', 'grapple pull', 'mag rail physics', 'mag bounce', 'mag launch', 'mag pull', 'glove upgrades'],
    sections: ['15'],
  },
  {
    file: 'physics-speed-converters',
    title: 'Speed Stores and Converters',
    summary: 'The augment rule, the moves that store speed and give it back, the moves that convert one kind of speed into another, and notes for finding new techs.',
    aliases: ['speed converters', 'speed stores', 'augment', 'how to get more speed', 'finding new techs', 'new techs'],
    sections: ['16', '19'],
  },
  {
    file: 'physics-techs',
    title: 'Tech Mechanics',
    summary: 'How every multi-step tech works physically, family by family: wall bounce, wall boost, wallrun and wall kick, Mag Rail, Grappler, dropdown and coil techs.',
    aliases: ['tech mechanics', 'how techs work', 'why techs work', 'boing', 'gumpy', 'wumpy', 'ddt', 'dropdown trimp', 'kogo', 'pogo', 'coil trimp', 'trimp', 'wavedash'],
    sections: ['18'],
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const source = readFileSync(join(repo, 'docs', 'parkour-reborn-physics.md'), 'utf8').replace(/\r\n/g, '\n');

const parts = source.split(/^(?=## \d+\. )/m);
const sections = new Map([['intro', parts[0].replace(/^# .*\n+/, '').replace(/\n---\s*$/, '').trim()]]);
for (const part of parts.slice(1)) {
  const number = part.match(/^## (\d+)\. /)[1];
  const body = part.replace(/\n---\s*$/, '').trim();
  sections.set(number, body);
  for (const sub of body.split(/^(?=### \d+\.\d+ )/m).slice(1)) {
    sections.set(sub.match(/^### (\d+\.\d+) /)[1], sub.trim());
  }
}

const owner = (number) => pages.find((page) => page.sections.includes(number))
  ?? pages.find((page) => page.sections.includes(number.split('.')[0]) && !(page.skip ?? []).includes(number));

function relink(text, page) {
  return text.replace(/\bsections? (\d+(?:\.\d+)?)(?:,? and (\d+(?:\.\d+)?))?/g, (match, a, b) => {
    const titles = Array.from(new Set([a, b].filter(Boolean).map((number) => owner(number)?.title).filter(Boolean)));
    if (!titles.length) return match;
    if (titles.length === 1 && titles[0] === page.title) return 'this page';
    return `the ${titles.join(' and ')} page${titles.length > 1 ? 's' : ''}`;
  });
}

function bodyFor(page) {
  const chunks = page.sections.map((number) => {
    let text = sections.get(number);
    if (!text) throw new Error(`section ${number} not found`);
    for (const skip of page.skip ?? []) text = text.replace(sections.get(skip), '').replace(/\n{3,}/g, '\n\n');
    return text;
  });
  return relink(chunks.join('\n\n'), page)
    .replace(/^## \d+\. /gm, '## ')
    .replace(/^### \d+\.\d+ /gm, '### ')
    .replace(/^### /gm, page.sections.length === 1 && page.sections[0].includes('.') ? '## ' : '### ');
}

for (const page of pages) {
  const front = [
    '---',
    `title: ${page.title}`,
    'category: mechanics',
    `summary: ${page.summary}`,
    'aliases:',
    ...page.aliases.map((alias) => `  - ${alias}`),
    'tags:',
    '  - mechanics',
    '  - physics',
    '---',
    '',
    '<!-- Generated from docs/parkour-reborn-physics.md by npm run kb:physics. Edit that file, not this one. -->',
    '',
  ].join('\n');
  writeFileSync(join(repo, 'knowledge', 'mechanics', `${page.file}.md`), `${front}${bodyFor(page)}\n`);
}
console.log(`kb:physics: ${pages.length} pages -> knowledge/mechanics/physics-*.md`);
