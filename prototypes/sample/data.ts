import type { Schema } from "@/components/control-panel";

export const SLUG = "sample";

export const controls = {
  gears: { type: "section", label: "Gears" },
  ring: { type: "range", label: "Ring teeth", min: 24, max: 120, step: 1, default: 96 },
  teeth: { type: "range", label: "Gear teeth", min: 5, max: 80, step: 1, default: 35 },
  pen: { type: "range", label: "Pen offset", min: 0.1, max: 1.5, step: 0.05, default: 0.8 },
  line: { type: "section", label: "Line" },
  layers: { type: "range", label: "Layers", min: 1, max: 6, step: 1, default: 3 },
  weight: { type: "range", label: "Weight", min: 0.5, max: 3, step: 0.25, default: 1 },
  ink: { type: "color", label: "Ink", default: null },
  animate: { type: "toggle", label: "Draw on change", default: true },
  backdropSection: { type: "section", label: "Backdrop" },
  backdrop: { type: "image", label: "Image" },
  backdropOpacity: { type: "range", label: "Opacity", min: 0.1, max: 1, step: 0.05, default: 0.4 },
} satisfies Schema;
