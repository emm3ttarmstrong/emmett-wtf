import geometry from "./geometry.json";
import type { Find, Item } from "./types";

export const SLUG = "search-party";
export const STORAGE_KEY = `${SLUG}:game`;

// Positions and beam sizes inside the Rive artboard, shared with the art generator in art/.
export const GEO = geometry;

// Names inside search-party.riv, set by art/rig.mjs.
export const RIVE = { artboard: "Scene", stateMachine: "Game" } as const;

// Helpers keep searching while the page is closed, up to this long.
export const AWAY_LIMIT_SECONDS = 8 * 60 * 60;

// Everything the shop sells, in the order it is listed. Each row has one job. `crawler` is the robot: the id is
// its name in the Rive file.
export const ITEMS: readonly Item[] = [
  { id: "lens", group: "torch", name: "Wider lens", note: "Finds several at once", cost: 60, growth: 3, max: 5 },
  { id: "bulb", group: "torch", name: "Stronger bulb", note: "Finds faster and pays more", cost: 150, growth: 4, max: 6 },
  { id: "intern", group: "crew", name: "Intern", note: "Her phone light gives a head start", cost: 40, growth: 4, max: 5, perSecond: 0.2 },
  { id: "crawler", group: "crew", name: "Robot", note: "Scans the wall ahead of you", cost: 400, growth: 4, max: 5, perSecond: 1 },
  { id: "detective", group: "crew", name: "Detective", note: "Rummages stashes for you", cost: 9_000, growth: 4, max: 5, perSecond: 20 },
  { id: "satellite", group: "crew", name: "Satellite", note: "A wide head start from above", cost: 60_000, growth: 2.5, max: 5, perSecond: 80 },
  { id: "cat", group: "pets", name: "Cat", note: "Pounces on what is close", cost: 900, growth: 4, max: 5, perSecond: 2 },
  { id: "dog", group: "pets", name: "Search dog", note: "Catches the mouse", cost: 2_500, growth: 4, max: 5, perSecond: 5 },
  { id: "bulbs", group: "room", name: "Fix the bulbs", note: "Ceiling lights give a head start", cost: 200, growth: 6, max: 3 },
];

export const GROUPS = [
  { id: "torch", title: "Your torch" },
  { id: "crew", title: "Crew" },
  { id: "pets", title: "Pets" },
  { id: "room", title: "The rooms" },
] as const;

// The page itself is never on this list.
export const FINDS: readonly Find[] = [
  { at: 25, name: "A sock" },
  { at: 150, name: "A semicolon" },
  { at: 800, name: "The TV remote" },
  { at: 4_000, name: "Your keys" },
  { at: 20_000, name: "A 10mm socket" },
  { at: 120_000, name: "The plot" },
  { at: 800_000, name: "Atlantis" },
  { at: 3_000_000, name: "A note: “moved, no forwarding address”" },
];

// What "the page" turns out to be, every time.
export const NOT_THE_PAGE = ["It was a takeaway menu.", "It was a receipt.", "It was page 2 of something else.", "It was a parking ticket."];

export const TUNING = {
  // A glint is worth one clue plus this share of what the crew and pets earn each second.
  glintShare: 0.5,
  // A glint found by the searcher's own torch in use is worth this many times one found while nobody is playing,
  // plus one per bulb level.
  torchBonus: 3,
  // The torch counts as in use for this long after the last tap or drag.
  attentionSeconds: 5,
  // While the torch is in use, every other light only gives glints a head start, up to this much, and leaves the
  // finding to the torch. Once nobody is playing, the other lights find things themselves.
  headStart: 0.7,
  stashGlints: 12,
  mouseGlints: 15,
  stashCooldown: 40,
  mouseEvery: [25, 45],
  firstMouse: 18,
  mouseSpeed: 110,
  respawn: [4, 10],
  popSeconds: 0.3,
  // How long a light has to rest on a glint to find it, and how long a half-found glint takes to fade back.
  torchDwell: 0.4,
  otherDwell: 0.7,
  stashDwell: 0.8,
  dwellFade: 1.5,
  // What each torch upgrade level adds.
  lensWiden: 0.22,
  bulbQuicken: 0.25,
  // Each crew level makes that helper's light this much bigger.
  crewGrow: 0.15,
  // The torch's top turning speed in degrees a second.
  turnSpeed: 170,
  // The searcher ambles forward on their own, and hurries towards a tap far ahead.
  ambleSpeed: 16,
  walkSpeed: 130,
  // Followers walk at up to this speed to keep their place in the party.
  followSpeed: 150,
  // Which ceiling bulbs work at each level of "Fix the bulbs", by the place they hang in.
  bulbOrder: [0, 3, 1, 7, 5],
  bulbsLit: [0, 2, 4, 5],
  // How sharply turning and walking slow down as they arrive. Higher is snappier.
  turnEase: 6,
  walkEase: 4.5,
  // The searcher turns round only for a target this many degrees to the other side of straight up.
  flipPast: 12,
  // The searcher hurries when a tapped point is further ahead than this, and slows to a stop this far short of it.
  standOff: 150,
  holdSeconds: 1.2,
  idleDrift: 4,
  // The torch never points closer to straight down than this many degrees of turn.
  maxTurn: 150,
  // Events: the wait between them, and what each pays in glints.
  firstEvent: 28,
  eventEvery: [30, 50],
  crashGlints: 6,
  mothGlints: 20,
  mothHold: 1.2,
  // A torch nobody is pointing still catches the moth, given this long.
  mothIdleHold: 4,
  mothSeconds: 25,
  phoneGlints: 25,
  phoneSeconds: 7,
  sheetGlints: 4,
  pageGlints: 40,
} as const;
