"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AWAY_LIMIT_SECONDS, STORAGE_KEY } from "./data";
import { buy, catchUp, earn, findsSoFar, newGame, perSecond, restore } from "./game";
import type { Economy, ItemId, Point, World, WorldEvent } from "./types";
import { createWorld, findSpot, stepWorld, tapWorld } from "./world";

const HUD_MS = 100;
const SAVE_MS = 2000;
// How long a line about something that just happened stays on the scoreboard, and the least time it gets when
// another is waiting behind it.
const NOTICE_MS = 4000;
const NOTICE_MIN_MS = 1800;
// The room never advances more than this in one frame, so a slow frame can't make a beam skip over a glint.
const MAX_STEP = 0.05;

export type Painter = (world: World, state: Economy, events: WorldEvent[]) => void;

// `at` is when the game last advanced. Saving with that time, not the time of saving, means the time a tab spent
// hidden is still credited if it is closed without coming back.
function save(state: Economy, at: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: at }));
  } catch {}
}

type Running = {
  state: Economy;
  world: World;
  events: WorldEvent[];
  // Where a finger is resting on the scene, in view units, while it is held down.
  held: Point | null;
  // The last moment the game advanced, on the wall clock.
  at: number;
};

// Runs the game. The room and the clue count advance every animation frame in refs, the scene is painted from them,
// and the count is copied into React state ten times a second for the interface.
export function useGame() {
  const [state, setState] = useState<Economy>(() => newGame(0));
  const [notice, setNotice] = useState<string | null>(null);
  const game = useRef<Running | null>(null);
  const painter = useRef<Painter | null>(null);

  useEffect(() => {
    let stored: unknown = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    } catch {}
    const now = Date.now();
    const current: Running = { state: catchUp(restore(stored, now), now), world: createWorld(Math.random), events: [], held: null, at: now };
    game.current = current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let last = performance.now();
    let shown = 0;
    let saved = last;
    let frame = 0;
    // Lines waiting to be shown, and when the one on screen went up.
    const waiting: string[] = [];
    let showing = 0;
    const tick = (time: number) => {
      const elapsed = Math.max(0, (time - last) / 1000);
      last = time;
      current.at = Date.now();
      // A finger resting on the scene keeps pointing the torch there, so holding still counts as using it.
      if (current.held) current.world = tapWorld(current.world, { x: current.held.x + current.world.camX, y: current.held.y });
      // The crew earns for all the time that passed, including while the tab was hidden. The room only moves a frame's worth.
      const idle = earn(current.state, perSecond(current.state) * Math.min(elapsed, AWAY_LIMIT_SECONDS));
      const step = stepWorld(current.world, idle, Math.min(elapsed, MAX_STEP), Math.random, calm);
      const before = findsSoFar(idle.earned).length;
      current.state = earn(idle, step.gained);
      // A new find lands beside wherever the searcher is standing.
      const found = findsSoFar(current.state.earned).length !== before;
      current.world = found ? { ...step.world, findX: findSpot(step.world.hero.x, step.world.hero.facing) } : step.world;
      painter.current?.(current.world, current.state, [...current.events, ...step.events]);
      current.events = [];

      // Notices queue up, so one can't wipe out another the moment it appears.
      for (const event of step.events) if (event.type === "notice") waiting.push(event.text);
      const age = time - showing;
      if (waiting.length && (!showing || age >= NOTICE_MIN_MS)) {
        setNotice(waiting.shift() ?? null);
        showing = time;
      } else if (showing && age >= NOTICE_MS) {
        setNotice(null);
        showing = 0;
      }

      if (time - shown >= HUD_MS || found) {
        shown = time;
        setState(current.state);
      }
      if (time - saved >= SAVE_MS) {
        saved = time;
        save(current.state, current.at);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const flush = () => save(current.state, current.at);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, []);

  const change = useCallback((next: (state: Economy) => Economy) => {
    if (!game.current) return;
    game.current.state = next(game.current.state);
    setState(game.current.state);
  }, []);

  // Points the torch at a spot in the view and keeps it there until `release`. `press` is true for a fresh tap and
  // false while a finger is dragging.
  const aim = useCallback((point: Point, press: boolean) => {
    if (!game.current) return;
    game.current.held = point;
    if (press) game.current.events.push({ type: "tap" });
  }, []);
  const release = useCallback(() => {
    if (!game.current?.held) return;
    // One last aim, so a quick tap that is released before the next frame still counts.
    game.current.world = tapWorld(game.current.world, { x: game.current.held.x + game.current.world.camX, y: game.current.held.y });
    game.current.held = null;
  }, []);
  // Tells the game which part of the view the device shows, so things happen where they can be seen.
  const setSeen = useCallback((left: number, right: number) => {
    if (game.current) game.current.world = { ...game.current.world, seen: { left, right } };
  }, []);
  // Starts again from nothing: no clues, no crew, no upgrades, and a fresh walk.
  const restart = useCallback(() => {
    if (!game.current) return;
    const seen = game.current.world.seen;
    game.current.state = newGame(Date.now());
    game.current.world = { ...createWorld(Math.random), seen };
    setState(game.current.state);
    save(game.current.state, Date.now());
  }, []);
  const buyItem = useCallback((id: ItemId) => change((s) => buy(s, id)), [change]);
  // The scene registers how to draw a frame once its Rive file has loaded.
  const setPainter = useCallback((paint: Painter | null) => {
    painter.current = paint;
  }, []);

  return { state, notice, aim, release, setSeen, restart, buy: buyItem, setPainter };
}
