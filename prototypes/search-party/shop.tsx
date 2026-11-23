import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HELPERS, UPGRADES } from "./data";
import { costOf, format, upgradeCost } from "./game";
import type { Economy, HelperId, UpgradeId } from "./types";

type RowProps = { name: string; note: string; count: string; cost: number | null; clues: number; onBuy: () => void };

function Row({ name, note, count, cost, clues, onBuy }: RowProps) {
  return (
    <li className="flex h-15 items-center gap-3 border-b border-border last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{note}</span>
      </span>
      <span className="w-10 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">{count}</span>
      <Button className="h-11 w-24 shrink-0 font-mono tabular-nums" disabled={cost === null || clues < cost} onClick={onBuy} aria-label={cost === null ? `${name} is at its maximum` : `Buy ${name} for ${format(cost)} clues`}>
        {cost === null ? "Max" : format(cost)}
      </Button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="pt-3 pb-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

type Props = { state: Economy; onHire: (id: HelperId) => void; onUpgrade: (id: UpgradeId) => void };

export function Shop({ state, onHire, onUpgrade }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 pb-2">
      <Section title="Your torch">
        {UPGRADES.map((item) => {
          const level = state.upgrades[item.id];
          return <Row key={item.id} name={item.name} note={item.note} count={`Lv ${level}`} cost={level >= item.max ? null : upgradeCost(item, level)} clues={state.clues} onBuy={() => onUpgrade(item.id)} />;
        })}
      </Section>
      <Section title="Help">
        {HELPERS.map((helper) => (
          <Row key={helper.id} name={helper.name} note={helper.note} count={`×${state.owned[helper.id]}`} cost={costOf(helper, state.owned[helper.id])} clues={state.clues} onBuy={() => onHire(helper.id)} />
        ))}
      </Section>
    </div>
  );
}
