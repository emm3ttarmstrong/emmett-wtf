"use client";

import { useRef } from "react";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ColorControl, Control, ImageControl } from "./schema";

const MAX_IMAGE_SIDE = 1600;
const row = "flex min-h-11 items-center justify-between gap-4 text-sm";

// Uploaded images are scaled down before use, so a phone photo doesn't hold tens of megabytes in memory.
async function readImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.9);
}

function ColorField({ control, value, set }: { control: ColorControl; value: string | null; set: (v: string | null) => void }) {
  return (
    <div className={row}>
      {control.label}
      <div className="flex items-center gap-1">
        {value && control.default === null && (
          <Button variant="ghost" className="h-11" onClick={() => set(null)}>
            Auto
          </Button>
        )}
        <label className="flex h-11 cursor-pointer items-center gap-2">
          <span className="font-mono text-muted-foreground">{value ?? "auto"}</span>
          <span
            className="size-7 rounded-md border border-border bg-foreground"
            // The swatch shows the colour the user picked, which is data, not a design choice.
            style={value ? { backgroundColor: value } : undefined}
          />
          <input
            type="color"
            className="sr-only"
            aria-label={control.label}
            value={value ?? "#808080"}
            onChange={(event) => set(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function ImageField({ control, value, set }: { control: ImageControl; value: string | null; set: (v: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={row}>
      {control.label}
      <div className="flex items-center gap-1">
        {value && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-9 rounded-md border border-border object-cover" />
            <Button variant="ghost" className="size-11" aria-label={`Remove ${control.label}`} onClick={() => set(null)}>
              <XIcon />
            </Button>
          </>
        )}
        <Button variant="outline" className="h-11" onClick={() => input.current?.click()}>
          <ImagePlusIcon />
          {value ? "Replace" : "Choose"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={control.label}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              set(await readImage(file));
            } catch {}
          }}
        />
      </div>
    </div>
  );
}

export function Field({ control, value, onChange }: { control: Control; value: unknown; onChange: (value: never) => void }) {
  const set = onChange as (value: unknown) => void;
  if (control.type === "color") return <ColorField control={control} value={value as string | null} set={set} />;
  if (control.type === "image") return <ImageField control={control} value={value as string | null} set={set} />;
  if (control.type === "toggle") {
    return (
      <label className={row}>
        {control.label}
        <Switch checked={value as boolean} onCheckedChange={set} />
      </label>
    );
  }
  if (control.type === "select") {
    return (
      <label className={row}>
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
