"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEY } from "./data";
import { catchUp, hire, restore, tap, tick } from "./game";
import type { GameState, HelperId } from "./types";

const TICK_MS = 100;
const SAVE_MS = 2000;

function save(state: GameState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}

// The game state, or `null` until the saved game has loaded. It ticks ten times a second and saves every two seconds.
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const latest = useRef<GameState | null>(null);

  useEffect(() => {
    let stored: unknown = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    } catch {}
    const now = Date.now();
    // The saved game only exists in the browser, so it is applied after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(catchUp(restore(stored, now), now));
  }, []);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    let last = performance.now();
    const ticker = window.setInterval(() => {
      const now = performance.now();
      const seconds = (now - last) / 1000;
      last = now;
      setState((s) => (s ? tick(s, seconds) : s));
    }, TICK_MS);
    const flush = () => latest.current && save(latest.current);
    const saver = window.setInterval(flush, SAVE_MS);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(ticker);
      window.clearInterval(saver);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const search = useCallback(() => setState((s) => (s ? tap(s) : s)), []);
  const hireHelper = useCallback((id: HelperId) => setState((s) => (s ? hire(s, id) : s)), []);
  return { state, search, hire: hireHelper };
}
