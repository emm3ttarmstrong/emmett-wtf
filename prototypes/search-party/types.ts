export type HelperId = "intern" | "crawler" | "dog" | "detective" | "satellite";
export type UpgradeId = "lens" | "reach" | "bulb" | "headlamp" | "lantern" | "bulbs" | "curtains" | "cat";
export type ItemId = HelperId | UpgradeId;

// Something the shop sells. Everything is bought one level at a time, and every level changes what the room looks like.
export type Item = {
  id: ItemId;
  group: "torch" | "crew" | "room";
  name: string;
  note: string;
  cost: number;
  // Each level costs this many times the one before.
  growth: number;
  max: number;
  // Crew only: clues a second at level one. It doubles with each level.
  perSecond?: number;
};
export type Find = { at: number; name: string };

// Everything that is saved. The room itself is not saved: it starts fresh on every visit.
export type Economy = {
  clues: number;
  // Clues collected over the whole game. It never goes down, and finds unlock on it.
  earned: number;
  levels: Record<ItemId, number>;
  savedAt: number;
};

export type Point = { x: number; y: number };

// A wedge of light: where it pivots, which way it points in degrees (0 is right, negative is up), how far along
// that line it starts and ends, and how wide it is either side of the line at the start and at the end.
export type Beam = { x: number; y: number; angle: number; start: number; length: number; near: number; far: number };

// A glint is waiting to be found ("on"), bursting once found ("pop"), or gone until it respawns ("off").
// `charge` runs from 0 to 1 while a light rests on it, and it is found when the charge is full.
export type Glint = { x: number; y: number; state: "on" | "pop" | "off"; timer: number; charge: number };

// A loose sheet blowing through the room. The big one is "the page".
export type Sheet = { active: boolean; x: number; baseY: number; speed: number; phase: number; big: boolean };

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
  // When each stash can next be rummaged, and how far through rummaging it a light is (0 to 1).
  stashReadyAt: number[];
  stashCharge: number[];
  mouse: { active: boolean; x: number; dir: 1 | -1; nextAt: number };
  dog: { x: number; dir: 1 | -1 };
  // Where the latest find sits on the floor: beside wherever the searcher was when it turned up.
  findX: number;
  // Events. Only one runs at a time, except the mouse, which keeps its own clock.
  nextEventAt: number;
  flashFrom: number;
  moth: { active: boolean; x: number; y: number; held: number; leaveAt: number };
  phone: { active: boolean; until: number; charge: number };
  sheets: Sheet[];
};

// Where every helper is and where its light points this instant.
export type Poses = Record<"intern" | "crawler" | "detective" | "satellite", { x: number; beam: Beam }>;

export type WorldEvent = { type: "burst"; x: number; y: number } | { type: "shake"; index: number } | { type: "tap" } | { type: "notice"; text: string };
