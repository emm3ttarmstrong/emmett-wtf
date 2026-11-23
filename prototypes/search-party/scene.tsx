"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { aimAt, approach, idleAim, toArtboard } from "./aim";
import { HELPERS, HOLD_MS, RIVE, SCENE } from "./data";
import type { HelperId } from "./types";

const src = new URL("./search-party.riv", import.meta.url).href;
const layout = new Layout({ fit: Fit.Contain });

type Props = {
  // How many finds have turned up. The scene shows the latest one.
  finds: number;
  owned: Record<HelperId, number>;
  onSearch: () => void;
};

// The Rive scene. React owns the torch angle and feeds it in every frame; Rive owns everything that moves on its own.
export function Scene({ finds, owned, onSearch }: Props) {
  const { rive, setCanvasRef, setContainerRef } = useRive({
    src,
    artboard: RIVE.artboard,
    stateMachine: RIVE.stateMachine,
    autoplay: true,
    autoBind: true,
    layout,
  });
  const vm = rive?.viewModelInstance ?? null;
  // Where the torch has been told to point, and until when. After that it goes back to sweeping.
  const hold = useRef({ angle: SCENE.aimRest as number, until: 0 });
  const shownFinds = useRef<number | null>(null);

  useEffect(() => {
    if (!vm) return;
    const aim = vm.number("aim");
    if (!aim) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current: number = SCENE.aimRest;
    let last = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = now < hold.current.until ? hold.current.angle : still ? SCENE.aimRest : idleAim(now / 1000);
      current = still ? target : approach(current, target, seconds);
      aim.value = current;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [vm]);

  useEffect(() => {
    if (!vm) return;
    for (const { id } of HELPERS) {
      const shown = vm.boolean(id);
      if (shown) shown.value = owned[id] > 0;
    }
  }, [vm, owned]);

  useEffect(() => {
    if (!vm) return;
    const find = vm.number("find");
    if (find) find.value = finds;
    // A find that was already there when the page loaded is shown without the celebration.
    if (shownFinds.current !== null && finds > shownFinds.current) {
      hold.current = { angle: aimAt(SCENE.findSpot), until: performance.now() + HOLD_MS.find };
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) vm.trigger("found")?.trigger();
    }
    shownFinds.current = finds;
  }, [vm, finds]);

  const search = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    // A keyboard press has no position, so the torch picks its own spot.
    const point = event.detail === 0 ? { x: SCENE.width, y: Math.random() * SCENE.height } : toArtboard(event.clientX, event.clientY, box);
    if (performance.now() >= hold.current.until || hold.current.angle !== aimAt(SCENE.findSpot)) {
      hold.current = { angle: aimAt(point), until: performance.now() + HOLD_MS.tap };
    }
    if (vm && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) vm.trigger("tap")?.trigger();
    onSearch();
  };

  return (
    <button
      ref={setContainerRef}
      type="button"
      aria-label="Search"
      onClick={search}
      className="block size-full cursor-pointer touch-manipulation overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <canvas ref={setCanvasRef} className="block size-full" />
    </button>
  );
}
