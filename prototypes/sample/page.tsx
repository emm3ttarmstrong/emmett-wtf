"use client";

import { ControlPanel, useControls } from "@/components/control-panel";
import { controls as schema, SLUG } from "./data";
import { Drawing } from "./drawing";

export default function Sample() {
  const controls = useControls(SLUG, schema);
  return (
    <ControlPanel controls={controls}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center p-6">
        <div className="aspect-square w-full max-h-full">
          <Drawing {...controls.values} />
        </div>
      </div>
    </ControlPanel>
  );
}
