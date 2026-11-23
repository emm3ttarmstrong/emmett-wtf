"use client";

import { useEffect, type MouseEvent } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { GEO, RIVE } from "./data";
import { findsSoFar } from "./game";
import { frameValues } from "./paint";
import type { Point } from "./types";
import type { Painter } from "./use-game";

const src = new URL("./search-party.riv", import.meta.url).href;
const layout = new Layout({ fit: Fit.Contain });

type Props = {
  onTap: (point: Point) => void;
  setPainter: (paint: Painter | null) => void;
};

// The Rive scene. The game decides where everything is; this writes those values into the file's view model each frame
// and fires its triggers. Rive draws the room, the light and every animation that plays on its own.
export function Scene({ onTap, setPainter }: Props) {
  const { rive, setCanvasRef, setContainerRef } = useRive({ src, artboard: RIVE.artboard, stateMachine: RIVE.stateMachine, autoplay: true, autoBind: true, layout });
  const vm = rive?.viewModelInstance ?? null;

  useEffect(() => {
    if (!vm) return;
    // Decorative reactions are skipped for reduced motion. The beams still move, because they are the game.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const numbers = new Map<string, { value: number } | null>();
    const booleans = new Map<string, { value: boolean } | null>();
    const number = (name: string) => numbers.get(name) ?? numbers.set(name, vm.number(name)).get(name);
    const boolean = (name: string) => booleans.get(name) ?? booleans.set(name, vm.boolean(name)).get(name);
    const fire = (name: string) => vm.trigger(name)?.trigger();
    let finds: number | null = null;

    setPainter((world, state, events) => {
      const values = frameValues(world, state);
      for (const [name, value] of Object.entries(values.numbers)) {
        const property = number(name);
        if (property && property.value !== value) property.value = value;
      }
      for (const [name, value] of Object.entries(values.booleans)) {
        const property = boolean(name);
        if (property && property.value !== value) property.value = value;
      }
      for (const event of events) {
        if (event.type === "burst") {
          const x = number("burstX");
          const y = number("burstY");
          if (x && y) {
            x.value = event.x;
            y.value = event.y;
          }
          fire("burst");
        } else if (calm) continue;
        else if (event.type === "shake") fire(`shake${event.index}`);
        else fire("tap");
      }
      // A find that was already there when the page loaded is shown without the celebration.
      const found = findsSoFar(state.earned).length;
      if (finds !== null && found > finds && !calm) fire("found");
      finds = found;
    });
    return () => setPainter(null);
  }, [vm, setPainter]);

  const tap = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    // A keyboard press has no position, so it searches a random spot.
    if (event.detail === 0) onTap({ x: Math.random() * GEO.width, y: Math.random() * GEO.floor });
    else onTap({ x: ((event.clientX - box.left) / box.width) * GEO.width, y: ((event.clientY - box.top) / box.height) * GEO.height });
  };

  return (
    <button
      ref={setContainerRef}
      type="button"
      aria-label="Search the room"
      onClick={tap}
      className="block size-full cursor-pointer touch-manipulation overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <canvas ref={setCanvasRef} className="block size-full" />
    </button>
  );
}
