import { FINDS } from "./data";
import { findProgress, findsSoFar, format, nextFind, perSecond } from "./game";
import type { Economy } from "./types";

// One decimal while the rate is small, so the first intern visibly counts.
const rate = (value: number) => (value < 100 ? String(Number(value.toFixed(1))) : format(value));

export function Scoreboard({ state }: { state: Economy }) {
  const found = findsSoFar(state.earned);
  const latest = found.at(-1);
  const next = nextFind(state.earned);
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="font-mono text-5xl leading-none font-medium tracking-tighter tabular-nums sm:text-6xl">{format(state.clues)}</div>
      <div className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground">
        <span>clues</span>
        <span className="font-mono tabular-nums">+{rate(perSecond(state))}/s</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progress to the next find" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(findProgress(state.earned) * 100)}>
        <div className="h-full origin-left bg-primary motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out" style={{ transform: `scaleX(${findProgress(state.earned)})` }} />
      </div>
      <div className="flex min-h-5 items-baseline justify-between gap-4 text-sm" aria-live="polite">
        <span className="truncate font-medium">{latest ? `Found: ${latest.name}` : "Tap the room to search"}</span>
        <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
          {next ? `${found.length}/${FINDS.length} · next at ${format(next.at)}` : `${found.length}/${FINDS.length}`}
        </span>
      </div>
    </div>
  );
}
