"use client";

import { findsSoFar, newGame } from "./game";
import { HelperList } from "./helper-list";
import { Scene } from "./scene";
import { Scoreboard } from "./scoreboard";
import { useGame } from "./use-game";

// Shown until the saved game loads, so the layout doesn't jump.
const EMPTY = newGame(0);

export default function SearchParty() {
  const { state, search, hire } = useGame();
  const game = state ?? EMPTY;
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
      <div className="mx-auto aspect-[39/38] h-[44dvh] max-w-full shrink-0 p-2 pb-0">
        <Scene finds={state ? findsSoFar(state.checked).length : 0} owned={game.owned} onSearch={search} />
      </div>
      <Scoreboard state={game} />
      <HelperList state={game} onHire={hire} />
    </div>
  );
}
