"use client";

import { Scene } from "./scene";
import { Scoreboard } from "./scoreboard";
import { Shop } from "./shop";
import { useGame } from "./use-game";

export default function SearchParty() {
  const game = useGame();
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* The walk spans the whole page, so a wide screen shows all of the view. */}
      <div className="h-[40dvh] w-full shrink-0 p-2 pb-0">
        <Scene onAim={game.aim} onRelease={game.release} onSeen={game.setSeen} setPainter={game.setPainter} />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <Scoreboard state={game.state} notice={game.notice} />
        <Shop state={game.state} onBuy={game.buy} onRestart={game.restart} />
      </div>
    </div>
  );
}
