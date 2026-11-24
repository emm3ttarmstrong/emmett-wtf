import { GEO, TUNING } from "./data";
import type { Beam, Economy, Follower, Point } from "./types";

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
export const torchDwell = (state: Economy) => TUNING.torchDwell / (1 + TUNING.bulbQuicken * state.levels.bulb);

export type Crew = "intern" | "crawler" | "detective" | "satellite";
export const CREW: readonly Crew[] = ["intern", "crawler", "detective", "satellite"];
// How big a helper's light is, as a multiple of its starting size. Zero until it is hired.
export const crewSize = (state: Economy, id: Crew) => (state.levels[id] > 0 ? 1 + TUNING.crewGrow * (state.levels[id] - 1) : 0);

// The searcher's hand, which the torch turns around. It is on whichever side the searcher faces.
export const handOf = (heroX: number, facing: 1 | -1): Point => ({ x: heroX + facing * GEO.hero.handX, y: GEO.hero.handY });

// The torch's beam. It starts at the lens, a little way out from the hand.
export function torchBeam(heroX: number, facing: 1 | -1, turn: number, state: Economy): Beam {
  const { start, length, near, far } = GEO.beams.main;
  const wide = torchWide(state);
  return { ...handOf(heroX, facing), angle: turn - 90, start, length, near: near * wide, far: far * wide };
}

// The turn that points the torch from a hand at a point, kept away from straight down.
export function turnTowards(hand: Point, point: Point) {
  const turn = fold(Math.atan2(point.y - hand.y, point.x - hand.x) / DEG + 90);
  return Math.max(-TUNING.maxTurn, Math.min(TUNING.maxTurn, turn));
}

const sized = (beam: Omit<Beam, "start">, size: number): Beam => ({ ...beam, start: 0, length: beam.length * size, near: beam.near * size, far: beam.far * size });

// The walk is a loop of places, each one segment wide. These say which place a stretch of the world is.
export const VIEW = GEO.width;
export const designOf = (segment: number) => ((segment % GEO.designs) + GEO.designs) % GEO.designs;
// The segments that are at least partly in view, with a little margin either side.
export function segmentsInView(camX: number, margin = 60) {
  const first = Math.floor((camX - margin) / GEO.segment);
  const last = Math.floor((camX + VIEW + margin) / GEO.segment);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

// The ceiling bulbs in view that have been fixed, as world positions.
export function bulbsInView(camX: number, state: Economy) {
  const working = TUNING.bulbOrder.slice(0, TUNING.bulbsLit[state.levels.bulbs]) as readonly number[];
  return segmentsInView(camX)
    .filter((k) => working.includes(designOf(k)))
    .map((k) => k * GEO.segment + GEO.lights.bulb.x);
}

// A working ceiling bulb throws a short, soft cone straight down.
export function bulbBeams(camX: number, state: Economy): Beam[] {
  const { y, length, near, far } = GEO.lights.bulb;
  return bulbsInView(camX, state).map((x) => sized({ x, y, angle: 90, length, near, far }, 1));
}

// How each helper swings its light, as an angle for someone facing right. It depends only on the clock.
const SWING: Record<Crew, (time: number) => number> = {
  intern: (time) => -38 + 10 * Math.sin(time * 1.1) + 4 * Math.sin(time * 2.7),
  crawler: (time) => -30 + 20 * Math.sin(time * 0.9),
  detective: (time) => -20 + 18 * Math.sin(time * 0.35),
  satellite: (time) => 90 + 14 * Math.sin(time * 0.37),
};

// A helper's light, from where they stand and which way they face. Facing left mirrors both the light's position
// and its angle.
export function crewBeam(id: Crew, follower: Follower, time: number, state: Economy): Beam {
  const b = GEO.beams[id];
  const angle = SWING[id](time);
  return sized({ x: follower.x + follower.dir * b.dx, y: b.oy, angle: follower.dir === 1 ? angle : 180 - angle, length: b.length, near: b.near, far: b.far }, crewSize(state, id));
}
