"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import { GEO, RIVE } from "./data";
import { findsSoFar } from "./game";
import { frameValues } from "./paint";
import type { Point } from "./types";
import type { Painter } from "./use-game";

const src = new URL("./search-party.riv", import.meta.url).href;
const layout = new Layout({ fit: Fit.Contain });
// How quickly the view catches up with the searcher. Higher is tighter.
const CAMERA_EASE = 5;

type Props = {
  // `press` is true for a fresh tap and false while a finger is dragging.
  onAim: (point: Point, press: boolean) => void;
  setPainter: (paint: Painter | null) => void;
};

// The Rive scene. The game decides where everything is; this writes those values into the file's view model each frame
// and fires its triggers. Rive draws the room, the light and every animation that plays on its own.
//
// The room is wider than most screens. The canvas is always the whole room at the height of the frame, and the frame
// shows as much of it as fits: all of it on a wide screen, or a window that follows the searcher on a narrow one.
export function Scene({ onAim, setPainter }: Props) {
  const { rive, setCanvasRef, setContainerRef } = useRive({ src, artboard: RIVE.artboard, stateMachine: RIVE.stateMachine, autoplay: true, autoBind: true, layout });
  const vm = rive?.viewModelInstance ?? null;
  const room = useRef<HTMLSpanElement | null>(null);
  const setRoom = useCallback(
    (element: HTMLSpanElement | null) => {
      room.current = element;
      setContainerRef(element);
    },
    [setContainerRef],
  );

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
    let camera: number | null = null;
    let last = performance.now();

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

      // The camera: slide the room so the searcher stays in view, or centre it when the whole room fits.
      const element = room.current;
      const frame = element?.parentElement;
      if (element && frame) {
        const now = performance.now();
        const seconds = Math.min(0.1, (now - last) / 1000);
        last = now;
        const roomWidth = element.clientWidth;
        const spare = frame.clientWidth - roomWidth;
        const wanted = spare >= 0 ? spare / 2 : Math.max(spare, Math.min(0, frame.clientWidth / 2 - (world.hero.x / GEO.width) * roomWidth));
        camera = camera === null || calm ? wanted : wanted + (camera - wanted) * Math.exp(-CAMERA_EASE * seconds);
        element.style.transform = `translateX(${camera.toFixed(2)}px)`;
      }
    });
    return () => setPainter(null);
  }, [vm, setPainter]);

  // Positions are measured against the room, not the frame, so they stay right wherever the camera is.
  const pointOf = (event: PointerEvent<HTMLButtonElement>): Point | null => {
    const box = room.current?.getBoundingClientRect();
    return box ? { x: ((event.clientX - box.left) / box.width) * GEO.width, y: ((event.clientY - box.top) / box.height) * GEO.height } : null;
  };
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointOf(event);
    if (point) onAim(point, true);
  };
  // Holding and dragging keeps the searcher following the finger.
  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    const point = event.currentTarget.hasPointerCapture(event.pointerId) ? pointOf(event) : null;
    if (point) onAim(point, false);
  };
  // A keyboard press has no position, so it searches a random spot. Pointer presses are handled above.
  const key = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onAim({ x: Math.random() * GEO.width, y: Math.random() * GEO.floor }, true);
  };

  return (
    <button
      type="button"
      aria-label="Search the room"
      onPointerDown={press}
      onPointerMove={drag}
      onClick={key}
      className="block size-full cursor-pointer touch-none overflow-hidden rounded-xl outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span ref={setRoom} className="block h-full overflow-hidden rounded-xl will-change-transform" style={{ aspectRatio: `${GEO.width} / ${GEO.height}` }}>
        <canvas ref={setCanvasRef} className="block size-full" />
      </span>
    </button>
  );
}
