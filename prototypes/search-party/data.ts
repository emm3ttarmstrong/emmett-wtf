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

// Everything the shop sells, in the order it is listed. `crawler` is the robot: the id is its name in the Rive file.
export const ITEMS: readonly Item[] = [
  { id: "lens", group: "torch", name: "Wider lens", note: "Wider beam", cost: 50, growth: 2.4, max: 6 },
  { id: "reach", group: "torch", name: "Longer reach", note: "Longer beam", cost: 80, growth: 2.6, max: 5 },
  { id: "bulb", group: "torch", name: "Stronger bulb", note: "Brighter, and finds faster", cost: 150, growth: 4, max: 6 },
  { id: "headlamp", group: "torch", name: "Headlamp", note: "A second light on the hood", cost: 400, growth: 4, max: 3 },
  { id: "lantern", group: "torch", name: "Lantern", note: "Lights whatever is close", cost: 600, growth: 4, max: 3 },
  { id: "intern", group: "crew", name: "Intern", note: "Jittery phone light", cost: 30, growth: 3.2, max: 8, perSecond: 0.2 },
  { id: "crawler", group: "crew", name: "Robot", note: "Scans as it scuttles", cost: 250, growth: 3.2, max: 8, perSecond: 1 },
  { id: "dog", group: "crew", name: "Search dog", note: "Chases the mouse", cost: 1_800, growth: 3.2, max: 8, perSecond: 5 },
  { id: "detective", group: "crew", name: "Detective", note: "Rummages for you", cost: 10_000, growth: 3.2, max: 8, perSecond: 20 },
  { id: "satellite", group: "crew", name: "Satellite", note: "Sweeps from above", cost: 55_000, growth: 3.2, max: 8, perSecond: 80 },
  { id: "bulbs", group: "room", name: "Fix a bulb", note: "Lights the floor under it", cost: 300, growth: 5, max: 3 },
  { id: "cat", group: "room", name: "Befriend the cat", note: "It pounces on what is near", cost: 1_200, growth: 1, max: 1 },
  { id: "curtains", group: "room", name: "Open the curtains", note: "Lets the moonlight in", cost: 2_500, growth: 1, max: 1 },
];

export const GROUPS = [
  { id: "torch", title: "Your torch" },
  { id: "crew", title: "Crew" },
  { id: "room", title: "The room" },
] as const;

// The page itself is never on this list.
export const FINDS: readonly Find[] = [
  { at: 25, name: "A sock" },
  { at: 150, name: "A semicolon" },
  { at: 800, name: "The TV remote" },
  { at: 4_000, name: "Your keys" },
  { at: 20_000, name: "A 10mm socket" },
  { at: 100_000, name: "The plot" },
  { at: 500_000, name: "Atlantis" },
  { at: 2_500_000, name: "A note: “moved, no forwarding address”" },
];

// What "the page" turns out to be, every time.
export const NOT_THE_PAGE = ["It was a takeaway menu.", "It was a receipt.", "It was page 2 of something else.", "It was a parking ticket."];

export const TUNING = {
  // A glint is worth one clue plus this share of what the crew earns each second.
  glintShare: 0.5,
  // A glint found by the searcher's own torch is worth this many times one found by any other light, plus one per bulb level.
  torchBonus: 3,
  // The torch counts as in use for this long after the last tap or drag. After that it finds things like any other light.
  attentionSeconds: 5,
  stashGlints: 12,
  mouseGlints: 15,
  stashCooldown: 40,
  firstStash: 6,
  mouseEvery: [25, 45],
  firstMouse: 18,
  mouseSpeed: 120,
  respawn: [4, 10],
  popSeconds: 0.3,
  // How long a light has to rest on a glint to find it, and how long a half-found glint takes to fade back.
  torchDwell: 0.4,
  otherDwell: 0.7,
  stashDwell: 0.8,
  dwellFade: 1.5,
  // What each torch upgrade level adds.
  lensWiden: 0.22,
  reachLengthen: 0.15,
  bulbQuicken: 0.25,
  // Each crew level makes that helper's light this much bigger.
  crewGrow: 0.2,
  // The torch: top turning speed in degrees a second, top walking speed in pixels a second.
  turnSpeed: 170,
  walkSpeed: 130,
  // How sharply turning and walking slow down as they arrive. Higher is snappier.
  turnEase: 6,
  walkEase: 4.5,
  // The searcher turns round only for a target this many degrees to the other side of straight up.
  flipPast: 12,
  // The searcher only walks when a tapped point is further away than this, and stops this far short of it.
  standOff: 150,
  holdSeconds: 1.2,
  idleDrift: 4,
  // The torch never points closer to straight down than this many degrees of turn.
  maxTurn: 150,
  // Events: the wait between them, and what each pays in glints.
  firstEvent: 28,
  eventEvery: [30, 50],
  lightningHeadStart: 0.6,
  crashGlints: 6,
  mothGlints: 20,
  mothHold: 1.2,
  mothSeconds: 25,
  phoneGlints: 25,
  phoneSeconds: 7,
  sheetGlints: 4,
  pageGlints: 40,
} as const;
