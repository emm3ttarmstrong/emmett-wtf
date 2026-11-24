import { AWAY_LIMIT_SECONDS, FINDS, ITEMS, TUNING } from "./data";
import type { Economy, Find, Item, ItemId } from "./types";

export function newGame(now: number): Economy {
  return { clues: 0, earned: 0, levels: Object.fromEntries(ITEMS.map((item) => [item.id, 0])) as Record<ItemId, number>, savedAt: now };
}

// What the next level of an item costs, or `null` when it is at its maximum.
export function costOf(item: Item, level: number) {
  return level >= item.max ? null : Math.ceil(item.cost * item.growth ** level);
}

// What the crew earns each second. Each level of a helper doubles what it brings in.
export function perSecond(state: Economy) {
  return ITEMS.reduce((sum, item) => sum + (item.perSecond ?? 0) * (2 ** state.levels[item.id] - 1), 0);
}

// What a glint pays when any light but the searcher's own torch finds it. It grows with the crew.
export function otherGlintValue(state: Economy) {
  return Math.ceil(1 + TUNING.glintShare * perSecond(state));
}

// What a glint pays when the searcher's own torch finds it. This is what keeps sweeping worth more than waiting.
export function glintValue(state: Economy) {
  return otherGlintValue(state) * (TUNING.torchBonus + state.levels.bulb);
}

export function earn(state: Economy, clues: number): Economy {
  return clues > 0 ? { ...state, clues: state.clues + clues, earned: state.earned + clues } : state;
}

export function buy(state: Economy, id: ItemId): Economy {
  const item = ITEMS.find((i) => i.id === id);
  const cost = item ? costOf(item, state.levels[id]) : null;
  if (cost === null || state.clues < cost) return state;
  return { ...state, clues: state.clues - cost, levels: { ...state.levels, [id]: state.levels[id] + 1 } };
}

export function findsSoFar(earned: number): Find[] {
  return FINDS.filter((f) => earned >= f.at);
}

export function nextFind(earned: number): Find | undefined {
  return FINDS.find((f) => earned < f.at);
}

// How far the game is between the last find and the next, from 0 to 1.
export function findProgress(earned: number) {
  const next = nextFind(earned);
  if (!next) return 1;
  const last = findsSoFar(earned).at(-1)?.at ?? 0;
  return (earned - last) / (next.at - last);
}

// Credits the time the page was closed, capped so a long absence can't finish the game.
export function catchUp(state: Economy, now: number): Economy {
  const away = Math.min(AWAY_LIMIT_SECONDS, Math.max(0, (now - state.savedAt) / 1000));
  return { ...earn(state, perSecond(state) * away), savedAt: now };
}

const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);

// Rebuilds a saved game field by field, so a stale or hand-edited entry can't break the page.
export function restore(stored: unknown, now: number): Economy {
  const fresh = newGame(now);
  if (!stored || typeof stored !== "object") return fresh;
  const saved = stored as Record<string, unknown>;
  const levels = (saved.levels && typeof saved.levels === "object" ? saved.levels : {}) as Record<string, unknown>;
  const earned = count(saved.earned);
  return {
    clues: Math.min(count(saved.clues), earned),
    earned,
    levels: Object.fromEntries(ITEMS.map((item) => [item.id, Math.min(item.max, Math.floor(count(levels[item.id])))])) as Record<ItemId, number>,
    savedAt: Math.min(count(saved.savedAt) || now, now),
  };
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function format(value: number) {
  return value < 10_000 ? Math.floor(value).toLocaleString("en") : compact.format(value);
}
