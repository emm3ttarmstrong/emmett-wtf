export type HelperId = "intern" | "crawler" | "dog" | "detective" | "satellite";

export type Helper = { id: HelperId; name: string; cost: number; perSecond: number };

export type Find = { at: number; name: string };

export type GameState = {
  // Clues are the spendable currency. Every place checked yields one.
  clues: number;
  // Places checked over the whole game. It never goes down, and finds unlock on it.
  checked: number;
  owned: Record<HelperId, number>;
  savedAt: number;
};
