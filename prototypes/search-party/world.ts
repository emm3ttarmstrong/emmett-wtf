import { dogPatrol, handOf, headBeam, inBeam, lanternSize, posesAt, roomLights, torchBeam, torchDwell, turnTowards } from "./beams";
import { GEO, NOT_THE_PAGE, TUNING } from "./data";
import { glintValue, otherGlintValue } from "./game";
import type { Economy, Glint, Point, Sheet, World, WorldEvent } from "./types";

type Random = () => number;

const between = ([low, high]: readonly number[], random: Random) => low + random() * (high - low);
const towards = (value: number, target: number, step: number) => (Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step);

// Moves towards a target at up to a top speed, slowing as it arrives, with no overshoot.
function glide(value: number, target: number, topSpeed: number, ease: number, crawl: number, seconds: number) {
  const gap = Math.abs(target - value);
  const step = Math.min(topSpeed * seconds, Math.max(gap * (1 - Math.exp(-ease * seconds)), crawl * seconds));
  return towards(value, target, step);
}

// Glints appear on the wall, never on the floor, so the torch can always reach one from where the searcher stands.
function place(random: Random): Point {
  return { x: 16 + random() * (GEO.width - 32), y: 20 + random() * (GEO.floor - 44) };
}

// Where a find lands: on the floor just ahead of the searcher, kept inside the room.
export const findSpot = (heroX: number, facing: 1 | -1) => Math.max(30, Math.min(GEO.width - 30, heroX + facing * 60));

const idleSheet = (): Sheet => ({ active: false, x: -100, baseY: 0, speed: 0, phase: 0, big: false });
export const sheetY = (sheet: Sheet, time: number) => sheet.baseY + (sheet.big ? 38 : 9) * Math.sin(time * (sheet.big ? 1.3 : 4) + sheet.phase);

export function createWorld(random: Random): World {
  return {
    time: 0,
    hero: { x: GEO.hero.x, turn: 80, rest: 80, facing: 1, target: null, targetX: GEO.hero.x, releaseAt: 0, walking: false, aimedAt: -Infinity },
    glints: Array.from({ length: GEO.glints }, (): Glint => ({ ...place(random), state: "on", timer: 0, charge: 0 })),
    stashReadyAt: GEO.stashes.map((_, i) => TUNING.firstStash + i * 5),
    stashCharge: GEO.stashes.map(() => 0),
    mouse: { active: false, x: -40, dir: 1, nextAt: TUNING.firstMouse },
    dog: { x: dogPatrol(0), dir: 1 },
    findX: findSpot(GEO.hero.x, 1),
    nextEventAt: TUNING.firstEvent,
    flashFrom: -Infinity,
    moth: { active: false, x: -100, y: 0, held: 0, leaveAt: 0 },
    phone: { active: false, until: 0, charge: 0 },
    sheets: Array.from({ length: GEO.pages }, idleSheet),
  };
}

// A tap sends the searcher towards a point: walking only if it is far away, with the torch turning to it.
export function tapWorld(world: World, point: Point): World {
  const side = point.x >= world.hero.x ? 1 : -1;
  const gap = Math.abs(point.x - world.hero.x);
  const targetX = gap <= TUNING.standOff ? world.hero.x : Math.max(GEO.hero.minX, Math.min(GEO.hero.maxX, point.x - side * TUNING.standOff));
  return { ...world, hero: { ...world.hero, target: point, targetX, releaseAt: Infinity, aimedAt: world.time } };
}

// Whether lightning is lighting the room this instant: two quick flashes.
export function flashing(world: World) {
  const since = world.time - world.flashFrom;
  return (since >= 0 && since < 0.12) || (since >= 0.25 && since < 0.55);
}

const EVENTS = ["lightning", "crash", "moth", "phone", "draught", "page"] as const;

