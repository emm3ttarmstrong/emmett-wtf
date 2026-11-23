import { handOf, posesAt, torchHalf } from "./beams";
import { GEO, HELPERS, TUNING } from "./data";
import { findsSoFar } from "./game";
import type { Economy, Glint, World } from "./types";

const DEG = Math.PI / 180;
// A light parked here is far outside the artboard, so a helper that hasn't been hired lights nothing.
const PARKED = -3000;

// Rive reads scale as a percentage. Glints are drawn a little larger than their artwork so they read on a phone.
const GLINT_SIZE = 135;

function glintScale(glint: Glint, index: number, time: number) {
  if (glint.state === "off") return 0;
  if (glint.state === "on") return GLINT_SIZE * (0.82 + 0.18 * Math.sin(time * 3 + index * 1.7));
  // A collected glint swells and then vanishes.
  const done = 1 - glint.timer / TUNING.popSeconds;
  return GLINT_SIZE * (1 + 1.6 * done) * (1 - done * done);
}

// Every value the Rive view model needs to draw this instant of the game. The names match art/rig.mjs.
export function frameValues(world: World, state: Economy) {
  const { hero } = world;
  const poses = posesAt(world.time);
  const hand = handOf(hero.x, hero.turn);
  const has = (id: "intern" | "crawler" | "detective" | "satellite") => state.owned[id] > 0;
  const numbers: Record<string, number> = {
    heroX: hero.x,
    facing: hero.turn >= 0 ? 100 : -100,
    // The torch angle inside the searcher's own, possibly mirrored, space.
    aim: Math.abs(hero.turn) - 90,
    beamX: hand.x,
    beamAngle: hero.turn - 90,
    beamWide: (100 * Math.tan(torchHalf(state) * DEG)) / Math.tan(GEO.beams.main.half * DEG),
    find: findsSoFar(state.earned).length,
    internX: poses.intern.x,
    internBeamX: has("intern") ? poses.intern.beam.x : PARKED,
    internAim: poses.intern.beam.angle,
    crawlerX: poses.crawler.x,
    crawlerBeamX: has("crawler") ? poses.crawler.beam.x : PARKED,
    crawlerAim: poses.crawler.beam.angle,
    detectiveBeamX: has("detective") ? poses.detective.beam.x : PARKED,
    detectiveAim: poses.detective.beam.angle,
    satelliteX: poses.satellite.x,
    satelliteBeamX: has("satellite") ? poses.satellite.beam.x : PARKED,
    satelliteAim: poses.satellite.beam.angle,
    dogX: poses.dog.x,
    dogDir: poses.dog.dir * 100,
    mouseX: world.mouse.x,
    mouseDir: world.mouse.dir * 100,
  };
  world.glints.forEach((glint, i) => {
    numbers[`g${i}x`] = glint.x;
    numbers[`g${i}y`] = glint.y;
    numbers[`g${i}s`] = glintScale(glint, i, world.time);
  });
  world.stashReadyAt.forEach((readyAt, i) => {
    numbers[`stash${i}`] = world.time >= readyAt ? 100 * (0.9 + 0.15 * Math.sin(world.time * 4 + i)) : 0;
  });
  const booleans: Record<string, boolean> = { walking: hero.walking };
  for (const helper of HELPERS) booleans[helper.id] = state.owned[helper.id] > 0;
  return { numbers, booleans };
}
