import type { Ref } from "react";
import { curve, toPath } from "./curve";
import type { CurveParams } from "./types";

type Props = CurveParams & {
  layers: number;
  weight: number;
  ink: string | null;
  animate: boolean;
  backdrop: string | null;
  backdropOpacity: number;
  ref?: Ref<SVGSVGElement>;
};

// Lines use `currentColor`. With no ink chosen that is the `text-foreground` token, so the drawing follows the theme.
export function Drawing({ layers, weight, ink, animate, backdrop, backdropOpacity, ref, ...params }: Props) {
  const path = toPath(curve(params));
  return (
    <svg
      ref={ref}
      viewBox="-1.05 -1.05 2.1 2.1"
      className="size-full text-foreground"
      // The ink is a colour the user picked in the control panel, which is data, not a design choice.
      style={ink ? { color: ink } : undefined}
      role="img"
      aria-label="Spirograph drawing"
    >
      <style>{`@keyframes sample-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }`}</style>
      {backdrop && (
        <image
          href={backdrop}
          x={-1.05}
          y={-1.05}
          width={2.1}
          height={2.1}
          opacity={backdropOpacity}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
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
          className={animate ? "motion-safe:animate-[sample-draw_1.8s_cubic-bezier(0.16,1,0.3,1)_both]" : undefined}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </svg>
  );
}
