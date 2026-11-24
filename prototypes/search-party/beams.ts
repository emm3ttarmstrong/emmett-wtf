import { GEO, TUNING } from "./data";
import type { Beam, Economy, Point, Poses } from "./types";

const DEG = Math.PI / 180;

// An angle folded into the range -180 to 180.
export const fold = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180;

export function inBeam(beam: Beam, point: Point, margin = 4) {
  const dx = point.x - beam.x;
  const dy = point.y - beam.y;
  const distance = Math.hypot(dx, dy);
  if (distance > beam.length) return false;
  if (distance < margin) return true;
  // The margin lets a glint count as soon as its edge is lit, not only its centre.
  const slack = Math.asin(Math.min(1, margin / distance)) / DEG;
  return Math.abs(fold(Math.atan2(dy, dx) / DEG - beam.angle)) <= beam.half + slack;
}

export const torchHalf = (state: Economy) => TUNING.torchHalf + TUNING.torchHalfStep * state.upgrades.torch;

// The searcher's hand, which the torch turns around. `flip` runs from -1 to 1 as the searcher turns round,
// so the hand slides across instead of jumping.
export const handOf = (heroX: number, flip: number): Point => ({ x: heroX + flip * GEO.hero.handX, y: GEO.hero.handY });

export function torchBeam(heroX: number, flip: number, turn: number, state: Economy): Beam {
  return { ...handOf(heroX, flip), angle: turn - 90, half: torchHalf(state), length: GEO.beams.main.length };
}

// The turn that points the torch from a hand at a point, kept away from straight down.
export function turnTowards(hand: Point, point: Point) {
  const turn = fold(Math.atan2(point.y - hand.y, point.x - hand.x) / DEG + 90);
  return Math.max(-TUNING.maxTurn, Math.min(TUNING.maxTurn, turn));
}

// Each helper follows a fixed path that depends only on the clock, so the game and the drawing always agree.
export function posesAt(time: number): Poses {
  const b = GEO.beams;
  const light = (name: "intern" | "crawler" | "detective" | "satellite", x: number, angle: number): Beam => ({ x: x + b[name].dx, y: b[name].oy, angle, half: b[name].half, length: b[name].length });
  const internX = 140 + 50 * Math.sin(time * 0.13);
  const crawlerX = 290 + 55 * Math.sin(time * 0.21);
  const satelliteX = 195 + 130 * Math.sin(time * 0.11);
  const dogPhase = time * 0.16;
  return {
    intern: { x: internX, beam: light("intern", internX, -35 + 22 * Math.sin(time * 2.3) + 8 * Math.sin(time * 5.1)) },
    crawler: { x: crawlerX, beam: light("crawler", crawlerX, -152 + 24 * Math.sin(time * 1.6)) },
    detective: { beam: light("detective", 30, -18 + 20 * Math.sin(time * 0.18)) },
    satellite: { x: satelliteX, beam: light("satellite", satelliteX, 90 + 14 * Math.sin(time * 0.37)) },
    dog: { x: 195 + 150 * Math.sin(dogPhase), dir: Math.cos(dogPhase) >= 0 ? 1 : -1 },
  };
}
