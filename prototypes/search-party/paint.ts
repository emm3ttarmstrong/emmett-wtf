import { bulbsInView, crewSize, designOf, handOf, headSize, lanternSize, moonAngle, moonWindow, posesAt, segmentsInView, torchLong, torchWide, VIEW } from "./beams";
import { GEO, ITEMS, TUNING } from "./data";
import { findsSoFar } from "./game";
import type { Economy, Glint, World } from "./types";
import { flashing, sheetY, stashesInView } from "./world";

// A light or sprite parked here is far outside the artboard.
const PARKED = -3000;
// Rive reads scale as a percentage. Glints are drawn a little larger than their artwork so they read on a phone.
const GLINT_SIZE = 135;
const CREW = ["intern", "crawler", "detective", "satellite"] as const;
const LOOP = GEO.designs * GEO.segment;

// A glint's star and its glow. The star only twinkles gently. While a light is finding it, the glow grows steadily
// brighter, and when it is found the star swells once and is gone.
function glintLook(glint: Glint, index: number, time: number) {
  if (glint.state === "off") return { size: 0, glow: 0 };
  if (glint.state === "on") return { size: GLINT_SIZE * (0.9 + 0.1 * Math.sin(time * 2 + index * 1.7)) * (1 + 0.25 * glint.charge), glow: 100 * (0.3 + 2.2 * glint.charge) };
  const done = 1 - glint.timer / TUNING.popSeconds;
  return { size: GLINT_SIZE * (1.25 + 1.2 * done) * (1 - done * done), glow: 250 * (1 - done) };
}

// Two copies of a repeating layer, placed so that between them they cover the view. `shift` is how far the layer
// has slid, and `period` is the width of one copy.
function tiled(shift: number, period: number, needAt: number | null = null) {
  const offset = ((shift % period) + period) % period;
  // With nothing particular to cover, the copies sit side by side from the left edge.
  const first = needAt === null ? 0 : Math.floor((needAt + offset) / period);
  return [first * period - offset, (first + 1) * period - offset];
}

