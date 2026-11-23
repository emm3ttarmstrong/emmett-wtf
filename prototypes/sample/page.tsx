"use client";

import { useRef } from "react";
import { ControlPanel, saveSvgAsPng, Stage, useControls } from "@/components/control-panel";
import { controls as schema, SLUG } from "./data";
import { Drawing } from "./drawing";

export default function Sample() {
  const controls = useControls(SLUG, schema);
  const drawing = useRef<SVGSVGElement>(null);
  return (
    <ControlPanel controls={controls} exportImage={() => drawing.current && saveSvgAsPng(drawing.current, SLUG)}>
      <Stage>
        <div className="aspect-square w-[min(80vmin,40rem)]">
          <Drawing ref={drawing} {...controls.values} />
        </div>
      </Stage>
    </ControlPanel>
  );
}
