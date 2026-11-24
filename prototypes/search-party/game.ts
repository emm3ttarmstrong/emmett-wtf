import { AWAY_LIMIT_SECONDS, COST_GROWTH, FINDS, HELPERS, TUNING, UPGRADES } from "./data";
import type { Economy, Find, Helper, HelperId, Upgrade, UpgradeId } from "./types";

export function newGame(now: number): Economy {
  return {
    clues: 0,
    earned: 0,
    owned: Object.fromEntries(HELPERS.map((h) => [h.id, 0])) as Record<HelperId, number>,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>,
    savedAt: now,
  };
}

export function costOf(helper: Helper, owned: number) {
  return Math.ceil(helper.cost * COST_GROWTH ** owned);
}

export function upgradeCost(upgrade: Upgrade, level: number) {
  return Math.ceil(upgrade.cost * upgrade.growth ** level);
}

export function perSecond(state: Economy) {
  return HELPERS.reduce((sum, h) => sum + h.perSecond * state.owned[h.id], 0);
}

// What a glint pays when a helper's light finds it. It grows with the helpers, so glints matter at every stage.
export function helperGlintValue(state: Economy) {
  return Math.ceil(1 + TUNING.glintShare * perSecond(state));
}

// What a glint pays when the searcher's own torch finds it. The bulb only brightens that torch,
// which is what keeps sweeping worth more than waiting.
export function glintValue(state: Economy) {
  return helperGlintValue(state) * (TUNING.torchBonus + state.upgrades.bulb);
}

export function earn(state: Economy, clues: number): Economy {
  return clues > 0 ? { ...state, clues: state.clues + clues, earned: state.earned + clues } : state;
}

export function hire(state: Economy, id: HelperId): Economy {
  const helper = HELPERS.find((h) => h.id === id);
  if (!helper) return state;
  const cost = costOf(helper, state.owned[id]);
  if (state.clues < cost) return state;
  return { ...state, clues: state.clues - cost, owned: { ...state.owned, [id]: state.owned[id] + 1 } };
}

export function upgrade(state: Economy, id: UpgradeId): Economy {
  const item = UPGRADES.find((u) => u.id === id);
  if (!item || state.upgrades[id] >= item.max) return state;
  const cost = upgradeCost(item, state.upgrades[id]);
  if (state.clues < cost) return state;
  return { ...state, clues: state.clues - cost, upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 } };
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
  const levels = (value: unknown) => (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const earned = count(saved.earned);
  return {
    clues: Math.min(count(saved.clues), earned),
    earned,
    owned: Object.fromEntries(HELPERS.map((h) => [h.id, Math.floor(count(levels(saved.owned)[h.id]))])) as Record<HelperId, number>,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, Math.min(u.max, Math.floor(count(levels(saved.upgrades)[u.id])))])) as Record<UpgradeId, number>,
    savedAt: Math.min(count(saved.savedAt) || now, now),
  };
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function format(value: number) {
  return value < 10_000 ? Math.floor(value).toLocaleString("en") : compact.format(value);
}
