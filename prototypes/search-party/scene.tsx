"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { GEO, RIVE } from "./data";
import { findsSoFar } from "./game";
import { frameValues } from "./paint";
import type { Point } from "./types";
import type { Painter } from "./use-game";

const src = new URL("./search-party.riv", import.meta.url).href;
const layout = new Layout({ fit: Fit.Contain });

type Props = {
  // A point in the view, in artboard units. `press` is true for a fresh tap and false while a finger is dragging.
  onAim: (point: Point, press: boolean) => void;
  onRelease: () => void;
  // Which part of the view the frame shows, in artboard units from the view's left edge.
  onSeen: (left: number, right: number) => void;
  setPainter: (paint: Painter | null) => void;
};

// The Rive scene. The game decides where everything is; this writes those values into the file's view model each frame
// and fires its triggers. Rive draws the places, the light and every animation that plays on its own.
//
// The artboard is one view of the walk, wider than a phone. The canvas is always the whole view at the height of
// the frame, centred, so a wide screen shows all of it and a narrow one shows the middle, where the searcher is.
export function Scene({ onAim, onRelease, onSeen, setPainter }: Props) {
  const { rive, setCanvasRef, setContainerRef } = useRive({ src, artboard: RIVE.artboard, stateMachine: RIVE.stateMachine, autoplay: true, autoBind: true, layout });
  const vm = rive?.viewModelInstance ?? null;
  const frame = useRef<HTMLButtonElement | null>(null);
  const view = useRef<HTMLSpanElement | null>(null);

  // Works out which slice of the view the frame shows, now and whenever either changes size.
  useEffect(() => {
    const report = () => {
      const outer = frame.current?.getBoundingClientRect();
      const inner = view.current?.getBoundingClientRect();
      if (!outer || !inner || !inner.width) return;
      const unit = GEO.width / inner.width;
      onSeen(Math.max(0, (outer.left - inner.left) * unit), Math.min(GEO.width, (outer.right - inner.left) * unit));
    };
    report();
    const watcher = new ResizeObserver(report);
    if (frame.current) watcher.observe(frame.current);
    if (view.current) watcher.observe(view.current);
    return () => watcher.disconnect();
  }, [onSeen, vm]);

  useEffect(() => {
    if (!vm) return;
    // Decorative reactions are skipped for reduced motion. The walk and the beams still move, because they are the game.
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
            x.value = event.x - world.camX;
            y.value = event.y;
          }
          fire("burst");
        } else if (event.type === "tap" && !calm) fire("tap");
      }
      // A find that was already there when the page loaded is shown without the celebration.
      const found = findsSoFar(state.earned).length;
      if (finds !== null && found > finds && !calm) fire("found");
      finds = found;
    });
    return () => setPainter(null);
  }, [vm, setPainter]);

  // Positions are measured against the view, which is wider than the frame on a narrow screen.
  const pointOf = (event: PointerEvent<HTMLButtonElement>): Point | null => {
    const box = view.current?.getBoundingClientRect();
    return box ? { x: ((event.clientX - box.left) / box.width) * GEO.width, y: ((event.clientY - box.top) / box.height) * GEO.height } : null;
  };
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointOf(event);
    if (point) onAim(point, true);
  };
  // Holding and dragging keeps the torch following the finger. Holding still keeps it where it is.
  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    const point = event.currentTarget.hasPointerCapture(event.pointerId) ? pointOf(event) : null;
    if (point) onAim(point, false);
  };
  // A keyboard press has no position, so it looks at a random spot a little way ahead.
  const key = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return;
    onAim({ x: GEO.hero.screenX + 60 + Math.random() * 200, y: 30 + Math.random() * 250 }, true);
    onRelease();
  };

  return (
    <button
      ref={frame}
      type="button"
      aria-label="Search as you walk"
      onPointerDown={press}
      onPointerMove={drag}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onClick={key}
      className="relative block size-full cursor-pointer touch-none overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        ref={(element) => {
          view.current = element;
          setContainerRef(element);
        }}
        className="absolute top-0 left-1/2 block h-full -translate-x-1/2 overflow-hidden rounded-xl"
        style={{ aspectRatio: `${GEO.width} / ${GEO.height}` }}
      >
        <canvas ref={setCanvasRef} className="block size-full" />
      </span>
    </button>
  );
}
