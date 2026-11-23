"use client";

import { RotateCcwIcon, ShuffleIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Control, Schema } from "./schema";
import type { Controls } from "./use-controls";

function Field({ control, value, onChange }: { control: Control; value: unknown; onChange: (value: never) => void }) {
  const set = onChange as (value: unknown) => void;
  if (control.type === "toggle") {
    return (
      <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
        {control.label}
        <Switch checked={value as boolean} onCheckedChange={set} />
      </label>
    );
  }
  if (control.type === "select") {
    return (
      <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
        {control.label}
        <NativeSelect value={value as string} onChange={(e) => set(e.target.value)}>
          {control.options.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {option}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    );
  }
  return (
    <div className="flex flex-col text-sm">
      <div className="flex justify-between">
        <span>{control.label}</span>
        <span className="font-mono text-muted-foreground tabular-nums">{value as number}</span>
      </div>
      <div className="flex h-11 items-center">
        <Slider
          aria-label={control.label}
          value={value as number}
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          onValueChange={set}
        />
      </div>
    </div>
  );
}

function Fields<S extends Schema>({ controls }: { controls: Controls<S> }) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(controls.schema).map(([key, control]) => (
        <Field
          key={key}
          control={control}
          value={controls.values[key]}
          onChange={(value) => controls.set(key, value)}
        />
      ))}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={controls.randomize}>
          <ShuffleIcon />
          Randomize
        </Button>
        <Button variant="ghost" className="h-11" onClick={controls.reset}>
          <RotateCcwIcon />
          Reset
        </Button>
      </div>
    </div>
  );
}

// Lays out a prototype's subject with its controls: a column on the right from `lg` up, a bottom sheet below that.
export function ControlPanel<S extends Schema>({ controls, children }: { controls: Controls<S>; children: React.ReactNode }) {
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
              <Fields controls={controls} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-4 lg:block">
        <Fields controls={controls} />
      </aside>
    </div>
  );
}
