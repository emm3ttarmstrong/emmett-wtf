import { AWAY_LIMIT_SECONDS, COST_GROWTH, FINDS, HELPERS } from "./data";
import type { Find, GameState, Helper, HelperId } from "./types";

export function newGame(now: number): GameState {
  return {
    clues: 0,
    checked: 0,
    owned: Object.fromEntries(HELPERS.map((h) => [h.id, 0])) as Record<HelperId, number>,
    savedAt: now,
  };
}

export function costOf(helper: Helper, owned: number) {
  return Math.ceil(helper.cost * COST_GROWTH ** owned);
}

export function perSecond(state: GameState) {
  return HELPERS.reduce((sum, h) => sum + h.perSecond * state.owned[h.id], 0);
}

function check(state: GameState, places: number): GameState {
  return { ...state, clues: state.clues + places, checked: state.checked + places };
}

export function tap(state: GameState): GameState {
  return check(state, 1);
}

export function tick(state: GameState, seconds: number): GameState {
  return check(state, perSecond(state) * seconds);
}

export function hire(state: GameState, id: HelperId): GameState {
  const helper = HELPERS.find((h) => h.id === id);
  if (!helper) return state;
  const cost = costOf(helper, state.owned[id]);
  if (state.clues < cost) return state;
  return { ...state, clues: state.clues - cost, owned: { ...state.owned, [id]: state.owned[id] + 1 } };
}

export function findsSoFar(checked: number): Find[] {
  return FINDS.filter((f) => checked >= f.at);
}

export function nextFind(checked: number): Find | undefined {
  return FINDS.find((f) => checked < f.at);
}

// Credits the time the page was closed, capped so a long absence can't finish the game.
export function catchUp(state: GameState, now: number): GameState {
  const away = Math.min(AWAY_LIMIT_SECONDS, Math.max(0, (now - state.savedAt) / 1000));
  return { ...tick(state, away), savedAt: now };
}

const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);

// Rebuilds a saved game field by field, so a stale or hand-edited entry can't break the page.
export function restore(stored: unknown, now: number): GameState {
  const fresh = newGame(now);
  if (!stored || typeof stored !== "object") return fresh;
  const saved = stored as Partial<Record<keyof GameState, unknown>>;
  const owned = (saved.owned && typeof saved.owned === "object" ? saved.owned : {}) as Record<string, unknown>;
  const checked = count(saved.checked);
  return {
    clues: Math.min(count(saved.clues), checked),
    checked,
    owned: Object.fromEntries(HELPERS.map((h) => [h.id, Math.floor(count(owned[h.id]))])) as Record<HelperId, number>,
    savedAt: Math.min(count(saved.savedAt) || now, now),
  };
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function format(value: number) {
  return value < 1000 ? String(Math.floor(value)) : compact.format(value);
}
