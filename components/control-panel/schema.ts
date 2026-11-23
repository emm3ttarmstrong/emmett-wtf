// A control schema describes a prototype's tunable parameters. Everything here is pure, so it tests without React.
export type RangeControl = { type: "range"; label: string; min: number; max: number; step?: number; default: number };
export type ToggleControl = { type: "toggle"; label: string; default: boolean };
export type SelectControl = { type: "select"; label: string; options: readonly string[]; default: string };
export type Control = RangeControl | ToggleControl | SelectControl;
export type Schema = Record<string, Control>;

export type Values<S extends Schema> = {
  [K in keyof S]: S[K] extends RangeControl ? number : S[K] extends ToggleControl ? boolean : string;
};

export function defaults<S extends Schema>(schema: S): Values<S> {
  return Object.fromEntries(Object.entries(schema).map(([key, c]) => [key, c.default])) as Values<S>;
}

function snap(c: RangeControl, value: number) {
  const step = c.step ?? 1;
  const snapped = c.min + Math.round((value - c.min) / step) * step;
  return Number(Math.min(c.max, Math.max(c.min, snapped)).toFixed(6));
}

export function randomize<S extends Schema>(schema: S, random: () => number = Math.random): Values<S> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, c]) => {
      if (c.type === "range") return [key, snap(c, c.min + random() * (c.max - c.min))];
      if (c.type === "toggle") return [key, random() < 0.5];
      return [key, c.options[Math.floor(random() * c.options.length)]];
    }),
  ) as Values<S>;
}

// Keeps only stored values that still fit the schema, so an old localStorage entry can't break a changed prototype.
export function sanitize<S extends Schema>(schema: S, stored: unknown): Values<S> {
  const base = defaults(schema) as Record<string, unknown>;
  if (stored && typeof stored === "object") {
    for (const [key, c] of Object.entries(schema)) {
      const value = (stored as Record<string, unknown>)[key];
      if (c.type === "range" && typeof value === "number" && Number.isFinite(value)) base[key] = snap(c, value);
      if (c.type === "toggle" && typeof value === "boolean") base[key] = value;
      if (c.type === "select" && typeof value === "string" && c.options.includes(value)) base[key] = value;
    }
  }
  return base as Values<S>;
}
