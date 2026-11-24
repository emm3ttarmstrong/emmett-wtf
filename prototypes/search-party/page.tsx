"use client";

import { Scene } from "./scene";
import { Scoreboard } from "./scoreboard";
import { Shop } from "./shop";
import { useGame } from "./use-game";

export default function SearchParty() {
  const game = useGame();
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* The room spans the whole page, so a wide screen shows all of it. */}
      <div className="h-[44dvh] w-full shrink-0 p-2 pb-0">
        <Scene onAim={game.aim} setPainter={game.setPainter} />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <Scoreboard state={game.state} />
        <Shop state={game.state} onHire={game.hire} onUpgrade={game.upgrade} onRestart={game.restart} />
      </div>
    </div>
  );
}