// Advances the room by a fraction of a second. Returns the new room, the clues collected and anything worth animating.
export function stepWorld(world: World, state: Economy, seconds: number, random: Random): { world: World; gained: number; events: WorldEvent[] } {
  const time = world.time + seconds;
  const events: WorldEvent[] = [];
  const value = glintValue(state);
  const otherValue = otherGlintValue(state);
  let gained = 0;

  // ── The searcher ──
  const speed = 1 + 0.12 * state.levels.reach;
  const hero = { ...world.hero };
  hero.x = glide(hero.x, hero.targetX, TUNING.walkSpeed * speed, TUNING.walkEase, 8, seconds);
  hero.walking = Math.abs(hero.targetX - hero.x) > 1.5;
  // Which way to face is judged from the body, not the hand. The hand changes sides when the searcher turns round,
  // so judging from it made a target overhead flip the facing back and forth forever.
  if (hero.target) {
    const fromBody = turnTowards({ x: hero.x, y: GEO.hero.handY }, hero.target);
    const side = fromBody > TUNING.flipPast ? 1 : fromBody < -TUNING.flipPast ? -1 : hero.facing;
    if (side !== hero.facing) {
      // Turning round is instant and carries the torch with it, so the beam mirrors to the other side.
      hero.facing = side;
      hero.turn = -hero.turn;
    }
  }
  const wanted = hero.target ? turnTowards(handOf(hero.x, hero.facing), hero.target) : hero.rest + TUNING.idleDrift * Math.sin(time * 0.6);
  hero.turn = glide(hero.turn, wanted, TUNING.turnSpeed, TUNING.turnEase, 10, seconds);
  if (hero.target && !hero.walking && Math.abs(hero.turn - wanted) < 0.5) {
    if (hero.releaseAt === Infinity) hero.releaseAt = time + TUNING.holdSeconds;
    else if (time >= hero.releaseAt) {
      hero.target = null;
      hero.rest = hero.turn;
    }
  }

  // ── Every light in the room ──
  const torch = torchBeam(hero.x, hero.facing, hero.turn, state);
  // A torch nobody is pointing still finds things, but slowly and without its bonus, like any other light.
  const attentive = time - hero.aimedAt <= TUNING.attentionSeconds;
  const poses = posesAt(time, state);
  const crew = (["intern", "crawler", "detective", "satellite"] as const).filter((id) => state.levels[id] > 0).map((id) => poses[id].beam);
  const others = [...crew, ...roomLights(time, state)];
  if (state.levels.headlamp > 0) others.push(headBeam(hero.x, hero.facing, state));
  const lantern = GEO.lights.lantern.radius * lanternSize(state);
  const cat = GEO.cat;

  // The dog chases the mouse when there is one, and patrols otherwise. It finds what is low on the wall above its nose.
  const dogSpeed = 150 * (1 + 0.2 * Math.max(0, state.levels.dog - 1));
  const chasing = state.levels.dog > 0 && world.mouse.active;
  const dogX = chasing ? towards(world.dog.x, world.mouse.x, dogSpeed * seconds) : glide(world.dog.x, dogPatrol(time), 70, 3, 6, seconds);
  const dog = { x: dogX, dir: dogX === world.dog.x ? world.dog.dir : dogX > world.dog.x ? (1 as const) : (-1 as const) };
  const noseX = dog.x + dog.dir * 32;

  // Whether a light other than the searcher's torch is on a point.
  const otherLit = (point: Point, margin = 4) =>
    inBeam(torch, point, margin) ||
    others.some((beam) => inBeam(beam, point, margin)) ||
    (lantern > 0 && Math.hypot(point.x - hero.x, point.y - GEO.lights.lantern.y) <= lantern + margin) ||
    (state.levels.dog > 0 && Math.abs(point.x - noseX) <= GEO.dog.reach && point.y >= GEO.dog.low) ||
    (state.levels.cat > 0 && point.x >= cat.left && point.x <= cat.right && point.y >= cat.low);
  // Who, if anyone, has a light on a point: the searcher's torch in use, or anything else.
  const litBy = (point: Point, margin = 4): "torch" | "other" | null => (attentive && inBeam(torch, point, margin) ? "torch" : otherLit(point, margin) ? "other" : null);
  const pay = (who: "torch" | "other", glints: number) => {
    gained += (who === "torch" ? value : otherValue) * glints;
  };

  // ── Glints ──
  const myDwell = torchDwell(state);
  let glints = world.glints.map((glint): Glint => {
    if (glint.state === "on") {
      // A light has to rest on a glint to find it. Sweeping past only starts the job, and it fades if the light moves on.
      const who = litBy(glint);
      const change = who === "torch" ? seconds / myDwell : who === "other" ? seconds / TUNING.otherDwell : -seconds / TUNING.dwellFade;
      const charge = Math.max(0, glint.charge + change);
      if (charge < 1) return charge === glint.charge ? glint : { ...glint, charge };
      pay(who ?? "other", 1);
      return { ...glint, state: "pop", timer: TUNING.popSeconds, charge: 0 };
    }
    const timer = glint.timer - seconds;
    if (timer > 0) return { ...glint, timer };
    if (glint.state === "pop") return { ...glint, state: "off", timer: between(TUNING.respawn, random) };
    return { ...place(random), state: "on", timer: 0, charge: 0 };
  });

  // ── Stashes: the searcher's torch rummages them, and so does the detective's light ──
  const detective = state.levels.detective > 0 ? poses.detective.beam : null;
  const stashReadyAt = [...world.stashReadyAt];
  const stashCharge = world.stashCharge.map((charge, index) => {
    const stash = GEO.stashes[index];
    if (time < stashReadyAt[index]) return 0;
    const mine = inBeam(torch, stash, 8);
    const theirs = !mine && detective !== null && inBeam(detective, stash, 8);
    const next = Math.max(0, charge + (mine || theirs ? seconds / TUNING.stashDwell : -seconds / TUNING.dwellFade));
    if (next < 1) return next;
    pay(mine && attentive ? "torch" : "other", TUNING.stashGlints);
    events.push({ type: "shake", index }, { type: "burst", x: stash.x, y: stash.y });
    stashReadyAt[index] = time + TUNING.stashCooldown;
    return 0;
  });

  // ── The mouse: any light catches it, and the dog runs it down ──
  let mouse = world.mouse;
  if (mouse.active) {
    const x = mouse.x + mouse.dir * TUNING.mouseSpeed * seconds;
    const spot = { x, y: GEO.mouseY };
    const who = state.levels.dog > 0 && Math.abs(noseX - x) <= 20 ? "other" : litBy(spot, 8);
    if (who) {
      pay(who, TUNING.mouseGlints);
      events.push({ type: "burst", ...spot }, { type: "notice", text: "Caught the mouse" });
      mouse = { ...mouse, active: false, x: -40, nextAt: time + between(TUNING.mouseEvery, random) };
    } else if (x < -30 || x > GEO.width + 30) mouse = { ...mouse, active: false, x: -40, nextAt: time + between(TUNING.mouseEvery, random) };
    else mouse = { ...mouse, x };
  } else if (time >= mouse.nextAt) {
    const dir = random() < 0.5 ? 1 : -1;
    mouse = { active: true, dir, x: dir === 1 ? -20 : GEO.width + 20, nextAt: 0 };
  }

  // ── Events ──
  let { nextEventAt, flashFrom } = world;
  let moth = world.moth;
  let phone = world.phone;
  let sheets = world.sheets;
  const busy = moth.active || phone.active || sheets.some((s) => s.active);
  if (!busy && time >= nextEventAt) {
    nextEventAt = time + between(TUNING.eventEvery, random);
    // "The page" is rare. The rest take turns at random.
    const roll = random();
    const event = roll < 0.08 ? "page" : EVENTS[Math.floor(random() * 5)];
    if (event === "lightning") {
      flashFrom = time;
      glints = glints.map((g) => (g.state === "on" ? { ...g, charge: Math.max(g.charge, TUNING.lightningHeadStart) } : g));
      events.push({ type: "notice", text: "Lightning" });
    } else if (event === "crash") {
      // The cat knocks something off its box, and a pile of glints spills out beside it.
      const spill = glints.flatMap((g, i) => (g.state === "pop" ? [] : [i])).slice(0, TUNING.crashGlints);
      glints = glints.map((g, i) => (spill.includes(i) ? { x: cat.left + 20 + random() * 130, y: 200 + random() * 90, state: "on", timer: 0, charge: 0 } : g));
      events.push({ type: "shake", index: 1 }, { type: "burst", x: cat.x, y: cat.y + 30 }, { type: "notice", text: "The cat knocked something over" });
    } else if (event === "moth") {
      moth = { active: true, x: Math.max(20, Math.min(GEO.width - 20, hero.x + (random() < 0.5 ? -260 : 260))), y: 50, held: 0, leaveAt: time + TUNING.mothSeconds };
      events.push({ type: "notice", text: "A moth" });
    } else if (event === "phone") {
      phone = { active: true, until: time + TUNING.phoneSeconds, charge: 0 };
      events.push({ type: "notice", text: "The phone is ringing" });
    } else if (event === "draught") {
      sheets = sheets.map((_, i) => ({ active: true, x: GEO.door.x - i * 14, baseY: GEO.door.y - 30 - random() * 150, speed: 70 + random() * 60, phase: random() * 6, big: false }));
      events.push({ type: "burst", x: GEO.door.x, y: GEO.door.y - 40 }, { type: "notice", text: "A draught" });
    } else {
      sheets = sheets.map((s, i) => (i === 0 ? { active: true, x: GEO.width + 30, baseY: 110, speed: 55, phase: random() * 6, big: true } : s));
      events.push({ type: "notice", text: "The page!" });
    }
  }

  // The moth flies to the far end of the searcher's beam and flutters there. Hold the beam on it to catch it.
  if (moth.active) {
    const reach = (torch.length * 0.7 * Math.PI) / 180;
    const lure = { x: torch.x + Math.cos(torch.angle * (Math.PI / 180)) * torch.length * 0.7 + 18 * Math.sin(time * 3.1), y: torch.y + Math.sin(torch.angle * (Math.PI / 180)) * torch.length * 0.7 + 14 * Math.sin(time * 4.3 + reach) };
    const x = glide(moth.x, Math.max(10, Math.min(GEO.width - 10, lure.x)), 95, 2.2, 10, seconds);
    const y = glide(moth.y, Math.max(14, Math.min(GEO.floor - 20, lure.y)), 95, 2.2, 10, seconds);
    const held = inBeam(torch, { x, y }, 6) && attentive ? moth.held + seconds : Math.max(0, moth.held - seconds * 0.5);
    if (held >= TUNING.mothHold) {
      pay("torch", TUNING.mothGlints);
      events.push({ type: "burst", x, y }, { type: "notice", text: "Caught the moth" });
      moth = { ...moth, active: false, x: -100 };
    } else if (time >= moth.leaveAt) moth = { ...moth, active: false, x: -100 };
    else moth = { ...moth, x, y, held };
  }

  // The phone: get any light on it before it stops ringing.
  if (phone.active) {
    const who = litBy(GEO.phone, 10);
    const charge = who ? phone.charge + seconds / 0.35 : phone.charge;
    if (charge >= 1 && who) {
      pay(who, TUNING.phoneGlints);
      events.push({ type: "burst", ...GEO.phone }, { type: "notice", text: "Wrong number" });
      phone = { ...phone, active: false };
    } else if (time >= phone.until) phone = { ...phone, active: false };
    else phone = { ...phone, charge };
  }

  // Loose sheets blow right to left. Any light catches a small one. Only the searcher's torch catches "the page".
  if (sheets.some((s) => s.active)) {
    sheets = sheets.map((sheet) => {
      if (!sheet.active) return sheet;
      const moved = { ...sheet, x: sheet.x - sheet.speed * seconds };
      const spot = { x: moved.x, y: sheetY(moved, time) };
      const who = litBy(spot, sheet.big ? 12 : 8);
      if (sheet.big ? who === "torch" : who !== null) {
        pay(who ?? "other", sheet.big ? TUNING.pageGlints : TUNING.sheetGlints);
        events.push({ type: "burst", ...spot });
        if (sheet.big) events.push({ type: "notice", text: NOT_THE_PAGE[Math.floor(random() * NOT_THE_PAGE.length)] });
        return idleSheet();
      }
      return moved.x < -30 ? idleSheet() : moved;
    });
  }

  return { world: { time, hero, glints, stashReadyAt, stashCharge, mouse, dog, findX: world.findX, nextEventAt, flashFrom, moth, phone, sheets }, gained, events };
}
