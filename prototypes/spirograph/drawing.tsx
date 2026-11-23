import { curve, toPath } from "./curve";
import type { CurveParams } from "./types";

type Props = CurveParams & { layers: number; weight: number; animate: boolean };

// Colour comes from `currentColor`, so the drawing follows the theme tokens without reading the theme.
export function Drawing({ layers, weight, animate, ...params }: Props) {
  const path = toPath(curve(params));
  return (
    <svg viewBox="-1.05 -1.05 2.1 2.1" className="size-full text-foreground" role="img" aria-label="Spirograph drawing">
      <style>{`@keyframes spirograph-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }`}</style>
      {Array.from({ length: layers }, (_, i) => (
        <path
          key={`${path}-${i}-${animate}`}
          d={path}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={weight * 0.004}
          strokeLinejoin="round"
          strokeDasharray={1}
          opacity={1 - (i / layers) * 0.8}
          transform={`rotate(${(i * 360) / (layers * 12)}) scale(${1 - i * 0.12})`}
          className={animate ? "motion-safe:animate-[spirograph-draw_1.8s_cubic-bezier(0.16,1,0.3,1)_both]" : undefined}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </svg>
  );
}
