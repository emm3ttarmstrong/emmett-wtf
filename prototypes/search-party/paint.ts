import { crewSize, handOf, headSize, lanternSize, moonAngle, posesAt, torchLong, torchWide } from "./beams";
import { GEO, ITEMS, TUNING } from "./data";
import { findsSoFar } from "./game";
import type { Economy, Glint, World } from "./types";
import { flashing, sheetY } from "./world";

// A light or sprite parked here is far outside the artboard.
const PARKED = -3000;
// Rive reads scale as a percentage. Glints are drawn a little larger than their artwork so they read on a phone.
const GLINT_SIZE = 135;
const CREW = ["intern", "crawler", "detective", "satellite"] as const;

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
  const poses = posesAt(world.time, state);
  const hand = handOf(hero.x, hero.facing);
  const head = GEO.lights.head;
  const numbers: Record<string, number> = {
    heroX: hero.x,
    facing: hero.facing * 100,
    // The torch angle inside the searcher's own, possibly mirrored, space.
    aim: hero.facing * hero.turn - 90,
    beamX: hand.x,
    beamAngle: hero.turn - 90,
    beamWide: 100 * torchWide(state),
    beamLong: 100 * torchLong(state),
    // The Stronger bulb shows as a brighter beam, from just over half strength to full. Rive reads opacity as 0 to 1.
    beamBright: 0.55 + 0.45 * (state.levels.bulb / 6),
    headX: hero.x + hero.facing * head.dx,
    headAim: hero.facing === 1 ? head.angle : 180 - head.angle,
    headSize: 100 * headSize(state),
    lantern: 100 * lanternSize(state),
    moon: state.levels.curtains > 0 ? 100 : 0,
    moonAim: moonAngle(world.time),
    flashX: flashing(world) ? 0 : -5000,
    catCollar: state.levels.cat > 0 ? 100 : 0,
    find: findsSoFar(state.earned).length,
    findX: world.findX,
    dogX: world.dog.x,
    dogDir: world.dog.dir * 100,
    mouseX: world.mouse.x,
    mouseDir: world.mouse.dir * 100,
    mothX: world.moth.active ? world.moth.x : PARKED,
    mothY: world.moth.y,
    alertX: GEO.phone.x,
    alertY: GEO.phone.y - 16,
    alertS: world.phone.active ? 100 * (1 + 0.18 * Math.sin(world.time * 16)) : 0,
  };
  GEO.lights.bulbs.forEach((_, i) => {
    numbers[`bulb${i}`] = state.levels.bulbs > i ? 100 : 0;
  });
  for (const id of CREW) {
    const size = crewSize(state, id);
    numbers[`${id}X`] = poses[id].x;
    // A helper that hasn't been hired has its light parked off the artboard.
    numbers[`${id}BeamX`] = size > 0 ? poses[id].beam.x : PARKED;
    numbers[`${id}Aim`] = poses[id].beam.angle;
    numbers[`${id}Size`] = 100 * Math.max(1, size);
  }
  world.glints.forEach((glint, i) => {
    const look = glintLook(glint, i, world.time);
    numbers[`g${i}x`] = glint.x;
    numbers[`g${i}y`] = glint.y;
    numbers[`g${i}s`] = look.size;
    numbers[`g${i}c`] = look.glow;
  });
  world.stashReadyAt.forEach((readyAt, i) => {
    const charge = world.stashCharge[i];
    const ready = world.time >= readyAt;
    numbers[`stash${i}`] = ready ? 100 * (0.94 + 0.06 * Math.sin(world.time * 2 + i) + 0.2 * charge) : 0;
    numbers[`stash${i}c`] = ready ? 100 * (0.5 + 1.8 * charge) : 0;
  });
  world.sheets.forEach((sheet, i) => {
    numbers[`p${i}x`] = sheet.active ? sheet.x : PARKED;
    numbers[`p${i}y`] = sheetY(sheet, world.time);
    numbers[`p${i}s`] = sheet.active ? (sheet.big ? 190 : 100) : 0;
  });
  const booleans: Record<string, boolean> = { walking: hero.walking };
  for (const item of ITEMS) if (item.group === "crew") booleans[item.id] = state.levels[item.id] > 0;
  return { numbers, booleans };
}
