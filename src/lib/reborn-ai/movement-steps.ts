// What each tech-list step does when it is part of a tech, condensed from
// the wiki's ability descriptions (knowledge/mechanics/movement-guide.md).
// The full descriptions also cover inputs, unlocks and side cases ("powerslide
// toward a low obstacle to slide under it"), which free models stitched into
// tech answers where they don't belong, so tech steps get only these notes.
// Keys are tech-list step names in lowercase. A step missing here falls back
// to the guide's description without its input and unlock lines.
export const techStepNotes: Record<string, string> = {
  jump: 'Jump. Jumping during coyote time while you already have velocity adds the jump force on top of that velocity (additive jump velocity). If a chain is active, the jump is a chain jump, which goes further with each chain.',
  ascend: 'Press the jump input.',
  descend: 'Press the crouch/slide input.',
  'use augment': 'Use the equipped gear.',
  attack: 'Press the attack input.',
  'coyote time': 'For a brief moment after the previous move takes you off a surface without jumping (such as just clearing the top of a wall, or a wall run reaching the floor), you still count as on an edge, so you can jump, chain or long jump from midair.',
  powerslide: 'A short powerslide in the coyote time window before the jump: it gives a momentary speed boost and keeps an active chain going.',
  dash: 'Dash for faster acceleration and bonus momentum; jumping off a ledge while dashing goes further.',
  'air dash': 'Hold dash while midair. Air dash is what turns a wall touch into a wall boost, wall clutch or wall kick.',
  afterboost: 'Release a fully charged dash, then tap dash again: a small velocity boost and extra momentum, and jumping off an edge in that moment becomes a long jump.',
  dropdown: 'Powerslide off a ledge: slightly less fall damage, and an active chain is kept.',
  impact: 'Roll on landing to take less fall damage.',
  'wall climb boost': 'While air dashing, boost up a wall. It gives much more upward velocity than a normal wall climb.',
  'wall run': 'Run along a wall; the speed depends on momentum, and jumping out sends your velocity forward.',
  'wall kick': 'While air dashing with your back to a wall, kick off it, sending you the way you are looking.',
  'wall bounce': 'Midair and facing a wall, bounce back off it; your velocity can be redirected the way you flick, including upward.',
  'wall clutch': 'While air dashing, hold onto a wall for a moment, even while falling.',
  'long jump': 'Afterboost into a jump off an edge: a very long horizontal jump that starts a chain.',
  'high jump': 'Hold jump to jump higher.',
  grapple: 'Fire the grappler: it pulls you toward where it hits, or, if you are already faster than its pull, redirects your velocity toward it.',
  swing: 'Swing from the grappler.',
  'mag launch': 'Mag rail launch: launches you off the wall in the direction you look.',
  'mag bounce': 'Mag rail bounce near a wall: bounces you and redirects your velocity, usually upward.',
  'mag pull': 'Mag rail pull: magnetizes you toward a drone in range.',
};
