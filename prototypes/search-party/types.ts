export type HelperId = "intern" | "crawler" | "dog" | "detective" | "satellite";
export type UpgradeId = "torch" | "sweep" | "bulb";

export type Helper = { id: HelperId; name: string; note: string; cost: number; perSecond: number };
export type Upgrade = { id: UpgradeId; name: string; note: string; cost: number; growth: number; max: number };
export type Find = { at: number; name: string };

// Everything that is saved. The room itself is not saved: it starts fresh on every visit.
export type Economy = {
  clues: number;
  // Clues collected over the whole game. It never goes down, and finds unlock on it.
  earned: number;
  owned: Record<HelperId, number>;
  upgrades: Record<UpgradeId, number>;
  savedAt: number;
};

export type Point = { x: number; y: number };

// A wedge of light: where it starts, which way it points in degrees (0 is right, negative is up),
// how long it is, and how wide it is either side of its centre line at the start and at the end.
export type Beam = { x: number; y: number; angle: number; length: number; near: number; far: number };

// A glint is waiting to be found ("on"), bursting once found ("pop"), or gone until it respawns ("off").
// `charge` runs from 0 to 1 while a light rests on it, and it is found when the charge is full.
export type Glint = { x: number; y: number; state: "on" | "pop" | "off"; timer: number; charge: number };

export type World = {
  time: number;
  hero: {
    x: number;
    // The torch direction as a turn from straight up: 0 is up, 90 is right, -90 is left. Straight down is never crossed.
    turn: number;
    // Where the torch settles when nothing is tapped.
    rest: number;
    facing: 1 | -1;
    target: Point | null;
    targetX: number;
    releaseAt: number;
    walking: boolean;
    // When the player last pointed the torch. The torch only pays its bonus while it is being used.
    aimedAt: number;
  };
  glints: Glint[];
  // When each stash can next be rummaged, and how far through rummaging it the torch is (0 to 1).
  stashReadyAt: number[];
  stashCharge: number[];
  mouse: { active: boolean; x: number; dir: 1 | -1; nextAt: number };
  // Where the latest find sits on the floor: beside wherever the searcher was when it turned up.
  findX: number;
};

// Where every helper is and where its light points this instant.
export type Poses = {
  intern: { x: number; beam: Beam };
  crawler: { x: number; beam: Beam };
  detective: { x: number; beam: Beam };
  satellite: { x: number; beam: Beam };
  dog: { x: number; dir: 1 | -1 };
};

export type WorldEvent = { type: "burst"; x: number; y: number } | { type: "shake"; index: number } | { type: "tap" };
