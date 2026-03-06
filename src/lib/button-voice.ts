const TARGET_LINE_COUNT = 300;
const MAX_WORDS_PER_LINE = 15;

const TAUNT_OPENERS = [
  "Tap now, sleepy speedster",
  "Move, reluctant legend",
  "Click, dramatic statue",
  "Press, puzzled sprinter",
  "Hurry up, hesitant hero",
  "Wake up, idle captain",
  "Act fast, wandering thumb",
  "Tap please, curious snail",
  "Move now, cozy meteor",
  "Click already, gentle tornado",
  "Press now, delayed champion",
  "Hustle, distracted pilot",
  "Tap quick, wandering gremlin",
  "Move please, waiting wizard",
  "Click now, clockwatching ninja",
  "Press soon, daydreaming racer",
  "Hurry, lounging gladiator",
  "Tap once, patient mammoth",
  "Move it, mellow comet",
  "Click quickly, stalling rocket",
];

const TAUNT_MIDDLES = [
  "the counter needs chaos",
  "this button craves impact",
  "the stream wants motion",
  "your silence feels loud",
  "the moment begs drama",
  "the tally misses you",
  "my pixels feel ignored",
  "this arena needs noise",
  "the vibe wants thunder",
  "your courage needs proof",
  "the graph wants spikes",
  "the audience wants action",
  "your finger needs purpose",
  "the page expects bravery",
  "this click deserves witnesses",
];

const TAUNT_TAG_ADJECTIVES = [
  "buffering",
  "wobbly",
  "sleepy",
  "sidequesting",
  "vacationing",
  "glitchy",
  "slowmo",
  "overthinking",
  "drifting",
  "echoing",
  "latecomer",
  "wandering",
  "puzzled",
  "fuzzy",
  "rubberbanding",
  "stubborn",
  "loitering",
  "napping",
  "laggy",
  "detouring",
];

const TAUNT_TAG_NOUNS = [
  "llama",
  "comet",
  "goblin",
  "otter",
  "pirate",
  "beacon",
  "hamster",
  "phoenix",
  "jellyfish",
  "pancake",
  "tornado",
  "fossil",
  "drummer",
  "badger",
  "moonwalker",
];

const RESPONSE_OPENERS = [
  "Ouch, bold striker",
  "Nice hit, chaos artist",
  "Sharp tap, tiny titan",
  "Direct hit, click wizard",
  "Solid press, speed fox",
  "Great poke, tap hero",
  "Clean strike, hype pilot",
  "Brave click, neon ninja",
  "Loud tap, pixel boxer",
  "Wild hit, turbo poet",
  "Big swing, spark captain",
  "Fast jab, rhythm goblin",
  "Hard press, stunt penguin",
  "Heavy tap, rocket bard",
  "Quick poke, joy pirate",
  "Hot click, vibe ranger",
  "Mean jab, caffeinated knight",
  "Sweet hit, storm dancer",
  "Prime press, cosmic chef",
  "Epic tap, glitch samurai",
];

const RESPONSE_MIDDLES = [
  "run another before cooldown",
  "keep the streak alive",
  "that felt expensive",
  "my gradients are rattled",
  "you woke the dashboard",
  "the counter applauds loudly",
  "your timing looks dangerous",
  "that shook my border",
  "you hit with confidence",
  "this page felt that",
  "your finger means business",
  "analytics just blinked",
  "the graph jumped instantly",
  "my pixels need ice",
  "the stream got louder",
];

const RESPONSE_TAG_ADJECTIVES = [
  "victorious",
  "reckless",
  "sparked",
  "rowdy",
  "charged",
  "fearless",
  "amped",
  "nuclear",
  "zippy",
  "feral",
  "flashy",
  "electric",
  "witty",
  "spicy",
  "stormy",
  "chaotic",
  "jubilant",
  "kinetic",
  "lucky",
  "legendary",
];

const RESPONSE_TAG_NOUNS = [
  "panther",
  "otter",
  "captain",
  "meteor",
  "badger",
  "wizard",
  "cyclone",
  "falcon",
  "pirate",
  "mongoose",
  "engine",
  "samurai",
  "beacon",
  "hammer",
  "juggler",
];

function countWords(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

function buildUniqueTags(adjectives: string[], nouns: string[]): string[] {
  const tags: string[] = [];
  for (const adjective of adjectives) {
    for (const noun of nouns) {
      tags.push(`${adjective} ${noun}`);
    }
  }

  if (tags.length !== TARGET_LINE_COUNT) {
    throw new Error(
      `Tag count mismatch: expected ${TARGET_LINE_COUNT}, got ${tags.length}.`,
    );
  }

  return tags;
}

function buildLinePool(
  openers: string[],
  middles: string[],
  adjectives: string[],
  nouns: string[],
): string[] {
  const tags = buildUniqueTags(adjectives, nouns);

  return tags.map((tag, index) => {
    const opener = openers[index % openers.length];
    const middle = middles[Math.floor(index / openers.length) % middles.length];
    const line = `${opener} ${middle}, ${tag}.`;

    if (countWords(line) > MAX_WORDS_PER_LINE) {
      throw new Error(
        `Line exceeds ${MAX_WORDS_PER_LINE} words: "${line}" (${countWords(line)} words).`,
      );
    }

    return line;
  });
}

/** 300 rotating taunts to provoke interaction. */
export const TAUNT_LINES = buildLinePool(
  TAUNT_OPENERS,
  TAUNT_MIDDLES,
  TAUNT_TAG_ADJECTIVES,
  TAUNT_TAG_NOUNS,
);

/** 300 rotating responses shown immediately after a press. */
export const PRESS_RESPONSE_LINES = buildLinePool(
  RESPONSE_OPENERS,
  RESPONSE_MIDDLES,
  RESPONSE_TAG_ADJECTIVES,
  RESPONSE_TAG_NOUNS,
);
