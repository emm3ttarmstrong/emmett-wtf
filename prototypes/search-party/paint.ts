import { handOf, posesAt, torchWide } from "./beams";
import { HELPERS, TUNING } from "./data";
import { findsSoFar } from "./game";
import type { Economy, Glint, World } from "./types";

// A light parked here is far outside the artboard, so a helper that hasn't been hired lights nothing.
const PARKED = -3000;

// Rive reads scale as a percentage. Glints are drawn a little larger than their artwork so they read on a phone.
const GLINT_SIZE = 135;

// A glint's star and its glow. The star only twinkles gently. While a light is finding it, the glow grows steadily
// brighter, and when it is found the star swells once and is gone.
function glintLook(glint: Glint, index: number, time: number) {
  if (glint.state === "off") return { size: 0, glow: 0 };
  if (glint.state === "on") return { size: GLINT_SIZE * (0.9 + 0.1 * Math.sin(time * 2 + index * 1.7)) * (1 + 0.25 * glint.charge), glow: 100 * (0.3 + 2.2 * glint.charge) };
  const done = 1 - glint.timer / TUNING.popSeconds;
  return { size: GLINT_SIZE * (1.25 + 1.2 * done) * (1 - done * done), glow: 250 * (1 - done) };
}

// Every value the Rive view model needs to draw this instant of the game. The names match art/rig.mjs.
export function frameValues(world: World, state: Economy) {
  const { hero } = world;
  const poses = posesAt(world.time);
  const hand = handOf(hero.x, hero.facing);
  const has = (id: "intern" | "crawler" | "detective" | "satellite") => state.owned[id] > 0;
  const numbers: Record<string, number> = {
    heroX: hero.x,
    facing: hero.facing * 100,
    // The torch angle inside the searcher's own, possibly mirrored, space.
    aim: hero.facing * hero.turn - 90,
    beamX: hand.x,
    beamAngle: hero.turn - 90,
    beamWide: 100 * torchWide(state),
    find: findsSoFar(state.earned).length,
    findX: world.findX,
    internX: poses.intern.x,
    internBeamX: has("intern") ? poses.intern.beam.x : PARKED,
    internAim: poses.intern.beam.angle,
    crawlerX: poses.crawler.x,
    crawlerBeamX: has("crawler") ? poses.crawler.beam.x : PARKED,
    crawlerAim: poses.crawler.beam.angle,
    detectiveX: poses.detective.x,
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
    const look = glintLook(glint, i, world.time);
    numbers[`g${i}s`] = look.size;
    numbers[`g${i}c`] = look.glow;
  });
  world.stashReadyAt.forEach((readyAt, i) => {
    const charge = world.stashCharge[i];
    const ready = world.time >= readyAt;
    numbers[`stash${i}`] = ready ? 100 * (0.94 + 0.06 * Math.sin(world.time * 2 + i) + 0.2 * charge) : 0;
    numbers[`stash${i}c`] = ready ? 100 * (0.5 + 1.8 * charge) : 0;
  });
  const booleans: Record<string, boolean> = { walking: hero.walking };
  for (const helper of HELPERS) booleans[helper.id] = state.owned[helper.id] > 0;
  return { numbers, booleans };
}
