import { FINDS } from "./data";
import { findsSoFar, format, perSecond } from "./game";
import type { GameState } from "./types";

// One decimal while the rate is small, so the first intern visibly counts.
const rate = (value: number) => (value < 100 ? String(Number(value.toFixed(1))) : format(value));

export function Scoreboard({ state }: { state: GameState }) {
  const found = findsSoFar(state.checked);
  const latest = found.at(-1);
  return (
    <div className="flex flex-col gap-1 px-4 py-4">
      <div className="font-mono text-5xl leading-none font-medium tracking-tighter tabular-nums sm:text-6xl">{Math.floor(state.checked).toLocaleString("en")}</div>
      <div className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground">
        <span>places checked</span>
        <span className="font-mono tabular-nums">
          {format(state.clues)} clues · {rate(perSecond(state))}/s
        </span>
      </div>
      <div className="flex min-h-6 items-baseline justify-between gap-4 pt-1 text-sm" aria-live="polite">
        <span className="truncate font-medium">{latest ? `Found: ${latest.name}` : "Tap the room to search"}</span>
        <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
          {found.length}/{FINDS.length}
        </span>
      </div>
    </div>
  );
}
