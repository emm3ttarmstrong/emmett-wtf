import type { Find, Helper } from "./types";

export const SLUG = "search-party";
export const STORAGE_KEY = `${SLUG}:game`;

// Each hire costs this much more than the last one of its kind.
export const COST_GROWTH = 1.15;
// Helpers keep searching while the page is closed, up to this long.
export const AWAY_LIMIT_SECONDS = 8 * 60 * 60;

export const HELPERS: readonly Helper[] = [
  { id: "intern", name: "Intern", cost: 15, perSecond: 0.5 },
  { id: "crawler", name: "Crawler", cost: 120, perSecond: 4 },
  { id: "dog", name: "Search dog", cost: 1_100, perSecond: 25 },
  { id: "detective", name: "Detective", cost: 12_000, perSecond: 150 },
  { id: "satellite", name: "Satellite", cost: 130_000, perSecond: 1_000 },
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

// Names inside search-party.riv, set by art/rig.mjs.
export const RIVE = { artboard: "Scene", stateMachine: "Game" } as const;

// Geometry of the Rive artboard, in its own units. `pivot` is the hand the torch turns around.
export const SCENE = {
  width: 390,
  height: 380,
  pivot: { x: 134, y: 270.96 },
  findSpot: { x: 314, y: 300 },
  // Torch angles in degrees. Zero points right and negative points up.
  aimMin: -62,
  aimMax: 30,
  aimRest: -12,
  aimSweep: 15,
} as const;

// How long the torch stays where a tap or a find sent it before it goes back to sweeping.
export const HOLD_MS = { tap: 2200, find: 3200 } as const;
