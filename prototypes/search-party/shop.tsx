import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GROUPS, ITEMS } from "./data";
import { costOf, format } from "./game";
import type { Economy, ItemId } from "./types";

type RowProps = { name: string; note: string; level: number; cost: number | null; clues: number; onBuy: () => void };

function Row({ name, note, level, cost, clues, onBuy }: RowProps) {
  return (
    <li className="flex h-15 items-center gap-3 border-b border-border last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{note}</span>
      </span>
      <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">{level > 0 ? `Lv ${level}` : ""}</span>
      <Button className="h-11 w-24 shrink-0 font-mono tabular-nums" disabled={cost === null || clues < cost} onClick={onBuy} aria-label={cost === null ? `${name} is at its maximum` : `Buy ${name} for ${format(cost)} clues`}>
        {cost === null ? "Max" : format(cost)}
      </Button>
    </li>
  );
}

// Asks once before erasing, in place, so the row keeps its height.
function StartOver({ onRestart }: { onRestart: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex h-15 items-center justify-end gap-2">
      {asking ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Erase everything?</span>
          <Button variant="outline" className="h-11 shrink-0" onClick={() => setAsking(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-11 shrink-0"
            onClick={() => {
              setAsking(false);
              onRestart();
            }}
          >
            Erase
          </Button>
        </>
      ) : (
        <Button variant="outline" className="h-11" onClick={() => setAsking(true)}>
          Start over
        </Button>
      )}
    </div>
  );
}

type Props = { state: Economy; onBuy: (id: ItemId) => void; onRestart: () => void };

export function Shop({ state, onBuy, onRestart }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 pb-2">
      {GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="pt-3 pb-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">{group.title}</h2>
          <ul>
            {ITEMS.filter((item) => item.group === group.id).map((item) => (
              <Row key={item.id} name={item.name} note={item.note} level={state.levels[item.id]} cost={costOf(item, state.levels[item.id])} clues={state.clues} onBuy={() => onBuy(item.id)} />
            ))}
          </ul>
        </section>
      ))}
      <StartOver onRestart={onRestart} />
    </div>
  );
}
