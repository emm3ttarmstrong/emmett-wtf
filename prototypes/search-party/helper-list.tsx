import { Button } from "@/components/ui/button";
import { HELPERS } from "./data";
import { costOf, format } from "./game";
import type { GameState, HelperId } from "./types";

export function HelperList({ state, onHire }: { state: GameState; onHire: (id: HelperId) => void }) {
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4">
      {HELPERS.map((helper) => {
        const owned = state.owned[helper.id];
        const cost = costOf(helper, owned);
        return (
          <li key={helper.id} className="flex h-15 items-center gap-3 border-b border-border last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{helper.name}</span>
              <span className="block font-mono text-xs text-muted-foreground tabular-nums">+{helper.perSecond}/s</span>
            </span>
            <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">×{owned}</span>
            <Button className="h-11 w-24 shrink-0 font-mono tabular-nums" disabled={state.clues < cost} onClick={() => onHire(helper.id)} aria-label={`Hire ${helper.name} for ${format(cost)} clues`}>
              {format(cost)}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
