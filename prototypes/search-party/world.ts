import { handOf, inBeam, posesAt, torchBeam, turnTowards } from "./beams";
import { GEO, TUNING } from "./data";
import { glintValue, helperGlintValue } from "./game";
import type { Economy, Glint, Point, World, WorldEvent } from "./types";

type Random = () => number;

const between = ([low, high]: readonly [number, number] | readonly number[], random: Random) => low + random() * (high - low);
const towards = (value: number, target: number, step: number) => (Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step);

function place(random: Random): Point {
  return { x: 16 + random() * (GEO.width - 32), y: 18 + random() * (GEO.height - 32) };
}

export function createWorld(random: Random): World {
  return {
    time: 0,
    hero: { x: GEO.hero.x, turn: 80, rest: 80, target: null, targetX: GEO.hero.x, releaseAt: 0, walking: false },
    glints: Array.from({ length: GEO.glints }, (): Glint => ({ ...place(random), state: "on", timer: 0 })),
    stashReadyAt: GEO.stashes.map((_, i) => TUNING.firstStash + i * 5),
    mouse: { active: false, x: -40, dir: 1, nextAt: TUNING.firstMouse },
  };
}

// A tap sends the searcher towards a point: walking to stand a little short of it, with the torch turning to it.
export function tapWorld(world: World, point: Point): World {
  const side = point.x >= world.hero.x ? 1 : -1;
  const gap = Math.abs(point.x - world.hero.x);
  const targetX = gap <= TUNING.standOff ? world.hero.x : Math.max(GEO.hero.minX, Math.min(GEO.hero.maxX, point.x - side * TUNING.standOff));
  return { ...world, hero: { ...world.hero, target: point, targetX, releaseAt: Infinity } };
}

// Advances the room by a fraction of a second. Returns the new room, the clues collected and anything worth animating.
export function stepWorld(world: World, state: Economy, seconds: number, random: Random): { world: World; gained: number; events: WorldEvent[] } {
  const time = world.time + seconds;
  const events: WorldEvent[] = [];
  const value = glintValue(state);
  const helperValue = helperGlintValue(state);
  let gained = 0;

  // The searcher walks, and the torch turns at a limited speed, so it sweeps instead of jumping.
  const speed = TUNING.sweepGrowth ** state.upgrades.sweep;
  const hero = { ...world.hero };
  hero.x = towards(hero.x, hero.targetX, TUNING.walkSpeed * speed * seconds);
  hero.walking = hero.x !== hero.targetX;
  const wanted = hero.target ? turnTowards(handOf(hero.x, hero.turn), hero.target) : hero.rest + TUNING.idleDrift * Math.sin(time * 0.6);
  hero.turn = towards(hero.turn, wanted, TUNING.turnSpeed * speed * seconds);
  if (hero.target && !hero.walking && hero.turn === wanted) {
    if (hero.releaseAt === Infinity) hero.releaseAt = time + TUNING.holdSeconds;
    else if (time >= hero.releaseAt) {
      hero.target = null;
      hero.rest = hero.turn;
    }
  }

  const torch = torchBeam(hero.x, hero.turn, state);
  const poses = posesAt(time);
  const lights = (["intern", "crawler", "detective", "satellite"] as const).filter((id) => state.owned[id] > 0).map((id) => poses[id].beam);
  const nose = state.owned.dog > 0 ? { x: poses.dog.x + poses.dog.dir * 32, y: GEO.dog.y - 12 } : null;

  const glints = world.glints.map((glint): Glint => {
    if (glint.state === "on") {
      const mine = inBeam(torch, glint);
      const theirs = !mine && (lights.some((beam) => inBeam(beam, glint)) || (nose !== null && Math.hypot(glint.x - nose.x, glint.y - nose.y) <= GEO.dog.reach));
      if (!mine && !theirs) return glint;
      gained += mine ? value : helperValue;
      return { ...glint, state: "pop", timer: TUNING.popSeconds };
    }
    const timer = glint.timer - seconds;
    if (timer > 0) return { ...glint, timer };
    if (glint.state === "pop") return { ...glint, state: "off", timer: between(TUNING.respawn, random) };
    return { ...place(random), state: "on", timer: 0 };
  });

  // Only the searcher's own torch can rummage a stash or catch the mouse.
  const stashReadyAt = world.stashReadyAt.map((readyAt, index) => {
    const stash = GEO.stashes[index];
    if (time < readyAt || !inBeam(torch, stash, 8)) return readyAt;
    gained += value * TUNING.stashGlints;
    events.push({ type: "shake", index }, { type: "burst", x: stash.x, y: stash.y });
    return time + TUNING.stashCooldown;
  });

  let mouse = world.mouse;
  if (mouse.active) {
    const x = mouse.x + mouse.dir * TUNING.mouseSpeed * seconds;
    if (inBeam(torch, { x, y: GEO.mouseY }, 8)) {
      gained += value * TUNING.mouseGlints;
      events.push({ type: "burst", x, y: GEO.mouseY });
      mouse = { ...mouse, active: false, x: -40, nextAt: time + between(TUNING.mouseEvery, random) };
    } else if (x < -30 || x > GEO.width + 30) mouse = { ...mouse, active: false, x: -40, nextAt: time + between(TUNING.mouseEvery, random) };
    else mouse = { ...mouse, x };
  } else if (time >= mouse.nextAt) {
    const dir = random() < 0.5 ? 1 : -1;
    mouse = { active: true, dir, x: dir === 1 ? -20 : GEO.width + 20, nextAt: 0 };
  }

  return { world: { time, hero, glints, stashReadyAt, mouse }, gained, events };
}
