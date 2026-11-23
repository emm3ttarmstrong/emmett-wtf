import geometry from "./geometry.json";
import type { Find, Helper, Upgrade } from "./types";

export const SLUG = "search-party";
export const STORAGE_KEY = `${SLUG}:game`;

// Positions and beam sizes inside the Rive artboard, shared with the art generator in art/.
export const GEO = geometry;

// Names inside search-party.riv, set by art/rig.mjs.
export const RIVE = { artboard: "Scene", stateMachine: "Game" } as const;

// Each hire costs this much more than the last one of its kind.
export const COST_GROWTH = 1.15;
// Helpers keep searching while the page is closed, up to this long.
export const AWAY_LIMIT_SECONDS = 8 * 60 * 60;

// `crawler` is the robot. The id is the name its layers and view model properties have in the Rive file.
export const HELPERS: readonly Helper[] = [
  { id: "intern", name: "Intern", note: "Jittery phone light", cost: 15, perSecond: 0.1 },
  { id: "crawler", name: "Robot", note: "Scans the floor", cost: 120, perSecond: 0.6 },
  { id: "dog", name: "Search dog", note: "Follows a scent trail", cost: 1_100, perSecond: 4 },
  { id: "detective", name: "Detective", note: "Slow and thorough", cost: 12_000, perSecond: 25 },
  { id: "satellite", name: "Satellite", note: "Sweeps from above", cost: 130_000, perSecond: 150 },
];

export const UPGRADES: readonly Upgrade[] = [
  { id: "torch", name: "Bigger torch", note: "Wider beam", cost: 50, growth: 2.4, max: 6 },
  { id: "sweep", name: "Faster sweep", note: "Turns and walks quicker", cost: 40, growth: 2.2, max: 6 },
  { id: "bulb", name: "Brighter bulb", note: "Your glints are worth more", cost: 150, growth: 4, max: 8 },
];

// The page itself is never on this list.
export const FINDS: readonly Find[] = [
  { at: 25, name: "A sock" },
  { at: 100, name: "A semicolon" },
  { at: 500, name: "The TV remote" },
  { at: 2_500, name: "Your keys" },
  { at: 10_000, name: "A 10mm socket" },
  { at: 50_000, name: "The plot" },
  { at: 250_000, name: "Atlantis" },
  { at: 1_000_000, name: "A note: “moved, no forwarding address”" },
];

export const TUNING = {
  // A glint is worth one clue plus this share of what the helpers earn each second.
  glintShare: 0.4,
  stashGlints: 12,
  mouseGlints: 30,
  stashCooldown: 40,
  firstStash: 6,
  mouseEvery: [25, 45],
  firstMouse: 18,
  mouseSpeed: 120,
  respawn: [3, 9],
  popSeconds: 0.3,
  // The torch: half-angle in degrees, turning speed in degrees a second, walking speed in pixels a second.
  torchHalf: 13,
  torchHalfStep: 3,
  turnSpeed: 80,
  walkSpeed: 45,
  sweepGrowth: 1.3,
  // How far short of a tapped point the searcher stops, so the beam has room to reach it.
  standOff: 70,
  holdSeconds: 1.2,
  idleDrift: 4,
  // The torch never points closer to straight down than this many degrees of turn.
  maxTurn: 150,
} as const;
