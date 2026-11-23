"use client";

import { useState } from "react";
import { CheckIcon, DownloadIcon, LinkIcon, RotateCcwIcon, ShuffleIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Field } from "./fields";
import type { Schema } from "./schema";
import type { Controls } from "./use-controls";

type Props<S extends Schema> = {
  controls: Controls<S>;
  // Saves the subject as an image. When given, the panel shows "Save image". See export.ts for ready-made savers.
  exportImage?: () => unknown;
  children: React.ReactNode;
};

function Panel<S extends Schema>({ controls, exportImage }: Omit<Props<S>, "children">) {
  const [copied, setCopied] = useState(false);
  const values = controls.values as Record<string, unknown>;
  const set = controls.set as (key: string, value: unknown) => void;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(controls.shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(controls.schema).map(([key, control]) =>
        control.type === "section" ? (
          <h2 key={key} className="mt-4 border-t border-border pt-4 text-xs font-medium text-muted-foreground first:mt-0 first:border-0 first:pt-0">
            {control.label}
          </h2>
        ) : (
          <Field key={key} control={control} value={values[key]} onChange={(value) => set(key, value)} />
        ),
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        <Button variant="outline" className="h-11" onClick={controls.randomize}>
          <ShuffleIcon />
          Randomize
        </Button>
        <Button variant="ghost" className="h-11" onClick={controls.reset}>
          <RotateCcwIcon />
          Reset
        </Button>
        {exportImage && (
          <Button variant="ghost" className="h-11" onClick={() => exportImage()}>
            <DownloadIcon />
            Save image
          </Button>
        )}
        <Button variant="ghost" className="h-11" onClick={copyLink}>
          {copied ? <CheckIcon /> : <LinkIcon />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

// Lays out a prototype's subject with its controls: a column on the right from `lg` up, a bottom sheet below that.
export function ControlPanel<S extends Schema>({ controls, exportImage, children }: Props<S>) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {children}
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] size-11 lg:hidden"
                aria-label="Controls"
              />
            }
          >
            <SlidersHorizontalIcon />
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Controls</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Panel controls={controls} exportImage={exportImage} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-4 lg:block">
        <Panel controls={controls} exportImage={exportImage} />
      </aside>
    </div>
  );
}
