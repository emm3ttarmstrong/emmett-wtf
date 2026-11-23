// A control schema describes a prototype's tunable parameters. Everything here is pure, so it tests without React.
export type RangeControl = { type: "range"; label: string; min: number; max: number; step?: number; default: number };
export type ToggleControl = { type: "toggle"; label: string; default: boolean };
export type SelectControl = { type: "select"; label: string; options: readonly string[]; default: string };
// `null` means "follow the theme": the prototype falls back to a design token such as `currentColor`.
export type ColorControl = { type: "color"; label: string; default: string | null };
// The value is a data URL, or `null` when no image is chosen. Images stay in memory: they are never saved or shared.
export type ImageControl = { type: "image"; label: string };
export type Control = RangeControl | ToggleControl | SelectControl | ColorControl | ImageControl;
// A section is a heading inside the panel. It sits in the schema between the controls it groups and has no value.
export type Section = { type: "section"; label: string };
export type Schema = Record<string, Control | Section>;

type ValueOf<C> = C extends RangeControl
  ? number
  : C extends ToggleControl
    ? boolean
    : C extends SelectControl
      ? string
      : C extends ColorControl | ImageControl
        ? string | null
        : never;

export type Values<S extends Schema> = { [K in keyof S as S[K] extends Section ? never : K]: ValueOf<S[K]> };

type Loose = Record<string, unknown>;
const HEX = /^#[0-9a-f]{6}$/i;

function controlsOf(schema: Schema) {
  return Object.entries(schema).filter((entry): entry is [string, Control] => entry[1].type !== "section");
}

function snap(c: RangeControl, value: number) {
  const step = c.step ?? 1;
  const snapped = c.min + Math.round((value - c.min) / step) * step;
  return Number(Math.min(c.max, Math.max(c.min, snapped)).toFixed(6));
}

export function defaults<S extends Schema>(schema: S): Values<S> {
  return Object.fromEntries(
    controlsOf(schema).map(([key, c]) => [key, c.type === "image" ? null : c.default]),
  ) as Values<S>;
}

// Images keep their current value, because a random image means nothing.
export function randomize<S extends Schema>(schema: S, current: Values<S>, random: () => number = Math.random): Values<S> {
  return Object.fromEntries(
    controlsOf(schema).map(([key, c]) => {
      if (c.type === "range") return [key, snap(c, c.min + random() * (c.max - c.min))];
      if (c.type === "toggle") return [key, random() < 0.5];
      if (c.type === "select") return [key, c.options[Math.floor(random() * c.options.length)]];
      if (c.type === "color") {
        return [key, `#${Math.floor(random() * 0x1000000).toString(16).padStart(6, "0")}`];
      }
      return [key, (current as Loose)[key]];
    }),
  ) as Values<S>;
}

// Keeps only stored values that still fit the schema, so an old saved entry or a hand-edited link can't break a prototype.
export function sanitize<S extends Schema>(schema: S, stored: unknown): Values<S> {
  const base = defaults(schema) as Loose;
  if (stored && typeof stored === "object") {
    for (const [key, c] of controlsOf(schema)) {
      const value = (stored as Loose)[key];
      if (c.type === "range" && typeof value === "number" && Number.isFinite(value)) base[key] = snap(c, value);
      if (c.type === "toggle" && typeof value === "boolean") base[key] = value;
      if (c.type === "select" && typeof value === "string" && c.options.includes(value)) base[key] = value;
      if (c.type === "color" && (value === null || (typeof value === "string" && HEX.test(value)))) base[key] = value;
    }
  }
  return base as Values<S>;
}

// The values worth saving or sharing: everything except images.
export function portable<S extends Schema>(schema: S, values: Values<S>): Loose {
  return Object.fromEntries(
    controlsOf(schema)
      .filter(([, c]) => c.type !== "image")
      .map(([key]) => [key, (values as Loose)[key]]),
  );
}

export function encode(values: Loose) {
  return btoa(JSON.stringify(values)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decode(text: string): unknown {
  try {
    return JSON.parse(atob(text.replaceAll("-", "+").replaceAll("_", "/")));
  } catch {
    return null;
  }
}
