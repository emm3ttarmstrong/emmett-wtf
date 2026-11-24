import { GEO, TUNING } from "./data";
import type { Beam, Economy, Point, Poses } from "./types";

const DEG = Math.PI / 180;

// An angle folded into the range -180 to 180.
export const fold = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180;

// Whether a point is inside a beam. The margin lets a glint count as soon as its edge is lit, not only its centre.
export function inBeam(beam: Beam, point: Point, margin = 4) {
  const dx = point.x - beam.x;
  const dy = point.y - beam.y;
  const cos = Math.cos(beam.angle * DEG);
  const sin = Math.sin(beam.angle * DEG);
  const along = dx * cos + dy * sin;
  if (along < beam.start - margin || along > beam.length) return false;
  const across = Math.abs(dy * cos - dx * sin);
  const span = Math.max(1, beam.length - beam.start);
  return across <= beam.near + ((beam.far - beam.near) * Math.max(0, along - beam.start)) / span + margin;
}

// How the torch upgrades change the beam. Each is also what the Rive file is told, so the picture and the rules agree.
export const torchWide = (state: Economy) => 1 + TUNING.lensWiden * state.levels.lens;
export const torchLong = (state: Economy) => 1 + TUNING.reachLengthen * state.levels.reach;
export const torchDwell = (state: Economy) => TUNING.torchDwell / (1 + TUNING.bulbQuicken * state.levels.bulb);
// How big a helper's light is, as a multiple of its starting size. Zero until it is hired.
export const crewSize = (state: Economy, id: "intern" | "crawler" | "detective" | "satellite") => (state.levels[id] > 0 ? 1 + TUNING.crewGrow * (state.levels[id] - 1) : 0);
export const headSize = (state: Economy) => (state.levels.headlamp > 0 ? 0.7 + 0.3 * state.levels.headlamp : 0);
export const lanternSize = (state: Economy) => (state.levels.lantern > 0 ? 0.6 + 0.4 * state.levels.lantern : 0);

// The searcher's hand, which the torch turns around. It is on whichever side the searcher faces.
export const handOf = (heroX: number, facing: 1 | -1): Point => ({ x: heroX + facing * GEO.hero.handX, y: GEO.hero.handY });

// The torch's beam. It starts at the lens, a little way out from the hand.
export function torchBeam(heroX: number, facing: 1 | -1, turn: number, state: Economy): Beam {
  const { start, length, near, far } = GEO.beams.main;
  const wide = torchWide(state);
  const long = torchLong(state);
  return { ...handOf(heroX, facing), angle: turn - 90, start: start * long, length: length * long, near: near * wide, far: far * wide };
}

// The turn that points the torch from a hand at a point, kept away from straight down.
export function turnTowards(hand: Point, point: Point) {
  const turn = fold(Math.atan2(point.y - hand.y, point.x - hand.x) / DEG + 90);
  return Math.max(-TUNING.maxTurn, Math.min(TUNING.maxTurn, turn));
}

const sized = (beam: Omit<Beam, "start">, size: number): Beam => ({ ...beam, start: 0, length: beam.length * size, near: beam.near * size, far: beam.far * size });

// The headlamp points wherever the searcher faces.
export function headBeam(heroX: number, facing: 1 | -1, state: Economy): Beam {
  const head = GEO.lights.head;
  return sized({ x: heroX + facing * head.dx, y: head.y, angle: facing === 1 ? head.angle : 180 - head.angle, length: head.length, near: head.near, far: head.far }, headSize(state));
}

// The lights that belong to the room: the ceiling bulbs that have been fixed, and the moon once the curtains are open.
export function roomLights(time: number, state: Economy): Beam[] {
  const { bulbs, bulb, moon } = GEO.lights;
  const lights = bulbs.slice(0, state.levels.bulbs).map((at) => sized({ ...at, angle: 90, ...bulb }, 1));
  if (state.levels.curtains > 0) lights.push(sized({ ...moon, angle: moonAngle(time) }, 1));
  return lights;
}

export const moonAngle = (time: number) => GEO.lights.moon.angle + GEO.lights.moon.swing * Math.sin(time * 0.1);

// Each helper follows a fixed path that depends only on the clock, so the game and the drawing always agree.
// They wander the whole width of the room, slowly enough for their lights to rest on things.
export function posesAt(time: number, state: Economy): Poses {
  const b = GEO.beams;
  const middle = GEO.width / 2;
  const pose = (name: keyof Poses, x: number, angle: number) => ({ x, beam: sized({ x: x + b[name].dx, y: b[name].oy, angle, length: b[name].length, near: b[name].near, far: b[name].far }, crewSize(state, name)) });
  return {
    intern: pose("intern", middle + 480 * Math.sin(time * 0.045), -35 + 10 * Math.sin(time * 1.1) + 4 * Math.sin(time * 2.7)),
    crawler: pose("crawler", middle + 30 + 470 * Math.sin(time * 0.07 + 1), -152 + 20 * Math.sin(time * 0.9)),
    detective: pose("detective", middle - 60 + 430 * Math.sin(time * 0.028 + 2), -18 + 20 * Math.sin(time * 0.18)),
    satellite: pose("satellite", middle + 520 * Math.sin(time * 0.05 + 4), 90 + 14 * Math.sin(time * 0.37)),
  };
}

// Where the dog would be if it had nothing to chase.
export const dogPatrol = (time: number) => GEO.width / 2 + 520 * Math.sin(time * 0.06 + 3);
