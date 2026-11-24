import geometry from "./geometry.json";
import type { Find, Helper, Upgrade } from "./types";

export const SLUG = "search-party";
export const STORAGE_KEY = `${SLUG}:game`;

// Positions and beam sizes inside the Rive artboard, shared with the art generator in art/.
export const GEO = geometry;

// Names inside search-party.riv, set by art/rig.mjs.
export const RIVE = { artboard: "Scene", stateMachine: "Game" } as const;

// Each hire costs this much more than the last one of its kind.
export const COST_GROWTH = 1.18;
// Helpers keep searching while the page is closed, up to this long.
export const AWAY_LIMIT_SECONDS = 8 * 60 * 60;

// `crawler` is the robot. The id is the name its layers and view model properties have in the Rive file.
export const HELPERS: readonly Helper[] = [
  { id: "intern", name: "Intern", note: "Jittery phone light", cost: 30, perSecond: 0.2 },
  { id: "crawler", name: "Robot", note: "Scans the floor", cost: 250, perSecond: 1 },
  { id: "dog", name: "Search dog", note: "Follows a scent trail", cost: 1_800, perSecond: 5 },
  { id: "detective", name: "Detective", note: "Slow and thorough", cost: 10_000, perSecond: 20 },
  { id: "satellite", name: "Satellite", note: "Sweeps from above", cost: 55_000, perSecond: 80 },
];

export const UPGRADES: readonly Upgrade[] = [
  { id: "torch", name: "Bigger torch", note: "Wider beam", cost: 50, growth: 2.4, max: 6 },
  { id: "sweep", name: "Faster sweep", note: "Turns and walks quicker", cost: 40, growth: 2.2, max: 6 },
  { id: "bulb", name: "Brighter bulb", note: "Your glints are worth more", cost: 150, growth: 4, max: 8 },
];

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

export const TUNING = {
  // A glint is worth one clue plus this share of what the helpers earn each second.
  glintShare: 0.5,
  // A glint found by the searcher's own torch is worth this many times one found by a helper, plus one per bulb level.
  torchBonus: 3,
  // The torch counts as in use for this long after the last tap or drag. After that it finds things like a helper does.
  attentionSeconds: 5,
  stashGlints: 12,
  mouseGlints: 30,
  stashCooldown: 40,
  firstStash: 6,
  mouseEvery: [25, 45],
  firstMouse: 18,
  mouseSpeed: 120,
  respawn: [4, 10],
  popSeconds: 0.3,
  // How long a light has to rest on a glint to find it, and how long a half-found glint takes to fade back.
  torchDwell: 0.4,
  helperDwell: 0.7,
  stashDwell: 0.8,
  dwellFade: 1.5,
  // Each Bigger torch level widens the beam by this share of its starting width.
  torchWiden: 0.22,
  // The torch: top turning speed in degrees a second, top walking speed in pixels a second.
  turnSpeed: 170,
  walkSpeed: 130,
  sweepGrowth: 1.25,
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
} as const;
