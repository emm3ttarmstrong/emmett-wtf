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
  if (along < -margin || along > beam.length) return false;
  const across = Math.abs(dy * cos - dx * sin);
  return across <= beam.near + ((beam.far - beam.near) * Math.max(0, along)) / beam.length + margin;
}

// How much wider than the starting torch the beam is.
export const torchWide = (state: Economy) => 1 + TUNING.torchWiden * state.upgrades.torch;

// The searcher's hand, which the torch turns around. It is on whichever side the searcher faces.
export const handOf = (heroX: number, facing: 1 | -1): Point => ({ x: heroX + facing * GEO.hero.handX, y: GEO.hero.handY });

export function torchBeam(heroX: number, facing: 1 | -1, turn: number, state: Economy): Beam {
  const { length, near, far } = GEO.beams.main;
  const wide = torchWide(state);
  return { ...handOf(heroX, facing), angle: turn - 90, length, near: near * wide, far: far * wide };
}

// The turn that points the torch from a hand at a point, kept away from straight down.
export function turnTowards(hand: Point, point: Point) {
  const turn = fold(Math.atan2(point.y - hand.y, point.x - hand.x) / DEG + 90);
  return Math.max(-TUNING.maxTurn, Math.min(TUNING.maxTurn, turn));
}

// Each helper follows a fixed path that depends only on the clock, so the game and the drawing always agree.
// They wander the whole width of the room, slowly enough for their lights to rest on things.
export function posesAt(time: number): Poses {
  const b = GEO.beams;
  const middle = GEO.width / 2;
  const light = (name: "intern" | "crawler" | "detective" | "satellite", x: number, angle: number): Beam => ({ x: x + b[name].dx, y: b[name].oy, angle, length: b[name].length, near: b[name].near, far: b[name].far });
  const internX = middle + 480 * Math.sin(time * 0.045);
  const crawlerX = middle + 30 + 470 * Math.sin(time * 0.07 + 1);
  const detectiveX = middle - 60 + 430 * Math.sin(time * 0.028 + 2);
  const satelliteX = middle + 520 * Math.sin(time * 0.05 + 4);
  const dogPhase = time * 0.06 + 3;
  return {
    intern: { x: internX, beam: light("intern", internX, -35 + 10 * Math.sin(time * 1.1) + 4 * Math.sin(time * 2.7)) },
    crawler: { x: crawlerX, beam: light("crawler", crawlerX, -152 + 20 * Math.sin(time * 0.9)) },
    detective: { x: detectiveX, beam: light("detective", detectiveX, -18 + 20 * Math.sin(time * 0.18)) },
    satellite: { x: satelliteX, beam: light("satellite", satelliteX, 90 + 14 * Math.sin(time * 0.37)) },
    dog: { x: middle + 520 * Math.sin(dogPhase), dir: Math.cos(dogPhase) >= 0 ? 1 : -1 },
  };
}