// Every value the Rive view model needs to draw this instant of the game. The names match art/rig.mjs.
// The world is in world space and the artboard is one view of it, so everything is shifted by the camera.
export function frameValues(world: World, state: Economy) {
  const { hero, camX } = world;
  const poses = posesAt(world.time, camX, state);
  const hand = handOf(hero.x, hero.facing);
  const head = GEO.lights.head;
  const numbers: Record<string, number> = {
    heroX: hero.x - camX,
    facing: hero.facing * 100,
    // The torch angle inside the searcher's own, possibly mirrored, space.
    aim: hero.facing * hero.turn - 90,
    beamX: hand.x - camX,
    beamAngle: hero.turn - 90,
    beamWide: 100 * torchWide(state),
    beamLong: 100 * torchLong(state),
    // The Stronger bulb shows as a brighter beam, from just over half strength to full. Rive reads opacity as 0 to 1.
    beamBright: 0.55 + 0.45 * (state.levels.bulb / 6),
    headX: hero.x + hero.facing * head.dx - camX,
    headAim: hero.facing === 1 ? head.angle : 180 - head.angle,
    headSize: 100 * headSize(state),
    lantern: 100 * lanternSize(state),
    moonAim: moonAngle(world.time),
    flashX: flashing(world) ? 0 : -5000,
    catCollar: state.levels.cat > 0 ? 100 : 0,
    find: findsSoFar(state.earned).length,
    findX: Math.max(PARKED, world.findX - camX),
    dogX: world.dog.x - camX,
    dogDir: world.dog.dir * 100,
    mouseX: world.mouse.active ? world.mouse.x - camX : PARKED,
    mouseDir: world.mouse.dir * 100,
    mothX: world.moth.active ? world.moth.x - camX : PARKED,
    mothY: world.moth.y,
    alertX: world.phone.active ? world.phone.x - camX : PARKED,
    alertY: world.phone.y - 16,
    alertS: world.phone.active ? 100 * (1 + 0.18 * Math.sin(world.time * 16)) : 0,
  };

  // Each of the eight places is drawn once. It is put wherever its nearest turn in the loop is.
  const middle = camX + VIEW / 2;
  for (let d = 0; d < GEO.designs; d++) {
    const centre = d * GEO.segment + GEO.segment / 2;
    numbers[`seg${d}x`] = d * GEO.segment + Math.round((middle - centre) / LOOP) * LOOP - camX;
  }
  // The skyline slides slowly behind the windows, and the foreground shapes pass faster than the room.
  const windows = GEO.lights.moon.windows as Record<string, number>;
  const glass = segmentsInView(camX, 0).flatMap((k) => (String(designOf(k)) in windows ? [k * GEO.segment + windows[String(designOf(k))] - 60 - camX] : []));
  // There are two copies of the skyline. One goes behind the first window in view. The other goes behind the second
  // window if there is one, and otherwise next to the first copy, in case that window straddles its edge.
  const sky = (needAt: number | null) => tiled(camX * GEO.sky.factor, GEO.sky.period, needAt);
  numbers.skyAx = sky(glass[0] ?? null)[0];
  numbers.skyBx = glass.length > 1 ? sky(glass[1])[0] : sky(glass[0] ?? null)[1];
  [numbers.foreAx, numbers.foreBx] = tiled(camX * GEO.fore.factor, GEO.fore.period);

  // Ceiling bulbs and the moonbeam are pooled lights, moved to whichever bulb or window is in view.
  const bulbs = bulbsInView(camX, state);
  for (let i = 0; i < GEO.lights.bulb.pool; i++) {
    numbers[`bulb${i}x`] = i < bulbs.length ? bulbs[i] - camX : PARKED;
    numbers[`bulb${i}`] = i < bulbs.length ? 100 : 0;
  }
  const window = moonWindow(camX, state);
  numbers.moonX = window === null ? PARKED : window - camX;
  numbers.moon = window === null ? 0 : 100;

  for (const id of CREW) {
    const size = crewSize(state, id);
    numbers[`${id}X`] = poses[id].x - camX;
    // A helper that hasn't been hired has its light parked off the artboard.
    numbers[`${id}BeamX`] = size > 0 ? poses[id].beam.x - camX : PARKED;
    numbers[`${id}Aim`] = poses[id].beam.angle;
    numbers[`${id}Size`] = 100 * Math.max(1, size);
  }
  world.glints.forEach((glint, i) => {
    const look = glintLook(glint, i, world.time);
    numbers[`g${i}x`] = glint.x - camX;
    numbers[`g${i}y`] = glint.y;
    numbers[`g${i}s`] = look.size;
    numbers[`g${i}c`] = look.glow;
  });
  // Stash markers are pooled too: each marker goes to a stash in view that is ready.
  const ready = stashesInView(camX).filter((stash) => world.time >= (world.stashes[stash.key]?.readyAt ?? 0));
  for (let i = 0; i < GEO.stashPool; i++) {
    const stash = ready[i];
    const charge = stash ? (world.stashes[stash.key]?.charge ?? 0) : 0;
    numbers[`stash${i}x`] = stash ? stash.x - camX : PARKED;
    numbers[`stash${i}y`] = stash ? stash.y : 0;
    numbers[`stash${i}`] = stash ? 100 * (0.94 + 0.06 * Math.sin(world.time * 2 + i) + 0.2 * charge) : 0;
    numbers[`stash${i}c`] = stash ? 100 * (0.5 + 1.8 * charge) : 0;
  }
  world.sheets.forEach((sheet, i) => {
    numbers[`p${i}x`] = sheet.active ? sheet.x - camX : PARKED;
    numbers[`p${i}y`] = sheetY(sheet, world.time);
    numbers[`p${i}s`] = sheet.active ? (sheet.big ? 190 : 100) : 0;
  });
  const booleans: Record<string, boolean> = { walking: hero.walking };
  for (const item of ITEMS) if (item.group === "crew") booleans[item.id] = state.levels[item.id] > 0;
  return { numbers, booleans };
}
