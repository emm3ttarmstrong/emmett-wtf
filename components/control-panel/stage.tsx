"use client";

import { useEffect, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type View = { x: number; y: number; k: number };
const HOME: View = { x: 0, y: 0, k: 1 };
const MIN = 0.25;
const MAX = 8;

// Zooms by `factor` while keeping the point (cx, cy), measured from the stage's centre, where it is on screen.
function zoom(view: View, factor: number, cx = 0, cy = 0): View {
  const k = Math.min(MAX, Math.max(MIN, view.k * factor));
  const f = k / view.k;
  return { k, x: cx - (cx - view.x) * f, y: cy - (cy - view.y) * f };
}

// A pan-and-zoom surface for a prototype's subject, like the canvas of a design tool. Drag or scroll to pan, pinch or
// ctrl-scroll to zoom, and press the percentage to go back to the starting view. Use it for visual subjects only:
// it takes over dragging, so anything the user needs to drag inside it won't work.
export function Stage({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState(HOME);
  const element = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const fromCentre = (clientX: number, clientY: number) => {
    const rect = element.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 } : { x: 0, y: 0 };
  };

  // React registers wheel listeners as passive, and a passive listener can't stop the page from zooming or scrolling.
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const point = fromCentre(event.clientX, event.clientY);
        setView((v) => zoom(v, Math.exp(-event.deltaY * 0.01), point.x, point.y));
      } else {
        setView((v) => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }));
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerMove(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1];
    pointers.current.set(event.pointerId, current);
    if (!other) {
      setView((v) => ({ ...v, x: v.x + current.x - previous.x, y: v.y + current.y - previous.y }));
      return;
    }
    const before = Math.hypot(previous.x - other.x, previous.y - other.y);
    const after = Math.hypot(current.x - other.x, current.y - other.y);
    const middle = fromCentre((current.x + other.x) / 2, (current.y + other.y) / 2);
    if (before > 0) setView((v) => zoom(v, after / before, middle.x, middle.y));
  }

  const release = (event: React.PointerEvent) => pointers.current.delete(event.pointerId);

  return (
    <div
      ref={element}
      className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        {children}
      </div>
      <div
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 flex items-center rounded-lg border border-border bg-background"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Button variant="ghost" className="size-11" aria-label="Zoom out" onClick={() => setView((v) => zoom(v, 1 / 1.5))}>
          <MinusIcon />
        </Button>
        <Button
          variant="ghost"
          className="h-11 w-14 font-mono text-xs tabular-nums"
          aria-label="Reset view"
          onClick={() => setView(HOME)}
        >
          {Math.round(view.k * 100)}%
        </Button>
        <Button variant="ghost" className="size-11" aria-label="Zoom in" onClick={() => setView((v) => zoom(v, 1.5))}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
