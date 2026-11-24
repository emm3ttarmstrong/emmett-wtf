"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AWAY_LIMIT_SECONDS, STORAGE_KEY } from "./data";
import { catchUp, earn, findsSoFar, hire, newGame, perSecond, restore, upgrade } from "./game";
import type { Economy, HelperId, Point, UpgradeId, World, WorldEvent } from "./types";
import { createWorld, findSpot, stepWorld, tapWorld } from "./world";

const HUD_MS = 100;
const SAVE_MS = 2000;
// The room never advances more than this in one frame, so a slow frame can't make a beam skip over a glint.
const MAX_STEP = 0.05;

export type Painter = (world: World, state: Economy, events: WorldEvent[]) => void;

function save(state: Economy) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}

// Runs the game. The room and the clue count advance every animation frame in refs, the scene is painted from them,
// and the count is copied into React state ten times a second for the interface.
export function useGame() {
  const [state, setState] = useState<Economy>(() => newGame(0));
  const game = useRef<{ state: Economy; world: World; loaded: boolean; events: WorldEvent[] } | null>(null);
  const painter = useRef<Painter | null>(null);

  useEffect(() => {
    let stored: unknown = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    } catch {}
    const now = Date.now();
    const current = { state: catchUp(restore(stored, now), now), world: createWorld(Math.random), loaded: true, events: [] as WorldEvent[] };
    game.current = current;

    let last = performance.now();
    let shown = 0;
    let saved = last;
    let frame = 0;
    const tick = (time: number) => {
      const elapsed = Math.max(0, (time - last) / 1000);
      last = time;
      // Helpers earn for all the time that passed, including while the tab was hidden. The room only moves a frame's worth.
      const idle = earn(current.state, perSecond(current.state) * Math.min(elapsed, AWAY_LIMIT_SECONDS));
      const step = stepWorld(current.world, idle, Math.min(elapsed, MAX_STEP), Math.random);
      const before = findsSoFar(idle.earned).length;
      current.state = earn(idle, step.gained);
      // A new find lands beside wherever the searcher is standing.
      const found = findsSoFar(current.state.earned).length !== before;
      current.world = found ? { ...step.world, findX: findSpot(step.world.hero.x, step.world.hero.facing) } : step.world;
      painter.current?.(current.world, current.state, [...current.events, ...step.events]);
      current.events = [];
      if (time - shown >= HUD_MS || found) {
        shown = time;
        setState(current.state);
      }
      if (time - saved >= SAVE_MS) {
        saved = time;
        save(current.state);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const flush = () => save(current.state);
    window.addEventListener("pagehide", flush);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const change = useCallback((next: (state: Economy) => Economy) => {
    if (!game.current) return;
    game.current.state = next(game.current.state);
    setState(game.current.state);
  }, []);

  // Points the searcher at a spot. `press` is true for a fresh tap and false while a finger is dragging.
  const aim = useCallback((point: Point, press: boolean) => {
    if (!game.current) return;
    game.current.world = tapWorld(game.current.world, point);
    if (press) game.current.events.push({ type: "tap" });
  }, []);
  // Starts again from nothing: no clues, no helpers, no upgrades, and a fresh room.
  const restart = useCallback(() => {
    if (!game.current) return;
    game.current.state = newGame(Date.now());
    game.current.world = createWorld(Math.random);
    setState(game.current.state);
    save(game.current.state);
  }, []);
  const hireHelper = useCallback((id: HelperId) => change((s) => hire(s, id)), [change]);
  const buyUpgrade = useCallback((id: UpgradeId) => change((s) => upgrade(s, id)), [change]);
  // The scene registers how to draw a frame once its Rive file has loaded.
  const setPainter = useCallback((paint: Painter | null) => {
    painter.current = paint;
  }, []);

  return { state, aim, restart, hire: hireHelper, upgrade: buyUpgrade, setPainter };
}
