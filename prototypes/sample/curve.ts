import type { CurveParams, Point } from "./types";

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// How many times the gear circles the ring before the pen returns to its start.
export function turns({ teeth, ring }: CurveParams) {
  return teeth / gcd(ring, teeth);
}

// A hypotrochoid, scaled to fit inside the unit circle.
export function curve(params: CurveParams, stepsPerTurn = 240): Point[] {
  const R = 1;
  const r = Math.min(params.teeth, params.ring - 1) / params.ring;
  const d = params.pen * r;
  const extent = R - r + d;
  const total = Math.round(turns(params) * stepsPerTurn);
  const points: Point[] = [];
  for (let i = 0; i <= total; i++) {
    const t = (i / stepsPerTurn) * Math.PI * 2;
    const k = ((R - r) / r) * t;
    points.push({
      x: ((R - r) * Math.cos(t) + d * Math.cos(k)) / extent,
      y: ((R - r) * Math.sin(t) - d * Math.sin(k)) / extent,
    });
  }
  return points;
}

export function toPath(points: Point[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(4)} ${p.y.toFixed(4)}`).join("") + "Z";
}
