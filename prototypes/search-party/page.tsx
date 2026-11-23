"use client";

import { Scene } from "./scene";
import { Scoreboard } from "./scoreboard";
import { Shop } from "./shop";
import { useGame } from "./use-game";

export default function SearchParty() {
  const game = useGame();
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
      <div className="mx-auto aspect-[39/38] h-[44dvh] max-w-full shrink-0 p-2 pb-0">
        <Scene onTap={game.tap} setPainter={game.setPainter} />
      </div>
      <Scoreboard state={game.state} />
      <Shop state={game.state} onHire={game.hire} onUpgrade={game.upgrade} />
    </div>
  );
}
